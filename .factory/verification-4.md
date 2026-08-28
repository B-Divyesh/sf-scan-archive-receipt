# Independent product verification 4 — FAIL

- Work order: `scan-archive-receipt-verify-4`
- Verified: 2026-08-28 UTC
- Candidate: `decbf10e48e275bd7a9115445396a4a4efeed6aa`
- Live URL: <https://scan-archive-receipt.sociobot.in>
- Artifact: static offline PWA
- Product code changed during verification: no

## Decision

**FAIL.** The candidate is not releasable under the supplied acceptance contract.

Two mandatory preflight gates fail independently:

1. `.factory/claims.json` is missing, so there are no declared claim tests to run. The claims contract says a missing registry is release-blocking.
2. A cold first screen has no one-click **Try it with sample data** action and no demo sandbox. It describes the task, but does not plainly name the intended family historian/archivist. The demo contract says either failure rejects the candidate.

The underlying scan-receipt workflow, accessibility, offline shell, deployment identity, performance, response policy, checkout, and API rate limit otherwise passed. Independent recovery testing also found two data-durability defects not covered by the repository suite.

## Release-blocking findings

### Acceptance blocker — required claim registry and claim tests are absent

- Fresh checkout state at the start of verification: clean `HEAD` at the candidate commit.
- Exact result: `.factory/claims.json` does not exist.
- Therefore zero claim entries or `@claim:<id>` tests were available to execute through the required demo entry point.
- `npm test` and `npm run test:e2e` pass, but none of their tests is tagged as a declared claim and neither suite uses a demo entry point.

The live product and README make material claims which are consequently all unlisted and have no required sandbox evidence. These include:

- local-only operation; scans and metadata do not leave the device;
- originals are never altered and EXIF is not extracted;
- offline reload and “everything here still works” offline;
- SHA-256 checksum generation from original bytes;
- UTF-8 CSV, self-contained HTML contact sheet, and restorable JSON exports;
- IndexedDB persistence across refresh;
- complete local deletion through **Clear batch**;
- free core receipts/exports and a `$12 once` Plus license;
- JPG, PNG, WebP, TIFF, and HEIC import support.

Expected: every visitor-relevant claim appears once in `.factory/claims.json`, with exactly one observable `@claim:<id>` test running from isolated sample data.

### Acceptance blocker — first-read and one-click demo requirements fail

Cold live Chromium, new context, 1440×900:

- Headline: “Give every scan a durable trail.”
- Supporting copy: “Turn a folder of family scans into an ordered, checksum-verified receipt—without uploading a single photograph.”
- Primary action: **Start a scan batch**.
- Exact **Try it with sample data** matches: `0`.

What a cold visitor can infer: it turns family scans into an ordered checksum receipt; it is only implied to be for someone holding family scans; the first click is **Start a scan batch**. The screen does not plainly name the intended family historian/archivist and supplies no sample-data tryout.

Direct demo probes make the isolation failure explicit:

- `/demo` and `/?demo=1` render the ordinary app.
- Both had zero demo banner, zero **Reset demo**, and zero **Start for real** actions.
- After one real-origin scan was imported, both URLs showed that same stored scan. They read the production IndexedDB namespace rather than an isolated `demo:` namespace.
- `.factory/demo.md` is missing.

Expected: a visible first-screen sample action, realistic seeded data, persistent “Demo — sample data, nothing is saved” controls, direct demo URL, separate storage namespace, and `.factory/demo.md`.

### S1 / Major — announced edits and removals can be lost on immediate reload or tab close

Fresh local production build reproduction:

1. Import two scans and wait for the import to be saved.
2. Remove the first scan and accept the confirmation.
3. Observe “Scan removed from the local batch.” and one remaining row.
4. Reload immediately.

Actual: both rows return. A separate immediate reload after filling **Source item** also restored the old blank value.

Cause confirmed by inspection and behavior: edits, reorder, defaults, and removal use a 350 ms timer before IndexedDB persistence. The success message is rendered before that write occurs, and there is no flush on page hide/unload.

Expected: an action announced as complete is durable across immediate refresh/tab close, as required by the PWA persistence contract.

### S1 / Major — storage failure is overwritten by false import success

Fresh local production build with the IndexedDB open call forced to throw, modeling quota/storage unavailability:

1. Import `quota-test.png`.
2. The in-memory row appears.
3. Final live status says “1 scan imported and verified.”
4. Reload after storage is available again.

Actual: zero rows remain. The internal save failure is briefly handled, but `addFiles()` unconditionally renders and announces successful import afterward.

Expected: preserve the storage error, do not claim durable success, and offer a recovery action such as export/retry or removal of the unsaved row.

## Other contract findings

### S2 / Moderate — route, metadata, and copy-audit requirements are incomplete

- `/privacy` and `/terms` retain the home title instead of route-specific titles.
- An unknown route returns HTTP 200 and the home app; there is no designed 404 route.
- `index.html` has no canonical URL, Open Graph metadata, Twitter card, 1200×630 social image declaration, or apple-touch icon.
- The footer has no “Built by Param Factory” label or version/build id.
- The landing page has no explicit three-step **How it works** or non-goals/privacy section in the required information order.
- `.factory/copy-audit.md` is missing. The README opening paragraph's second sentence has 27 words, exceeding the plain-words 22-word hard cap.

These do not explain the claim/demo rejection, but they independently miss the attached site-structure and plain-words contracts.

## What passed

### Clean checkout and repository gates

- Initial `git status --short`: empty; `git rev-parse HEAD`: exact candidate.
- `npm ci`: 136 packages installed; 0 vulnerabilities reported during install.
- `npm audit --omit=dev`: 0 vulnerabilities.
- `npm audit`: 0 vulnerabilities.
- `npm test`: 2 files, **8/8 passed**.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Exact `npm run build` (`tsc -b && vite build`): passed and produced root `dist/index.html`.
- `npm run test:e2e`: **14/14 passed** in 16.6 seconds.
- The worker `verify-url.sh` passed locally (572 ms) and live (755 ms): title, `lang=en`, one h1, main landmark, alt text, button names, and no console/page errors.

### Smallest useful product and recovery paths

- A fresh 100-image batch imported and hashed in 531 ms.
- Import through CSV, HTML, and JSON export finished in 1.549 seconds, well inside the 20-minute target.
- UI reported `100/100 complete`; final stable filename was `archive-2026-08-28-0100.png`.
- CSV had a UTF-8 BOM, CRLF rows, 100 data records, and correctly doubled quotes in `Album "Bleu", été`.
- HTML had 100 contact cards and escaped script-shaped item notes; no script executed.
- JSON had 100 embedded image data URLs.
- A non-image input reported “No supported image files were selected” and left the two existing rows unchanged.
- Repository regressions passed for malformed backup rejection, safe restore, replacement of older records, complete clear, license states, mobile layout, offline reload, and update notification.

### Privacy and outbound traffic

- Normal live load/import flow requested only the product origin and ephemeral same-origin `blob:` previews.
- No analytics, tracker, third-party font/script, upload path, or EXIF parser exists in the source or runtime flow.
- License verification is the only runtime cross-origin request and is limited by CSP to `https://api.sociobot.in`.
- A real invalid-token return stored and stripped the token, made exactly one API request, kept Plus locked, and showed the required inactive-license notice.
- No sign-in exists, so Entra External ID validation is not applicable.

### Accessibility, keyboard, mobile, and errors

- Fresh live axe: **0 serious/critical** findings on empty desktop, populated desktop, populated 390×844 mobile, `/privacy`, and `/terms`.
- First Tab focused **Skip to main content** with a 3 px amber outline and a 198.6×47.2 px box.
- Import focus produced a visible 3 px outline; all rendered mobile interactive elements measured at least 44×44 CSS px.
- Populated mobile widths were viewport/document/body `390/390/390`; visual inspection found no cropping or overlap.
- Simulated 200% root text retained `390/390/390` widths.
- Reduced-motion matched, used `scroll-behavior: auto`, and reduced transition/animation duration to 0.01 ms.
- No page errors, console errors, or failed product HTTP responses occurred in the normal live flow.

### PWA and offline behavior

- Chromium parsed the live manifest with zero errors. It has standalone display, versioned `/?v=1` id/start URL, matching colors, 192/512 icons, and a maskable 512 icon.
- Live immediate offline reload passed **5/5** fresh contexts at 390 px.
- A populated project reloaded offline with its scan row and offline banner intact.
- Cache `scan-receipt-shell-v3` contained `/`, `/index.html`, offline fallback, manifest, icons, hero variants, and current hashed JS/CSS.
- Registering a changed worker produced the visible “New version ready. Reload” toast.

### Deployment identity, policies, links, and rate limiting

- SHA-256 comparison: all **15** deployable files in fresh local `dist/` matched the live files byte-for-byte. Deployment-only `staticwebapp.config.json` was excluded.
- Root response includes CSP with `frame-ancestors 'none'`, Permissions-Policy, `X-Frame-Options: DENY`, HSTS, nosniff, and strict-origin referrer policy.
- Hashed JS/CSS use `public, max-age=31536000, immutable`; `sw.js` uses `no-cache, no-store, must-revalidate`; manifest MIME is `application/manifest+json`.
- All internal links returned 200. Checkout returned 303 to hosted `checkout.dodopayments.com`; no card was charged.
- Fresh API sequence: 30 verification requests were accepted; the **31st** returned 429 with `Retry-After: 4`.
- A concurrent 90-request follow-up returned **90/90 HTTP 429**, all with `Retry-After: 4`.
- A later request with the live `Origin` header returned the exact-origin CORS value and `Cache-Control: no-store`.

### Performance and visual system

- Build JS: 27,510 bytes raw / 10.34 kB gzip.
- Build CSS: 12,742 bytes raw / 3.57 kB gzip.
- Fonts: 0 bytes. Mobile hero: 11,590 bytes. Largest hero: 84,706 bytes.
- Lighthouse 13.0.1 mobile, local production build: **Performance 99, Accessibility 100, Best Practices 100, SEO 100**; FCP 0.97 s, LCP 1.27 s, TBT 137 ms, CLS 0, transfer 64,354 bytes.
- Lighthouse 13.0.1 mobile, live: **Performance 100, Accessibility 100, Best Practices 100, SEO 100**; FCP 0.96 s, LCP 1.02 s, TBT 39 ms, CLS 0, transfer 60,676 bytes.
- `.factory/design.md` records the product-specific palette, typography, spacing, interaction grammar, reduced-motion policy, image prompt, model/date, and license. The shipped hero was visually inspected at source resolution; no text artifacts, brands, seams, or misleading capability imagery were found.

## Reproduction

```sh
git checkout decbf10e48e275bd7a9115445396a4a4efeed6aa
npm ci
npm audit --omit=dev
npm audit
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run preview
```

The two mandatory preflight failures need no subjective interpretation: add `.factory/claims.json` with demo-backed tagged tests, and implement/document the isolated one-click sample demo before requesting another release verification. Fix the two persistence/error-recovery defects and add regressions before claiming PWA durability.
