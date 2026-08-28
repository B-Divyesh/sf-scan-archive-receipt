# Demo sandbox

- URL: <https://scan-archive-receipt.sociobot.in/demo> (legacy `/?demo=1` redirects to it).
- Entry: **Try it with sample data** is visible on the first home screen.
- Sample: three records from the fictional Nair family album, covering an album cover and two positions on page 4. Each record has source, date, rights, notes, stable filename, original bytes, and a SHA-256 checksum.
- Isolation: demo state uses the in-memory `demo:` batch `demo:nair-family-album`. Demo code never opens, reads, or writes the production `scan-archive-receipt` IndexedDB database.
- Reset: **Reset demo** rebuilds the original three-record sample. Reloading `/demo` does the same.
- Exit: **Start for real** discards demo changes and opens `/`, where the user's IndexedDB batch remains unchanged.
- Offline: the sample uses images already in the app shell cache, so `/demo` reloads after the first successful visit.

Run all observable claim checks with `npm run test:e2e -- --grep @claim:`.
