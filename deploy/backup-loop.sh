#!/bin/sh
# Dumps the database once a day at BACKUP_HOUR (UTC) and keeps BACKUP_KEEP_DAYS.
# Also writes one dump at startup, so a fresh deploy is never without a backup.
set -eu
mkdir -p "$BACKUP_DIR"

dump() {
  f="$BACKUP_DIR/car_booking-$(date -u +%Y%m%d-%H%M%S).sql.gz"
  if mariadb-dump -h "$DB_HOST" -u "$DB_USER" --single-transaction --routines \
       "$DB_NAME" | gzip > "$f.tmp"; then
    mv "$f.tmp" "$f"
    echo "$(date -u) backup ok: $f ($(wc -c < "$f") bytes)"
  else
    rm -f "$f.tmp"
    echo "$(date -u) backup FAILED" >&2
  fi
  find "$BACKUP_DIR" -name 'car_booking-*.sql.gz' -mtime +"$BACKUP_KEEP_DAYS" -delete
}

dump
last=$(date -u +%Y%m%d)
while true; do
  sleep 300
  today=$(date -u +%Y%m%d)
  if [ "$(date -u +%H)" = "$BACKUP_HOUR" ] && [ "$today" != "$last" ]; then
    dump
    last=$today
  fi
done
