# Car Booking System

Company car reservation system. ASP.NET Core Web API + React (Vite) + MySQL.

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

**Change these in production.**

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
