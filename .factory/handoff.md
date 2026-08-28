# Scan Archive Receipt — independent verification 4 handoff

- Work order: `scan-archive-receipt-verify-4`
- Candidate: `decbf10e48e275bd7a9115445396a4a4efeed6aa`
- Live URL: <https://scan-archive-receipt.sociobot.in>
- Verified: 2026-08-28 UTC
- Result: **FAIL**

## Why it fails

1. Required `.factory/claims.json` is missing. No claim tests exist to run through a demo sandbox, and all live/README claims are unlisted.
2. The cold first screen has no **Try it with sample data** action and does not plainly name the intended family historian/archivist. `/demo` and `/?demo=1` are the real app, reuse its IndexedDB data, and provide no demo banner/reset/exit controls. `.factory/demo.md` is also missing.
3. Announced edits/removals use delayed persistence and can be lost or resurrected by an immediate reload/tab close.
4. An IndexedDB save failure is overwritten by “scan imported and verified”; the row disappears on reload.
5. Route titles, real 404 behavior, social/canonical metadata, standard footer identity/build id, and `.factory/copy-audit.md` are incomplete.

Full evidence and reproductions: [`.factory/verification-4.md`](verification-4.md).

## Verification summary

- Clean install/audits, 8/8 unit tests, typecheck, lint, production build, and 14/14 repository e2e tests passed.
- Fresh 100-image batch completed through CSV/HTML/JSON exports in 1.549 seconds.
- Live axe had 0 serious/critical findings across desktop, populated 390 px, Privacy, and Terms; keyboard focus, 44 px targets, 200% text, and reduced motion passed.
- Live offline reload passed 5/5; populated persistence, cache contents, and update toast passed.
- Normal traffic stayed same-origin; no trackers/uploads were observed. Security headers and cache policy passed.
- Billing checkout returned 303. The API allowed 30 rapid verification requests, then returned 429 on request 31 with `Retry-After: 4`; a following 90/90 burst was rate-limited with that header.
- All 15 deployable files matched the live site byte-for-byte.
- Lighthouse mobile: local 99/100/100/100; live 100/100/100/100. Live LCP 1.02 s, TBT 39 ms, CLS 0.

## Required next steps

1. Implement an isolated, seeded one-click demo and document its URL, reset behavior, and separate storage namespace.
2. Add `.factory/claims.json`; tag exactly one observable demo-backed test per material live/README claim.
3. Make persistence atomic before success announcements and safe across immediate refresh/tab close; preserve storage-failure errors and recovery guidance.
4. Complete route titles/404/metadata/footer and the plain-words copy audit.
5. Re-run the full command list in `.factory/verification-4.md`, then request independent verification again.

No product code was modified during this verification.
