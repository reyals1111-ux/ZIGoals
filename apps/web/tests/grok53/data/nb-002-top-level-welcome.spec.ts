import {expect, test} from '@playwright/test';

// Session AL (P-NB-08; NB-002, NB-033): a person who types /welcome, /onboarding, /start or /setup gets the setup, not a 404.
for (const word of ['welcome', 'onboarding', 'start', 'setup']) {
  test(`NB-002/NB-033: /${word} opens the welcome at /app/welcome`, async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    const response = await page.goto(`/${word}`);
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/app\/welcome(?:\?|$)/);
    await expect(page.getByRole('heading', {name: /page not found/i})).toHaveCount(0);
  });
}
