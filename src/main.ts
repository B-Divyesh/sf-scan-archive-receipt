import './style.css';
import type { Batch, ScanItem } from './types';
import { decodeProjectBackup } from './backup';
import { clearAllBatches, loadLatestBatch, replaceAllBatches, saveBatch } from './db';
import { captureLicense, checkoutUrl, getLicense, getLicenseVerdict, optimisticUnlock, storeLicense, verifyLicense } from './license';
import { downloadBlob, escapeHtml, formatBytes, makeCsv, sha256, slugify, stableFilename, thumbnailData } from './utils';

const app = document.querySelector<HTMLDivElement>('#app')!;
const BUILD_ID = '1.0.1+repair.3';
const requestedDemo = location.pathname === '/demo' || new URL(location.href).searchParams.get('demo') === '1';
if (requestedDemo && location.pathname !== '/demo') history.replaceState({}, '', '/demo');
const demoMode = location.pathname === '/demo';
let batch: Batch | null = null;
let hashing = false;
let paid = false;
let objectUrls: string[] = [];
let saveQueue: Promise<void> = Promise.resolve();
let editRevision = 0;

const returnedFromCheckout = demoMode ? false : captureLicense();
paid = demoMode ? false : optimisticUnlock();

const blankBatch = (): Batch => ({
  id: crypto.randomUUID(), title: 'Family archive batch', collection: '', physicalSource: '', filenamePrefix: `archive-${new Date().toISOString().slice(0, 10)}`,
  customPattern: '{prefix}-{order}', defaultSource: '', defaultDate: 'Undated', defaultRights: 'Rights status not evaluated', notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: []
});

async function sampleBatch(): Promise<Batch> {
  const examples = [
    { source: '/assets/hero-480.webp', name: 'nair-album-01-cover.webp', item: 'Green family album', page: 'Front cover', date: 'c. 1958', rights: 'Family use permitted', notes: 'Album title is handwritten inside the cover.' },
    { source: '/assets/hero-960.jpg', name: 'nair-album-01-page-04.jpg', item: 'Green family album', page: 'Page 4, top left', date: 'June 1962', rights: 'Family use permitted', notes: 'Meera and Arun named on the paper sleeve.' },
    { source: '/assets/hero-960.webp', name: 'nair-album-01-page-04b.webp', item: 'Green family album', page: 'Page 4, bottom right', date: 'June 1962', rights: 'Rights status not evaluated', notes: 'Small crease along the lower edge.' }
  ];
  const items: ScanItem[] = await Promise.all(examples.map(async (example, index) => {
    const blob = await fetch(example.source).then(response => {
      if (!response.ok) throw new Error('Sample image unavailable');
      return response.blob();
    });
    const item: ScanItem = {
      id: `demo-scan-${index + 1}`, order: index + 1, originalName: example.name, stableName: '', type: blob.type,
      size: blob.size, checksum: await sha256(blob), sourceItem: example.item, page: example.page,
      approximateDate: example.date, rights: example.rights, notes: example.notes, blob
    };
    return item;
  }));
  const now = new Date().toISOString();
  const sample: Batch = {
    id: 'demo:nair-family-album', title: 'Nair family album · 1958–1962', collection: 'Nair family photographs',
    physicalSource: 'Green album, archive box 2', filenamePrefix: 'nair-family-album-01', customPattern: '{prefix}-{date}-{order}',
    defaultSource: 'Green family album', defaultDate: 'c. 1960', defaultRights: 'Rights status not evaluated',
    notes: 'Sample receipt showing an album cover and two page details.', createdAt: now, updatedAt: now, items
  };
  updateNamesFor(sample);
  return sample;
}

const announce = (message: string, kind: 'ok' | 'error' | 'info' = 'ok') => {
  const status = document.querySelector<HTMLElement>('#live-status');
  if (status) { status.textContent = message; status.dataset.kind = kind; }
};

function updateNamesFor(target: Batch): void {
  target.items.forEach((item, index) => { item.order = index + 1; item.stableName = stableFilename(target, item, paid); });
}

function updateNames(): void { if (batch) updateNamesFor(batch); }

function persistEdit(): void {
  if (!batch || demoMode) return;
  batch.updatedAt = new Date().toISOString();
  const snapshot = structuredClone(batch);
  const revision = ++editRevision;
  saveQueue = saveQueue.catch(() => undefined).then(() => saveBatch(snapshot));
  void saveQueue.then(() => {
    if (revision === editRevision) announce('Changes saved on this device.');
  }).catch(() => {
    if (revision === editRevision) announce('Could not save this edit. Export a backup or free browser storage, then retry.', 'error');
  });
}

async function persistMutation(previous: Batch, success: string): Promise<boolean> {
  if (!batch) return false;
  if (demoMode) { render(); announce(success); return true; }
  batch.updatedAt = new Date().toISOString();
  try {
    await saveQueue.catch(() => undefined);
    await saveBatch(batch);
    render(); announce(success);
    return true;
  } catch {
    batch = previous;
    render();
    announce('That change was not saved. Export a backup or free browser storage, then retry.', 'error');
    return false;
  }
}

function setRouteMetadata(title: string, description: string, canonicalPath: string): void {
  document.title = title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', description);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', title);
  document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', description);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `https://scan-archive-receipt.sociobot.in${canonicalPath}`);
}

function shell(content: string): void {
  const demoBanner = demoMode ? `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><span>Changes stay in this temporary preview.</span><div><button id="reset-demo">Reset demo</button><a class="button" href="/">Start for real</a></div></aside>` : '';
  app.innerHTML = `<header class="site-header"><a class="brand" href="/" aria-label="Scan Archive Receipt home"><span class="brand-mark" aria-hidden="true">▦</span><span>SCAN / ARCHIVE / RECEIPT</span></a><nav aria-label="Primary"><a href="/demo">Demo</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></header>${demoBanner}${content}<footer><p>Receipts for careful family archives.</p><p><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="https://hello-factory.sociobot.in" aria-label="Built by Param Factory (external site)">Built by Param Factory ↗</a> · <span>Version ${BUILD_ID}</span></p><p>Original AI-generated artwork is documented in the design record.</p></footer><div id="update-toast" class="toast" hidden>New version ready. <button id="reload-app">Reload</button></div>`;
  document.querySelector('#reset-demo')?.addEventListener('click', async () => {
    batch = await sampleBatch();
    render();
    announce('Demo reset to its original three scans.');
  });
}

function renderLegal(kind: 'privacy' | 'terms'): void {
  const privacy = `<h1>Privacy, by design</h1><p class="lede">Your family photographs stay on your device during the core receipt workflow.</p><h2>What stays on your device</h2><p>Imported image files, previews, notes, filenames, checksums, and batch settings use your browser’s IndexedDB storage.</p><p>The core workflow sends no scans or notes across the network. The app does not extract EXIF metadata.</p><h2>What can leave your device</h2><p>License verification sends only the license token to Sociobot’s billing API.</p><p>Checkout is hosted by Sociobot/Dodo, the merchant of record. Exports go only where you choose to save or share them.</p><h2>Storage control</h2><p>“Clear batch” deletes every locally stored batch and scan copy. Clearing browser site data also removes the stored license.</p><p>The demo uses temporary memory and never reads or writes your real batch.</p><h2>Contact</h2><p>Privacy questions: <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>`;
  const terms = `<h1>Terms of use</h1><p class="lede">Use Scan Archive Receipt as a bookkeeping aid, not as legal, preservation, or authenticity advice.</p><h2>Your materials</h2><p>You keep all rights to your scans and metadata. You must have permission to digitize and share materials.</p><p>Rights fields are descriptive notes, not legal decisions.</p><h2>What the tool does</h2><p>The app reads originals to calculate SHA-256 checksums and make local previews. It does not alter original files.</p><p>A checksum records bytes, but does not prove authorship or historical authenticity. Keep independent backups and check exports before relying on them.</p><h2>Plus license</h2><p>Plus costs $12 once and adds custom filename recipes after license verification. Core CSV, HTML, and JSON exports remain free.</p><p>Sociobot/Dodo handles payments and refunds as merchant of record. A refund revokes the license.</p><h2>Warranty</h2><p>The software is provided “as is,” without warranties. Applicable law limits any liability for lost files, metadata, or indirect damages.</p><p>Questions: <a href="mailto:support@sociobot.in">support@sociobot.in</a>.</p>`;
  const isPrivacy = kind === 'privacy';
  setRouteMetadata(`${isPrivacy ? 'Privacy' : 'Terms'} — Scan Archive Receipt`, isPrivacy ? 'How Scan Archive Receipt stores family scans locally and handles license checks.' : 'Terms for using Scan Archive Receipt and its one-time Plus license.', `/${kind}`);
  shell(`<main id="main" class="legal"><a class="back-link" href="/">← Back to archive bench</a>${isPrivacy ? privacy : terms}<p class="muted">Effective 28 August 2026</p></main>`);
}

function renderNotFound(): void {
  setRouteMetadata('Page not found — Scan Archive Receipt', 'This Scan Archive Receipt page does not exist.', location.pathname);
  shell(`<main id="main" class="not-found"><p class="eyebrow">ERROR 404 // MISFILED</p><h1>This page is not in the archive</h1><div class="missing-card" aria-hidden="true">?<span>NO MATCH</span></div><p>The address does not match a receipt page.</p><a class="primary button" href="/">Return to the archive bench</a></main>`);
}

function completeness(item: ScanItem): boolean {
  return Boolean(item.sourceItem.trim() && item.page.trim() && item.approximateDate.trim() && item.rights.trim() && item.checksum);
}

function render(): void {
  objectUrls.forEach(URL.revokeObjectURL);
  objectUrls = [];
  if (location.pathname === '/privacy') return renderLegal('privacy');
  if (location.pathname === '/terms') return renderLegal('terms');
  if (!['/', '/demo'].includes(location.pathname)) return renderNotFound();
  if (!batch) batch = blankBatch();
  const licenseVerdict = getLicenseVerdict();
  const inactiveLicense = !demoMode && Boolean(licenseVerdict && !licenseVerdict.valid);
  const complete = batch.items.filter(completeness).length;
  const totalSize = batch.items.reduce((sum, item) => sum + item.size, 0);
  const rows = batch.items.map((item, index) => {
    const canPreview = item.type.startsWith('image/');
    const url = canPreview ? URL.createObjectURL(item.blob) : '';
    if (url) objectUrls.push(url);
    return `<li class="scan-row ${completeness(item) ? 'is-complete' : ''}" data-id="${item.id}">
      <div class="scan-preview">${url ? `<img src="${url}" alt="Preview of ${escapeHtml(item.originalName)}" loading="lazy" decoding="async">` : `<span aria-label="Preview unavailable">NO<br>PREVIEW</span>`}<b>${String(index + 1).padStart(3, '0')}</b></div>
      <div class="scan-fields">
        <div class="row-heading"><div><strong>${escapeHtml(item.originalName)}</strong><span>${formatBytes(item.size)} · ${completeness(item) ? 'Receipt complete' : 'Needs details'}</span></div><div class="row-actions"><button data-move="up" aria-label="Move ${escapeHtml(item.originalName)} earlier" ${index === 0 ? 'disabled' : ''}>↑</button><button data-move="down" aria-label="Move ${escapeHtml(item.originalName)} later" ${index === batch!.items.length - 1 ? 'disabled' : ''}>↓</button><button class="danger-quiet" data-remove aria-label="Remove ${escapeHtml(item.originalName)}">Remove</button></div></div>
        <div class="stable-name"><span>Stable filename</span><code>${escapeHtml(item.stableName)}</code></div>
        <div class="field-grid"><label>Source item<input name="sourceItem" value="${escapeHtml(item.sourceItem)}" placeholder="Album 3"></label><label>Page / position<input name="page" value="${escapeHtml(item.page)}" placeholder="Page 12, top left"></label><label>Approximate date<input name="approximateDate" value="${escapeHtml(item.approximateDate)}" placeholder="c. 1964 or Undated"></label><label>Rights note<input name="rights" value="${escapeHtml(item.rights)}" placeholder="Family use permitted"></label></div>
        <label>Item notes<textarea name="notes" rows="2" placeholder="People named on sleeve, damage, orientation…">${escapeHtml(item.notes)}</textarea></label>
        <details class="checksum"><summary>SHA-256 checksum</summary><code>${item.checksum || 'Not calculated'}</code></details>
      </div></li>`;
  }).join('');
  const homeIntro = `<section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow">OFFLINE PRESERVATION WORKBENCH // V1</p><h1 id="hero-title">Build a receipt for<br><em>every family scan.</em></h1><p class="hero-lede">For family historians who need ordered filenames, source notes, and checksums without a spreadsheet.</p><div class="hero-actions"><a class="primary button" id="demo-link" href="/demo">Try it with sample data <span aria-hidden="true">→</span></a><button id="start-link">${batch.items.length ? 'Continue your batch' : 'Start your batch'}</button></div><p class="next-step">The sample opens a ready-to-review three-scan receipt.</p><ul class="trust-line"><li>Scans stay local</li><li>Works offline after one visit</li><li>Core exports are free</li></ul></div><div class="hero-art"><picture><source srcset="/assets/hero-480.webp 480w, /assets/hero-960.webp 960w, /assets/hero-1440.webp 1440w" sizes="(max-width: 850px) calc(100vw - 32px), 46vw" type="image/webp"><img src="/assets/hero-960.jpg" width="960" height="640" alt="Pixel-art archive desk with slides, cotton gloves, and a catalog card" fetchpriority="high" decoding="async"></picture><span>FIG 01 / PROVENANCE BENCH</span></div></section>`;
  const demoIntro = `<section class="demo-intro" aria-labelledby="hero-title"><p class="eyebrow">READY-TO-REVIEW RECEIPT // DEMO</p><h1 id="hero-title">Review a sample family scan receipt</h1><p>Three sample scans show filenames, source notes, checksums, and exports.</p></section>`;
  setRouteMetadata(demoMode ? 'Demo — Scan Archive Receipt' : 'Scan Archive Receipt — receipts for family scans', demoMode ? 'Try a temporary family scan receipt with three realistic sample records.' : 'Build ordered filenames, source notes, and checksum receipts for family scans.', demoMode ? '/demo' : '/');
  shell(`<main id="main">
    ${demoMode ? demoIntro : homeIntro}
    <section class="workflow" id="workspace" aria-labelledby="workspace-title"><div class="section-head"><div><p class="eyebrow">${demoMode ? 'SAMPLE RECEIPT' : 'ACTIVE RECEIPT'}</p><h2 id="workspace-title">Batch workbench</h2></div><ol class="stepper" aria-label="Batch progress"><li class="done">1 Describe</li><li class="${batch.items.length ? 'done' : 'active'}">2 Import</li><li class="${batch.items.length && complete < batch.items.length ? 'active' : complete ? 'done' : ''}">3 Verify</li><li class="${complete && complete === batch.items.length ? 'active' : ''}">4 Export</li></ol></div>
      <div id="offline-banner" class="notice info" hidden><strong>Offline:</strong> receipts and exports still work. License checks wait for a connection.</div>
      <div id="live-status" class="live-status" aria-live="polite"></div>
      <div class="batch-grid"><form id="batch-form" class="batch-meta"><h3>01 / Describe the source</h3><label>Batch title<input name="title" value="${escapeHtml(batch.title)}" required></label><label>Collection or family<input name="collection" value="${escapeHtml(batch.collection)}" placeholder="Nair family photographs"></label><label>Physical source<input name="physicalSource" value="${escapeHtml(batch.physicalSource)}" placeholder="Blue album, shelf B"></label><label>Filename prefix<input name="filenamePrefix" value="${escapeHtml(batch.filenamePrefix)}" pattern="[A-Za-z0-9 _-]+" required aria-describedby="prefix-help"><small id="prefix-help">Use safe letters and numbers. Files become prefix-0001.ext.</small></label><label>Batch notes<textarea name="notes" rows="3" placeholder="Who supplied it, handling notes, scan settings…">${escapeHtml(batch.notes)}</textarea></label></form>
      <section class="import-zone" aria-labelledby="import-title"><h3 id="import-title">02 / Import original scans</h3><label class="drop-zone" id="drop-zone"><input id="file-input" type="file" accept="image/*,.tif,.tiff,.heic" multiple><span class="drop-icon" aria-hidden="true">＋</span><strong>${hashing ? 'Calculating checksums…' : 'Choose scans or drop them here'}</strong><small>Import JPG, PNG, WebP, TIFF, or HEIC. The app reads originals without changing them.</small></label><div class="import-meta"><span>${batch.items.length} scan${batch.items.length === 1 ? '' : 's'}</span><span>${formatBytes(totalSize)}</span><span>${complete}/${batch.items.length} complete</span></div></section></div>
      ${batch.items.length ? `<section class="defaults"><div><h3>03 / Apply batch defaults</h3><p>Fill blanks across the batch. Positions use scan order. Existing details stay untouched.</p></div><label>Source item<input id="default-source" value="${escapeHtml(batch.defaultSource || batch.physicalSource)}" placeholder="Album 3"></label><label>Approximate date<input id="default-date" value="${escapeHtml(batch.defaultDate)}"></label><label>Rights note<input id="default-rights" value="${escapeHtml(batch.defaultRights)}"></label><button id="apply-defaults">Fill blank fields</button></section><section aria-labelledby="scans-title"><div class="list-head"><h3 id="scans-title">Scan order <span>${batch.items.length}</span></h3><p>Use the arrow buttons to match physical order.</p></div><ol class="scan-list">${rows}</ol></section>` : `<section class="empty-state"><span aria-hidden="true">▦</span><h3>No scans on the bench yet</h3><p>Start with one folder or album section. The app hashes files in browser order. You can correct that order.</p></section>`}
      <section class="export-bay" aria-labelledby="export-title"><div><p class="eyebrow">RECEIPT OUTPUT</p><h3 id="export-title">04 / Carry the context forward</h3><p>Export a UTF-8 CSV, a self-contained HTML contact sheet, or a restorable JSON project.</p></div><div class="export-actions"><button id="export-csv" class="primary" ${batch.items.length ? '' : 'disabled'}>Export CSV</button><button id="export-html" ${batch.items.length ? '' : 'disabled'}>Export contact sheet</button><button id="export-json">Back up project</button><label class="button-like">Restore project<input id="import-json" type="file" accept="application/json,.json"></label></div></section>
      <section class="how-it-works" aria-labelledby="how-title"><p class="eyebrow">THREE STEPS</p><h2 id="how-title">How it works</h2><ol><li><strong>Import scans</strong><span>Choose the original image files from one album section.</span></li><li><strong>Record context</strong><span>Add the source, position, date, rights note, and scan order.</span></li><li><strong>Export the receipt</strong><span>Keep the CSV, contact sheet, or project backup beside your scans.</span></li></ol></section>
      <section class="boundaries" aria-labelledby="boundaries-title"><p class="eyebrow">CLEAR BOUNDARIES</p><h2 id="boundaries-title">What stays private and what this skips</h2><p>The core workflow sends no scans or notes across the network. License checks send only the license token.</p><p>This tool does not perform OCR, image enhancement, historical identification, cloud hosting, or legal rights analysis.</p></section>
      <section class="plus-panel" aria-labelledby="plus-title"><div class="plus-badge">PLUS</div><div><h2 id="plus-title">Custom archive filenames</h2><p>Use <code>{prefix}</code>, <code>{order}</code>, <code>{source}</code>, <code>{page}</code>, and <code>{date}</code>. Core receipts and every export stay free.</p><label>Filename recipe<input id="custom-pattern" value="${escapeHtml(batch.customPattern)}" ${paid ? '' : 'disabled'}></label><p class="pattern-preview">Example: <code>${escapeHtml(stableFilename(batch, batch.items[0] || { order: 1, originalName: 'scan.jpg', sourceItem: 'album-3', page: '12', approximateDate: '1964' } as ScanItem, true))}</code></p></div><div class="purchase"><strong>${paid ? 'Plus active' : '$12 once'}</strong>${paid ? '<span>License verified on this browser.</span>' : inactiveLicense ? `<p class="license-notice" role="status">This license is no longer active. <a href="${checkoutUrl}" aria-label="Buy Plus on Sociobot checkout (external site)">Buy Plus ↗</a> or paste an active license.</p><button id="restore-license">Have a license?</button>` : `<a class="primary button" href="${checkoutUrl}" aria-label="Buy Plus on Sociobot checkout (external site)">Buy Plus ↗</a><button id="restore-license">Have a license?</button>`}</div></section>
      <div class="danger-zone"><div><strong>Finished with this device?</strong><span>Clear every stored batch and local scan copy.</span></div><button id="clear-batch" class="danger">Clear batch</button></div>
    </section></main>`);
  bindEvents();
  updateOnlineState();
  document.querySelector('#start-link')?.addEventListener('click', () => document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth' }));
}

function refreshNameLabels(): void {
  if (!batch) return;
  document.querySelectorAll<HTMLElement>('.scan-row').forEach(row => {
    const item = batch!.items.find(scan => scan.id === row.dataset.id);
    const label = row.querySelector<HTMLElement>('.stable-name code');
    if (item && label) label.textContent = item.stableName;
  });
  const example = document.querySelector<HTMLElement>('.pattern-preview code');
  if (example) example.textContent = stableFilename(batch, batch.items[0] || { order: 1, originalName: 'scan.jpg', sourceItem: 'album-3', page: '12', approximateDate: '1964' } as ScanItem, true);
}

async function addFiles(files: File[]): Promise<void> {
  if (!batch || hashing || !files.length) return;
  const images = files.filter(file => file.type.startsWith('image/') || /\.(tif|tiff|heic)$/i.test(file.name));
  if (!images.length) return announce('No supported image files were selected. Choose JPG, PNG, WebP, TIFF, or HEIC files.', 'error');
  const originalCount = batch.items.length;
  hashing = true;
  render();
  announce(`Reading ${images.length} original${images.length === 1 ? '' : 's'} and calculating SHA-256 checksums…`, 'info');
  try {
    for (const file of images) {
      const order = batch.items.length + 1;
      const item: ScanItem = { id: crypto.randomUUID(), order, originalName: file.name, stableName: '', type: file.type || 'application/octet-stream', size: file.size, checksum: await sha256(file), sourceItem: batch.defaultSource || batch.physicalSource, page: String(order), approximateDate: batch.defaultDate, rights: batch.defaultRights, notes: '', blob: file };
      item.stableName = stableFilename(batch, item, paid);
      batch.items.push(item);
    }
    if (!demoMode) await saveBatch(batch);
    hashing = false;
    render();
    announce(`${images.length} scan${images.length === 1 ? '' : 's'} imported, checked, and saved.`);
  } catch {
    batch.items.splice(originalCount);
    updateNames();
    hashing = false;
    render();
    announce('The scans were checked but could not be saved. Free browser storage, then choose the scans again.', 'error');
  }
}

function bindEvents(): void {
  document.querySelector<HTMLFormElement>('#batch-form')?.addEventListener('input', event => {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!batch || !(input.name in batch)) return;
    (batch as unknown as Record<string, string>)[input.name] = input.value;
    updateNames();
    refreshNameLabels();
    persistEdit();
  });
  const fileInput = document.querySelector<HTMLInputElement>('#file-input');
  fileInput?.addEventListener('change', () => void addFiles([...fileInput.files!]));
  const drop = document.querySelector<HTMLElement>('#drop-zone');
  drop?.addEventListener('dragover', event => { event.preventDefault(); drop.classList.add('dragging'); });
  drop?.addEventListener('dragleave', () => drop.classList.remove('dragging'));
  drop?.addEventListener('drop', event => { event.preventDefault(); drop.classList.remove('dragging'); void addFiles([...event.dataTransfer!.files]); });
  document.querySelectorAll<HTMLElement>('.scan-row').forEach(row => {
    const id = row.dataset.id!;
    const item = batch!.items.find(scan => scan.id === id)!;
    row.addEventListener('input', event => {
      const field = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (!(field.name in item)) return;
      (item as unknown as Record<string, string>)[field.name] = field.value;
      updateNames();
      refreshNameLabels();
      persistEdit();
    });
    row.querySelector('[data-remove]')?.addEventListener('click', async () => {
      if (!confirm(`Remove ${item.originalName} from this batch? The original file is not affected.`)) return;
      const previous = structuredClone(batch!);
      batch!.items = batch!.items.filter(scan => scan.id !== id);
      updateNames();
      await persistMutation(previous, 'Scan removed and saved to the local batch.');
    });
    row.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button => button.addEventListener('click', async () => {
      const previous = structuredClone(batch!);
      const old = batch!.items.indexOf(item);
      const next = old + (button.dataset.move === 'up' ? -1 : 1);
      [batch!.items[old], batch!.items[next]] = [batch!.items[next], batch!.items[old]];
      updateNames();
      await persistMutation(previous, `${item.originalName} moved to position ${next + 1} and saved.`);
    }));
  });
  document.querySelector('#apply-defaults')?.addEventListener('click', async () => {
    const previous = structuredClone(batch!);
    const source = document.querySelector<HTMLInputElement>('#default-source')!.value;
    const date = document.querySelector<HTMLInputElement>('#default-date')!.value || 'Undated';
    const rights = document.querySelector<HTMLInputElement>('#default-rights')!.value || 'Rights status not evaluated';
    batch!.defaultSource = source; batch!.defaultDate = date; batch!.defaultRights = rights;
    batch!.items.forEach(item => { if (!item.sourceItem.trim()) item.sourceItem = source; if (!item.page.trim()) item.page = String(item.order); if (!item.approximateDate.trim()) item.approximateDate = date; if (!item.rights.trim()) item.rights = rights; });
    updateNames();
    await persistMutation(previous, 'Blank source, position, date, and rights fields filled and saved.');
  });
  document.querySelector('#export-csv')?.addEventListener('click', () => { downloadBlob(new Blob([makeCsv(batch!)], { type: 'text/csv;charset=utf-8' }), `${slugify(batch!.title)}-receipt.csv`); announce('UTF-8 CSV receipt exported.'); });
  document.querySelector('#export-html')?.addEventListener('click', () => void exportHtml());
  document.querySelector('#export-json')?.addEventListener('click', () => void exportJson());
  document.querySelector<HTMLInputElement>('#import-json')?.addEventListener('change', event => void importJson(event));
  document.querySelector<HTMLInputElement>('#custom-pattern')?.addEventListener('input', event => { batch!.customPattern = (event.target as HTMLInputElement).value; updateNames(); refreshNameLabels(); persistEdit(); });
  document.querySelector('#restore-license')?.addEventListener('click', () => void restoreLicense());
  document.querySelector('#clear-batch')?.addEventListener('click', async () => {
    if (!confirm(`Delete “${batch!.title}” and its ${batch!.items.length} locally stored scan${batch!.items.length === 1 ? '' : 's'} from this browser? Export a backup first if needed.`)) return;
    if (demoMode) { batch = blankBatch(); render(); announce('Demo batch cleared. Your real archive was not changed.'); return; }
    try {
      await saveQueue.catch(() => undefined);
      await clearAllBatches();
      batch = blankBatch();
      render();
      announce('Local batch cleared. Originals outside this app were not changed.');
    } catch { announce('The local batch could not be cleared. Free browser storage and try again.', 'error'); }
  });
}

async function exportHtml(): Promise<void> {
  announce('Building the contact sheet…', 'info');
  const cards = await Promise.all(batch!.items.map(async item => {
    let image = '';
    try { image = await thumbnailData(item.blob); } catch { /* Unsupported previews still retain receipt metadata. */ }
    return `<article>${image ? `<img src="${image}" alt="">` : '<div class="no-preview">Preview unavailable</div>'}<h2>${item.order}. ${escapeHtml(item.stableName)}</h2><dl><dt>Original</dt><dd>${escapeHtml(item.originalName)}</dd><dt>Source</dt><dd>${escapeHtml(item.sourceItem)} — ${escapeHtml(item.page)}</dd><dt>Date</dt><dd>${escapeHtml(item.approximateDate)}</dd><dt>Rights</dt><dd>${escapeHtml(item.rights)}</dd><dt>SHA-256</dt><dd><code>${item.checksum}</code></dd></dl>${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}</article>`;
  }));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(batch!.title)} — archive receipt</title><style>body{font:16px/1.5 system-ui;color:#18201d;margin:2rem auto;max-width:1200px;padding:0 1rem}header{border-bottom:4px solid #18201d;margin-bottom:2rem}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:2rem}article{break-inside:avoid;border-top:2px solid;padding-top:1rem}img,.no-preview{width:100%;aspect-ratio:3/2;object-fit:contain;background:#e8eee9}h1,h2{font-family:monospace}h2{font-size:1rem;overflow-wrap:anywhere}dl{display:grid;grid-template-columns:6rem 1fr;margin:.5rem 0}dt{font-weight:bold}dd{margin:0;overflow-wrap:anywhere}code{font-size:.7rem}@media print{body{margin:0}article{page-break-inside:avoid}}</style></head><body><header><h1>${escapeHtml(batch!.title)}</h1><p>${escapeHtml(batch!.collection)} · ${escapeHtml(batch!.physicalSource)} · ${batch!.items.length} scans</p><p>${escapeHtml(batch!.notes)}</p></header><main>${cards.join('')}</main><footer><p>Receipt created ${new Date().toISOString()} with Scan Archive Receipt. SHA-256 values describe the imported original bytes.</p></footer></body></html>`;
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${slugify(batch!.title)}-contact-sheet.html`);
  announce('Self-contained HTML contact sheet exported.');
}

async function exportJson(): Promise<void> {
  const items = await Promise.all(batch!.items.map(async item => ({ ...item, blob: await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(item.blob); }) })));
  downloadBlob(new Blob([JSON.stringify({ ...batch, items }, null, 2)], { type: 'application/json' }), `${slugify(batch!.title)}-project.json`);
  announce('Restorable project backup exported.');
}

async function importJson(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const restored = await decodeProjectBackup(await file.text());
    const replacement = { ...restored, id: crypto.randomUUID(), updatedAt: new Date().toISOString() };
    updateNamesFor(replacement);
    if (!demoMode) await replaceAllBatches(replacement);
    batch = replacement;
    render();
    announce(`Restored ${replacement.items.length} scan${replacement.items.length === 1 ? '' : 's'} from project backup.`);
  } catch { announce('That file is not a valid Scan Archive Receipt project backup. Your current batch was not changed.', 'error'); }
  input.value = '';
}

async function restoreLicense(): Promise<void> {
  const token = prompt('Paste your Scan Archive Receipt license token:');
  if (!token) return;
  storeLicense(token);
  announce('Checking the license…', 'info');
  paid = await verifyLicense(true);
  updateNames();
  render();
  const inactive = Boolean(getLicenseVerdict() && !getLicenseVerdict()!.valid);
  announce(paid ? 'Plus active.' : inactive ? 'This license is no longer active. Buy Plus or paste a different license.' : 'That license could not be verified. Check your connection and try again.', paid ? 'ok' : 'error');
}

function updateOnlineState(): void {
  const banner = document.querySelector<HTMLElement>('#offline-banner');
  if (banner) banner.hidden = navigator.onLine;
}
window.addEventListener('online', updateOnlineState);
window.addEventListener('offline', updateOnlineState);

async function start(): Promise<void> {
  if (location.pathname === '/privacy' || location.pathname === '/terms' || !['/', '/demo'].includes(location.pathname)) {
    render();
  } else {
    try { batch = demoMode ? await sampleBatch() : await loadLatestBatch(); } catch { batch = demoMode ? await sampleBatch().catch(() => blankBatch()) : null; }
    render();
  }
  if (!demoMode && getLicense()) { paid = await verifyLicense(returnedFromCheckout); updateNames(); render(); }
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('/sw.js');
    if (registration.waiting) showUpdate();
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => { if (registration.waiting && navigator.serviceWorker.controller) showUpdate(); }));
    await navigator.serviceWorker.ready;
    await waitForController();
    document.documentElement.dataset.offlineReady = await workerConfirmsOfflineReady() ? 'true' : 'false';
  }
}

function showUpdate(): void {
  const toast = document.querySelector<HTMLElement>('#update-toast');
  if (toast) { toast.hidden = false; toast.querySelector('button')?.addEventListener('click', () => location.reload()); }
}

function waitForController(): Promise<void> {
  if (navigator.serviceWorker.controller) return Promise.resolve();
  return new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
}

function workerConfirmsOfflineReady(): Promise<boolean> {
  return new Promise(resolve => {
    const controller = navigator.serviceWorker.controller;
    if (!controller) return resolve(false);
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => resolve(false), 5000);
    channel.port1.onmessage = event => { clearTimeout(timeout); resolve(event.data?.type === 'OFFLINE_READY' && event.data.ready === true); };
    controller.postMessage({ type: 'CHECK_OFFLINE_READY' }, [channel.port2]);
  });
}

void start();
