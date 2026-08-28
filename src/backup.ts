import type { Batch, ScanItem } from './types';

type BackupItem = Omit<ScanItem, 'blob'> & { blob: string };
type ProjectBackup = Omit<Batch, 'items'> & { items: BackupItem[] };

const batchStrings = ['id', 'title', 'collection', 'physicalSource', 'filenamePrefix', 'customPattern', 'defaultSource', 'defaultDate', 'defaultRights', 'notes', 'createdAt', 'updatedAt'] as const;
const itemStrings = ['id', 'originalName', 'stableName', 'type', 'checksum', 'sourceItem', 'page', 'approximateDate', 'rights', 'notes'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const hasStrings = (value: Record<string, unknown>, keys: readonly string[]) => keys.every(key => typeof value[key] === 'string');
const validDate = (value: string) => value.length > 0 && Number.isFinite(Date.parse(value));

function validCommonBatch(value: unknown): value is Omit<Batch, 'items'> & { items: unknown[] } {
  if (!isRecord(value) || !hasStrings(value, batchStrings) || !Array.isArray(value.items)) return false;
  const candidate = value as Record<(typeof batchStrings)[number], string> & { items: unknown[] };
  return candidate.id.length > 0 && candidate.title.trim().length > 0 && candidate.filenamePrefix.trim().length > 0
    && candidate.customPattern.trim().length > 0 && validDate(candidate.createdAt) && validDate(candidate.updatedAt);
}

function validCommonItem(value: unknown, count: number): value is Omit<ScanItem, 'blob'> & { blob: unknown } {
  if (!isRecord(value) || !hasStrings(value, itemStrings)) return false;
  const candidate = value as Record<(typeof itemStrings)[number], string> & Record<'order'|'size', unknown>;
  return candidate.id.length > 0 && candidate.originalName.length > 0
    && Number.isInteger(candidate.order) && Number(candidate.order) >= 1 && Number(candidate.order) <= count
    && Number.isFinite(candidate.size) && Number(candidate.size) >= 0
    && /^[a-f\d]{64}$/i.test(candidate.checksum);
}

export function isStoredBatch(value: unknown): value is Batch {
  if (!validCommonBatch(value)) return false;
  const ids = new Set<string>();
  return value.items.every(item => {
    if (!validCommonItem(item, value.items.length) || !(item.blob instanceof Blob) || item.blob.size !== item.size || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}

function isBase64DataUrl(value: string): boolean {
  const match = /^data:[^,]*;base64,([a-z\d+/]*={0,2})$/i.exec(value);
  return Boolean(match && match[1].length % 4 === 0);
}

function parseBackup(value: unknown): ProjectBackup {
  if (!validCommonBatch(value)) throw new Error('Invalid batch');
  const ids = new Set<string>();
  const valid = value.items.every(item => {
    if (!validCommonItem(item, value.items.length) || typeof item.blob !== 'string' || ids.has(item.id)) return false;
    ids.add(item.id);
    return isBase64DataUrl(item.blob);
  });
  if (!valid) throw new Error('Invalid items');
  return value as ProjectBackup;
}

export async function decodeProjectBackup(text: string): Promise<Batch> {
  const raw = parseBackup(JSON.parse(text) as unknown);
  const items = await Promise.all(raw.items.map(async item => {
    const response = await fetch(item.blob);
    if (!response.ok) throw new Error('Invalid blob');
    const blob = await response.blob();
    if (blob.size !== item.size) throw new Error('Blob size mismatch');
    return { ...item, blob };
  }));
  const restored: Batch = { ...raw, items };
  if (!isStoredBatch(restored)) throw new Error('Invalid restored project');
  return restored;
}
