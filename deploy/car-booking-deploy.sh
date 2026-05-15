#!/usr/bin/env bash
set -euo pipefail

REPO="Aqdshk/Car-Reservation"
TOKEN_FILE="/etc/car-booking/github-token"
STATE_FILE="/var/lib/car-booking/last-deploy-run-id"
LOG_FILE="/var/log/car-booking-deploy.log"
WORK_DIR="/var/tmp/car-booking-deploy"
LOCK_FILE="/var/lock/car-booking-deploy.lock"

mkdir -p "$WORK_DIR" "$(dirname "$STATE_FILE")"

exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

TOKEN=$(cat "$TOKEN_FILE")
LAST_RUN_ID=$(cat "$STATE_FILE" 2>/dev/null || echo 0)

RUN_JSON=$(curl -fsS \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/workflows/ci.yml/runs?branch=main&status=success&per_page=1")

RUN_ID=$(echo "$RUN_JSON" | jq -r '.workflow_runs[0].id // empty')
RUN_SHA=$(echo "$RUN_JSON" | jq -r '.workflow_runs[0].head_sha // empty')

if [ -z "$RUN_ID" ]; then
  log "No successful CI run found."
  exit 0
fi

if [ "$RUN_ID" = "$LAST_RUN_ID" ]; then
  exit 0
fi

log "New CI run $RUN_ID (sha ${RUN_SHA:0:7}) — deploying."

ARTIFACTS=$(curl -fsS \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/artifacts")

BACKEND_URL=$(echo "$ARTIFACTS" | jq -r '.artifacts[] | select(.name=="backend-publish") | .archive_download_url')
FRONTEND_URL=$(echo "$ARTIFACTS" | jq -r '.artifacts[] | select(.name=="frontend-dist") | .archive_download_url')

if [ -z "$BACKEND_URL" ] || [ -z "$FRONTEND_URL" ]; then
  log "Missing artifacts for run $RUN_ID (artifacts may have expired)."
  exit 1
fi

rm -rf "$WORK_DIR"/*
curl -fsSL -H "Authorization: Bearer $TOKEN" -o "$WORK_DIR/backend.zip" "$BACKEND_URL"
curl -fsSL -H "Authorization: Bearer $TOKEN" -o "$WORK_DIR/frontend.zip" "$FRONTEND_URL"

mkdir -p "$WORK_DIR/backend" "$WORK_DIR/frontend"
unzip -qo "$WORK_DIR/backend.zip" -d "$WORK_DIR/backend"
unzip -qo "$WORK_DIR/frontend.zip" -d "$WORK_DIR/frontend"

log "Stopping service..."
systemctl stop car-booking

log "Syncing backend to /opt/car-booking/..."
rsync -a --delete "$WORK_DIR/backend/" /opt/car-booking/
chown -R www-data:www-data /opt/car-booking

log "Syncing frontend to /var/www/car-booking/..."
rsync -a --delete "$WORK_DIR/frontend/" /var/www/car-booking/
chown -R www-data:www-data /var/www/car-booking

log "Starting service..."
systemctl start car-booking

for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:5000/health > /dev/null 2>&1; then
    log "Healthy. Deploy successful (run $RUN_ID, sha ${RUN_SHA:0:7})."
    echo "$RUN_ID" > "$STATE_FILE"
    exit 0
  fi
  sleep 3
done

log "Health check failed after deploy of run $RUN_ID."
systemctl status car-booking --no-pager | tee -a "$LOG_FILE" || true
exit 1
