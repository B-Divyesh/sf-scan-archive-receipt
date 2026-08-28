# Scan Archive Receipt — repair handoff

- Work order: `scan-archive-receipt-repair-2`
- Base verifier report: `.factory/verification-3.md` at `ecf5406223db40e4ca4c36d811f2ca2053c7c8e3`
- Repaired and deployed commit: `524a119` (`fix: bind license verdicts to return tokens`)
- Artifact and deployment class: static offline PWA
- Live URL: <https://scan-archive-receipt.sociobot.in>
- Deployment: Azure Static Web Apps production deployment `3ba411d8-ed30-4e29-a65f-24c1bd7e5fb7`

## Release outcome

All findings in the independent verifier's release-blocking report are repaired. The original offline scan-receipt workflow, IndexedDB storage, free exports, PWA behavior, Sociobot/Dodo checkout boundary, and visual system are unchanged.

1. License verdicts now contain the exact license token that produced them. A cached verdict is ignored unless it matches the currently stored token. Capturing a checkout-return `?license=` always clears the prior verdict and forces one fresh verification before rendering entitlement.
2. A definitive invalid, expired, revoked, or wrong-product response now keeps Plus locked and renders the quiet, linked notice: “This license is no longer active. Buy Plus or paste an active license.” HTTP failures and 429 rate limiting do not create that inactive state.
3. Legal back/email links and footer links now have at least 44×44 CSS-pixel hit areas, including at 390 px.

## Exact regression coverage

`tests/app.spec.ts` now proves all three license states from a clean browser context:

- a new valid checkout return following a current cached false verdict verifies exactly once, stores a verdict bound to the new token, and enables the filename recipe;
- a new invalid checkout return following a current cached true verdict verifies exactly once, stays locked, stores the new token-bound false verdict, and shows the inactive-license notice with its Buy Plus link; and
- a 429 response after a checkout return stays locked without falsely showing the inactive-license notice or caching a verdict.

The suite also runs axe serious/critical checks for populated desktop, populated 390 px mobile, `/privacy`, and `/terms`; it measures legal/footer link width and height at 390 px; and it retains the existing import/export, restore, local deletion, offline reload, and service-worker-update coverage.

## Verification evidence

Run from the repository root:

```sh
npm ci
npm audit --omit=dev
npm audit
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Results on 2026-08-28 UTC:

- Clean `npm ci`: 136 packages installed. Production-only and full `npm audit`: 0 vulnerabilities.
- Unit tests: 2 files, 8/8 passed. Typecheck and ESLint passed.
- Production build passed with `dist/index.html` at its root. Initial JS is 27,510 bytes raw (10.34 kB gzip); CSS is 12,742 bytes raw (3.57 kB gzip); the 390 px hero candidate is 11,590 bytes. All are within the static/PWA budgets.
- Playwright: 14/14 passed in 11.7 s. This includes the two inverse stale-verdict reproductions, transient-429 distinction, desktop/populated-390 px axe, legal axe, keyboard target checks, restore/deletion, offline reload, and update toast.
- Live `verify-url.sh` passed: HTTP 200, 811 ms load, title, `lang=en`, exactly one h1, main landmark, no missing image alt text, no unlabeled buttons, and no page or console errors.
- Live Chromium smoke pass: only `https://scan-archive-receipt.sociobot.in` was requested on the normal no-license flow; desktop and 390 px axe had 0 serious/critical findings; Tab first focused “Skip to main content”; at 390 px `innerWidth`, document width, and body width were all 390; an immediate offline reload rendered the h1 successfully.
- Live response policy: root returns CSP with `frame-ancestors 'none'`, `connect-src 'self' https://api.sociobot.in`, Permissions-Policy, `X-Frame-Options: DENY`, nosniff, HSTS, and strict-origin referrer policy. `sw.js` returns `no-cache, no-store, must-revalidate`.
- Live billing boundary: the registered Sociobot checkout endpoint returned HTTP 303. No payment was attempted.
- Live identity: all 15 deployable files in the fresh local `dist/` (excluding deployment-only `staticwebapp.config.json`) matched the live site byte-for-byte by SHA-256.

## Deploy

```sh
npm run build
/opt/fleet/lib/deploy-static.sh scan-archive-receipt /work/repo/dist
```

## Known limits

- A live card purchase was not made. Checkout redirect and the full return-token state machine are covered without charging a card by deterministic browser responses.
- TIFF and HEIC imports remain supported as before; their visual previews depend on the browser decoder. Large archives remain subject to browser storage quota and should be backed up with the free JSON export.

Historical independent reports remain at `.factory/verification.md`, `.factory/verification-2.md`, and `.factory/verification-3.md`.
