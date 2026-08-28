# Scan Archive Receipt — verification addendum: FAIL

Candidate independently verified: `0a362aecd1374c773b2f7a6b67680924c2c51de4`

Live URL: <https://scan-archive-receipt.sociobot.in>
Verification report: `.factory/verification-2.md`

## Release decision: FAIL

The static PWA candidate passes its clean install, unit/e2e/type/lint/build gates and the deployed app matches the candidate. It **fails** the work-order release contract because the live server-side Sociobot license verification endpoint has no observed rate limit: 30 rapid requests (concurrency 10) and 120 rapid requests (concurrency 30) all returned HTTP 200, with no HTTP 429 and no `Retry-After` header. The observed threshold is greater than 120 requests in approximately eight seconds, or absent.

Severity: **S1 / Major**, because the required public API abuse control is missing. The required remediation is in factory/API infrastructure, not product source: rate-limit `GET /api/v1/products/scan-archive-receipt/verify`, return HTTP 429 with `Retry-After`, then re-run verification. No product code was changed by this verifier.

---

# Scan Archive Receipt — repair handoff

- Work order: `scan-archive-receipt-repair-1`
- Repaired from verifier report: `7e0938f604f09f5f447d6f8b95506f3f67544666`
- Failed candidate: `c4d247e8abe23887965f9324fb8bf2c75e05b73c`
- Deploy class: static offline PWA
- Live URL: <https://scan-archive-receipt.sociobot.in>

## Outcome

All five release-blocking findings were reproduced and repaired without changing the researched job-to-be-done, artifact class, visual thesis, free exports, or license-return behavior.

- Registered and enabled `Scan Archive Receipt Plus` as a live $12 USD one-time digital product in the existing Sociobot billing engine. The product URL now returns HTTP 303 to the hosted `checkout.dodopayments.com/session/...` checkout. No provider code or secret was added to this repository.
- Added complete project/scan schema, timestamp, checksum, order, duplicate-ID, base64 data-URL, decoded-blob, and byte-size validation. Restore now decodes and validates everything before changing app state or IndexedDB. The verifier's exact `{"id":"looks-valid","items":[]}` payload leaves the active batch untouched, and legacy malformed records are ignored on launch.
- Made restore an atomic clear-and-put transaction and made “Clear batch” clear the entire batches store. A restore-over-existing/clear/reload regression confirms the IndexedDB count goes `1 → 1 → 0` and no private copy returns.
- Added explicit min-width containment for scan list/grid descendants and safe wrapping for checksums/actions. A populated 390×844 browser regression now reports `innerWidth = document.scrollWidth = body.scrollWidth = 390` with the row and editor inside the viewport.
- Rebuilt the service worker around a versioned `scan-receipt-shell-v3` cache. Installation precaches and verifies the complete shell, fetches cache entries by stable pathname, and answers the app's offline-readiness handshake itself. Navigation/assets are cache-first with background navigation refresh. The update toast still appears for a newly installed worker.
- Made the restore file control's full 44 px surface focusable with a visible 3 px amber focus ring; enlarged brand, legal links, and checksum summary targets to 44 px.
- Added Azure Static Web Apps response policy: CSP with `frame-ancestors 'none'`, Permissions-Policy, X-Frame-Options, existing nosniff/referrer policy, correct manifest MIME, immutable one-year caching for hashed JS/CSS, and no-store for `sw.js`.
- Removed the delayed-save status race and upgraded Vite/Vitest to non-advisory versions. Added explicit TypeScript and ESLint gates.

## Exact regression coverage

`src/backup.test.ts` covers valid embedded-byte decoding, the verifier's minimally malformed backup, incomplete item fields, byte-size mismatch, and stored-batch validation.

`tests/app.spec.ts` covers:

- real import, metadata persistence, checksum, stable name, CSV and HTML exports;
- 100-image import and four-digit `-0100.png` numbering;
- returned-license storage, URL stripping, one verification call, and recipe unlock;
- populated desktop/mobile axe checks and exact 390 px containment;
- malformed restore preserving the current project across reload;
- safe launch with a legacy malformed IndexedDB record;
- restore replacement and complete clear verified by IndexedDB record count and reload;
- visible 44 px keyboard targets;
- immediate offline reload; and
- update-available toast for a newly installed worker.

## Verification evidence

Run from `/work/repo`:

```sh
npm ci
npm audit --omit=dev
npm audit
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npx playwright test tests/app.spec.ts:157 --repeat-each=12 --workers=1
```

Results on 2026-08-28 UTC:

- Clean `npm ci`: 136 packages installed; both production-only and full audit report 0 vulnerabilities.
- Unit: 2 files, 8/8 tests passed.
- TypeScript: passed. ESLint: passed.
- Production build: passed; `dist/index.html` at root. Initial JS 26,666 bytes raw / 10.07 kB gzip; CSS 12,627 bytes raw / 3.54 kB gzip; no fonts. All remain well below contract budgets.
- Playwright: 10/10 passed in 8.5 s, including desktop, populated 390 px mobile, keyboard/focus, privacy/data deletion, license, offline, and update paths.
- Repeated clean-context immediate-offline regression: 12/12 passed locally. Post-deploy clean-context offline reload: 5/5 passed live at 390×844.
- Live browser QA: 0 serious/critical axe findings on populated desktop and populated 390 px mobile; `/privacy` and `/terms` also had 0 serious/critical findings. No console or page errors. Initial load contacted only `https://scan-archive-receipt.sociobot.in`.
- Factory `verify-url.sh`, live: HTTP 200 in 644 ms; title present, `lang=en`, exactly one h1, main landmark, 0 missing image alts, 0 unlabeled buttons, 0 console/page errors.
- Lighthouse 13.0.1 mobile, local: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.1 s, TBT 0 ms, CLS 0.
- Lighthouse 13.0.1 mobile, live: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.0 s, TBT 0 ms, CLS 0, total transfer 62 KiB.
- Live response policy: CSP, Permissions-Policy, X-Frame-Options DENY, nosniff, and strict-origin referrer policy present. Hashed JS/CSS return `public, max-age=31536000, immutable`; `sw.js` returns `no-cache, no-store, must-revalidate`; the manifest is `application/manifest+json`.
- Live identity: all 15 deployed product files (excluding deployment-only `staticwebapp.config.json`) are byte-for-byte identical to the fresh local `dist/` by SHA-256.
- Live billing: three consecutive product checkout requests returned HTTP 303 to hosted Dodo checkout sessions. The invalid-license verification endpoint remains operational, and the browser regression proves return-token capture/strip/verify/unlock.

Deployment used the work-order configuration:

```sh
npm ci && npm test && npm run build
/opt/fleet/lib/deploy-static.sh scan-archive-receipt /work/repo/dist
```

## Known limitations / next steps

- No live card was charged during QA. Checkout creation/redirect is proven live; return-token behavior is deterministically covered with the Sociobot verification response stub so testing does not create a real purchase.
- TIFF and HEIC import/checksum remain supported, while preview depends on browser decoding support as before.
- Browser quota still varies; large archives should be split into album-sized batches and backed up with the JSON export.
