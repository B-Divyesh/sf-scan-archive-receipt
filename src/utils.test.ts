import { describe, expect, it } from 'vitest';
import { csvCell, makeCsv, slugify, stableFilename } from './utils';
import type { Batch, ScanItem } from './types';

const item = { order: 7, originalName: 'Grandma Scan.JPEG', sourceItem: 'Album 2', page: 'P 4', approximateDate: 'c. 1964' } as ScanItem;

describe('archive naming', () => {
  it('creates a safe, padded, extension-preserving default name', () => {
    expect(stableFilename({ filenamePrefix: 'Nair Family', customPattern: '' }, item)).toBe('nair-family-0007.jpeg');
  });
  it('replaces custom recipe tokens', () => {
    expect(stableFilename({ filenamePrefix: 'Nair', customPattern: '{prefix}-{date}-{order}-{source}' }, item, true)).toBe('nair-c-1964-0007-album-2.jpeg');
  });
  it('normalizes accented and unsafe text', () => expect(slugify(' Été / 1964 ')).toBe('ete-1964'));
});

describe('interoperable CSV', () => {
  it('escapes quote characters', () => expect(csvCell('Album "Blue"')).toBe('"Album ""Blue"""'));
  it('includes a UTF-8 BOM and CRLF rows', () => {
    const batch = { title:'Test', collection:'Family', physicalSource:'Box', items:[{...item,id:'1',stableName:'test-0007.jpeg',type:'image/jpeg',size:4,checksum:'abc',rights:'Private',notes:'One, two'}] } as Batch;
    const csv = makeCsv(batch);
    expect(csv.startsWith('\uFEFForder,')).toBe(true);
    expect(csv).toContain('\r\n"7","Grandma Scan.JPEG"');
    expect(csv).toContain('"One, two"');
  });
});
