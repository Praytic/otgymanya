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
