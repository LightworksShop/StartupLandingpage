#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run this activation script with sudo." >&2
  exit 1
fi
if [[ $# -ne 1 || ! $1 =~ ^[a-f0-9]{64}$ ]]; then
  echo "Usage: sudo bash activate.sh EXPECTED_CURRENT_NGINX_SHA256" >&2
  exit 1
fi
deployment_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
target=/etc/nginx/sites-available/smartwerk-software.de
current=$(sha256sum "$target" | cut -d ' ' -f 1)
if [[ $current != "$1" ]]; then
  echo "Nginx configuration changed. Review the current file before activation." >&2
  exit 1
fi
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3030/health >/dev/null
umask 077
backup_dir=$(mktemp -d /opt/smartwerk/marketing-nginx-backup.XXXXXX)
cp -p -- "$target" "$backup_dir/nginx.conf"
rollback() {
  cp -p -- "$backup_dir/nginx.conf" "$target"
  nginx -t && systemctl reload nginx
  echo "Activation failed; previous configuration restored from $backup_dir." >&2
}
trap rollback ERR
install -o root -g root -m 644 "$deployment_dir/nginx.conf" "$target"
nginx -t
systemctl reload nginx
curl --fail --silent --show-error --max-time 15 \
  --resolve smartwerk-software.de:443:127.0.0.1 \
  https://smartwerk-software.de/marketing >/dev/null
trap - ERR
echo "Marketing activated. Previous Nginx configuration: $backup_dir/nginx.conf"
