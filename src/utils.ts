import type { Batch, ScanItem } from './types';

export const slugify = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'scan';

export function stableFilename(batch: Pick<Batch, 'filenamePrefix' | 'customPattern'>, item: Pick<ScanItem, 'order' | 'originalName' | 'sourceItem' | 'page' | 'approximateDate'>, custom = false): string {
  const extension = item.originalName.includes('.') ? item.originalName.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : 'img';
  const index = String(item.order).padStart(4, '0');
  if (!custom || !batch.customPattern.trim()) return `${slugify(batch.filenamePrefix)}-${index}.${extension}`;
  const base = batch.customPattern
    .replaceAll('{prefix}', slugify(batch.filenamePrefix))
    .replaceAll('{order}', index)
    .replaceAll('{source}', slugify(item.sourceItem || 'item'))
    .replaceAll('{page}', slugify(item.page || 'na'))
    .replaceAll('{date}', slugify(item.approximateDate || 'undated'));
  return `${slugify(base)}.${extension}`;
}

export async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export function makeCsv(batch: Batch): string {
  const headings = ['order','original_filename','stable_filename','sha256','bytes','media_type','collection','physical_source','source_item','page_or_position','approximate_date','rights_statement','notes'];
  const rows = batch.items.map(item => [item.order,item.originalName,item.stableName,item.checksum,item.size,item.type,batch.collection,batch.physicalSource,item.sourceItem,item.page,item.approximateDate,item.rights,item.notes].map(csvCell).join(','));
  return `\uFEFF${headings.join(',')}\r\n${rows.join('\r\n')}\r\n`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export const escapeHtml = (value: string) => value.replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]!));

export async function thumbnailData(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const ratio = Math.min(1, 360 / bitmap.width, 240 / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', .72);
}
