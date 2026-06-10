#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${1:?Usage: deploy.sh <user@host>}"
REMOTE_DIR="/var/www/gamepoly"

echo "Building Nuxt static site..."
npm run generate

echo "Uploading dist/ to ${REMOTE_HOST}:${REMOTE_DIR}..."
rsync -rz --delete dist/ "${REMOTE_HOST}:${REMOTE_DIR}/dist/"

echo "Uploading Nginx config..."
scp deploy/nginx.conf "${REMOTE_HOST}:/tmp/gamepoly.nginx.conf"
ssh "${REMOTE_HOST}" "sudo mv /tmp/gamepoly.nginx.conf /etc/nginx/sites-available/gamepoly && sudo ln -sf /etc/nginx/sites-available/gamepoly /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx"

echo "Done! Site should be live at https://gamepoly.chamvea.dev"