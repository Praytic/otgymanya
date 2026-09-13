#!/usr/bin/env bash
set -euo pipefail
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
export DBUS_SESSION_BUS_ADDRESS=${DBUS_SESSION_BUS_ADDRESS:-unix:path=$XDG_RUNTIME_DIR/bus}
cd "$(dirname "$0")/.."
config=${GYM_DOCKER_ENV:-$HOME/.config/gym-routine-tracker/docker.env}
compose=(docker compose --env-file "$config")
"${compose[@]}" config --quiet
"${compose[@]}" build
services=(gym-routine-tracker-mini-app.service)
rollback() {
  echo 'Container startup failed; restoring user services.' >&2
  "${compose[@]}" down || true
  systemctl --user start "${services[@]}"
}
trap rollback ERR
systemctl --user stop "${services[@]}"
"${compose[@]}" up -d --wait --wait-timeout 120 --remove-orphans
systemctl --user disable "${services[@]}"
trap - ERR
"${compose[@]}" ps
