# Scan Archive Receipt — build handoff

Work order: `scan-archive-receipt-build-1`  
Completed: 2026-08-28  
Deploy type: static PWA; build output is `dist/`

## What was built

- A complete local-first batch workbench for image imports, physical source metadata, per-item source/page/date/rights/notes, scan order, stable filenames, and SHA-256 checksums.
- Fast batch defaults: imported scans inherit physical source, sequential page/position, “Undated,” and a descriptive rights placeholder; users can fill blank fields across an existing batch without overwriting edits.
- IndexedDB persistence of project metadata and original image copies. Refresh, tab close, installation, and offline use retain the active project. The app never edits originals and does not extract EXIF.
- UTF-8 BOM CSV receipts, self-contained HTML contact sheets with reduced previews, and JSON project backup/restore with original bytes included.
- Hand-written versioned service worker, install manifest, offline fallback, cache warming for Vite’s hashed shell assets, update toast, 192/512 icons, and an explicit offline status.
- $12 one-time Plus unlock for custom filename recipes, using only the Sociobot checkout and verification endpoints. Return tokens, daily verdict caching, background/offline behavior, and paste-to-restore are implemented. All core exports remain free.
- `/privacy` and `/terms`, deletion confirmation, empty/error/loading/offline states, mobile layout, keyboard-visible controls, reduced-motion handling, and no runtime CDN/tracking.
- Original `factory-image` pixel-art hero and hand-authored app icon. Prompt, review, licensing, sizes, and rationale are in `.factory/design.md` and `assets/src/`.

## How to run and verify

```sh
npm install
npm test
npm run build
npm run test:e2e
npm run preview
```

Deployment command: `npm run build`  
Deployment directory: `dist` (contains `index.html` at its root)

Verification completed locally against the production build:

- `npm test`: 5/5 unit tests passed (stable naming and interoperable CSV escaping/encoding).
- `npm run test:e2e`: 3/3 Playwright tests passed (real image import/hash, IndexedDB persistence, CSV and HTML downloads, desktop/mobile axe scan, console check, and browser-level offline reload).
- Factory `verify-url.sh`: HTTP 200; title and `lang` present; exactly one h1; main landmark present; 0 missing image alts; 0 unlabeled buttons; 0 console/page errors.
- Lighthouse 12.8.2, mobile default profile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.1 s, TBT 0 ms, CLS 0.
- Production bundle: 24.37 KB raw / 9.37 KB gzip JS; 11.78 KB raw / 3.34 KB gzip CSS. No fonts. Responsive hero WebP is 12/44/84 KB with a 64 KB JPEG fallback.
- `npm audit --omit=dev`: 0 production vulnerabilities.
- 1440 px and 390 px screenshots were reviewed; mobile body width equals viewport width (no horizontal overflow).

## Known gaps and deployment notes

- TIFF and HEIC files are accepted and checksummed, but previews depend on the browser’s decoder. Unsupported previews are explicitly labeled; receipts and checksums still work.
- Browser storage quota varies by device and private-browsing mode. Very large projects should be split into album-sized batches and backed up through the project export.
- JSON backup and HTML contact-sheet creation are intentionally client-side; exceptionally large batches may take time and use significant memory.
- The factory must register the live paid product/price and return URL with Sociobot. No product identifier or payment provider is embedded in the repository.
- Checkout/verification cannot be fully exercised without a factory-issued test license. The no-license, cached-verdict, offline, invalid-license, and restore paths are implemented defensively.
