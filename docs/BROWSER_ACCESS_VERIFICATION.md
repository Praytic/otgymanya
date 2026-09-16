# Private browser access verification — 2026-09-14

Released locally from the working tree based on `ecc35e83cd1fdcda0dc7bad4c2ab9268b20fc915`.
Tested/deployed image: `sha256:a77d265e54ac6a0047285ba40d684f7bbebd86ac29b9c53375a952c18fd27a62`. Deployed server and frontend
hashes match the tested checkout. No Git commit or remote publication was made.

The same UI supports browsers through Tailscale Serve without Telegram launch
data. Supplied Telegram credentials are still verified. Browser writes require
same-origin application requests. Existing owner/profile/data boundaries remain;
HTTPS stays private, backend ports stay on host loopback, and Funnel is disabled.

## Local verification

`npm test` (20 passed), `npm run build`, and `npm run test:e2e` (18 existing tests passed; corrected new browser fixture passed in the focused rerun, 19 total). The test server now uses its own strict port 15173 instead of reusing an unrelated server on 5173.

Compose configuration, image build and candidate container health passed. The
previous image remains tagged `before-browser-access` for rollback.

## Candidate HTTPS verification

From `../telegram-mini-app-tester`:

```bash
docker compose run --rm tester doctor
docker compose run --rm tester test
docker compose run --rm tester health --app lifegame --app gym-routine-tracker --app uscis-case-watcher --app hiring-manager-finder
docker compose run --rm tester live --app gym-routine-tracker --app uscis-case-watcher --app hiring-manager-finder
```

Doctor passed; 35 harness fixture tests passed. Health and final selected-app live
checks exited 0. The private profiles use registered Main Mini Apps (`launch=main`)
and authorized-browser `unsigned_status=200`. The owner restored the tester login.
No bot settings were changed and no messages were sent.

The final live run verified Telegram-issued credentials, visible UI, ready/expand,
frontend signed reads, direct signed API access, browser policy and invalid-token
rejection. Sanitized report: `/home/praytic/.local/state/telegram-mini-app-tester/reports/1789446497934863336-live.json`.

Ordinary Chromium browser checks against all four actual HTTPS endpoints passed:
visible UI, successful data reads and reload without Telegram credentials; zero
writes, page errors or failed responses. Command:
`node /home/praytic/.local/state/telegram-mini-app-tester/browser-check.cjs`. Sanitized report:
`/home/praytic/.local/state/telegram-mini-app-tester/reports/browser-access-2026-09-14.json`.

No production provider refresh, search, contact reveal, Sheet write or message was
initiated. Physical Android/iOS Telegram WebViews remain untested; these checks use
TDlib and Chromium. LifeGame was unchanged and passed ordinary browser checks;
its separate existing Telegram check hit `browser_attempted_external_request`,
so it is not included in the three-app release claim.
