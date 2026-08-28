# Independent product verification — FAIL

Work order: `scan-archive-receipt-verify-2`

Verified: 2026-08-28 UTC

Candidate: `0a362aecd1374c773b2f7a6b67680924c2c51de4`

Live URL: <https://scan-archive-receipt.sociobot.in>
Artifact: offline PWA

## Decision

**FAIL.** The candidate's product code, build, PWA behaviour, accessibility, privacy model, and deployed artifact passed the checks below. It is nevertheless not releasable under this work order because its live server-side license verification endpoint has no observed rate limiting. This is an explicit acceptance requirement for every server-side endpoint, including the factory product-unlock call.

No product code was modified during verification. This report supersedes the repaired candidate's prior handoff only as release QA for this candidate.

## Release-blocking defect

### S1 / Major — live license-verification API does not rate limit

- Endpoint tested: `GET https://api.sociobot.in/api/v1/products/scan-archive-receipt/verify?license=<invalid-token>`.
- Baseline invalid token result: HTTP `200`, `{"expires_at":null,"reason":"invalid","valid":false}`, which is the expected functional response.
- Burst 1: 30 rapid requests at concurrency 10: **30 × HTTP 200**, no `Retry-After` header.
- Burst 2: 120 rapid requests at concurrency 30 (unique invalid tokens): **120 × HTTP 200**, no `429` and no `Retry-After` header. The observed threshold is therefore **greater than 120 requests in an approximately 8-second burst, or absent**.
- Expected: the burst must start returning HTTP `429` with a `Retry-After` header. This protects a public license-token validation endpoint against brute-force and resource-abuse traffic.
- Ownership: this is factory/API deployment infrastructure rather than a defect in the static product code, but the work order expressly includes it and the live product invokes this endpoint for license verification.

## What passed

### Clean candidate and quality gates

- Fresh checkout was clean and `HEAD == origin/main == 0a362aecd1374c773b2f7a6b67680924c2c51de4` before documentation was written.
- `npm ci` installed 136 packages successfully. `npm audit --omit=dev` and full `npm audit` both reported 0 vulnerabilities.
- `npm test`: 2 files, **8/8 passed**.
- `npm run typecheck`: passed. `npm run lint`: passed.
- Exact production build, `npm run build` (`tsc -b && vite build`): passed and produced `dist/`.
- `npm run test:e2e`: **10/10 passed** in 13.3 seconds, including the repository's 100-scan, populated mobile, restore validation, deletion, offline reload, and service-worker update regressions.
- Build sizes: JS 26,666 bytes raw / 10.07 kB gzip; CSS 12,627 bytes raw / 3.54 kB gzip; no font files. This is within the 200 kB JS, 50 kB CSS, and 120 kB font budgets. Responsive hero candidates are 11.6–84.7 kB, below the 300 kB mobile hero budget.

### End-to-end product behaviour

- Independently exercised the live desktop path: import a representative PNG, enter physical provenance, page/position, approximate date, descriptive rights note, and item note; SHA-256 was calculated; CSV and self-contained HTML contact-sheet downloads contained the entered fields/checksum.
- Boundary workflow: repository e2e imported 100 scans, retained all 100 rows, and produced the expected padded `-0100.png` stable name.
- Invalid/recovery paths: a text file was rejected with the visible message “No supported image files were selected.” Repository e2e also passed malformed JSON recovery, legacy malformed IndexedDB recovery, restore-over-existing replacement, and complete clear/reload deletion.
- Privacy: import traffic contacted only the product origin; static inspection found no analytics, tracker, external font/CDN, scan upload, or EXIF-reading code. Imported originals and metadata use IndexedDB; exports are local browser downloads. The only external runtime call is the documented Sociobot license API.
- Checkout is live: the product checkout endpoint returned HTTP `303` to `checkout.dodopayments.com`. Invalid-license verification returned the expected response. No purchase was made.

### Browser, accessibility, responsive, and PWA checks

- Fresh live browser check at desktop and populated 390×844 mobile: no console errors, page errors, or HTTP error responses; zero axe serious/critical findings in both states. `/privacy` and `/terms` also had zero serious/critical axe findings.
- At 390 px with a populated row, `innerWidth`, document scroll width, and body scroll width were all 390. Visual inspection showed intentional single-column editing with no clipped controls.
- Keyboard: the restore control was focused via keyboard; it measured 317.6×45.1 px and showed a visible `3px` amber focus ring. The repository keyboard-target regression passed. The skip link is present.
- Reduced-motion emulation produced `scroll-behavior: auto` and no active-button transform.
- The factory URL verifier passed live: HTTP 200, title, `lang=en`, exactly one h1, main landmark, 0 images missing alt text, 0 unlabeled buttons, 0 page/console errors; observed load was 1,172 ms.
- Live PWA: after service-worker readiness, an offline reload rendered the app shell and Offline notice. Registering a newly installed worker displayed “New version ready. Reload.” The manifest has standalone display, versioned start URL, 192/512 icons (including maskable), and theme/background colours matching the product.

### Live identity, response policy, and caching

- SHA-256 comparison found every deployable product artifact in local `dist/` byte-identical at the live URL: HTML, JS, CSS, service worker, manifest, offline page, icons, hero variants, robots, and sitemap. The platform's deployed `staticwebapp.config.json` is environment-transformed and was the sole expected non-identical file.
- Root and asset responses have CSP (`default-src 'self'`; limited `connect-src` to the Sociobot API), Permissions-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS, and strict-origin referrer policy.
- Hashed JS/CSS use `public, max-age=31536000, immutable`; `sw.js` uses `no-cache, no-store, must-revalidate`; the manifest is `application/manifest+json`.

## Notes

- I attempted a new Lighthouse 13.0.1 run, but this container's preinstalled Playwright Chromium crashed under Lighthouse's Chrome-debug protocol. It is not a product failure: static budget checks, browser response/error checks, and the candidate's own fully passing e2e performance-sensitive flow are recorded above. A prior candidate handoff reports Lighthouse evidence; it was not used as evidence for this independent verdict.
- The product does not require sign-in, so Entra tenant validation is not applicable.

## Reproduction

```sh
git checkout 0a362aecd1374c773b2f7a6b67680924c2c51de4
npm ci
npm audit --omit=dev
npm audit
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e

# Required rate-limit check (the candidate fails this):
seq 1 120 | xargs -P 30 -I{} sh -c \
  'curl -sS -D - -o /dev/null \
  "https://api.sociobot.in/api/v1/products/scan-archive-receipt/verify?license=qa-invalid-rate-token-{}"'
```

## Required next step

Configure and verify a rate limit on the Sociobot product verification endpoint. Re-run a rapid burst and require the first HTTP `429` plus a valid `Retry-After` header before changing this candidate's release decision to PASS.
