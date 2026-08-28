# Scan Archive Receipt

Scan Archive Receipt is an offline-first PWA for family historians. It turns image batches into ordered preservation receipts.

Each receipt records source notes, stable filenames, and SHA-256 checksums. The core workflow sends no scans or notes across the network.

Live product: <https://scan-archive-receipt.sociobot.in>

One-click demo: <https://scan-archive-receipt.sociobot.in/demo>

## What it does

- Imports JPG, PNG, WebP, TIFF, and HEIC files.
- Calculates SHA-256 from each imported file's original bytes.
- Records collection, source, order, approximate date, rights, and notes.
- Reorders scans and assigns stable, padded filenames.
- Exports UTF-8 CSV and a self-contained HTML contact sheet.
- Exports and restores a complete JSON project.
- Stores real projects locally in IndexedDB for offline continuity.
- Reloads receipts and exports offline after the first visit.
- Deletes every local batch and scan copy through **Clear batch**.
- Keeps core receipts and exports free. Plus costs $12 once and adds custom filename recipes.

The app reads originals without changing them. It does not extract EXIF metadata.

It does not perform OCR, enhancement, identification, cloud hosting, or legal rights analysis.

## Demo sandbox

Open `/demo` or select **Try it with sample data**. It loads three realistic family-album records without setup.

Demo changes remain in temporary memory. They never read or write the real IndexedDB batch.

Use **Reset demo** to restore the sample. Use **Start for real** to discard demo changes.

See [the demo record](.factory/demo.md) and [the claim registry](.factory/claims.json) for exact verification details.

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Browser storage belongs to that local origin.

## Test and build

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Run every visitor-facing claim test with:

```sh
npm run test:e2e -- --grep @claim:
```

The production command creates `dist/index.html`. The browser suite uses Playwright 1.58.2.

To inspect the production build:

```sh
npm run preview
```

## Data, payment, and deployment

The real app stores imported image copies and notes in local IndexedDB. This keeps the batch available after refresh.

License verification sends only the license token to the Sociobot billing API. Sociobot/Dodo hosts checkout and acts as merchant of record.

The static deployment uses `public/staticwebapp.config.json`. The factory deploys `dist/`; this repository does not manage DNS or billing.

See `/privacy` and `/terms` in the built app.

## Project records

- [Opportunity brief](.factory/brief.json)
- [Visual thesis and asset provenance](.factory/design.md)
- [Demo sandbox](.factory/demo.md)
- [Verified claims](.factory/claims.json)
- [Build handoff](.factory/handoff.md)

## License

MIT © 2026 Sociobot (Param Factory). See [LICENSE](LICENSE).
