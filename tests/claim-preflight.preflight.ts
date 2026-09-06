import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

test('runs a declared claim from a checkout with no production artifact', { timeout: 30_000 }, () => {
  const distDirectory = path.join(process.cwd(), 'dist');
  const entryPoint = path.join(distDirectory, 'index.html');

  // A claim command must provision its own previewable artifact; it cannot
  // depend on a build that a developer happened to leave behind.
  rmSync(distDirectory, { recursive: true, force: true });
  expect(existsSync(entryPoint)).toBe(false);

  execFileSync('npm', ['run', 'test:e2e', '--', '--grep', '@claim:scope-boundaries'], {
    cwd: process.cwd(),
    stdio: 'pipe'
  });

  expect(existsSync(entryPoint)).toBe(true);
});
