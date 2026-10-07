import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const FIXTURE = '.cache/eval/Dandelion.jpg';

test.skip(!existsSync(FIXTURE), 'Run `npm run eval` once to download the sample photos');

test('downloads the real model, then verifies a photo with no network', async ({
  page,
  context,
}) => {
  const externalRuntimeRequests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('cdn.jsdelivr.net')) externalRuntimeRequests.push(r.url());
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Download model' }).click();
  await expect(page.getByText(/Vision model ready/)).toBeVisible({ timeout: 480_000 });

  // The service worker must control the page before the app shell can load offline.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: /Neighbourhood Basics/ }).click();
  await expect(page.getByLabel('Take photo')).toBeEnabled({ timeout: 120_000 });

  // Clue 2 is "a flower"; a dandelion photo should count.
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByLabel('Take photo').setInputFiles({
    name: 'dandelion.jpg',
    mimeType: 'image/jpeg',
    buffer: readFileSync(FIXTURE),
  });
  await expect(page.getByText(/^Found it\./)).toBeVisible({ timeout: 60_000 });
  const timing = await page.getByText(/Checked on this device in/).textContent();
  console.log(`[offline verification] ${timing}`);

  expect(externalRuntimeRequests).toEqual([]);
});
