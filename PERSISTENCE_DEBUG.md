# Current workout deletion persistence

- Status: Fixed by the reload regression test.
- Smallest repro: Load a saved two-exercise workout, remove one set and one exercise, submit, then reload.
- Exact probe: `npm run test:e2e -- --grep "mobile workout editor"`
- Expected: The removed set and exercise stay absent after reload.
- Observed before fix: Current week reconstructed deleted items from the routine definition. The first set-count probe was invalid because it re-added the set before submission; the corrected probe removes it again before submitting.
- Confirmed cause: Saved workouts were initialized with the routine's complete exercise list and configured set minimum instead of the exact submitted rows.
- Accepted fix: Initialize exact saved rows when a session exists, while retaining routine defaults for a new session.
- Observed result: The target reload case passes; full regression commands are `npm test`, `npm run build`, and `npm run test:e2e`.
