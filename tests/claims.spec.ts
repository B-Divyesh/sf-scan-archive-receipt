import { expect, test } from '@playwright/test';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const scanPath = path.join(process.cwd(), 'public/icons/icon-192.png');

test('@claim:local-only core demo flow sends no scans or notes off origin', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/demo');
  await page.locator('.scan-row').first().getByLabel('Item notes').fill('Private family note');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
  expect(await download.path()).toBeTruthy();
  const productOrigin = new URL(page.url()).origin;
  expect(requests.every(url => new URL(url).origin === productOrigin)).toBe(true);
});

test('@claim:original-integrity reads original bytes without changing them or extracting EXIF', async ({ page }) => {
  const original = await readFile(scanPath);
  const before = createHash('sha256').update(original).digest('hex');
  await page.goto('/demo');
  await page.locator('#file-input').setInputFiles({ name: 'exif-family-photo.jpg', mimeType: 'image/jpeg', buffer: original });
  await expect(page.locator('.scan-row')).toHaveCount(4);
  const [backup] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Back up project' }).click()]);
  const backupPath = await backup.path();
  const backupData = JSON.parse(await readFile(backupPath!, 'utf8')) as Record<string, unknown>;
  const keys: string[] = [];
  const collectKeys = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(collectKeys);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) { keys.push(key.toLowerCase()); collectKeys(child); }
  };
  collectKeys(backupData);
  expect(keys).not.toContain('exif');
  expect(createHash('sha256').update(await readFile(scanPath)).digest('hex')).toBe(before);
});

test('@claim:offline-reload reloads the sample receipt and exports while offline after one visit', async ({ page, context }) => {
  await page.goto('/demo');
  await page.waitForSelector('html[data-offline-ready="true"]');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.scan-row')).toHaveCount(3);
  await expect(page.getByText('Offline:', { exact: false })).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
  expect(await download.path()).toBeTruthy();
});

test('@claim:sha256 calculates SHA-256 from the imported original bytes', async ({ page }) => {
  const original = await readFile(scanPath);
  const expected = createHash('sha256').update(original).digest('hex');
  await page.goto('/demo');
  await page.locator('#file-input').setInputFiles({ name: 'known-bytes.png', mimeType: 'image/png', buffer: original });
  const row = page.locator('.scan-row').last();
  await row.getByText('SHA-256 checksum').click();
  await expect(row.locator('.checksum code')).toHaveText(expected);
});

test('@claim:metadata-receipt records context, reorders scans, and assigns stable padded filenames', async ({ page }) => {
  await page.goto('/demo');
  const last = page.locator('.scan-row').last();
  await expect(last.getByLabel('Source item')).toHaveValue('Green family album');
  await expect(last.getByLabel('Page / position')).toHaveValue('Page 4, bottom right');
  await last.getByRole('button', { name: /Move .* earlier/ }).click();
  await expect(page.locator('.scan-row').nth(1).locator('.stable-name code')).toHaveText('nair-family-album-01-0002.webp');
});

test('@claim:three-exports creates UTF-8 CSV, self-contained HTML, and a restorable JSON project', async ({ page }) => {
  await page.goto('/demo');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
  const csvText = await readFile((await csv.path())!, 'utf8');
  expect(csvText.startsWith('\uFEFForder,')).toBe(true);
  expect(csvText.trim().split('\r\n')).toHaveLength(4);
  const [html] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export contact sheet' }).click()]);
  const htmlText = await readFile((await html.path())!, 'utf8');
  expect(htmlText).toContain('<!doctype html>');
  expect(htmlText).toContain('data:image/jpeg;base64,');
  const [backup] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Back up project' }).click()]);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Clear batch' }).click();
  await expect(page.locator('.scan-row')).toHaveCount(0);
  await page.locator('#import-json').setInputFiles((await backup.path())!);
  await expect(page.locator('.scan-row')).toHaveCount(3);
});

test('@claim:indexeddb-persistence keeps real projects across an immediate refresh', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Start for real' }).click();
  await page.locator('#file-input').setInputFiles(scanPath);
  await page.locator('.scan-row').getByLabel('Source item').fill('Archive box 7');
  await page.reload();
  await expect(page.locator('.scan-row').getByLabel('Source item')).toHaveValue('Archive box 7');
});

test('@claim:clear-batch deletes every locally stored batch and scan copy', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Start for real' }).click();
  await page.locator('#file-input').setInputFiles(scanPath);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Clear batch' }).click();
  await expect(page.getByText('Local batch cleared.')).toBeVisible();
  expect(await page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('scan-archive-receipt', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const count = request.result.transaction('batches').objectStore('batches').count();
      count.onsuccess = () => resolve(count.result);
      count.onerror = () => reject(count.error);
    };
  }))).toBe(0);
});

test('@claim:free-core-plus-price keeps all exports free and lists Plus at $12 once', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('$12 once')).toBeVisible();
  await expect(page.locator('#custom-pattern')).toBeDisabled();
  for (const name of ['Export CSV', 'Export contact sheet', 'Back up project']) await expect(page.getByRole('button', { name })).toBeEnabled();
  await expect(page.getByRole('link', { name: 'Buy Plus' })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/scan-archive-receipt/checkout');
  await page.route('https://api.sociobot.in/api/v1/products/scan-archive-receipt/verify?license=claim-token', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"valid":true,"reason":"ok"}' }));
  await page.goto('/?license=claim-token');
  await page.locator('#file-input').setInputFiles(scanPath);
  await page.locator('#custom-pattern').fill('{prefix}-{source}-{order}');
  await expect(page.locator('.stable-name code')).toContainText('archive-');
  await expect(page.locator('.stable-name code')).toContainText('-item-0001.png');
});

test('@claim:supported-formats imports JPG, PNG, WebP, TIFF, and HEIC files', async ({ page }) => {
  const bytes = await readFile(scanPath);
  await page.goto('/demo');
  await page.locator('#file-input').setInputFiles([
    { name: 'one.jpg', mimeType: 'image/jpeg', buffer: bytes },
    { name: 'two.png', mimeType: 'image/png', buffer: bytes },
    { name: 'three.webp', mimeType: 'image/webp', buffer: bytes },
    { name: 'four.tiff', mimeType: 'image/tiff', buffer: bytes },
    { name: 'five.heic', mimeType: 'image/heic', buffer: bytes }
  ]);
  await expect(page.getByText('5 scans imported, checked, and saved.')).toBeVisible();
  await expect(page.locator('.scan-row')).toHaveCount(8);
});

test('@claim:scope-boundaries exposes no OCR, enhancement, identification, cloud, or legal-analysis action', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('This tool does not perform OCR')).toBeVisible();
  const actionNames = await page.getByRole('button').allTextContents();
  expect(actionNames.join(' ')).not.toMatch(/OCR|enhance|identify|cloud|legal analysis/i);
});

test('@claim:license-network sends only the license token for verification', async ({ page }) => {
  let observed: { method: string; url: string; body: string | null } | undefined;
  await page.goto('/demo');
  await page.route('https://api.sociobot.in/api/v1/products/scan-archive-receipt/verify?license=network-token', route => {
    const request = route.request();
    observed = { method: request.method(), url: request.url(), body: request.postData() };
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"valid":true,"reason":"ok"}' });
  });
  await page.goto('/?license=network-token');
  await expect(page.locator('#custom-pattern')).toBeEnabled();
  expect(observed).toEqual({ method: 'GET', url: 'https://api.sociobot.in/api/v1/products/scan-archive-receipt/verify?license=network-token', body: null });
});
