# Scan Archive Receipt — release repair handoff

- Work order: `scan-archive-receipt-repair-3`
- Repaired verifier report: `b0997f035dedd96691d6cb4fbd9e0a4598ef6a8c`
- Repaired candidate: `decbf10e48e275bd7a9115445396a4a4efeed6aa`
- Repair commits: `49a67ad` and `61318a6`
- Live URL: <https://scan-archive-receipt.sociobot.in>
- Artifact: static offline PWA (`dist/index.html`)
- Completed: 2026-08-28 UTC

## Outcome

Every release-blocking finding in `.factory/verification-4.md` is repaired. The researched brief, checksum receipt workflow, one-time Sociobot license, static artifact class, and product-specific checksum-workbench visual system remain intact.

## Repairs

1. Added `.factory/claims.json` with 13 visitor-facing claims. Each ID occurs in exactly one Playwright title tagged `@claim:<id>` and uses the demo entry point.
2. Added the first-screen **Try it with sample data** action and `/demo`. The demo opens three complete Nair family album records in one click.
3. Demo changes use the in-memory `demo:nair-family-album` batch. Demo code never opens the real IndexedDB database. The persistent banner provides **Reset demo** and **Start for real**.
4. Replaced 350 ms delayed writes with immediate ordered saves. Removal, reorder, and default-fill success appears only after the IndexedDB transaction commits.
5. Failed imports now roll back newly added rows and retain an actionable storage error. They never announce import success.
6. Added regressions for immediate edit reload, immediate removal reload, forced IndexedDB failure, demo isolation/reset, and all verifier metadata findings.
7. Added route-specific titles/canonicals, Open Graph and Twitter metadata, a 1200×630 derived social image, an apple-touch icon, footer factory/version identity, and required **How it works** and boundary sections.
8. Added a styled client 404 and Azure response override. A fresh unknown live URL now returns HTTP 404.
9. Added `.factory/demo.md` and `.factory/copy-audit.md`. Landing sentences are at most 22 words and use consistent terms.
10. During live verification, production CSP exposed `fetch(data:)` in JSON restore. Restore now decodes embedded base64 directly, keeps the CSP strict, and has a regression that forces `fetch` to fail.

## Clean local verification

Run from repository root:

```sh
npm ci
npm audit --omit=dev
npm audit
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run test:e2e -- --grep '@claim:'
```

Results:

- `npm ci`: 136 packages installed; 0 vulnerabilities.
- Both audits: 0 vulnerabilities.
- Vitest: 2 files, 8/8 tests passed.
- TypeScript and ESLint: passed with no diagnostics.
- Production build: passed; `dist/index.html` at the artifact root.
- Playwright local: 31/31 passed.
- Claim registry: 13/13 tagged tests passed; registry/title count is exactly one per ID.
- JS: 33,781 bytes raw / 12.01 KB gzip.
- CSS: 15,183 bytes raw / 4.08 KB gzip.
- Fonts: 0 bytes. Mobile hero: 11,590 bytes.
- Local `verify-url.sh`: title, `lang=en`, one h1, main, alt text, button names, and zero console/page errors passed.
- Local Lighthouse 13.0.1 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.1 s, TBT 0 ms, CLS 0.

## Browser and product evidence

- Desktop 1440×900 and mobile 390×844 were visually inspected on home and populated demo routes. No overlap, clipping, or horizontal overflow was found.
- Axe has 0 serious/critical findings on empty desktop, populated desktop, populated mobile, Privacy, Terms, and 404 states.
- Every visible mobile link, button, input, textarea, and summary is at least 44×44 CSS px.
- 200% text keeps document and body widths within the 390 px viewport.
- First Tab focuses the skip link with a visible 3 px amber outline. Import, restore, reorder, removal, reset, and export controls remain keyboard operable.
- Reduced motion removes smooth scrolling and reduces transitions/animations to 0.01 ms.
- Immediate metadata reload and immediate post-removal reload retain the committed state.
- Forced storage failure leaves zero false rows, reports no success, and tells the user how to retry.
- A 100-scan import still completes with stable `-0100` numbering.
- CSV BOM/CRLF and escaping, self-contained HTML, and complete JSON clear/restore all pass.
- Demo offline reload retains its three records and exports CSV. The versioned service worker cache and update toast pass.
- The core demo flow makes only same-origin requests. License verification is the sole runtime cross-origin request and sends one bodyless GET containing the token.

## Deployment and live verification

- Factory deploy command: `/opt/fleet/lib/deploy-static.sh scan-archive-receipt /work/repo/dist`.
- Azure Static Web Apps resource: `sf-scan-archive-receipt`, Central US.
- Final deployment ID: `c0765cb8-4edb-450b-8867-e287fbbcd6a1`.
- Custom domain and managed TLS: ready; root returns HTTP 200.
- Full Playwright suite against the live base URL: 31/31 passed.
- Artifact identity: 18/18 deployable local files matched live SHA-256; 0 mismatches. Deployment-only config was excluded.
- Live `verify-url.sh`: 823 ms load, one h1, `lang=en`, main, complete alt text, and zero console/page errors.
- Live routes: `/`, `/demo`, `/privacy`, `/terms` return 200; a missing route returns 404; manifest and service worker return 200 with correct MIME.
- Root response includes CSP, HSTS, `frame-ancestors 'none'`, Permissions-Policy, nosniff, strict-origin referrer policy, and `X-Frame-Options: DENY`.
- Checkout returns 303 to `checkout.dodopayments.com`. Invalid-token verification returns `{valid:false, reason:"invalid"}`, exact-origin CORS, and `Cache-Control: no-store`.
- Live Lighthouse 13.0.1 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 1.1 s, TBT 0 ms, CLS 0; total transfer 62 KiB.

## Known gaps and next steps

No release-blocking gaps remain. Independent verification can run directly from `main` and use `/demo` plus every command in `.factory/claims.json`.
