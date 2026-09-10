#!/usr/bin/env bash
set -euo pipefail

project_dir=${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}
hook_input=$(command jq -c .)
hook_event=$(command jq -r '.hook_event_name // empty' <<<"$hook_input")
changed_path=$(command jq -r '.file_path // empty' <<<"$hook_input")

if [[ $hook_event == FileChanged && $changed_path != "$project_dir/WORKOUT_CONTEXT.md" ]]; then
  exit 0
fi
if [[ $hook_event != FileChanged && $hook_event != SessionStart ]]; then
  exit 0
fi

service=gym-routine-tracker-telegram.service
service_pid=$(systemctl --user show "$service" --property=MainPID --value)
if [[ ! $service_pid =~ ^[1-9][0-9]*$ || ! -r /proc/$service_pid/environ ]]; then
  echo "Cannot read the running Telegram service environment" >&2
  exit 1
fi

while IFS= read -r variable; do
  export "$variable"
done < <(tr '\0' '\n' < "/proc/$service_pid/environ" | command grep -E '^TELEGRAM_GYM_(BOT_TOKEN|CHAT_ID|STATE_PATH)=')

cd "$project_dir"
exec node telegram/sync-context.mjs
