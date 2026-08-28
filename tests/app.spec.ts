import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const scanPath = path.join(process.cwd(), 'public/icons/icon-192.png');

async function storedBatchCount(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('scan-archive-receipt', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const count = request.result.transaction('batches').objectStore('batches').count();
      count.onerror = () => reject(count.error);
      count.onsuccess = () => resolve(count.result);
    };
  }));
}

test('imports a scan, records metadata, and survives reload', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.locator('#file-input').setInputFiles(scanPath);
  await expect(page.getByText('1 scan imported and verified.')).toBeVisible();
  const scanRow = page.locator('.scan-row');
  await scanRow.getByLabel('Source item').fill('Blue album');
  await scanRow.getByLabel('Page / position').fill('Page 4');
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.locator('.scan-row').getByLabel('Source item')).toHaveValue('Blue album');
  await expect(page.locator('.checksum code')).not.toHaveText('Not calculated');
  await expect(page.locator('.stable-name code')).toContainText('-0001.png');
  const [csvDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
  const csvPath = await csvDownload.path();
  expect(csvPath && (await readFile(csvPath, 'utf8'))).toContain('"Blue album","Page 4"');
  const [htmlDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export contact sheet' }).click()]);
  const htmlPath = await htmlDownload.path();
  expect(htmlPath && (await readFile(htmlPath, 'utf8'))).toContain('SHA-256');
  expect(consoleErrors).toEqual([]);
});

test('has no serious accessibility violations at desktop and mobile', async ({ page }) => {
  await page.goto('/');
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => ['serious','critical'].includes(v.impact || ''))).toEqual([]);
  await page.locator('#file-input').setInputFiles(scanPath);
  await expect(page.locator('.scan-row')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => ['serious','critical'].includes(v.impact || ''))).toEqual([]);
  const containment = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(containment.document).toBeLessThanOrEqual(containment.viewport);
  expect(containment.body).toBeLessThanOrEqual(containment.viewport);
  const row = await page.locator('.scan-row').boundingBox();
  const fields = await page.locator('.scan-fields').boundingBox();
  expect(row && row.x + row.width).toBeLessThanOrEqual(390);
  expect(fields && fields.x + fields.width).toBeLessThanOrEqual(390);
});

test('rejects malformed restore without changing or persisting over the usable batch', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await page.locator('#file-input').setInputFiles(scanPath);
  await expect(page.locator('.scan-row')).toHaveCount(1);
  await page.locator('#import-json').setInputFiles({
    name: 'malformed-project.json', mimeType: 'application/json', buffer: Buffer.from('{"id":"looks-valid","items":[]}')
  });
  await expect(page.getByText('Your current batch was not changed.', { exact: false })).toBeVisible();
  expect(await storedBatchCount(page)).toBe(1);
  await page.reload();
  await expect(page.locator('.scan-row')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('Give every scan');
  expect(pageErrors).toEqual([]);
});

test('ignores a legacy malformed IndexedDB record on launch', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('scan-archive-receipt', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction('batches', 'readwrite');
      transaction.objectStore('batches').put({ id: 'looks-valid', items: [] });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  }));
  await page.reload();
  await expect(page.locator('h1')).toContainText('Give every scan');
  await expect(page.getByText('No scans on the bench yet')).toBeVisible();
});

test('restore replaces prior private records and clear removes every stored copy', async ({ page }) => {
  await page.goto('/');
  await page.locator('#file-input').setInputFiles(scanPath);
  const [backup] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Back up project' }).click()]);
  const backupPath = await backup.path();
  expect(backupPath).toBeTruthy();
  await page.locator('#import-json').setInputFiles(backupPath!);
  await expect(page.getByText('Restored 1 scan from project backup.')).toBeVisible();
  expect(await storedBatchCount(page)).toBe(1);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Clear batch' }).click();
  await expect(page.getByText('Local batch cleared.', { exact: false })).toBeVisible();
  expect(await storedBatchCount(page)).toBe(0);
  await page.reload();
  await expect(page.locator('.scan-row')).toHaveCount(0);
  await expect(page.getByText('No scans on the bench yet')).toBeVisible();
});

test('restore and navigation controls expose visible 44px keyboard targets', async ({ page }) => {
  await page.goto('/');
  await page.locator('#import-json').focus();
  const restore = await page.locator('.button-like').evaluate(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { width: rect.width, height: rect.height, outline: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(restore.width).toBeGreaterThanOrEqual(44);
  expect(restore.height).toBeGreaterThanOrEqual(44);
  expect(restore.outline).not.toBe('none');
  expect(restore.outlineWidth).toBe('3px');
  for (const target of await page.locator('.brand, .site-header nav a, footer a').all()) {
    const box = await target.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test('reopens the app shell while offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.waitForSelector('html[data-offline-ready="true"]');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toContainText('Give every scan');
  await expect(page.getByText('Offline:', { exact: false })).toBeVisible();
});
