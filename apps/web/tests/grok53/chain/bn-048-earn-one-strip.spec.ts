import {expect, test, type Page} from '@playwright/test';
import {earnRoutes, seedShowcase} from '../../earn-fixtures';
import {chooseChain} from '../../chain-choice';

// Session AL third pass (lane L6, P-BN-48 / AL-LAYOUT-500-001): Berlin BN-074 (500 px: the round icon strip sat under the
// bottom bar, labels hidden), BN-126 and N-BN-05 (375 px: two stacked topic strips with the same targets; the small print
// in a narrower column than the lede), D-123 (old). Showcase, chain chosen, the bots' widths. Fails on main (two strips),
// passes on the branch.
async function openEarn(page: Page, width: number, height: number) {
  await page.setViewportSize({width, height});
  await chooseChain(page);
  await seedShowcase(page);
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('main h1').first()).toHaveText('Ways to earn on ZIGChain');
}

for (const [width, height] of [[500, 800], [375, 812]] as const) {
  test(`BN-074/BN-126/N-BN-05: at ${width} px Earn has one topic strip, whole on the first screen above the bottom bar`, async ({page}) => {
    await openEarn(page, width, height);
    await expect(page.getByRole('navigation', {name: 'Ecosystem apps', exact: true})).toHaveCount(0);
    const index = page.getByRole('navigation', {name: 'On this page', exact: true});
    await expect(index).toBeInViewport({ratio: 1});
    const bar = page.getByRole('navigation', {name: 'Main navigation'});
    if (await bar.isVisible()) {
      const barTop = (await bar.boundingBox())!.y, box = (await index.boundingBox())!;
      expect(box.y + box.height, 'the index ends above the bottom bar').toBeLessThanOrEqual(barTop);
    }
    // The first chips' labels are readable on the first screen, not hidden under a bar.
    for (const name of ['Start here', 'Native staking']) await expect(index.getByRole('link', {name, exact: true})).toBeInViewport({ratio: 1});
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}

test('BN-126: at 375 px the small print under the title runs as wide as the lede', async ({page}) => {
  await openEarn(page, 375, 812);
  const pad = await page.locator('.earn-hero-note').evaluate(el => parseFloat(getComputedStyle(el).paddingInlineEnd));
  expect(pad).toBeLessThan(8);
  const note = (await page.locator('.earn-hero-note').boundingBox())!, lede = (await page.locator('.earn-hero .page-lede').boundingBox())!;
  expect(note.x + note.width).toBeGreaterThanOrEqual(lede.x + lede.width - 24);
});

test('BN-160: a chip still jumps to its section and marks it, from the one strip', async ({page}) => {
  await openEarn(page, 375, 812);
  const index = page.getByRole('navigation', {name: 'On this page', exact: true});
  await index.getByRole('link', {name: 'Valdora stZIG', exact: true}).click();
  await expect(page).toHaveURL(/#valdora$/);
  await expect(index.getByRole('link', {name: 'Valdora stZIG', exact: true})).toHaveAttribute('aria-current', 'true');
});
