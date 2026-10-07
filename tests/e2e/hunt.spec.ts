import { expect, test } from '@playwright/test';

const photo = (scene: string) => ({
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.from(`scene:${scene}`),
});

test('plays a whole hunt on a phone-sized screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Tuft' })).toBeVisible();

  await page.getByRole('button', { name: /Neighbourhood Basics/ }).click();
  await expect(page.getByText('Find 1 of 5')).toBeVisible();
  const camera = page.getByLabel('Take photo');
  await expect(camera).toBeEnabled();

  await camera.setInputFiles(photo('a computer screen'));
  await expect(page.getByText(/does not look like it yet/)).toBeVisible();

  for (const scene of ['a tree trunk', 'a flower', 'a bird', 'clouds in the sky', 'a dog']) {
    await page.getByLabel('Take photo').setInputFiles(photo(scene));
    await page.getByRole('button', { name: 'Next clue' }).click();
  }
  await expect(page.getByText(/You found 5 of 5/)).toBeVisible();
});

test('rejects a malformed hunt file with a readable message', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Import a hunt file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"id": "nope"'),
  });
  await expect(page.getByRole('alert')).toContainText('not valid JSON');
});
