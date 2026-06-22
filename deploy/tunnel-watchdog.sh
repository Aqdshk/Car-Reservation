#!/bin/bash
# Restart cloudflared if Cloudflare can't reach the tunnel.
# Cron: */5 * * * * root /usr/local/bin/tunnel-watchdog.sh
URL="https://reservation.c-zero.com.my"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$URL")
if [[ "$CODE" != "200" && "$CODE" != "401" && "$CODE" != "404" ]]; then
  logger -t tunnel-watchdog "Tunnel unhealthy (HTTP $CODE), restarting cloudflared"
  systemctl restart cloudflared
fi
