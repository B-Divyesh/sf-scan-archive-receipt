# Scan Archive Receipt

Scan Archive Receipt is an offline-first PWA for family historians digitizing albums, slides, and rare originals. It turns an imported image batch into an ordered preservation receipt with physical provenance, descriptive rights notes, stable filenames, and SHA-256 checksums—without uploading or altering the originals.

Live product: <https://scan-archive-receipt.sociobot.in>

## What it does

- Imports image batches and calculates SHA-256 from the original bytes.
- Records collection, physical source, item/page order, approximate date, rights, and notes.
- Reorders scans and assigns stable, padded filenames.
- Exports UTF-8 CSV, a self-contained HTML contact sheet, and a restorable JSON project.
- Stores the active project and image copies locally in IndexedDB for offline continuity.
- Installs as a PWA and reloads fully offline after the first visit.
- Offers a $12 one-time Plus unlock for custom filename recipes; every core receipt and data export remains free.

It intentionally does not perform OCR, enhancement, historical identification, cloud hosting, or legal rights analysis.

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Browser storage belongs to that local origin.

## Test and build

```sh
npm test
npm run build
npm run test:e2e
```

`npm run build` is the deployment command. It creates the static site in `dist/`, with `dist/index.html` at its root. The end-to-end suite uses Playwright 1.58.2 and verifies import/persistence, real exports, desktop/mobile accessibility, console output, and offline reload.

To inspect the production build manually:

```sh
npm run preview
```

## Data and privacy

No scan or descriptive metadata is sent to this product’s servers. Imported image copies are saved in the browser solely so the batch survives refresh and works offline. EXIF is not extracted. “Clear batch” deletes the active project from IndexedDB but never touches the original files outside the app. See `/privacy` and `/terms` in the built app.

License verification uses the Sociobot billing API. Checkout is hosted by Sociobot/Dodo; no payment provider code is embedded here. The product slug is used in the checkout URL, while registration and pricing configuration remain factory-side.

## Project records

- [Opportunity brief](.factory/brief.json)
- [Visual thesis and asset provenance](.factory/design.md)
- [Build handoff](.factory/handoff.md)

## License

MIT © 2026 Sociobot (Param Factory). See [LICENSE](LICENSE).
