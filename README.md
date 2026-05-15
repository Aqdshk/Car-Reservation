# Car Booking System

Company car reservation system. ASP.NET Core Web API + React (Vite) + MySQL.

![CI](../../actions/workflows/ci.yml/badge.svg) ![CD](../../actions/workflows/deploy.yml/badge.svg)

## Quick Start (Local Dev)

### 1. Database
Start MySQL Server, then:
```sql
mysql -u root -p < database/schema.sql
```
Or just let the backend auto-create the schema on first run (`EnsureCreated`).

### 2. Backend
```bash
cd backend
dotnet run
```
Runs on `http://localhost:5000`. Swagger UI at `/swagger`.

Edit `backend/appsettings.json` to set MySQL password and JWT secret.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.

## Default Accounts (seeded)

| Role  | Email             | Password   |
|-------|-------------------|------------|
| Admin | admin@c-zero.my   | admin123   |
| Staff | aqid@c-zero.my    | staff123   |

**Change these in production.** In `Production` environment the backend refuses to seed a default admin unless `CARBOOKING_SEED_ADMIN_PASSWORD` is set.

## Configuration (env vars)

The backend reads these in priority order: env var → `appsettings.{Env}.json` → `appsettings.json`.

| Env var | Purpose |
|---|---|
| `CARBOOKING_JWT_KEY` | JWT signing key (min 32 bytes). Required in Production. |
| `CARBOOKING_DB_CONN` | MySQL connection string. |
| `CARBOOKING_SEED_ADMIN_PASSWORD` | Initial admin password — only used on first run. |

Generate a key: `openssl rand -base64 48`

## Health check

`GET /health` returns `Healthy` when the DB is reachable. Wire to Cloudflare uptime / Grafana.

## CI / CD

- **CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) — runs on every PR and `main` push. Builds backend + frontend, runs tests, uploads artifacts.
- **CD** ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) — runs on `main` push (and manual dispatch). Builds on the Pi via a self-hosted runner and deploys to `/opt/car-booking` + `/var/www/car-booking`, then health-checks.

### One-time CD setup on the Banana Pi

```bash
# 1. Create runner user (or reuse existing one — must NOT be www-data)
sudo useradd -m -s /bin/bash gha
sudo usermod -aG sudo gha

# 2. Install GitHub Actions self-hosted runner
#    Get the token from: GitHub repo → Settings → Actions → Runners → New self-hosted runner
sudo -iu gha bash <<'EOF'
mkdir actions-runner && cd actions-runner
curl -o runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-arm64-2.319.1.tar.gz
tar xzf runner.tar.gz
./config.sh --url https://github.com/<OWNER>/<REPO> --token <TOKEN> --labels banana-pi,production
EOF

# 3. Install as a service
cd /home/gha/actions-runner
sudo ./svc.sh install gha
sudo ./svc.sh start

# 4. Grant passwordless sudo for ONLY the deploy commands
sudo tee /etc/sudoers.d/gha-deploy > /dev/null <<'EOF'
gha ALL=(root) NOPASSWD: /bin/systemctl stop car-booking, /bin/systemctl start car-booking, /bin/systemctl status car-booking, /usr/bin/rsync -a --delete *, /bin/chown -R www-data\:www-data /opt/car-booking, /bin/chown -R www-data\:www-data /var/www/car-booking
EOF
sudo chmod 440 /etc/sudoers.d/gha-deploy

# 5. Install build deps
sudo apt install -y nodejs npm  # or use nvm
# .NET SDK 8 should already be installed for the runtime; if not:
sudo apt install -y dotnet-sdk-8.0
```

Push to `main` → deploy.yml triggers → ~2 min later the Pi is running the new build.

### Rollback

The workflow stops the service before rsync, so a failed deploy leaves the previous binaries in place — just `git revert` the bad commit and push, or `sudo systemctl start car-booking` after restoring from snapshot.

## Production Deploy (Banana Pi)

### 1. Build artifacts on dev machine
```bash
# Backend
cd backend
dotnet publish -c Release -r linux-arm64 --self-contained false -o publish

# Frontend
cd ../frontend
npm run build
# output in frontend/dist/
```

### 2. On Banana Pi (Armbian)
```bash
# Install runtime
sudo apt update
sudo apt install -y dotnet-runtime-8.0 aspnetcore-runtime-8.0 mysql-server nginx

# Copy backend
sudo mkdir -p /opt/car-booking
sudo cp -r publish/* /opt/car-booking/
sudo chown -R www-data:www-data /opt/car-booking

# Configure secrets (read by systemd unit)
sudo mkdir -p /etc/car-booking
sudo tee /etc/car-booking/env > /dev/null <<EOF
CARBOOKING_JWT_KEY=$(openssl rand -base64 48)
CARBOOKING_DB_CONN=server=localhost;port=3306;database=car_booking;user=carbooking;password=STRONG_PASSWORD;TreatTinyAsBoolean=true
CARBOOKING_SEED_ADMIN_PASSWORD=$(openssl rand -base64 16)
EOF
sudo chmod 600 /etc/car-booking/env
sudo chown www-data:www-data /etc/car-booking/env

# Copy frontend
sudo mkdir -p /var/www/car-booking
sudo cp -r dist/* /var/www/car-booking/

# Database
sudo mysql < database/schema.sql

# Service
sudo cp deploy/car-booking.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now car-booking

# Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/car-booking
sudo ln -s /etc/nginx/sites-available/car-booking /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Cloudflare Tunnel
```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
sudo mv cloudflared /usr/local/bin/ && sudo chmod +x /usr/local/bin/cloudflared

# Auth & create tunnel
cloudflared tunnel login
cloudflared tunnel create car-booking
# Route DNS in Cloudflare dashboard:
#   reservation.c-zero.my → CNAME → <tunnel-id>.cfargotunnel.com

# Run as service
sudo cloudflared service install <tunnel-token>
```

## Project Structure
```
backend/        ASP.NET Core 8 Web API
  Models/       Entity classes
  Data/         EF Core DbContext
  Controllers/  Auth, Vehicles, Reservations
  Services/     JwtService
  Dtos/         Request/response DTOs
frontend/       React + Vite
  src/pages/    Login, Dashboard, NewBooking, MyBookings, AdminDashboard, Vehicles, ManageBookings
  src/components/Layout.jsx
database/       schema.sql
deploy/         nginx.conf, systemd unit
```

## API Endpoints

| Method | Path                            | Auth     |
|--------|---------------------------------|----------|
| POST   | /api/auth/register              | Public   |
| POST   | /api/auth/login                 | Public   |
| GET    | /api/vehicles                   | Any user |
| POST   | /api/vehicles                   | Admin    |
| PUT    | /api/vehicles/{id}              | Admin    |
| DELETE | /api/vehicles/{id}              | Admin    |
| GET    | /api/reservations               | Any/admin filters automatically |
| GET    | /api/reservations/mine          | Any user |
| GET    | /api/reservations/pending       | Admin    |
| POST   | /api/reservations               | Any user |
| PATCH  | /api/reservations/{id}/status   | Admin    |
| DELETE | /api/reservations/{id}          | Owner/Admin |
