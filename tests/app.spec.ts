import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

test('imports a scan, records metadata, and survives reload', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.locator('#file-input').setInputFiles(path.join(process.cwd(), 'public/icons/icon-192.png'));
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => ['serious','critical'].includes(v.impact || ''))).toEqual([]);
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
