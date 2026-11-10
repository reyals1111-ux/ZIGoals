import {expect, test} from '@playwright/test';
import {governanceRelay, openGovernance} from '../../governance-chain';
import {chooseChain} from '../../chain-choice';

// Session AL (lane L6): Berlin BN-003 — at 375 px (Dark) the real-network dialog clipped "Continue on the real network".
test.use({viewport: {width: 375, height: 812}, colorScheme: 'dark'});
test.beforeEach(async ({page}) => { await chooseChain(page); });

test('BN-003: the real-network confirm keeps both buttons whole inside the dialog at 375 px', async ({page}) => {
  await governanceRelay(page, 'practice');
  const view = await openGovernance(page);
  await view.getByRole('button', {name: /Real network \(real ZIG\)/}).click();
  const dialog = page.getByRole('dialog', {name: 'This is real money'});
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  for (const name of ['Not now', 'Continue on the real network']) {
    const b = (await dialog.getByRole('button', {name}).boundingBox())!;
    expect(b.x, name).toBeGreaterThanOrEqual(box.x);
    expect(b.x + b.width, name).toBeLessThanOrEqual(box.x + box.width + 0.5);
    expect(b.height, name).toBeGreaterThanOrEqual(44);
  }
  expect(await dialog.getByRole('button', {name: 'Continue on the real network'}).evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
});
