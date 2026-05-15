# Car Booking System

Company car reservation system. ASP.NET Core Web API + React (Vite) + MySQL.

![CI](../../actions/workflows/ci.yml/badge.svg)

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

- **CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) — runs on every PR and `main` push. Builds backend (publishes for `linux-arm`) + frontend on `ubuntu-latest`, uploads both as artifacts (retention 7 days).
- **CD** — pull-based. A cron job on the Banana Pi polls the GitHub API every 5 minutes for the latest successful CI run on `main`; when the run id changes, it downloads the artifacts, rsyncs them into `/opt/car-booking` + `/var/www/car-booking`, restarts the service, and health-checks.

Why pull-based and not a self-hosted runner: the Banana Pi M2 Ultra is `armv7l` (32-bit) on Debian 13. The GitHub Actions runner v2.334.0 bundles .NET 6, which fails TLS handshakes against newer OpenSSL 3.x trust stores (`NotTimeValid` certificate chain errors). Pull-based deploy uses system `curl` (which works fine) and avoids the runner entirely.

### Pi-side setup

1. **Create a fine-grained GitHub PAT** at https://github.com/settings/personal-access-tokens/new
   - Repository access: only this repo
   - Permissions: `Actions: Read`, `Contents: Read`, `Metadata: Read`

2. **Drop the token on the Pi** (replace `<PAT>`):

   ```bash
   sudo mkdir -p /etc/car-booking
   echo '<PAT>' | sudo tee /etc/car-booking/github-token > /dev/null
   sudo chmod 600 /etc/car-booking/github-token
   sudo chown root:root /etc/car-booking/github-token
   sudo apt install -y jq unzip
   ```

3. **Install the deploy script** — copy [deploy/car-booking-deploy.sh](deploy/car-booking-deploy.sh) to `/usr/local/bin/`:

   ```bash
   sudo cp deploy/car-booking-deploy.sh /usr/local/bin/
   sudo chmod 750 /usr/local/bin/car-booking-deploy.sh
   sudo chown root:root /usr/local/bin/car-booking-deploy.sh
   ```

4. **Install the cron job** — copy [deploy/car-booking-deploy.cron](deploy/car-booking-deploy.cron) to `/etc/cron.d/`:

   ```bash
   sudo cp deploy/car-booking-deploy.cron /etc/cron.d/car-booking-deploy
   sudo chmod 644 /etc/cron.d/car-booking-deploy
   ```

5. **Trigger the first deploy manually** to verify everything wires up:

   ```bash
   sudo /usr/local/bin/car-booking-deploy.sh
   ```

   Subsequent runs are silent until a new CI run-id appears. Logs land in `/var/log/car-booking-deploy.log`; last-deployed run-id is tracked in `/var/lib/car-booking/last-deploy-run-id`.

### Force redeploy

Clear the state file, next cron tick will pull again:

```bash
sudo rm -f /var/lib/car-booking/last-deploy-run-id
sudo /usr/local/bin/car-booking-deploy.sh   # or wait for cron
```

Push to `main` → deploy.yml triggers → ~2 min later the Pi is running the new build.

### Rollback

If a deploy fails health check, the service is left stopped and the state file is NOT updated — so the next cron tick will retry the same artifact. To roll back to a previous green build, either `git revert` the bad commit and push (CI rebuilds, cron picks it up), or manually rsync from a known-good artifact.

## Production Deploy (Banana Pi)

### 1. Build artifacts on dev machine
```bash
# Backend
cd backend
dotnet publish -c Release -r linux-arm --self-contained false -o publish

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
