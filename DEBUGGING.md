# Debugging

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
