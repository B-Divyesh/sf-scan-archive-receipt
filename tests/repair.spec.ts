import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const scanPath = path.join(process.cwd(), 'public/icons/icon-192.png');

test('@claim:demo-isolation offers one-click sample data in an isolated resettable demo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('For family historians')).toBeVisible();
  await page.locator('#file-input').setInputFiles(scanPath);
  await expect(page.locator('.scan-row')).toHaveCount(1);
  await page.getByRole('link', { name: /Try it with sample data/ }).click();
  await expect(page).toHaveURL('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('.scan-row')).toHaveCount(3);
  await expect(page.locator('input[name="title"]')).toHaveValue('Nair family album · 1958–1962');
  await page.locator('.scan-row').first().getByLabel('Source item').fill('Temporary demo edit');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('.scan-row').first().getByLabel('Source item')).toHaveValue('Green family album');
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(database => database.name).filter(Boolean))).not.toContain('demo:scan-archive-receipt');
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.scan-row')).toHaveCount(1);
});

test('persists edits and removals before announcing completion', async ({ page }) => {
  const image = await readFile(scanPath);
  await page.goto('/');
  await page.locator('#file-input').setInputFiles([
    { name: 'first.png', mimeType: 'image/png', buffer: image },
    { name: 'second.png', mimeType: 'image/png', buffer: image }
  ]);
  const first = page.locator('.scan-row').first();
  await first.getByLabel('Source item').fill('Blue album');
  await page.reload();
  await expect(page.locator('.scan-row').first().getByLabel('Source item')).toHaveValue('Blue album');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.scan-row').first().getByRole('button', { name: /Remove/ }).click();
  await expect(page.getByText('Scan removed and saved to the local batch.')).toBeVisible();
  await page.reload();
  await expect(page.locator('.scan-row')).toHaveCount(1);
  await expect(page.locator('.scan-row strong').first()).toHaveText('second.png');
});

test('keeps a storage failure visible and never reports false import success', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const factory = indexedDB as IDBFactory & { originalOpen?: IDBFactory['open'] };
    factory.originalOpen = factory.open.bind(factory);
    Object.defineProperty(factory, 'open', { configurable: true, value: () => { throw new DOMException('Quota blocked', 'QuotaExceededError'); } });
  });
  await page.locator('#file-input').setInputFiles(scanPath);
  await expect(page.getByText('The scans were checked but could not be saved.')).toBeVisible();
  await expect(page.getByText(/imported, checked, and saved/)).toHaveCount(0);
  await expect(page.locator('.scan-row')).toHaveCount(0);
});

test('provides complete route metadata, footer identity, required sections, and a designed 404', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What stays private and what this skips' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Built by Param Factory' })).toBeVisible();
  await expect(page.getByText('Version 1.0.1+repair.3')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://scan-archive-receipt.sociobot.in/');
  for (const [route, title] of [['/demo', 'Demo — Scan Archive Receipt'], ['/privacy', 'Privacy — Scan Archive Receipt'], ['/terms', 'Terms — Scan Archive Receipt']]) {
    await page.goto(route);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('h1')).toHaveCount(1);
  }
  await page.goto('/missing-receipt');
  await expect(page).toHaveTitle('Page not found — Scan Archive Receipt');
  await expect(page.getByRole('heading', { name: 'This page is not in the archive' })).toBeVisible();
});

test('keeps repaired pages accessible on desktop, keyboard, and 390px mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/demo', '/missing-receipt']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(item => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
    const width = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(width.document).toBeLessThanOrEqual(width.viewport);
    expect(width.body).toBeLessThanOrEqual(width.viewport);
  }
  await page.goto('/demo');
  for (const target of await page.locator('a, button, input, textarea, summary').all()) {
    if (!await target.isVisible()) continue;
    const box = await target.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  const zoomWidth = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  expect(zoomWidth.document).toBeLessThanOrEqual(zoomWidth.viewport);
  expect(zoomWidth.body).toBeLessThanOrEqual(zoomWidth.viewport);
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  const focusStyle = await page.getByRole('link', { name: 'Skip to main content' }).evaluate(element => getComputedStyle(element).outlineWidth);
  expect(focusStyle).toBe('3px');
});
