# Mini App verification

## Test runner exclusion

Status: fixed.

On 2026-09-11, `npm test` expanded the unquoted `e2e/**` pattern into two filenames. Vitest excluded the first file and tried to collect the second Playwright suite, failing with “Playwright Test did not expect test() to be called here”.

Hypothesis: shell expansion caused the failure. Quoting the glob should run unit tests without collecting Playwright suites; continued collection would disprove it.

Probe: `npx vitest run --exclude 'e2e/**'` passed all 31 tests. Applied the same quoting to the package script; `npm test` then passed all 31 tests.

## Browser checks

`npm run build` succeeded. The full Android Chromium (Pixel 7) Playwright suite passed 10 tests. An additional Mini App draft/reload/signed-submission test was then added; `npx playwright test e2e/telegram.spec.ts` passed all three Mini App tests. API writes in browser tests use intercepted fixture responses, not the production Sheet.

## Deployment handoff

The protected loopback service is installed. Public HTTPS requires the workstation owner to enable Tailscale Funnel:

```sh
sudo tailscale funnel --bg --https=8443 --yes http://127.0.0.1:8083
```

Direct invocation was denied by Tailscale permissions, and passwordless sudo is unavailable. Main Mini App registration is also required through the bot owner's BotFather account. After those steps, run the launcher setup with the private bot environment as described in README.md. Verify the public endpoint, group launcher, and a real Android Telegram session before claiming end-to-end deployment is complete.

### Deployment completed

The owner enabled Funnel and registered the Main Mini App on 2026-09-11. Public HTTPS returned 200 for the app and health endpoint, and 401 for unsigned bootstrap and Context requests. Bot API `getMe` confirmed Main Mini App registration. Launcher setup succeeded, configuring the private-chat menu and posting the Open Gym direct-link button in the Gym group's General topic. A physical Android Telegram launch still requires user verification.

### Legacy bot retirement

Removed the topic/dashboard interaction code, polling entry point, topic registration, bot state helpers, associated tests, and Claude Context-post hooks. Disabled, stopped, and uninstalled the legacy user service; verified `LoadState=not-found`, `ActiveState=inactive`, and `MainPID=0`. The Mini App service remains active and enabled. Public app/health checks return 200 and unsigned data requests return 401. The remaining unit suite passes 13 tests and the production build succeeds. Historical Sheet data and local legacy state files were preserved.
