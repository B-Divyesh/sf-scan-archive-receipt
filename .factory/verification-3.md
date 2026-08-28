# Independent product verification — FAIL

Work order: `scan-archive-receipt-verify-3`

Verified: 2026-08-28 UTC

Candidate: `0a362aecd1374c773b2f7a6b67680924c2c51de4`

Live URL: <https://scan-archive-receipt.sociobot.in>

Artifact: offline PWA

## Decision

**FAIL.** The previous deployment-only rate-limit failure is fixed, and the core local-first scan-receipt workflow, clean repository gates, deployed artifact, PWA behavior, privacy boundary, accessibility automation, performance budgets, response policy, and checkout all pass. Fresh paid-return edge testing found a separate release-blocking defect in candidate code: a verification verdict is cached without the license token that produced it, and capturing a new checkout-return token does not clear that old verdict. A buyer can therefore return with a valid newly purchased token and remain locked for up to 24 hours; the inverse stale-valid state can unlock an unverified replacement token.

No product code was changed during verification.

## Defects

### S1 / Major — a new checkout-return token reuses another token's cached verdict

The cache at `sb_license:scan-archive-receipt:verdict` stores only `{valid, checkedAt}`. `captureLicense()` replaces `sb_license:scan-archive-receipt` from the `?license=` return parameter but neither removes the verdict nor associates it with the token. `verifyLicense()` then trusts any verdict less than one day old without making a request.

Deterministic reproduction against the candidate build:

1. Seed local storage with `previous-token` and a current cached `valid:false` verdict.
2. Visit `/?license=new-valid-token`, with the verification endpoint stubbed to return `valid:true` if called.
3. Actual: the URL token is captured and stripped, but **0 verification calls** occur; the cached false verdict remains and the custom filename field stays disabled.
4. Inverse reproduction: seed a current cached `valid:true` verdict, then visit `/?license=new-invalid-token` with a stubbed invalid response.
5. Actual: again **0 verification calls** occur; the invalid token replaces the stored token while Plus remains unlocked.

Expected: receiving or otherwise replacing a token must invalidate the prior token's verdict and verify the new token. A cached verdict must be bound to the exact token it describes.

Impact: a paid buyer who previously attempted an invalid, expired, or revoked token can be denied the purchased unlock for up to 24 hours after returning from checkout. Conversely, entitlement state can remain true for an unverified replacement token. This violates the paid-unlock first-verification and reconciliation contract.

### S2 / Moderate — an inactive license has no required user-facing notice

- Fresh live request: `GET .../verify?license=qa-verify3-invalid-browser` returned HTTP 200 with `{"expires_at":null,"reason":"invalid","valid":false}`.
- The app stored the token, stripped it from the URL, and correctly kept the custom recipe locked.
- Actual UI: the panel silently returned to generic `$12 once / Buy Plus / Have a license?` copy; there were **0** elements matching “license no longer active.”
- Expected by the paid-unlock contract: keep paid features locked and show a quiet “license no longer active” notice with the buy link.

This makes invalid, expired, revoked, and wrong-product outcomes indistinguishable from never having entered a license.

### S3 / Minor — several mobile text links miss the 44×44 target contract

At 390 px, the legal-page “Back to archive bench” link measured 220.8×18 px; the privacy and support email links measured 161.8×19 px and 164.5×19 px. The footer Terms link measured 40×44 px. These are ordinary inline links and axe did not flag them, but they do not meet the attached product contract's 44×44 CSS-pixel target minimum. Primary workflow controls and the restore control meet the requirement.

## What passed

### Clean checkout and repository gates

- Created a detached clean worktree at exactly `0a362aecd1374c773b2f7a6b67680924c2c51de4`; it remained clean after verification.
- `npm ci`: 136 packages installed from the lockfile.
- `npm audit --omit=dev`: 0 vulnerabilities. Full `npm audit`: 0 vulnerabilities.
- `npm test`: 2 files, **8/8 tests passed**.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Exact production build, `npm run build` (`tsc -b && vite build`): passed and produced root `dist/index.html`.
- `npm run test:e2e`: **10/10 passed** in 13.6 seconds.
- Repeated repository offline regression: **5/5 passed** in separate clean worker contexts.

### Smallest useful product and recovery paths

- Independently completed a 100-image batch in **1.121 seconds** from import through checksum completion and CSV plus HTML export: 100/100 complete, 100 CSV data rows, 100 HTML contact cards, and final stable name `muller-family-1964-0100.png`. This is well inside the 20-minute target.
- Representative two-image testing used Unicode, ampersands, quotes, commas, newlines, em dashes, and script-shaped notes. The browser SHA-256 exactly matched the source bytes: `5033bf9ae92ad5665b3b6340057590309736a4fa4fc183018ff3553f8d775d97`.
- CSV began with a UTF-8 BOM, used CRLF records, correctly doubled embedded quotes, and included provenance and checksums.
- The self-contained contact sheet included both cards and checksums, and escaped `<script>window.qaInjected=true</script>` as text rather than executable markup.
- Backup JSON embedded both original images as data URLs. Restore, reload persistence, reordering, stable renumbering, and complete clear/reload deletion passed; IndexedDB batch count was 0 after clearing.
- A non-image file produced “No supported image files were selected” without changing the batch. The minimally malformed `{"id":"looks-valid","items":[]}` backup produced the recovery message and left the two-image project intact across reload.
- Live checkout is operational: `GET /products/scan-archive-receipt/checkout` returned HTTP 303 to a hosted `checkout.dodopayments.com/session/...` URL. No card was charged.
- The repository's clean-context positive license-return regression stored and stripped a returned token, made one successful verification request, and unlocked the recipe. The defect above requires a prior cached verdict and is not covered by that happy-path test.

### Privacy and persistence boundaries

- Local and live import traffic contacted only their product origins. No scan bytes or descriptive metadata were sent off-origin.
- Static inspection found no analytics, telemetry, tracker, CDN font/script, EXIF extraction, or image-upload path. Runtime external access is limited to the documented Sociobot license API; CSP `connect-src` enforces the same boundary.
- Imported files and metadata persisted in IndexedDB, survived an offline reload with the populated row and `Offline album` source intact, and were removed by the in-product clear action.
- The only source-domain URLs besides the license API are the product sitemap entries. The app does not require sign-in, so Entra authority validation is not applicable.

### Accessibility, responsive behavior, and browser errors

- Independent axe runs found **0 serious/critical findings** on empty desktop, populated desktop, populated 390×844 mobile, `/privacy`, and `/terms`.
- Populated mobile measurements were `innerWidth=390`, `document.scrollWidth=390`, and `body.scrollWidth=390`; the scan row and its fields rendered inside the viewport. Visual inspection confirmed the row content appears when scrolled into view.
- Keyboard order begins with the visible “Skip to main content” link and its 3 px amber outline. The restore-project target measured 317.6×45.1 px with a visible 3 px amber focus ring.
- At a simulated 200% root text size, the 390 px page retained `document/body.scrollWidth=390`.
- Reduced-motion emulation matched and produced `scroll-behavior:auto` with 0.01 ms transition/animation durations.
- No console errors, page errors, or HTTP error responses occurred during the independent local or live app flows.
- Factory `verify-url.sh` passed locally in 595 ms and live in 691 ms: title, `lang=en`, exactly one h1, main landmark, alt text, labeled buttons, and no page/console errors.

### PWA, deployment identity, headers, and rate limiting

- Chromium parsed the live manifest with no errors. It has standalone display, `/?v=1` versioned start URL/id, matching theme/background colors, 192/512 icons, and a maskable 512 icon.
- Independent live immediate-offline reload passed **5/5** at 390×844. A populated project also survived and rendered offline with no errors. A newly installed worker displayed `New version ready. Reload`.
- SHA-256 comparison found all **15 deployable files** in fresh local `dist/` byte-identical at the live URL. `staticwebapp.config.json` is deployment configuration and was excluded from the artifact comparison.
- Root and assets return CSP with `frame-ancestors 'none'`, Permissions-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS, and strict-origin referrer policy.
- Hashed JS/CSS return `public, max-age=31536000, immutable`; `sw.js` returns `no-cache, no-store, must-revalidate`; the manifest is `application/manifest+json`.
- The license verification endpoint supplies exact-origin CORS and `Cache-Control: no-store`.
- Fresh required burst test: 150 rapid invalid-token verification requests at concurrency 30 completed in approximately 8.1 seconds: **31 HTTP 200 and 119 HTTP 429**. Every 429 included `Retry-After` (observed values 0–4 seconds). A follow-up sequence within the rolling window returned 200 for requests 1–8 and began returning 429 with `Retry-After` on request 9. The earlier deployment-only rate-limit blocker is therefore resolved.

### Performance and budgets

- Production JS: 26,666 bytes raw / 10.07 kB gzip. CSS: 12,627 bytes raw / 3.54 kB gzip. Fonts: 0 bytes. Largest hero candidate: 84,706 bytes; the 390 px candidate is 11,590 bytes. All static budgets pass.
- Fresh Lighthouse 13.0.1 mobile, local production preview: **Performance 96, Accessibility 100, Best Practices 100, SEO 100**; FCP 1.0 s, LCP 1.2 s, TBT 220 ms, CLS 0, total transfer 63 KiB.
- Fresh Lighthouse 13.0.1 mobile, live: **Performance 99, Accessibility 100, Best Practices 100, SEO 100**; FCP 0.9 s, LCP 1.1 s, TBT 140 ms, CLS 0, total transfer 59 KiB. Lab INP was unavailable; max potential FID was 170 ms live.

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
npx playwright test tests/app.spec.ts:157 --repeat-each=5 --workers=1
```

Rate-limit check:

```sh
seq 1 150 | xargs -P 30 -I{} sh -c \
  'curl -sS -o /dev/null -w "%{http_code}\t%header{retry-after}\n" \
  "https://api.sociobot.in/api/v1/products/scan-archive-receipt/verify?license=qa-verify3-burst-{}"'
```

## Required next steps

1. Bind cached verdicts to the exact license token, or clear the verdict whenever `captureLicense()` accepts a different token; force first verification of every checkout-return token.
2. Add regressions for a valid return after cached false and an invalid return after cached true.
3. Render the required inactive-license notice for invalid/expired/revoked/wrong-product responses and distinguish transient network/429 responses from definitive invalidity.
4. Enlarge the remaining legal/footer text-link targets to 44×44 CSS px.
