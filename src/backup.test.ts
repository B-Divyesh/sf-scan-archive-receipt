import { describe, expect, it } from 'vitest';
import { decodeProjectBackup, isStoredBatch } from './backup';

const now = '2026-08-28T00:00:00.000Z';
const bytes = 'aGVsbG8=';
const checksum = 'a'.repeat(64);

function validBackup() {
  return {
    id: 'batch-1', title: 'Family scans', collection: '', physicalSource: '', filenamePrefix: 'family',
    customPattern: '{prefix}-{order}', defaultSource: '', defaultDate: 'Undated', defaultRights: 'Unknown', notes: '',
    createdAt: now, updatedAt: now,
    items: [{ id: 'scan-1', order: 1, originalName: 'scan.png', stableName: 'family-0001.png', type: 'image/png', size: 5,
      checksum, sourceItem: 'Album', page: '1', approximateDate: 'Undated', rights: 'Unknown', notes: '', blob: `data:image/png;base64,${bytes}` }]
  };
}

describe('project backup validation', () => {
  it('decodes a complete backup and verifies its embedded bytes', async () => {
    const batch = await decodeProjectBackup(JSON.stringify(validBackup()));
    expect(batch.items[0].blob).toBeInstanceOf(Blob);
    expect(batch.items[0].blob.size).toBe(5);
    expect(isStoredBatch(batch)).toBe(true);
  });

  it('rejects the minimally malformed backup from independent verification', async () => {
    await expect(decodeProjectBackup('{"id":"looks-valid","items":[]}')).rejects.toThrow('Invalid batch');
  });

  it('rejects incomplete item fields and mismatched embedded bytes', async () => {
    const incomplete = validBackup();
    delete (incomplete.items[0] as Partial<(typeof incomplete.items)[number]>).rights;
    await expect(decodeProjectBackup(JSON.stringify(incomplete))).rejects.toThrow('Invalid items');

    const mismatch = validBackup();
    mismatch.items[0].size = 99;
    await expect(decodeProjectBackup(JSON.stringify(mismatch))).rejects.toThrow('Blob size mismatch');
  });
});
