# Independent product verification 5 — FAIL

- Work order: `scan-archive-receipt-verify-5`
- Verified: 2026-08-28 UTC
- Candidate: `9c1565671e5317bfad8144bd2ea12acb26e26341`
- Live URL: <https://scan-archive-receipt.sociobot.in>
- Artifact: static offline PWA
- Product code changed during verification: no

## Decision

**FAIL.** The candidate cannot be released under the supplied acceptance contract because its declared claim tests do not run from a clean clone.

## Release blocker

### S0 — every required claim command fails before the production artifact exists

The required first action was performed at a clean checkout of the exact candidate:

```text
HEAD 9c1565671e5317bfad8144bd2ea12acb26e26341
git status --short  # empty
npm ci
```

`.factory/claims.json` exists and declares 13 claims. Each exact `test` command was then invoked individually before any build. All 13 failed (the first is in `/tmp/scan-archive-claims/local-only.log`; the remaining status/log pairs are in `/tmp/scan-archive-claims/`). The commands run `playwright test`, whose `webServer` runs only `npm run preview`. In a clean clone there is no `dist/` directory, so that preview server returns HTTP 404 for `/demo` and every locator/service-worker wait times out after 30 seconds.

Representative exact failure:

```text
Error: locator.fill: Test timeout of 30000ms exceeded.
waiting for locator('.scan-row').first().getByLabel('Item notes')
```

Directly during the failing run, `ls dist` returned `No such file or directory` and `curl http://127.0.0.1:4173/demo` returned `HTTP/1.1 404 Not Found`.

This is not a claim of a functional failure after a build: after the required production build, the combined 13 claim tests pass. It is nevertheless a release blocker because the contract explicitly requires every listed claim test to run from the clean clone/demo entry point, and says any failing claim test rejects the candidate. The listed commands must themselves create a runnable production artifact (for example, build in the Playwright web-server command or an explicit claim-test script), then be reverified from a fresh clone.

## First-read result — PASS

Cold live Chromium at 1440×900, new context, showed:

- What it does: “Build a receipt for every family scan.” It describes ordered filenames, source notes, and checksums.
- For whom: “For family historians … without a spreadsheet.”
- What to click first: visible **Try it with sample data**, followed by “The sample opens a ready-to-review three-scan receipt.”

The first screen answers all three in plain words and has the required one-click sample entry. The normal cold load made only same-origin requests for the document, CSS, JS, and hero image; it produced no console or page errors.

## Evidence that passed after the artifact was built

### Local gates and claim behavior

- `npm ci`: completed; 0 install vulnerabilities.
- `npm audit --omit=dev` and `npm audit`: 0 vulnerabilities.
- `npm test`: 8/8 passed.
- `npm run typecheck` and `npm run lint`: passed.
- Exact `npm run build`: passed and created `dist/index.html`.
- `npm run test:e2e`: 31/31 passed.
- After that build, `npm run test:e2e -- --grep @claim:`: all 13 declared claim tests passed.

The passing post-build claim run covers the sample demo, local-only request log, original-byte SHA-256, five input formats, UTF-8 CSV/self-contained HTML/restorable JSON, real IndexedDB persistence and complete clear, metadata/reorder filenames, scope boundaries, free exports/$12 Plus, demo isolation, offline reload, and token-only license verification.

### Live deployment identity and end-to-end behavior

- The exact production build was compared with the live origin: **18/18 deployable files matched SHA-256**, 0 mismatches (`staticwebapp.config.json` is deployment-only and excluded).
- `PLAYWRIGHT_BASE_URL=https://scan-archive-receipt.sociobot.in npm run test:e2e`: 31/31 passed, including representative normal import/export, 100-image boundary import, invalid JSON restore recovery, immediate persistence/removal, clear, responsive checks, offline reload, and service-worker update toast.
- A fresh live `/demo` sample had three rows. Editing its note and exporting CSV made only same-origin HTTP requests plus browser-local `blob:` preview URLs; there were no console/page errors.
- Fresh live offline test: after service-worker readiness, offline reload of `/demo` returned 200 from cache, retained all three rows, showed the offline notice, and reported cache `scan-receipt-shell-v4`.
- The live root, `/demo`, `/privacy`, and `/terms` return 200; a missing route returns 404. The manifest has the correct MIME and `sw.js` is `no-cache, no-store, must-revalidate`; hashed JS is immutable for one year.

### Accessibility, mobile, privacy, and performance

- Live axe on populated 390×844 demo: 0 serious/critical findings. Document/body widths were both 390 px; all visible interactive targets were at least 44×44 px. The live suite also passed its keyboard skip-link/focus and route accessibility coverage.
- With `prefers-reduced-motion: reduce`, scroll behavior was `auto`; transition and animation duration were `0.00001s`.
- Live headers include strict CSP (`connect-src 'self' https://api.sociobot.in`), HSTS, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, nosniff, strict-origin referrer policy, and a restrictive Permissions-Policy.
- Build payloads: JS 33,781 bytes raw / 11,903 bytes gzip; CSS 15,183 bytes raw / 4,103 bytes gzip; no fonts; mobile hero 11,590 bytes. These are within the stated static/PWA budgets.
- No sign-in is present, so Entra External ID validation is not applicable.

### Billing endpoint allowance

The only server-side product call is Sociobot license verification. With one fresh invalid QA token from this client, requests 1–30 returned 200; request 31 and requests 32–35 returned **429** with `Retry-After: 2`. Observed allowance: **30 requests per client/window**. This satisfies the documented rate-limit requirement.

## Required repair and recheck

1. Make every command named in `.factory/claims.json` runnable from a fresh clone without relying on a pre-existing `dist/` directory. Do not merely document a preceding build; the supplied claim command must provision its demo entry point.
2. Re-run the 13 exact declared commands immediately after `npm ci` in a fresh clone. They must all pass before a release can be accepted.

No other release-blocking product defect was found in this verification.
