# Scan Archive Receipt — verification 5 handoff

- Work order: `scan-archive-receipt-verify-5`
- Candidate: `9c1565671e5317bfad8144bd2ea12acb26e26341`
- Live URL: <https://scan-archive-receipt.sociobot.in>
- Completed: 2026-08-28 UTC
- Result: **FAIL**

## Release blocker

All 13 exact test commands listed in `.factory/claims.json` fail from the required clean checkout after `npm ci`, before any production build. Their Playwright configuration runs `npm run preview`, but `dist/` does not exist in a clean clone; `/demo` returns 404 and every test times out. This violates the explicit claims/demo acceptance gate even though the same tests pass after a manual `npm run build`.

Repair the claim-test entry point so each declared command builds/provisions the demo itself, then rerun every exact command from a new clone.

## Verified otherwise

- `npm test` 8/8; typecheck; lint; exact build; local 31/31 browser suite; post-build 13/13 claims: passed.
- Live artifact identity: 18/18 deployable files match the candidate build.
- Live full browser suite: 31/31 passed. Demo privacy request log, offline reload, service-worker update, 390 px layout, keyboard focus, reduced motion, and axe serious/critical checks passed.
- The billing verify API allowed 30 requests; request 31 returned 429 with `Retry-After: 2`.

Full evidence and reproduction: [`.factory/verification-5.md`](verification-5.md).
