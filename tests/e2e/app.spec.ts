import { expect, test, type Page } from '@playwright/test';
import axeCore from 'axe-core';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = 'http://127.0.0.1:4173';

async function openDemo(page: Page, fresh = true): Promise<void> {
  await page.goto(fresh ? '/demo?fresh=1' : '/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set 1 of 3' })).toBeVisible();
}

async function logSets(page: Page, reps: number[], rir = 2): Promise<void> {
  for (let index = 0; index < reps.length; index += 1) {
    await page.getByLabel('Reps', { exact: true }).fill(String(reps[index]));
    await page.getByRole('spinbutton', { name: 'RIR reps left' }).fill(String(rir));
    await page.getByRole('button', { name: index === reps.length - 1 ? 'Finish session' : 'Log set' }).click();
  }
}

async function resetDemo(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#feedback')).toHaveText('Demo reset. The sample log is ready again.');
  await expect(page.getByText('Increase to 42.5 kg', { exact: true })).toBeVisible();
}

async function sessionCount(page: Page, database: string): Promise<number> {
  return page.evaluate(async (databaseName) => {
    const request = indexedDB.open(databaseName);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!db.objectStoreNames.contains('sessions')) { db.close(); return 0; }
    const transaction = db.transaction('sessions', 'readonly');
    const rows = transaction.objectStore('sessions').getAll();
    const result = await new Promise<unknown[]>((resolve, reject) => {
      rows.onsuccess = () => resolve(rows.result);
      rows.onerror = () => reject(rows.error);
    });
    db.close();
    return result.length;
  }, database);
}

test('@claim:log-set logs weight, reps, and RIR in the demo', async ({ page }) => {
  await openDemo(page);
  await page.getByLabel('Weight (kg)').fill('42.5');
  await page.getByLabel('Reps', { exact: true }).fill('9');
  await page.getByRole('spinbutton', { name: 'RIR reps left' }).fill('3');
  await page.getByRole('button', { name: 'Log set' }).click();
  await expect(page.getByRole('heading', { name: 'Set 2 of 3' })).toBeVisible();
  await expect(page.getByLabel('Set progress')).toContainText('9 reps · 3 RIR');
});

test('@claim:progression-rules applies both progression rules and the RIR floor', async ({ page }) => {
  await openDemo(page);
  await logSets(page, [12, 11, 12]);
  await expect(page.getByText('Repeat 42.5 kg', { exact: true })).toBeVisible();
  await resetDemo(page);
  await page.locator('#settings-section summary').click();
  await page.getByLabel('Weight-increase rule').selectOption('total-reps');
  await page.getByLabel('Total-rep target').fill('30');
  await page.getByRole('button', { name: 'Save progression rule' }).click();
  await expect(page.locator('#feedback')).toHaveText('Progression rule saved.');
  await logSets(page, [10, 10, 10]);
  await expect(page.getByText('Increase to 45 kg', { exact: true })).toBeVisible();
});

test('@claim:local-persistence keeps a logged set after a reload', async ({ page }) => {
  await openDemo(page);
  await page.getByLabel('Reps', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Log set' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Set 2 of 3' })).toBeVisible();
  await expect(page.getByLabel('Set progress')).toContainText('10 reps · 2 RIR');
});

test('@claim:repeat-or-increase shows the next weight decision', async ({ page }) => {
  await openDemo(page);
  await logSets(page, [12, 12, 12]);
  await expect(page.getByText('Increase to 45 kg', { exact: true })).toBeVisible();
  await resetDemo(page);
  await logSets(page, [12, 11, 12]);
  await expect(page.getByText('Repeat 42.5 kg', { exact: true })).toBeVisible();
});

test('@claim:csv-export downloads every demo session as CSV', async ({ page }) => {
  await openDemo(page);
  await page.locator('details').filter({ hasText: 'Export, import, or clear' }).locator('summary').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const content = Buffer.concat(chunks).toString('utf8');
  expect(content).toContain('"session_id","exercise","started_at"');
  expect((content.match(/demo-bench-/g) ?? []).length).toBe(18);
});

test('@claim:csv-import-validation rejects an invalid CSV without changing the demo log', async ({ page }) => {
  await openDemo(page);
  const invalid = `session_id,exercise,started_at,completed_at,weight,unit,set_number,reps,rir,rep_min,rep_max,rule,decision,next_weight
bad-session,Primary lift,2026-08-28T00:00:00.000Z,2026-08-28T00:01:00.000Z,40,kg,0,-1,99,-8,12,all-top,increase,42.5`;
  await page.locator('#import-csv').setInputFiles({ name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from(invalid) });
  await expect(page.getByRole('status').filter({ hasText: /Row 2: set number/ }).first()).toBeVisible();
  expect(await sessionCount(page, 'demo:rep-range-compass')).toBe(6);
});

test('@claim:pwa-shell provides an installable cached app shell in the demo', async ({ page }) => {
  await openDemo(page);
  const shell = await page.evaluate(async () => {
    const manifest = await fetch('/manifest.webmanifest').then((response) => response.json()) as { display: string; icons: unknown[] };
    const registration = await navigator.serviceWorker.ready;
    const cachesWithDemo = await Promise.all((await caches.keys()).map(async (name) => ({ hasDemo: Boolean(await (await caches.open(name)).match('/demo')) })));
    return { display: manifest.display, iconCount: manifest.icons.length, active: registration.active?.state, hasDemo: cachesWithDemo.some((cache) => cache.hasDemo) };
  });
  expect(shell).toEqual({ display: 'standalone', iconCount: 3, active: 'activated', hasDemo: true });
});

test('@claim:offline-reload reloads the populated demo offline after the first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await openDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Demo — sample data, nothing is saved', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set 1 of 3' })).toBeVisible();
  await expect(page.getByText(/Offline · saved locally/)).toBeVisible();
  await context.close();
});

test('@claim:local-only keeps demo data separate and makes no external requests', async ({ page }) => {
  await page.goto('/');
  await logSets(page, [12, 12, 12]);
  expect(await sessionCount(page, 'rep-range-compass')).toBe(1);
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin) externalRequests.push(request.url());
  });
  await openDemo(page);
  await page.getByRole('button', { name: 'Log set' }).click();
  await resetDemo(page);
  expect(await sessionCount(page, 'demo:rep-range-compass')).toBe(6);
  expect(await sessionCount(page, 'rep-range-compass')).toBe(1);
  expect(externalRequests).toEqual([]);
});

test('@claim:plus-scope keeps the core free and reveals all history after a verified $12 unlock', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText('Showing your five latest sessions.')).toBeVisible();
  expect(await page.locator('.history-row').count()).toBe(5);
  const unlock = page.locator('details').filter({ hasText: 'One-time unlock' });
  await unlock.locator('summary').click();
  await expect(unlock.getByText('Compass Plus · $12 once', { exact: true })).toBeVisible();
  await page.route('https://api.sociobot.in/api/v1/products/rep-range-compass/verify?license=*', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok' }) });
  });
  await page.getByLabel('Have a license? Paste it here').fill('demo-license');
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(unlock.locator('summary')).toContainText('Compass Plus active');
  expect(await page.locator('.history-row').count()).toBe(6);
});

test('@claim:returned-license stores a returned token and verifies it once per day', async ({ page }) => {
  let verifyCalls = 0;
  await page.route('https://api.sociobot.in/api/v1/products/rep-range-compass/verify?license=*', async (route) => {
    verifyCalls += 1;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok' }) });
  });
  await page.goto('/demo?fresh=1&license=returned-demo-license');
  await expect(page.locator('details').filter({ hasText: 'One-time unlock' }).locator('summary')).toContainText('Compass Plus active');
  await expect(page).toHaveURL(/\/demo$/);
  const stored = await page.evaluate(() => ({ token: localStorage.getItem('demo:sb_license:rep-range-compass'), verdict: localStorage.getItem('demo:sb_license:rep-range-compass:verdict') }));
  expect(stored.token).toBe('returned-demo-license');
  expect(stored.verdict).toContain('"valid":true');
  await page.reload();
  await expect(page.locator('details').filter({ hasText: 'One-time unlock' }).locator('summary')).toContainText('Compass Plus active');
  expect(verifyCalls).toBe(1);
});

test('offers a direct one-click sample from the landing screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Decide whether to repeat or increase');
  await expect(page.getByText('For strength trainees using double progression, each logged set shows the next target and next weight.')).toBeVisible();
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page.getByText('Demo — sample data, nothing is saved', { exact: false })).toBeVisible();
  await expect(page.getByText('Increase to 42.5 kg', { exact: true })).toBeVisible();
});

test('has no accessibility violations and fits a 390px viewport', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('/');
  await page.addScriptTag({ content: axeCore.source });
  const results = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: () => Promise<{ violations: Array<{ id: string; impact: string | null }> }> } }).axe;
    return axe.run();
  });
  expect(results.violations).toEqual([]);
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
  await page.close();
});

test('reflows at 200% text and keeps every mobile link target at least 44px', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('/');
  await page.locator('details').filter({ hasText: 'One-time unlock' }).locator('summary').click();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
  const undersizedLinks = await page.locator('a:visible').evaluateAll((links) => links.map((link) => {
    const box = link.getBoundingClientRect();
    return { label: link.getAttribute('aria-label') ?? link.textContent?.trim() ?? '', width: box.width, height: box.height };
  }).filter(({ width, height }) => width < 44 || height < 44));
  expect(undersizedLinks).toEqual([]);
  await page.close();
});

test('keeps a never-verified restored license locked when verification is offline', async ({ context, page }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  const unlock = page.locator('details').filter({ hasText: 'One-time unlock' });
  await unlock.locator('summary').click();
  await page.getByLabel('Have a license? Paste it here').fill('not-a-real-license');
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByText(/Compass Plus stays locked/)).toBeAttached();
  await expect(page.getByText('✓ This device is unlocked.')).toHaveCount(0);
  await expect(unlock.locator('summary')).toContainText('Compass Plus · $12 once');
  await context.setOffline(false);
});

test('announces an installed service-worker update and applies it', async ({ page }) => {
  const workerPath = resolve('dist/sw.js');
  const originalWorker = await readFile(workerPath, 'utf8');
  try {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    });
    await writeFile(workerPath, `${originalWorker}\n// update-regression-${Date.now()}\n`);
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
    const toast = page.locator('#update-toast');
    await expect(toast).toContainText('An app update is ready.');
    await expect(toast).toBeVisible();
    await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Refresh now' }).click()]);
    const workerState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return { active: registration?.active?.state, waiting: registration?.waiting?.state ?? null };
    });
    expect(workerState).toEqual({ active: 'activated', waiting: null });
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

test('ships accessible privacy and terms pages', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/training data stays/i);
  await page.goto('/terms/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Terms for using/i);
});
