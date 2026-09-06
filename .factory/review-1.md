# Review 1 — Build a receipt for every family scan

- Work order: `scan-archive-receipt-review-1`
- Reviewed: 2026-09-06 UTC
- Implementation candidate: `591ddd7fcdb29c281edfc9c90888ad2dd14e2532`
- Documentation baseline: `024c24dc74575818a90c3a0b39a9ad2366c14407`
- Live URL: <https://scan-archive-receipt.sociobot.in>
- Product code changed during review: no

## Verdict

**PASS.** There are zero findings at every severity and zero untested public claims.

## Job, audience, and first action

Fresh, separate desktop (1440 × 900) and phone (390 × 844) browser contexts opened the live home page at scroll position zero. Both showed the job, audience, and first action before scrolling:

- Job: “Build a receipt for every family scan.”
- Audience: family historians who need ordered filenames, source notes, and checksums without a spreadsheet.
- First action: **Try it with sample data**. The adjacent explanation says it opens a ready-to-review three-scan receipt.

Both contexts had zero console/page errors. The phone document and body widths were both 390 px, with no horizontal overflow. Visual inspection of the fresh first screens found readable, unclipped copy and controls.

## Clean checkout and public claims

A detached fresh clone of `591ddd7` began without `dist/`. After `npm ci`, every exact command declared in `.factory/claims.json` was run separately. The first command itself produced `dist/index.html`; all 13 commands passed.

| Claim ID | Result |
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

The registry contains one matching `@claim:` browser test for each of its 13 entries. Landing, demo, legal-page, and README promises were compared with the registry; no unlisted public claim was found.

The clean clone also passed `npm audit --omit=dev`, `npm audit`, `npm test` (9/9), `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:e2e` (31/31). The production build has root `dist/index.html`, 33.82 kB raw / 12.05 kB gzip JavaScript, 15.18 kB raw / 4.08 kB gzip CSS, and no shipped fonts.

## Live product checks

`PLAYWRIGHT_BASE_URL=https://scan-archive-receipt.sociobot.in npm run test:e2e` passed 31/31. It covers normal import, provenance editing, SHA-256, CSV/contact-sheet/project exports, a 100-image boundary batch, supported types, invalid file input, malformed project recovery, legacy-record recovery, immediate persistence, removal, restore replacement, clear, license returns, keyboard targets, phone containment, reduced motion, offline reload, service-worker update feedback, legal routes, 404, and accessibility.

I also performed the one-click demo workflow in a fresh live phone context. After a real browser batch was created, **Try it with sample data** opened `/demo` with the persistent “Demo — sample data, nothing is saved” label and three populated Nair family-album records. The sample had the expected batch title and “Green family album” source. Editing a sample then selecting **Reset demo** restored that source. No `demo:` IndexedDB database was created. **Start for real** returned to the unchanged one-record real batch. The temporary browser context was then closed.

`/opt/fleet/lib/verify-url.sh` passed against the live root: HTTP 200, title, `lang=en`, one h1, main landmark, alt attributes, labelled buttons, and no console/page errors. Its measured load was 550 ms. The live Playwright suite uses Axe and passed serious/critical checks on desktop, populated phone, demo, privacy, terms, and 404 routes. The separate `@axe-core/cli` launcher could not start its Selenium Chrome session in this container; this is an environment-launcher limitation, not an untested accessibility result, because the same live pages passed the repository's Playwright Axe integration.

The live root, `/demo`, `/privacy`, `/terms`, `robots.txt`, `sitemap.xml`, manifest, and service worker returned 200. `/missing-receipt` deliberately returned the designed 404 page. Headers include CSP with `frame-ancestors 'none'`, Permissions-Policy, X-Frame-Options, nosniff, HSTS, and strict-origin referrer policy. Hashed JavaScript is immutable for one year; `sw.js` is no-store.

## Live implementation and factory API checks

All 18 deployable artifacts in the fresh production build matched the live HTTPS artifact byte-for-byte by SHA-256. `staticwebapp.config.json` is deployment configuration and was excluded. The live product therefore serves the reviewed implementation candidate rather than a later product image.

The checkout endpoint returned its expected HTTP 303 redirect to the hosted Sociobot checkout. A fresh invalid-license allowance check returned HTTP 200 for requests 1 through 30, then HTTP 429 with `Retry-After: 3` on request 31; requests through 35 remained limited. This static PWA has no product backend, tenant, restart, or health surface, so backend-only checks do not apply.

## Earlier findings and their current disposition

| Earlier finding | Current disposition |
| --- | --- |
| Checkout unavailable; no license rate limit | Checkout redirects; the fresh allowance test limited request 31 with `Retry-After`. |
| Cached license verdict could apply to another token; inactive state had no notice | Live 31-test suite passed both stale-verdict return paths, inactive notice, and temporary-429 path. |
| Malformed backup blanked the application; clear could revive data | Live suite passed malformed/legacy recovery, restore replacement, clear, reload, and empty-database checks. |
| Immediate edits/removals could be lost; storage failure claimed success | Live suite passed immediate persistence/removal and storage-failure recovery. |
| Populated phone layout overflowed; focus/links were too small | Fresh 390 px checks passed with no overflow; keyboard/focus and 44 px target tests passed. |
| Offline reload was flaky; update feedback was absent | Local and live offline reload tests passed; the update toast test passed. |
| Claim registry/demo were missing; clean claim commands required a prior build | The 13-entry registry and isolated demo exist; every exact command passed directly after clean `npm ci`. |
| Metadata, legal titles, 404, footer, required landing sections, and copy audit were missing | Route, title, 404, footer, required-section, and copy-audit regressions passed live. |
| Header and caching policy gaps | Current live headers and immutable asset policy passed direct inspection. |
| Status race and inert filename validation | Persistence feedback waits for storage; invalid prefixes safely normalise to `scan-0001.png` in the covered regression. |

## Evidence

- Fresh-clone claim logs: `/tmp/scan-archive-review1-*.log`
- Fresh desktop, phone, and populated-demo screenshots: `/tmp/scan-archive-review1-desktop.png`, `/tmp/scan-archive-review1-phone.png`, and `/tmp/scan-archive-review1-demo-phone.png`
- Prior authoritative verification: `.factory/verification-6.md`
