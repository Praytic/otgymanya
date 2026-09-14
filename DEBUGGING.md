# Debugging

## Week label changes when navigating into a weekly routine

- Status: Fixed and deployed; regression and production build pass.
- Smallest repro: Open Monday 2026-09-14, then scroll to the next workout on Wednesday 2026-09-16 in Android Chromium.
- Source of truth: Monday's immutable routine has a six-week cycle; Wednesday starts a different routine with a repeating one-week prescription.
- Hypotheses: Stale navigation state could mix the selected workout and initial version, or the header could be showing correct cycle lengths without identifying the routine transition. A switch within the same version would support the former; matching the two Sheet versions supports the latter.
- Observed live baseline: The header changes from `Week 1 of 6` to `Week 1 of 1`. Read-only Sheet inspection confirms both lengths belong to their respective dates.
- Regression probe: `npm run test:e2e -- --grep 'workout header explains'`. Before the fix, the header lacks the expected routine name.
- Fix: Identify the selected routine beside its cycle label, and display `Repeats weekly` for one-week schedules. Retain the actual cycle week for multiweek routines.
- Observed result: The target regression passes, including forward navigation within the weekly routine and return to the original six-week routine. Android touch navigation and original-version submission regressions also pass; all 16 unit/API tests and the production build pass.
- Regression command: `npm run test:e2e -- --grep 'workout header explains|Friday navigates|native Android touch'`.
- Live verification: Signed Android Chromium navigation shows the WS4SB name with `Week 1 of 6`, then the RP name with `Repeats weekly`. The header fits the mobile width, the container is healthy, and no live workout writes were made.
- No routine definitions, effective dates, or historical results were changed.

## Exercise icons missing in the Telegram Mini App

- Status: Fixed and deployed.
- Smallest repro: Compare the exercise-ID strings in the JavaScript served from `127.0.0.1:8083` with the current production build.
- Exact probes: fetch the live and local `index-*.js` bundles, then search for `bodyweight-row`, `push-up`, `pull-up`, `deadbug`, and `seated-cable-row`.
- Expected: Both bundles contain the current exercise-ID mappings.
- Observed source of truth: The local bundle contains all five mappings.
- Observed live behavior: The container bundle contains none of them. It serves `index-BcqWP7j1.js`; the current local build serves `index-CtDQNDnc.js`.
- Confirmed cause: The Telegram WebView was receiving a container image built before commit `e46d388`, rather than hiding or failing to load icons from the current build.
- Evidence: The running image was created on September 12, while the icon commit was created on September 14. Tailnet HTTPS proxies to the same stale loopback bundle.
- Fix: Rebuilt and recreated the Mini App container from the current checkout.
- Observed result: Loopback and tailnet HTTPS both serve `index-CtDQNDnc.js`; all 31 bundled exercise images return HTTP 200. An Android-sized Chromium launch against the live signed Mini App rendered five exercise icons across four rows, and every image completed with a nonzero intrinsic width.
- Regression checks: Container is healthy, `/api/health/live` returns 200, and unsigned bootstrap remains rejected with 401.

## Android pull-to-refresh

- Status: Fixed locally
- Smallest repro: Open Current week in Android Chromium, start at the top, and drag down.
- Exact probe: `npx playwright test e2e/mobile.spec.ts`
- Expected: The document root permits vertical overscroll so Chromium can start native refresh.
- Observed: Both `html` and `body` compute to `overflow-y: hidden`; only the nested view scrolls.
- Confirmed cause: Root overflow suppression blocks the browser gesture.
- Fix: Leave `html` and `body` at their native visible vertical overflow, and clip only `#root` to preserve the viewport-sized app layout.
- Observed result: The root-overflow regression check flips to passing while the mobile editor and history tests remain green.

## Previous workout across routine versions

- Status: Fixed; focused regression passes.
- Smallest repro: On Friday 2026-09-11, scroll upward beyond the top to open Wednesday 2026-09-09.
- Inputs: Friday's snapshot begins 2026-09-10; Wednesday belongs to the snapshot ending 2026-09-09. Confirmed through the live bootstrap API.
- Hypotheses: Either the edge gesture failed, or the schedule search excluded Wednesday. The existing search used only the current snapshot, predicting no previous label regardless of gesture.
- Exact probe: `npx playwright test e2e/mobile.spec.ts -g 'Friday navigates'`.
- Before: Timed out waiting for the Wednesday previous-workout button.
- Fix: Search all provided snapshots within their effective ranges and carry the selected version into the editor and submission. No Sheet edits.
- After: Friday-to-Wednesday navigation, original-version submission, and forward navigation into the next version pass.
- Regression command: `npx playwright test e2e/mobile.spec.ts`.
- Live verification: Android Chromium against the running app displayed `Wednesday — Lower & Power · 2026-09-09` after upward wheel input from Friday. Clicking selected 2026-09-09 with four exercise groups; no live results were submitted.
- Final checks: 14 mobile browser tests, 13 unit/API tests, production build, and `git diff --check` passed.
