# Verify Scan Archive Receipt — PASS

- Work order: `scan-archive-receipt-verify-6`
- Verified: 2026-09-06 UTC
- Implementation reviewed: `591ddd7fcdb29c281edfc9c90888ad2dd14e2532`
- Documentation baseline: `65f6793aefb04232ce02e2aca7298ec64507074c`
- Live URL: <https://scan-archive-receipt.sociobot.in>
- Product code changed during verification: no

## Verdict

**PASS.** There are zero findings at every severity and zero untested public claims.

## First screen

Fresh desktop (1440 × 900) and phone (390 × 844) contexts both opened at scroll position 0 with no console or page errors.

- Job: “Build a receipt for every family scan.”
- Audience: family historians who need ordered filenames, source notes, and checksums without a spreadsheet.
- First action: **Try it with sample data**. Its nearby explanation says that it opens a ready-to-review three-scan receipt.

The phone page had viewport, document, and body widths of 390 px. Visual inspection found no clipped first-screen content or horizontal scrolling.

## Clean checkout and declared claims

A fresh detached clone at the implementation commit started with no `dist/` directory. `npm ci` completed with no install vulnerabilities. Every exact command in `.factory/claims.json` was run individually before any manual build; all passed and each built its own production preview.

| Claim | Result |
| --- | --- |
| `local-only` | PASS |
| `original-integrity` | PASS |
| `offline-reload` | PASS |
| `sha256` | PASS |
| `three-exports` | PASS |
| `indexeddb-persistence` | PASS |
| `clear-batch` | PASS |
| `free-core-plus-price` | PASS |
| `supported-formats` | PASS |
| `demo-isolation` | PASS |
| `metadata-receipt` | PASS |
| `scope-boundaries` | PASS |
| `license-network` | PASS |

The claim registry has 13 entries and the browser suite contains one matching `@claim:` test for each. Landing-page, legal-page, and README promises were cross-checked against that registry; no unlisted public claim was found.

## Local quality checks

- `npm audit --omit=dev` and `npm audit`: 0 vulnerabilities.
- `npm test`: 9/9 passed, including the clean-artifact preflight.
- `npm run typecheck`, `npm run lint`, and `npm run build`: passed.
- `npm run test:e2e`: 31/31 passed.
- Build output has `dist/index.html`. JavaScript is 33.82 kB raw / 12.05 kB gzip; CSS is 15.18 kB raw / 4.08 kB gzip; no fonts are shipped.

## Live workflow and demo

`PLAYWRIGHT_BASE_URL=https://scan-archive-receipt.sociobot.in npm run test:e2e` passed 31/31 tests.

The direct `/demo` check showed three populated Nair family-album records, provenance fields, padded names, checksums, the persistent “Demo — sample data, nothing is saved” label, and the reset and real-start controls. Editing a sample source and selecting **Reset demo** restored “Green family album.” No `demo:` IndexedDB database was created. The live suite also created a real batch before entering demo, then confirmed the real batch remained unchanged after leaving demo.

The live checks exercised normal import and export, 100-image order boundary, five supported extensions, invalid non-image input, malformed JSON recovery, storage failure recovery, immediate-edit reload persistence, removal, restore replacement, complete clear, license-return states, keyboard controls, offline reload, and service-worker update notification. An invalid filename prefix safely normalised the generated name to `scan-0001.png`; it did not create an unsafe filename or lose the batch.

## Accessibility, privacy, PWA, routes, and links

- The browser suite uses Playwright Axe and found no serious or critical violations on desktop, populated phone, demo, privacy, terms, and 404 states.
- `/opt/fleet/lib/verify-url.sh` passed live: HTTP 200, title, `lang=en`, one h1, main landmark, all image alt attributes, labelled buttons, and no console/page errors. Its measured initial load was 575 ms.
- Keyboard testing put focus first on the skip link; it had a 3 px amber focus ring and a 198.6 × 47.2 px target. Phone controls and legal/footer links passed the 44 px target tests. With reduced motion, live CSS used `scroll-behavior: auto` and 0.01 ms transition/animation durations.
- The local-only claim recorded the full demo edit/export flow and observed only product-origin requests. Static inspection found no tracker, analytics, external font, or scan-upload path. The only runtime external request is the documented Sociobot license API, limited by CSP.
- Offline reload of the sample and CSV export passed after service-worker readiness. The update test displayed “New version ready. Reload.”
- `/`, `/demo`, `/privacy`, `/terms`, `robots.txt`, `sitemap.xml`, the manifest, and `sw.js` returned 200. `/missing-receipt` deliberately returned the designed 404 page with its own title. Route-specific titles passed. All ordinary anchor destinations returned 200; the 404 page’s own skip-link correctly retains its 404 response, and mailto/checkout are intentional external targets.
- Responses include CSP with `frame-ancestors 'none'`, Permissions-Policy, X-Frame-Options, nosniff, HSTS, and strict-origin referrer policy. Hashed JS/CSS are immutable for one year; `sw.js` is no-store.

## Live identity and request allowance

Fresh local production output was compared with live HTTPS. All 18 deployable artifacts matched byte-for-byte by SHA-256. `staticwebapp.config.json` is deployment configuration and was excluded from the served-artifact comparison.

The live checkout endpoint returned its expected redirect to the hosted Sociobot checkout. A fresh invalid-license allowance check accepted requests 1–30 and returned HTTP 429 with `Retry-After: 3` on request 31; requests 32–35 also returned 429. This static PWA has no product backend, tenant, health, or restart surface, so those backend-only checks are not applicable.

## Earlier findings

| Earlier finding | Current disposition and evidence |
| --- | --- |
| Checkout unavailable; license rate limit absent | Checkout now redirects to hosted checkout. Verification allowance is 30 requests, then 429 with Retry-After. |
| Cached verdict could apply to another license; inactive license had no notice | Live 31-test suite passed both cached-false/new-valid and cached-true/new-invalid return paths, plus the inactive notice and temporary-429 path. |
| Malformed restore blanked the app; clear could resurrect data | Live suite passed malformed-backup recovery, legacy record recovery, restore replacement, clear, reload, and empty IndexedDB checks. |
| Edits/removals could be lost; storage failure claimed success | Live suite passed immediate persistence/removal and the storage-failure recovery check. |
| Populated mobile overflow; small or invisible targets | Live 390 px populated, route, keyboard, and touch-target checks all passed; no horizontal overflow was measured. |
| Offline reload was flaky; update feedback missing | Local and live offline reload tests passed, and the update toast test passed. |
| Missing claim registry/demo; clean claim commands needed an existing build | Registry has 13 demo-backed claims. Each exact command passed from a clean clone before a manual build. |
| Missing route metadata, legal titles, 404, footer, required sections, and copy audit | Live tests passed metadata, route titles, designed 404, footer identity, and required sections; `.factory/copy-audit.md` is present. |
| Header policy/caching gaps | Live headers and immutable asset caching are present as recorded above. |
| Status races and inert filename validation | Persistence feedback now waits for storage; an invalid prefix normalizes to a safe fallback filename and survives reload without blanking the app. |

## Evidence location

Temporary clean-checkout claim logs were retained under `/tmp/scan-archive-receipt-verify6-claims/` for this worker session. Desktop, phone, and demo screenshots were captured during verification. This report is copied to `/work/.evidence/qa-report.md`; the machine-readable result is `/work/.evidence/qa-result.json`.
