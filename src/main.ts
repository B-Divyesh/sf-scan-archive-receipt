import './style.css';
import type { Batch, ScanItem } from './types';
import { deleteBatch, loadLatestBatch, saveBatch } from './db';
import { checkoutUrl, captureLicense, getLicense, optimisticUnlock, storeLicense, verifyLicense } from './license';
import { downloadBlob, escapeHtml, formatBytes, makeCsv, sha256, slugify, stableFilename, thumbnailData } from './utils';

const app = document.querySelector<HTMLDivElement>('#app')!;
let batch: Batch | null = null;
let hashing = false;
let paid = false;
let objectUrls: string[] = [];
let saveTimer = 0;

captureLicense();
paid = optimisticUnlock();

const blankBatch = (): Batch => ({
  id: crypto.randomUUID(), title: 'Family archive batch', collection: '', physicalSource: '', filenamePrefix: `archive-${new Date().toISOString().slice(0,10)}`,
  customPattern: '{prefix}-{order}', defaultSource: '', defaultDate: 'Undated', defaultRights: 'Rights status not evaluated', notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: []
});

const announce = (message: string, kind: 'ok'|'error'|'info' = 'ok') => {
  const status = document.querySelector<HTMLElement>('#live-status');
  if (status) { status.textContent = message; status.dataset.kind = kind; }
};

const laterSave = () => {
  if (!batch) return;
  clearTimeout(saveTimer); batch.updatedAt = new Date().toISOString();
  saveTimer = window.setTimeout(() => saveBatch(batch!).then(() => announce('Changes saved on this device.')).catch(() => announce('Could not save. Your browser storage may be full.', 'error')), 350);
};

function shell(content: string, legal = false): void {
  app.innerHTML = `<header class="site-header"><a class="brand" href="/" aria-label="Scan Archive Receipt home"><span class="brand-mark" aria-hidden="true">▦</span><span>SCAN / ARCHIVE / RECEIPT</span></a><nav aria-label="Primary"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></header>${content}<footer><p>Made for careful family archives. Your scans stay on this device.</p><p><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <span>Original AI-generated artwork disclosed in the design record.</span></p></footer><div id="update-toast" class="toast" hidden>New version ready. <button id="reload-app">Reload</button></div>`;
  if (!legal) document.querySelector('#start-link')?.addEventListener('click', () => document.querySelector('#workspace')?.scrollIntoView({behavior:'smooth'}));
}

function renderLegal(kind: 'privacy'|'terms'): void {
  const privacy = `<h1>Privacy, by design</h1><p class="lede">Scan Archive Receipt works locally. We designed it so your family photographs do not need to leave your device.</p><h2>What stays on your device</h2><p>Imported image files, previews, provenance notes, filenames, checksums, and batch settings are stored in your browser’s IndexedDB storage. We do not upload, inspect, sell, or track them. EXIF metadata is not extracted.</p><h2>What can leave your device</h2><p>If you verify or purchase a Plus license, the license token is sent to Sociobot’s billing API. Checkout is hosted by Sociobot/Dodo, the merchant of record. Your exported CSV, HTML, and JSON files go only where you choose to save or share them.</p><h2>Storage control</h2><p>Use “Clear batch” inside the app to delete the current local batch. Clearing site data in your browser removes all app data and the stored license. The service worker caches only the public app shell.</p><h2>Contact</h2><p>Privacy questions: <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>.</p>`;
  const terms = `<h1>Terms of use</h1><p class="lede">Use Scan Archive Receipt as a careful bookkeeping aid—not as legal, preservation, or authenticity advice.</p><h2>Your materials</h2><p>You keep all rights to your scans and metadata. You are responsible for having permission to digitize and share materials. Rights fields are descriptive notes, not legal determinations.</p><h2>What the tool does</h2><p>The app reads originals to calculate SHA-256 checksums and make local previews; it does not alter original files. A checksum records bytes, but does not prove authorship or historical authenticity. Keep independent backups and verify exports before relying on them.</p><h2>Plus license</h2><p>Plus is a $12 one-time purchase that unlocks custom filename recipes on one browser after license verification. Core CSV, HTML, and JSON exports remain free. Sociobot/Dodo is the merchant of record and handles payment and refunds; a refund revokes the license.</p><h2>Warranty</h2><p>The software is provided “as is,” without warranties. To the extent permitted by law, Sociobot is not liable for lost files, metadata, or indirect damages. These terms are governed by applicable law.</p><p>Questions: <a href="mailto:support@sociobot.in">support@sociobot.in</a>.</p>`;
  shell(`<main id="main" class="legal"><a class="back-link" href="/">← Back to archive bench</a>${kind === 'privacy' ? privacy : terms}<p class="muted">Effective 28 August 2026</p></main>`, true);
}

function completeness(item: ScanItem): boolean { return Boolean(item.sourceItem.trim() && item.page.trim() && item.approximateDate.trim() && item.rights.trim() && item.checksum); }

function render(): void {
  objectUrls.forEach(URL.revokeObjectURL); objectUrls = [];
  if (location.pathname === '/privacy') return renderLegal('privacy');
  if (location.pathname === '/terms') return renderLegal('terms');
  if (!batch) batch = blankBatch();
  const complete = batch.items.filter(completeness).length;
  const totalSize = batch.items.reduce((sum, item) => sum + item.size, 0);
  const rows = batch.items.map((item, index) => {
    const canPreview = item.type.startsWith('image/'); const url = canPreview ? URL.createObjectURL(item.blob) : ''; if (url) objectUrls.push(url);
    return `<li class="scan-row ${completeness(item) ? 'is-complete' : ''}" data-id="${item.id}">
      <div class="scan-preview">${url ? `<img src="${url}" alt="Preview of ${escapeHtml(item.originalName)}" loading="lazy" decoding="async">` : `<span aria-label="Preview unavailable">NO<br>PREVIEW</span>`}<b>${String(index+1).padStart(3,'0')}</b></div>
      <div class="scan-fields">
        <div class="row-heading"><div><strong>${escapeHtml(item.originalName)}</strong><span>${formatBytes(item.size)} · ${completeness(item) ? 'Receipt complete' : 'Needs details'}</span></div><div class="row-actions"><button data-move="up" aria-label="Move ${escapeHtml(item.originalName)} earlier" ${index === 0 ? 'disabled':''}>↑</button><button data-move="down" aria-label="Move ${escapeHtml(item.originalName)} later" ${index === batch!.items.length-1 ? 'disabled':''}>↓</button><button class="danger-quiet" data-remove aria-label="Remove ${escapeHtml(item.originalName)}">Remove</button></div></div>
        <div class="stable-name"><span>Stable filename</span><code>${escapeHtml(item.stableName)}</code></div>
        <div class="field-grid"><label>Source item<input name="sourceItem" value="${escapeHtml(item.sourceItem)}" placeholder="Album 3"></label><label>Page / position<input name="page" value="${escapeHtml(item.page)}" placeholder="Page 12, top left"></label><label>Approximate date<input name="approximateDate" value="${escapeHtml(item.approximateDate)}" placeholder="c. 1964 or Undated"></label><label>Rights note<input name="rights" value="${escapeHtml(item.rights)}" placeholder="Family use permitted"></label></div>
        <label>Item notes<textarea name="notes" rows="2" placeholder="People named on sleeve, damage, orientation…">${escapeHtml(item.notes)}</textarea></label>
        <details class="checksum"><summary>SHA-256 checksum</summary><code>${item.checksum || 'Not calculated'}</code></details>
      </div></li>`;
  }).join('');
  shell(`<main id="main">
    <section class="hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow">OFFLINE PRESERVATION WORKBENCH // V1</p><h1 id="hero-title">Give every scan<br><em>a durable trail.</em></h1><p class="hero-lede">Turn a folder of family scans into an ordered, checksum-verified receipt—without uploading a single photograph.</p><button class="primary" id="start-link">${batch.items.length ? 'Continue this batch' : 'Start a scan batch'} <span aria-hidden="true">→</span></button><ul class="trust-line"><li>Local only</li><li>Never alters originals</li><li>UTF-8 exports</li></ul></div><div class="hero-art"><picture><source srcset="/assets/hero-480.webp 480w, /assets/hero-960.webp 960w, /assets/hero-1440.webp 1440w" sizes="(max-width: 850px) calc(100vw - 32px), 46vw" type="image/webp"><img src="/assets/hero-960.jpg" width="960" height="640" alt="Pixel-art archive desk with slides, cotton gloves, and a catalog card" fetchpriority="high" decoding="async"></picture><span>FIG 01 / PROVENANCE BENCH</span></div></section>
    <section class="workflow" id="workspace" aria-labelledby="workspace-title"><div class="section-head"><div><p class="eyebrow">ACTIVE RECEIPT</p><h2 id="workspace-title">Batch workbench</h2></div><ol class="stepper" aria-label="Batch progress"><li class="done">1 Describe</li><li class="${batch.items.length?'done':'active'}">2 Import</li><li class="${batch.items.length && complete<batch.items.length?'active':complete?'done':''}">3 Verify</li><li class="${complete && complete===batch.items.length?'active':''}">4 Export</li></ol></div>
      <div id="offline-banner" class="notice info" hidden><strong>Offline:</strong> everything here still works. License verification will resume later.</div>
      <div id="live-status" class="live-status" aria-live="polite"></div>
      <div class="batch-grid"><form id="batch-form" class="batch-meta"><h3>01 / Describe the source</h3><label>Batch title<input name="title" value="${escapeHtml(batch.title)}" required></label><label>Collection or family<input name="collection" value="${escapeHtml(batch.collection)}" placeholder="Nair family photographs"></label><label>Physical source<input name="physicalSource" value="${escapeHtml(batch.physicalSource)}" placeholder="Blue album, shelf B"></label><label>Filename prefix<input name="filenamePrefix" value="${escapeHtml(batch.filenamePrefix)}" pattern="[A-Za-z0-9 _-]+" required aria-describedby="prefix-help"><small id="prefix-help">Safe letters and numbers; files become prefix-0001.ext.</small></label><label>Batch notes<textarea name="notes" rows="3" placeholder="Who supplied it, handling notes, scan settings…">${escapeHtml(batch.notes)}</textarea></label></form>
      <section class="import-zone" aria-labelledby="import-title"><h3 id="import-title">02 / Import original scans</h3><label class="drop-zone" id="drop-zone"><input id="file-input" type="file" accept="image/*,.tif,.tiff" multiple><span class="drop-icon" aria-hidden="true">＋</span><strong>${hashing ? 'Calculating checksums…' : 'Choose scans or drop them here'}</strong><small>JPG, PNG, WebP, TIFF, HEIC; originals are read, never changed.</small></label><div class="import-meta"><span>${batch.items.length} scan${batch.items.length===1?'':'s'}</span><span>${formatBytes(totalSize)}</span><span>${complete}/${batch.items.length} complete</span></div></section></div>
      ${batch.items.length ? `<section class="defaults"><div><h3>03 / Apply batch defaults</h3><p>Fill blanks across the batch. Positions use scan order; existing details stay untouched.</p></div><label>Source item<input id="default-source" value="${escapeHtml(batch.defaultSource || batch.physicalSource)}" placeholder="Album 3"></label><label>Approximate date<input id="default-date" value="${escapeHtml(batch.defaultDate)}"></label><label>Rights note<input id="default-rights" value="${escapeHtml(batch.defaultRights)}"></label><button id="apply-defaults">Fill blank fields</button></section><section aria-labelledby="scans-title"><div class="list-head"><h3 id="scans-title">Scan order <span>${batch.items.length}</span></h3><p>Use the arrow buttons to match physical order.</p></div><ol class="scan-list">${rows}</ol></section>` : `<section class="empty-state"><span aria-hidden="true">▦</span><h3>No scans on the bench yet</h3><p>Start with one folder or album section. Files are hashed in the order your browser provides them, then you can correct that order.</p></section>`}
      <section class="export-bay" aria-labelledby="export-title"><div><p class="eyebrow">RECEIPT OUTPUT</p><h3 id="export-title">04 / Carry the context forward</h3><p>Exports are yours: a spreadsheet-ready manifest, a self-contained visual contact sheet, and a restorable project backup.</p></div><div class="export-actions"><button id="export-csv" class="primary" ${batch.items.length?'':'disabled'}>Export CSV</button><button id="export-html" ${batch.items.length?'':'disabled'}>Export contact sheet</button><button id="export-json">Back up project</button><label class="button-like">Restore project<input id="import-json" type="file" accept="application/json,.json"></label></div></section>
      <section class="plus-panel" aria-labelledby="plus-title"><div class="plus-badge">PLUS</div><div><h3 id="plus-title">Custom archive filenames</h3><p>Use <code>{prefix}</code>, <code>{order}</code>, <code>{source}</code>, <code>{page}</code>, and <code>{date}</code>. Core receipts and every export stay free.</p><label>Filename recipe<input id="custom-pattern" value="${escapeHtml(batch.customPattern)}" ${paid?'':'disabled'}></label><p class="pattern-preview">Example: <code>${escapeHtml(stableFilename(batch, batch.items[0] || {order:1,originalName:'scan.jpg',sourceItem:'album-3',page:'12',approximateDate:'1964'} as ScanItem, true))}</code></p></div><div class="purchase"><strong>${paid?'Plus unlocked':'$12 once'}</strong>${paid?'<span>License verified on this browser.</span>':`<a class="primary button" href="${checkoutUrl}">Buy Plus</a><button id="restore-license">Have a license?</button>`}</div></section>
      <div class="danger-zone"><div><strong>Finished with this device?</strong><span>Clear the stored batch and all local scan copies.</span></div><button id="clear-batch" class="danger">Clear batch</button></div>
    </section></main>`);
  bindEvents(); updateOnlineState();
}

function updateNames(): void {
  if (!batch) return;
  batch.items.forEach((item, i) => { item.order = i + 1; item.stableName = stableFilename(batch!, item, paid); });
}

async function addFiles(files: File[]): Promise<void> {
  if (!batch || hashing || !files.length) return;
  const images = files.filter(file => file.type.startsWith('image/') || /\.(tif|tiff|heic)$/i.test(file.name));
  if (!images.length) return announce('No supported image files were selected.', 'error');
  hashing = true; render(); announce(`Reading ${images.length} original${images.length===1?'':'s'} and calculating SHA-256 checksums…`, 'info');
  try {
    for (const file of images) {
      const order = batch.items.length + 1;
      const item: ScanItem = {id:crypto.randomUUID(),order,originalName:file.name,stableName:'',type:file.type||'application/octet-stream',size:file.size,checksum:await sha256(file),sourceItem:batch.defaultSource || batch.physicalSource,page:String(order),approximateDate:batch.defaultDate,rights:batch.defaultRights,notes:'',blob:file};
      item.stableName = stableFilename(batch, item, paid); batch.items.push(item);
    }
    await saveBatch(batch);
  } catch { announce('Import stopped. This device may not have enough local storage for these files.', 'error'); }
  hashing = false; render(); announce(`${images.length} scan${images.length===1?'':'s'} imported and verified.`);
}

function bindEvents(): void {
  document.querySelector<HTMLFormElement>('#batch-form')?.addEventListener('input', event => {
    const input = event.target as HTMLInputElement|HTMLTextAreaElement; if (!batch || !(input.name in batch)) return;
    (batch as unknown as Record<string,string>)[input.name] = input.value; updateNames(); laterSave();
  });
  const fileInput = document.querySelector<HTMLInputElement>('#file-input'); fileInput?.addEventListener('change', () => addFiles([...fileInput.files!]))
  const drop = document.querySelector<HTMLElement>('#drop-zone');
  drop?.addEventListener('dragover', event => {event.preventDefault(); drop.classList.add('dragging')}); drop?.addEventListener('dragleave', () => drop.classList.remove('dragging')); drop?.addEventListener('drop', event => {event.preventDefault();drop.classList.remove('dragging');addFiles([...event.dataTransfer!.files])});
  document.querySelectorAll<HTMLElement>('.scan-row').forEach(row => {
    const id = row.dataset.id!; const item = batch!.items.find(scan => scan.id === id)!;
    row.addEventListener('input', event => { const field = event.target as HTMLInputElement|HTMLTextAreaElement; if (!(field.name in item)) return; (item as unknown as Record<string,string>)[field.name]=field.value; updateNames(); laterSave(); });
    row.querySelector('[data-remove]')?.addEventListener('click', () => { if (confirm(`Remove ${item.originalName} from this batch? The original file is not affected.`)) { batch!.items=batch!.items.filter(scan=>scan.id!==id);updateNames();laterSave();render();announce('Scan removed from the local batch.'); }});
    row.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button => button.addEventListener('click', () => {const old=batch!.items.indexOf(item), next=old+(button.dataset.move==='up'?-1:1); [batch!.items[old],batch!.items[next]]=[batch!.items[next],batch!.items[old]];updateNames();laterSave();render();announce(`${item.originalName} moved to position ${next+1}.`);}));
  });
  document.querySelector('#apply-defaults')?.addEventListener('click', () => {const source=document.querySelector<HTMLInputElement>('#default-source')!.value;const date=(document.querySelector<HTMLInputElement>('#default-date')!.value||'Undated');const rights=(document.querySelector<HTMLInputElement>('#default-rights')!.value||'Rights status not evaluated');batch!.defaultSource=source;batch!.defaultDate=date;batch!.defaultRights=rights;batch!.items.forEach(item=>{if(!item.sourceItem.trim())item.sourceItem=source;if(!item.page.trim())item.page=String(item.order);if(!item.approximateDate.trim())item.approximateDate=date;if(!item.rights.trim())item.rights=rights});updateNames();laterSave();render();announce('Blank source, position, date, and rights fields filled.');});
  document.querySelector('#export-csv')?.addEventListener('click', () => {downloadBlob(new Blob([makeCsv(batch!)],{type:'text/csv;charset=utf-8'}),`${slugify(batch!.title)}-receipt.csv`);announce('UTF-8 CSV receipt exported.');});
  document.querySelector('#export-html')?.addEventListener('click', exportHtml);
  document.querySelector('#export-json')?.addEventListener('click', exportJson);
  document.querySelector<HTMLInputElement>('#import-json')?.addEventListener('change', importJson);
  document.querySelector<HTMLInputElement>('#custom-pattern')?.addEventListener('input', event => {batch!.customPattern=(event.target as HTMLInputElement).value;updateNames();laterSave();});
  document.querySelector('#restore-license')?.addEventListener('click', restoreLicense);
  document.querySelector('#clear-batch')?.addEventListener('click', async () => {if(!confirm(`Delete “${batch!.title}” and its ${batch!.items.length} locally stored scan${batch!.items.length===1?'':'s'} from this browser? Export a backup first if needed.`))return;await deleteBatch(batch!.id);batch=blankBatch();render();announce('Local batch cleared. Originals outside this app were not changed.');});
}

async function exportHtml(): Promise<void> {
  announce('Building the contact sheet…', 'info');
  const cards = await Promise.all(batch!.items.map(async item => {let image='';try{image=await thumbnailData(item.blob)}catch{}return `<article>${image?`<img src="${image}" alt="">`:'<div class="no-preview">Preview unavailable</div>'}<h2>${item.order}. ${escapeHtml(item.stableName)}</h2><dl><dt>Original</dt><dd>${escapeHtml(item.originalName)}</dd><dt>Source</dt><dd>${escapeHtml(item.sourceItem)} — ${escapeHtml(item.page)}</dd><dt>Date</dt><dd>${escapeHtml(item.approximateDate)}</dd><dt>Rights</dt><dd>${escapeHtml(item.rights)}</dd><dt>SHA-256</dt><dd><code>${item.checksum}</code></dd></dl>${item.notes?`<p>${escapeHtml(item.notes)}</p>`:''}</article>`}));
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(batch!.title)} — archive receipt</title><style>body{font:16px/1.5 system-ui;color:#18201d;margin:2rem auto;max-width:1200px;padding:0 1rem}header{border-bottom:4px solid #18201d;margin-bottom:2rem}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:2rem}article{break-inside:avoid;border-top:2px solid;padding-top:1rem}img,.no-preview{width:100%;aspect-ratio:3/2;object-fit:contain;background:#e8eee9}h1,h2{font-family:monospace}h2{font-size:1rem;overflow-wrap:anywhere}dl{display:grid;grid-template-columns:6rem 1fr;margin:.5rem 0}dt{font-weight:bold}dd{margin:0;overflow-wrap:anywhere}code{font-size:.7rem}@media print{body{margin:0}article{page-break-inside:avoid}}</style></head><body><header><h1>${escapeHtml(batch!.title)}</h1><p>${escapeHtml(batch!.collection)} · ${escapeHtml(batch!.physicalSource)} · ${batch!.items.length} scans</p><p>${escapeHtml(batch!.notes)}</p></header><main>${cards.join('')}</main><footer><p>Receipt created ${new Date().toISOString()} with Scan Archive Receipt. SHA-256 values describe the imported original bytes.</p></footer></body></html>`;
  downloadBlob(new Blob([html],{type:'text/html;charset=utf-8'}),`${slugify(batch!.title)}-contact-sheet.html`);announce('Self-contained HTML contact sheet exported.');
}

async function exportJson(): Promise<void> {
  const items=await Promise.all(batch!.items.map(async item=>({...item,blob:await new Promise<string>(resolve=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.readAsDataURL(item.blob)})})));
  downloadBlob(new Blob([JSON.stringify({...batch,items},null,2)],{type:'application/json'}),`${slugify(batch!.title)}-project.json`);announce('Restorable project backup exported.');
}

async function importJson(event: Event): Promise<void> {
  const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
  try {const raw=JSON.parse(await file.text()) as Omit<Batch,'items'> & {items:(Omit<ScanItem,'blob'>&{blob:string})[]};if(!raw.id||!Array.isArray(raw.items))throw new Error();const items=await Promise.all(raw.items.map(async item=>({...item,blob:await (await fetch(item.blob)).blob()})));batch={...raw,id:crypto.randomUUID(),items,updatedAt:new Date().toISOString()};updateNames();await saveBatch(batch);render();announce(`Restored ${items.length} scans from project backup.`);} catch {announce('That file is not a valid Scan Archive Receipt project backup.','error');}
}

async function restoreLicense(): Promise<void> {
  const token=prompt('Paste your Scan Archive Receipt license token:'); if(!token)return;storeLicense(token);announce('Checking the license…','info');paid=await verifyLicense(true);render();announce(paid?'Plus unlocked.':'That license could not be verified. Check the token or your connection.',paid?'ok':'error');
}

function updateOnlineState(): void { const banner=document.querySelector<HTMLElement>('#offline-banner');if(banner)banner.hidden=navigator.onLine; }
window.addEventListener('online',updateOnlineState);window.addEventListener('offline',updateOnlineState);

async function start(): Promise<void> {
  try { batch=await loadLatestBatch(); } catch { batch=null; }
  render();
  if(getLicense()){paid=await verifyLicense();updateNames();render();}
  if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.register('/sw.js');if(registration.waiting)showUpdate();registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',()=>{if(registration.waiting&&navigator.serviceWorker.controller)showUpdate()}));await navigator.serviceWorker.ready;try{const urls=[...document.querySelectorAll<HTMLScriptElement>('script[src]'),...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map(element=>element instanceof HTMLScriptElement?element.src:element.href);const hero=document.querySelector<HTMLImageElement>('.hero-art img')?.currentSrc;if(hero)urls.push(hero);await (await caches.open('scan-receipt-shell-v2')).addAll([...new Set(urls)]);document.documentElement.dataset.offlineReady='true';}catch{document.documentElement.dataset.offlineReady='false';}}
}
function showUpdate(){const toast=document.querySelector<HTMLElement>('#update-toast');if(toast){toast.hidden=false;toast.querySelector('button')?.addEventListener('click',()=>location.reload())}}

start();
