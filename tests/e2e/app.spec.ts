import { expect, test } from '@playwright/test';
import axeCore from 'axe-core';

test('logs a full session and persists the next-weight decision', async ({ page }) => {
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
});

test('has no serious accessibility violations and fits a 390px viewport', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('/');
  await page.addScriptTag({ content: axeCore.source });
  const results = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (options: { runOnly: string[] }) => Promise<{ violations: Array<{ impact: string | null }> }> } }).axe;
    return axe.run({ runOnly: ['wcag2a', 'wcag2aa'] });
  });
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
  await page.close();
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
