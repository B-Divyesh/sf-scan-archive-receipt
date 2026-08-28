# Independent product verification — FAIL

Work order: `scan-archive-receipt-verify-1`  
Verified: 2026-08-28 UTC  
Candidate: `c4d247e8abe23887965f9324fb8bf2c75e05b73c`  
Live URL: <https://scan-archive-receipt.sociobot.in>  
Artifact: static offline PWA

## Decision

**FAIL.** The candidate is not releasable under the brief and factory definition of done. The free happy path is useful and fast, and the live artifact is byte-for-byte the candidate build, but four acceptance-critical areas fail: the advertised checkout is not registered, malformed backup input can persistently blank the app, a populated batch is broken at the required 390 px mobile width, and the repository's required PWA offline test is nondeterministically failing. There is also a local-data deletion defect after restore.

No product code was changed during verification.

## Release-blocking defects

### S1 / Major — live “Buy Plus” action is a dead checkout

- Reproduction: request the exact link rendered by the live app, `GET https://api.sociobot.in/api/v1/products/scan-archive-receipt/checkout`.
- Actual: HTTP 404, body `{"error":"enabled factory product","status":404}`.
- Expected: redirect to the hosted Sociobot checkout for the advertised `$12 once` unlock.
- Scope: deployment/product registration. Candidate code uses the required Sociobot URL; the external product is not enabled. The invalid-license verification endpoint is operational (`200`, `{"expires_at":null,"reason":"invalid","valid":false}`) and supplies the correct live-origin CORS header, isolating the failure to checkout/product enablement.

### S1 / Major — minimally malformed project backup permanently blanks subsequent launches

- Reproduction from a fresh context: use “Restore project” with `{"id":"looks-valid","items":[]}`. The app initially says the file is invalid; reload the page.
- Actual: `#app` has zero text and the page raises `Cannot read properties of undefined (reading 'replace')` on every subsequent launch because the invalid record was saved to IndexedDB before rendering failed.
- Expected: validate the complete schema and blob payload before changing or persisting the current project; an invalid import must leave the usable project intact.
- Recovery currently requires clearing site data/IndexedDB outside the product UI.

### S1 / Major — populated workspace overflows and hides the scan editor at 390 px

- Reproduction: at a 390×844 viewport, import one PNG and scroll to “Scan order.”
- Actual: viewport `innerWidth=390`, document/body `scrollWidth=633`. The scan row ends at x=633 and is 617 px wide; its preview and fields are 580 px wide. The supplied mobile screenshot shows a large blank/cropped scan block, with the editor content offscreen.
- Expected: intentional single-column mobile editing with no horizontal overflow.
- The empty mobile state is 390 px wide, which explains why the builder's empty-state-only mobile assertion passed.

### S1 / Major — required local offline PWA gate is flaky and failed from the clean checkout

- Exact `npm run test:e2e`: **2 passed, 1 failed**. The failing repository test was `reopens the app shell while offline`; after reload only the static skip link remained and no `h1` was rendered.
- Repeating that repository test three times: **1 passed, 2 failed**.
- An eight-context diagnostic waited for the service worker controller and `html[data-offline-ready="true"]`, confirmed `/`, the JS, CSS, hero, manifest, icons, index, and offline page were present in `scan-receipt-shell-v2`, then immediately disabled networking and reloaded. **3/8 succeeded and 5/8 failed**. Failed requests were the hashed JS and/or CSS with `net::ERR_FAILED`; `#app` remained empty.
- The live deployment succeeded in the same immediate-offline sequence **5/5** times. This does not repair the required local quality-gate failure or establish reliable offline behavior across timing/network conditions.
- Service-worker update behavior itself passed: a changed worker activated and the in-app update toast became visible.

### S1 / Major — “Clear batch” can retain and resurrect a prior private scan copy

- Reproduction: import a scan, back up the project, restore that backup over the active project, then accept “Clear batch” and reload.
- Actual: restore leaves two batch records in IndexedDB. Clear deletes only the restored record; after reload, the original record and `private-original.png` reappear. Observed IndexedDB count before clear: 2.
- Expected: the UI promise “Clear the stored batch and all local scan copies” must remove all product-retained copies that are not otherwise reachable/manageable.
- This is a privacy/data-control defect because the user is explicitly told the local copy was cleared.

## Other defects and risks

### S2 / Moderate — keyboard focus and target sizing do not meet the attached accessibility contract

- The “Restore project” file input is keyboard-focusable but `opacity: 0`; measured focused box was 27.59×44 px and its visible parent had `outline: none`. The input's own focus outline is also transparent due to its opacity, so keyboard users lose visible focus on this action.
- Several interactive targets are under 44 px high: header Privacy/Terms links measured 15 px, footer Privacy/Terms 16 px, brand link 32 px, and checksum summary 19.83 px.
- Positive evidence: the skip link works with Tab/Enter and has a visible 3 px outline; native controls otherwise have visible focus.

### S2 / Moderate — production response policy/caching is incomplete

- All inspected live responses include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and `X-DNS-Prefetch-Control: off`.
- No `Content-Security-Policy`, `Permissions-Policy`, or anti-framing policy (`frame-ancestors`/`X-Frame-Options`) is present.
- Every asset, including content-hashed JS/CSS and images, is served as `Cache-Control: public, must-revalidate, max-age=30`; hashed assets are not long-lived/immutable as required by the performance contract. HTML and service-worker revalidation at 30 seconds is reasonable.
- The manifest is served as `application/octet-stream`, although Chromium parsed it without errors and reported no installability errors.

### S3 / Minor — success feedback can be overwritten and form constraints are inert

- After editing batch fields and immediately importing 100 scans, the final status read “Changes saved on this device.” rather than the import/checksum completion message because an older delayed save announcement won the race.
- `required` and `pattern` are present on batch title/prefix, but the form is never submitted or explicitly validated; invalid/empty values receive no announced validation/recovery guidance.

### S3 / Tooling — development dependencies have known advisories

- `npm audit --omit=dev`: 0 vulnerabilities.
- Full `npm audit`: 2 development-only vulnerabilities (1 high in Vite 7.1.3 and 1 critical in Vitest 3.2.4). The cited cases concern development/UI servers rather than shipped runtime code, but the pinned tooling should be upgraded.

## What passed

### Clean checkout, install, tests, and build

- Initial tree was clean and `HEAD == origin/main == c4d247e8abe23887965f9324fb8bf2c75e05b73c`.
- `npm ci`: completed from the lockfile; 61 packages installed.
- `npm test`: **5/5 passed** in one test file.
- No lint script exists. Type checking is part of the production build.
- Exact `npm run build` (`tsc -b && vite build`): passed and produced `dist/`.
- `npm run test:e2e`: failed as detailed above, so the quality gate does not pass overall.

### Core job-to-be-done

- Imported and SHA-256 hashed 100 representative PNG scans in **551 ms** in the successful stress run, well within the 20-minute target.
- Verified 100/100 completeness, four-digit stable filenames through `nair-family-2026-0100.png`, reordering and renumbering, and refresh persistence.
- Source SHA-256 was `5033bf9ae92ad5665b3b6340057590309736a4fa4fc183018ff3553f8d775d97`; receipts preserved it.
- Exercised Unicode, punctuation, quotes, commas, newlines, and HTML-like notes (`Müller 家族`, `café`, and a script-shaped string).
- CSV: UTF-8 BOM, CRLF rows, 100 data rows, correct quote escaping; 26,208 bytes.
- Contact sheet: 100 self-contained cards, 648,316 bytes, metadata escaped rather than executed.
- JSON backup: 100 items with original bytes embedded as data URLs; a valid backup restored successfully.
- Non-image input and syntactically invalid JSON were rejected with visible errors and recovery; the structural-validation failure is separately documented above.
- Scan bytes were stored locally in IndexedDB (observed one batch/one item with blob size exactly 3,541 bytes). Core import generated requests only to the app origin. Static inspection found no analytics, tracking, CDN script, external font, or scan upload path. The only external runtime API is the specified Sociobot license API.
- License return handling passed with the API stubbed: token stored under `sb_license:scan-archive-receipt`, token stripped from the address bar, one correct verification request made, and custom recipes unlocked. The real API invalid-token path also behaved correctly.
- Remove/clear confirmations, ordering controls, persistence, empty state, legal pages, and reduced-motion styling were exercised.

### Accessibility and responsive checks

- Playwright axe found **0 serious/critical findings** on empty desktop, populated desktop, populated 390 px mobile, `/privacy`, and `/terms`.
- Factory `verify-url.sh` passed locally and live: HTTP 200, title present, `lang=en`, exactly one `h1`, main landmark, zero missing image alts, zero unlabeled buttons, and zero console/page errors. Reported load was 712 ms local and 731 ms live.
- `prefers-reduced-motion: reduce` produced `scroll-behavior: auto` and 0.01 ms animation/transition durations.
- The empty page has no horizontal overflow at 390 px. The populated-state failure is documented above.

### PWA and live identity

- Chromium parsed the manifest locally and live with no manifest or installability errors. It has standalone display, a versioned start URL, matching colors, and valid 192/512 PNG icons; the 512 icon is maskable.
- Service-worker shell versioning, cache contents, update activation, update toast, and offline banner were inspected.
- Every one of the 15 files in the fresh local `dist/` matched the live URL byte-for-byte by SHA-256, including HTML, hashed JS/CSS, service worker, manifest, offline page, icons, and hero variants. The live deployment therefore matches the candidate.
- Live initial load made requests only to `https://scan-archive-receipt.sociobot.in`; no console/page errors were observed.

### Performance and budgets

- Production output: JS 24,760 bytes raw / 9.44 kB gzip; CSS 11,778 bytes raw / 3.34 kB gzip; no fonts. These pass the 200 kB JS, 50 kB CSS, and 120 kB font budgets.
- Responsive hero selection passed: 390 px uses the 11,590-byte 480 WebP; 1440 px uses the 43,432-byte 960 WebP. Both are below the 300 kB hero budget.
- Lighthouse 12.8.2 mobile, live: **Performance 99, Accessibility 100, Best Practices 100, SEO 100**; FCP 0.8 s, LCP 1.1 s, TBT 150 ms, CLS 0, total transfer 57 KiB.
- Lighthouse 12.8.2 mobile, local production preview: **92/100/100/100**; FCP 1.0 s, LCP 1.2 s, TBT 350 ms, CLS 0, total transfer 62 KiB.
- Lighthouse flagged image-delivery/right-sizing opportunities but all contractual size and score thresholds pass. INP was not available from this lab run; max potential FID was 190 ms live.

## Reproduction commands

```sh
git checkout c4d247e8abe23887965f9324fb8bf2c75e05b73c
npm ci
npm test
npm run build
npm run test:e2e
npx playwright test tests/app.spec.ts:40 --repeat-each=3 --workers=1
npm audit --omit=dev
npm audit
```

Lighthouse used version 12.8.2 and the preinstalled Playwright Chromium. Additional verifier-only Playwright scenarios were run from temporary test files and removed before commit; they did not alter product code.

## Required next steps

1. Register/enable the live Sociobot product and prove the checkout redirect plus return-license flow.
2. Fully schema-validate backup JSON and all item/blob fields before persistence; keep the prior project usable after any failure.
3. Fix populated mobile containment/width at 390 px and add a populated mobile regression test.
4. Make the service-worker readiness signal and immediate offline reload deterministic; require repeated clean-context passes.
5. Make project restore replace/delete the prior record or provide explicit project management; ensure “Clear batch” removes every promised local copy.
6. Add visible focus for the restore control, enlarge interactive targets, and tighten response policies/immutable asset caching.

