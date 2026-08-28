import { expect, test } from '@playwright/test';
import axeCore from 'axe-core';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('logs a full session and persists the next-weight decision', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Know the next set/i);
  await expect(page.getByRole('heading', { name: 'Set 1 of 3' })).toBeVisible();

  await page.getByLabel('Weight (kg)').fill('40');
  for (let set = 1; set <= 3; set += 1) {
    await page.getByLabel('Reps', { exact: true }).fill('12');
    await page.getByRole('spinbutton', { name: 'RIR reps left' }).fill('2');
    await page.getByRole('button', { name: set === 3 ? 'Finish session' : 'Log set' }).click();
  }
  await expect(page.getByText('Increase to 42.5 kg', { exact: true })).toBeVisible();
  await expect(page.getByText('1 total')).toBeVisible();
  await page.reload();
  await expect(page.getByText('at 42.5 kg')).toBeVisible();
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
  expect(errors).toEqual([]);
});

test('has no accessibility violations and fits a 390px viewport', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') externalRequests.push(request.url());
  });
  await page.goto('/');
  await page.addScriptTag({ content: axeCore.source });
  const results = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: () => Promise<{ violations: Array<{ id: string; impact: string | null }> }> } }).axe;
    return axe.run();
  });
  expect(results.violations).toEqual([]);
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
  expect(externalRequests).toEqual([]);
  await page.close();
});

test('rejects the verifier CSV before writing any session', async ({ page }) => {
  await page.goto('/');
  const invalid = `session_id,exercise,started_at,completed_at,weight,unit,set_number,reps,rir,rep_min,rep_max,rule,decision,next_weight
bad-session,Primary lift,2026-08-28T00:00:00.000Z,2026-08-28T00:01:00.000Z,40,kg,0,-1,99,-8,12,all-top,increase,42.5`;
  await page.locator('#import-csv').setInputFiles({ name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from(invalid) });
  await expect(page.getByRole('status').filter({ hasText: /Row 2: set number/ }).first()).toBeVisible();
  await expect(page.getByText('0 total')).toBeVisible();
  const stored = await page.evaluate(async () => {
    const request = indexedDB.open('rep-range-compass');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('sessions', 'readonly');
    const all = transaction.objectStore('sessions').getAll();
    const result = await new Promise<unknown[]>((resolve, reject) => {
      all.onsuccess = () => resolve(all.result);
      all.onerror = () => reject(all.error);
    });
    db.close();
    return result;
  });
  expect(stored).toEqual([]);
});

test('announces an installed service-worker update and applies it', async ({ page }) => {
  const workerPath = resolve('dist/sw.js');
  const originalWorker = await readFile(workerPath, 'utf8');
  try {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
      }
    });
    await writeFile(workerPath, `${originalWorker}\n// update-regression-${Date.now()}\n`);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });
    const toast = page.locator('#update-toast');
    await expect(toast).toContainText('An app update is ready.');
    await expect(toast).toBeVisible();
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: 'Refresh now' }).click()
    ]);
    const workerState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return { active: registration?.active?.state, waiting: registration?.waiting?.state ?? null };
    });
    expect(workerState).toEqual({ active: 'activated', waiting: null });
    await expect(page.getByRole('heading', { name: 'Set 1 of 3' })).toBeVisible();
  } finally {
    await writeFile(workerPath, originalWorker);
  }
});

test('supports the documented keyboard path', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.getByLabel('Reps', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Set 2 of 3' })).toBeVisible();
  const settings = page.locator('#settings-section summary');
  await settings.focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Save progression rule' })).toBeVisible();
});

test('reloads the compass while offline after first use', async ({ context, page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Set 1 of 3' })).toBeVisible();
  await expect(page.getByText(/Offline · saved locally/)).toBeVisible();
  await context.setOffline(false);
});

test('ships accessible privacy and terms pages', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Privacy stays/);
  await page.goto('/terms/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Terms, in plain language/);
});
