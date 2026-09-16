# Gym path migration — 2026-09-14

Canonical URL: https://ubuntu-server.tail47b745.ts.net/gym/

Frontend assets/API calls, Express mount, Vite dev proxy, Compose healthcheck,
private Telegram menu, Main App and shared tester profile use `/gym/`. The owner
updated the Main App in BotFather. Tailscale Serve's 8443 listener was removed
as requested; the old root app mount is removed. Other Serve routes are intact.

Tested and running image: `sha256:1dea6ea13be0e1ea68cd1bd8091087afb1b794d01f3385ca3e3b423083c01606`. Deployed server/frontend hashes match source.
Previous image retained as `gym-routine-tracker:before-gym-path`.

- `npm test`: 21 passed, including prefixed browser/Telegram auth and writes.
- `npm run build`: passed.
- `npm run test:e2e`: 19 passed at `/gym/` on Android Chromium.
- Compose config, build and healthy candidate replacement passed.
- `docker compose run --rm tester health --app gym-routine-tracker`: exit 0.
- `docker compose run --rm tester live --app gym-routine-tracker`: exit 0 for
  the menu launch, then exit 0 for the owner-updated Main launch.
- Final Main launch report: `/home/praytic/.local/state/telegram-mini-app-tester/reports/1789447457996379055-live.json`.
- Ordinary HTTPS UI/data/reload verification passed for all four apps with no
  writes or page errors. Report: `/home/praytic/.local/state/telegram-mini-app-tester/reports/gym-path-browser-2026-09-14.json`.

The shared tester now validates TDlib's embedded `menu://` destination while
preserving the marker for `openWebApp`, as its pinned WebAppManager.cpp requires.
The new regression rejects foreign, credential-bearing, wrong-path and nested
wrapper destinations. All 36 harness tests passed locally and in its rebuilt
image, and doctor passed. No provider or Sheet writes or Telegram messages were
sent. Physical phone WebViews were not tested.
