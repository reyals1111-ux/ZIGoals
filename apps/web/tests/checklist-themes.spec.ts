import {expect, test, type Page} from '@playwright/test';
import {UI_PREFS_KEY} from '../lib/ab-design-keys';
import {MOTION_PREFERENCE_KEY} from '../components/use-entrance';
import {TITLE, seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AF (L3; P7.18, P7.23, ADR-028 H55, H75): the Checklist in Nebula, Light and Dark. Dots, lines, orbit banners
 * and the timers' rings are the same colours in every theme (theme islands); only the sky (white with a light mist by
 * day, black with a subtle mist for Dark) and the page's own text differ. Under reduced motion and Motion Off nothing
 * moves on the path, even right after a tick: every state is a still. The only loop on the page is the Nebula mist.
 */
const paint = async (page: Page) => { await page.locator('.path-stage').evaluate(el => Promise.all(el.getAnimations({subtree: true}).map(a => a.finished.catch(() => undefined)))); return page.evaluate(() => {
  const css = (sel: string, props: string[]) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return Object.fromEntries(props.map(p => [p, s.getPropertyValue(p)])); };
  return {
    doneDot: css('.path-dot[data-state=done]', ['background-image', 'box-shadow', '--dot']),
    undoneDot: css('.path-dot[data-state=undone]', ['--dot', 'box-shadow']),
    glyph: css('.path-dot[data-state=undone] .path-dot-core', ['color']),
    lit: css('.path-segment[data-lit] .path-segment-lit', ['stroke', 'stroke-width']),
    stops: [...document.querySelectorAll('.path-line linearGradient stop')].map(s => s.getAttribute('stop-color')),
    banner: css('.path-banner', ['border-top-color', 'box-shadow', 'background-image']),
    planet: css('.path-banner-planet', ['background-image']),
    timerRing: css('.checklist-timer[data-kind=sleep] .checklist-timer-ring', ['color']),
  };
}); };
async function openIn(page: Page, theme: 'nebula' | 'light' | 'dark') {
  await seedChecklist(page, {extra: {[UI_PREFS_KEY]: JSON.stringify({version: 1, ...(theme === 'nebula' ? {} : {theme})})}});
  await page.goto('/app/checklist'); await settled(page);
  if (theme !== 'nebula') await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-loading', /.*/);
  await expect(page.locator('.path-line')).toBeVisible();
  // One dot lit and its line to a lit neighbour: the stretch and the custom item… the stretch and Water are neighbours.
  if (!await page.locator('.path-dot[data-state=done]').count()) {
    await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
    await page.getByRole('button', {name: 'Water: not done yet', exact: true}).click();
    await page.getByRole('form', {name: 'Log Water'}).getByRole('button', {name: /^Log /}).click();
  }
  await expect(page.locator('.path-segment[data-lit]')).not.toHaveCount(0);
}

test('dots, lines, banners and the timers’ rings are identical in Nebula, Light and Dark; the sky is the theme’s', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'one layout is enough for colours');
  test.setTimeout(90_000);
  await openIn(page, 'nebula'); const nebula = await paint(page);
  const nebulaSky = await page.locator('.checklist-sky').evaluate(el => getComputedStyle(el).backgroundColor);
  for (const theme of ['light', 'dark'] as const) {
    await openIn(page, theme);
    expect(await paint(page), `${theme}: the path paints as in Nebula`).toEqual(nebula);
    const sky = await page.locator('.checklist-sky').evaluate(el => ({background: getComputedStyle(el).backgroundColor, mist: getComputedStyle(el.querySelector('.checklist-mist-a')!).backgroundImage}));
    if (theme === 'dark') { const [r, g, b] = sky.background.match(/\d+/g)!.map(Number); expect(Math.max(r!, g!, b!), 'Dark: a near-black sky').toBeLessThan(10); }
    else expect(sky.mist, 'Light: a light colour mist').toMatch(/rgb\((2[2-5]\d), (2[2-5]\d), (2[2-5]\d)\)/);
    if (theme === 'light') { const [r, g, b] = (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).match(/\d+/g)!.map(Number); expect(Math.min(r!, g!, b!)).toBeGreaterThan(225); }
  }
  expect(nebulaSky).toBe('rgba(0, 0, 0, 0)');
  expect(nebula.stops).toEqual(['#9273ff', '#23eaff', '#ff74be', '#f06dff']);
});

for (const mode of ['reduced motion', 'Motion Off'] as const) {
  test(`${mode}: every state is a still — nothing animates on the path, even right after a tick`, async ({page}, info) => {
    test.skip(info.project.name !== 'desktop', 'one layout is enough');
    if (mode === 'reduced motion') await page.emulateMedia({reducedMotion: 'reduce'});
    await seedChecklist(page, {extra: mode === 'Motion Off' ? {[MOTION_PREFERENCE_KEY]: 'off'} : {}});
    await page.goto('/app/checklist'); await settled(page);
    if (mode === 'Motion Off') await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
    await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
    await expect(page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true})).toBeVisible();
    const running = await page.locator('.checklist-page').evaluate(el => el.getAnimations({subtree: true}).filter(a => a.playState === 'running').map(a => (a.effect as KeyframeEffect | null)?.target instanceof Element ? ((a.effect as KeyframeEffect).target as Element).className.toString() : ''));
    expect(running).toEqual([]);
  });
}
