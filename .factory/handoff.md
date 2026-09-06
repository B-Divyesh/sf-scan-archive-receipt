# Scan Archive Receipt — repair 4 handoff

- Work order: `scan-archive-receipt-repair-4`
- Implementation SHA: `591ddd7fcdb29c281edfc9c90888ad2dd14e2532`
- Previous verification record: `beeed9c5a0904de490effd74bdfa1ded0a96ea6f`
- Live URL: <https://scan-archive-receipt.sociobot.in>
- Released: 2026-09-06 UTC
- Result: **PASS**

## Fixed

- Every declared claim command now builds the production artifact before starting Vite preview. A clean checkout no longer needs a prior `npm run build`; `/demo` is available to each claim command.
- Added an outcome-based preflight regression. It removes `dist/`, runs the declared scope-boundaries claim command, and proves that the command produces `dist/index.html`.
- Fixed a newly observed immediate-reload persistence race. The first edit now starts its IndexedDB write in the input event instead of waiting for a deferred Promise continuation. The immediate-refresh claim passed 10 consecutive runs after the change.
- Added the verb-first catalog description and documented that direct claim commands work after `npm ci`.

## Verification

Fresh detached checkout at the implementation SHA:

- `npm ci`; `npm audit --omit=dev`; `npm audit`: passed, 0 vulnerabilities.
- All 13 exact commands declared in `.factory/claims.json` were run individually before a manual build: 13/13 passed.
- `npm test`: 9/9 passed, including the clean-artifact preflight regression.
- `npm run typecheck`, `npm run lint`, and `npm run build`: passed. Build output has root `dist/index.html`; JS is 33.82 kB raw / 12.05 kB gzip and CSS is 15.18 kB raw / 4.08 kB gzip.
- `npm run test:e2e`: 31/31 passed.
- `/opt/fleet/lib/verify-url.sh` passed locally and live: HTTP 200, title, `lang=en`, one h1, main landmark, image alt text, and no console/page errors. Playwright axe checks in the browser suite found no serious or critical issues.
- Fresh live desktop and 390 px phone contexts began at scroll position 0 with the job (“Build a receipt for every family scan”), audience (family historians), and visible first action (“Try it with sample data”). The phone page had no horizontal overflow. Visual inspection confirmed both first screens.
- The live 31/31 browser suite passed, including one-click sample data, persistent demo label, reset, real-data isolation, exports, offline reload, keyboard/focus, reduced motion, legal routes, 404, and the accessibility checks.
- All 18 deployable build artifacts matched the live HTTPS origin by SHA-256.
- Live license verification allowed requests 1–30 and returned request 31 as HTTP 429 with `Retry-After: 3`.

## Deployment

Deployed the verified static `dist/` through the existing `sf-scan-archive-receipt` static app. The durable Static Web Apps configuration in `public/staticwebapp.config.json` was retained. The live origin now serves `assets/index-D_445wqx.js`, which is the implementation build.

## Known gaps and next steps

No product defects remain from the recorded verification history. Checkout and license verification are live factory dependencies and were verified without making a purchase. Continue normal release monitoring; no further application change is required.

## Independent verification 6

- Verification report: `.factory/verification-6.md`
- Implementation SHA reviewed: `591ddd7fcdb29c281edfc9c90888ad2dd14e2532`
- Documentation baseline reviewed: `65f6793aefb04232ce02e2aca7298ec64507074c`
- Result: **PASS** — zero findings and zero untested claims.

Fresh-clone verification ran all 13 declared claim commands individually before a manual build; all passed. `npm test` passed 9/9, `npm run typecheck`, `npm run lint`, and `npm run build` passed, and local plus live browser suites passed 31/31. Live desktop and 390 px phone first screens, one-click isolated demo/reset, real-data isolation, accessibility, reduced motion, routes/legal pages/404, privacy, offline reload/update, artifact identity, checkout redirect, and rate limiting were checked.

Live deployment matched 18/18 production artifacts. The license endpoint accepted 30 fresh invalid requests and returned 429 with Retry-After on request 31. Full evidence is in `.factory/verification-6.md` and copied to `/work/.evidence/qa-report.md`.

## Review 1

- Review report: `.factory/review-1.md`
- Implementation candidate: `591ddd7fcdb29c281edfc9c90888ad2dd14e2532`
- Documentation baseline: `024c24dc74575818a90c3a0b39a9ad2366c14407`
- Result: **PASS** — zero findings and zero untested public claims.

This review did not change product code. A fresh detached clone ran all 13 declared claim commands individually after `npm ci`, plus audit, unit, type, lint, build, and the 31-test browser suite. The live 31-test suite also passed. Fresh desktop and 390 px phone pages plainly showed the job, audience, and sample action. The isolated sample had three populated Nair records, its persistent label, working reset, and no effect on a real browser batch.

All 18 deployable artifacts from the reviewed build matched live by SHA-256. Direct live checks passed for routes, headers, URL verifier, checkout redirect, offline/update coverage, and the license allowance of 30 requests followed by HTTP 429 with `Retry-After: 3`. The standalone Axe CLI could not launch Selenium Chrome in this container; the live Playwright Axe integration in the repository passed all required routes, so no accessibility claim is untested.
