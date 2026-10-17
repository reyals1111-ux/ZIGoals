import {expect, test} from '@playwright/test';

/**
 * Session AE (Part 2.5, the owner's request, ADR-027): the music player's button is ZIGi's launcher's twin — the same
 * size, shape and nebula design (rim, fill, glow), a music glyph in ZIGi's nebula colours instead of ZIGi.
 */
test('the music button and ZIGi\'s launcher have the same size, shape, rim, fill and glow', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'on phones ZIGi is the one floating button (the music player opens from its menu)');
  // The Showcase shows the music player's button.
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const music = page.locator('.music-launcher'), zigi = page.locator('.ai-launcher-button');
  await expect(music).toBeVisible();
  await expect(zigi).toBeVisible();
  const read = (sel: string) => page.locator(sel).evaluate(el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), radius: s.borderRadius, border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, background: s.backgroundImage, shadow: s.boxShadow}; });
  const m = await read('.music-launcher'), z = await read('.ai-launcher-button');
  expect(m).toEqual(z);
  // One column: their centres line up, the music button above ZIGi's.
  const mb = (await music.boundingBox())!, zb = (await zigi.boundingBox())!;
  expect(Math.abs((mb.x + mb.width / 2) - (zb.x + zb.width / 2))).toBeLessThan(1.5);
  expect(mb.y + mb.height).toBeLessThan(zb.y);
  // The glyph is drawn in the nebula colours (a gradient), not plain white.
  expect(await music.locator('svg.music-note linearGradient stop').count()).toBeGreaterThanOrEqual(3);
  // Tucked, its edge tab is ZIGi's edge tab's twin too.
  await page.getByRole('button', {name: 'Tuck the music button away'}).click();
  const tab = page.locator('.music-edge-tab');
  await expect(tab).toBeVisible();
  const t = await tab.evaluate(el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), radius: s.borderRadius}; });
  expect(t).toEqual({w: 44, h: 52, radius: '16px 0px 0px 16px'});
  await page.getByRole('button', {name: 'Show the music button'}).click();
  await expect(music).toBeVisible();
});
