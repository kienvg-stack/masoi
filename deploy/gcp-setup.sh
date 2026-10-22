#!/usr/bin/env bash
# One-shot setup for a fresh Ubuntu VM (Google Cloud e2-micro, us-central1).
#   Free sslip.io name from the VM IP:   bash gcp-setup.sh
#   Free DuckDNS name:                   bash gcp-setup.sh <duckdns-name> <duckdns-token>
# Run it again any time to pull the latest code and restart.
set -euo pipefail
DIR="$HOME/masoi"

# 1 GB RAM is tight while Docker builds; a swap file keeps it from running out
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
command -v docker >/dev/null || { curl -fsSL https://get.docker.com | sudo sh; }
command -v git >/dev/null || sudo apt-get install -y git

if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only; else git clone https://github.com/kienvg-stack/masoi.git "$DIR"; fi
cd "$DIR/deploy"

IP=$(curl -fsS -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip || curl -fsS https://api.ipify.org)
if [ ! -f .env ]; then
  if [ $# -ge 2 ]; then
    curl -fsS "https://www.duckdns.org/update?domains=$1&token=$2&ip=$IP" | grep -q OK || { echo "DuckDNS update failed: check the name and token"; exit 1; }
    GAME="$1.duckdns.org"
  else
    GAME="masoi.${IP//./-}.sslip.io"
  fi
  printf 'GAME_DOMAIN=%s\nADMIN_DOMAIN=admin.%s\nADMIN_PASSWORD=%s\n' "$GAME" "$GAME" "$(openssl rand -base64 12 | tr -d '/+=')" > .env
  chmod 600 .env
fi

sudo docker compose up -d --build
. ./.env
echo
echo "Game:   https://$GAME_DOMAIN"
echo "Admin:  https://$ADMIN_DOMAIN   (user: admin, password: $ADMIN_PASSWORD)"
echo "HTTPS certificates can take a minute on the first start."
