import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase} from './ah-helpers';

/**
 * Session AK M1 (owner follow-up 2): the one shared-element morph. On /app/goals a private goal card's title morphs into
 * the goal page's heading (React <ViewTransition name share="zg-morph"> on both ends, components/motion/goal-title-morph.tsx)
 * in Full motion only. Calm names no pair (no morph), and Motion Off / the device's reduced motion start no view
 * transition at all. The heading drawn in the goal page's first frame is the very element that then carries the loaded page.
 */
test.use({viewport: {width: 1280, height: 900}});
const setMotion = (page: Page, value: 'system' | 'calm' | 'off') => page.addInitScript(v => { try { localStorage.setItem('zigoals:motion:v1', v); } catch { /* storage denied */ } }, value);

/** Records every view-transition pseudo-element animated over the next seconds, and the first goal heading drawn. */
const record = (page: Page) => page.evaluate(() => {
  const w = window as unknown as {zgSeen: string[]; zgFirstH1: Element | null; zgFirstBusy: boolean};
  w.zgSeen = []; w.zgFirstH1 = null; w.zgFirstBusy = false;
  const first = (h1: Element) => { w.zgFirstH1 = h1; w.zgFirstBusy = !!h1.closest('[aria-busy="true"]'); };
  const end = performance.now() + 4000;
  const tick = () => {
    for (const a of document.documentElement.getAnimations({subtree: true})) { const p = (a.effect as KeyframeEffect | null)?.pseudoElement; if (p && !w.zgSeen.includes(p)) w.zgSeen.push(p); }
    if (!w.zgFirstH1) { const h1 = document.querySelector('.goal-detail-heading h1'); if (h1) first(h1); }
    if (performance.now() < end) requestAnimationFrame(tick);
  };
  new MutationObserver((_, observer) => { const h1 = document.querySelector('.goal-detail-heading h1'); if (h1 && !w.zgFirstH1) { first(h1); observer.disconnect(); } }).observe(document.body, {childList: true, subtree: true});
  requestAnimationFrame(tick);
});
const seen = (page: Page) => page.evaluate(() => (window as unknown as {zgSeen: string[]}).zgSeen);

async function openFirstGoal(page: Page) {
  await page.goto('/app/goals');
  await hydrated(page);
  const title = page.locator('.unified-goal-card h2 a[href^="/app/goals/tracked/"]').first();
  await expect(title).toBeVisible();
  const name = (await title.innerText()).trim(), href = (await title.getAttribute('href'))!;
  await record(page);
  await title.click();
  await page.waitForURL(`**${href}`);
  await expect(page.locator('.goal-detail-heading h1')).toHaveText(name);
  await expect(page.getByTestId('tracked-progress')).toBeVisible();
  return {name, id: href.split('/').pop()!};
}

test('Full: the goal card’s title morphs into the goal page’s heading, and that heading is the element the page keeps', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await loadShowcase(page);
  await page.goto('/app/goals');
  await hydrated(page);
  await expect(page.locator('html')).toHaveAttribute('data-zg-vt', 'on');
  const {id} = await openFirstGoal(page);
  await expect.poll(() => seen(page)).toContain(`::view-transition-group(zg-goal-${id.replace(/[^A-Za-z0-9_-]/g, '_')})`);
  // The first heading drawn was the loading frame's (the page still busy), and it is the element the loaded page kept.
  expect(await page.evaluate(() => { const w = window as unknown as {zgFirstH1: Element | null; zgFirstBusy: boolean}; return {busy: w.zgFirstBusy, same: w.zgFirstH1 === document.querySelector('.goal-detail-heading h1')}; })).toEqual({busy: true, same: true});
  // Outside the transition the heading carries no name and the overlay is gone.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.goal-detail-heading h1')!).viewTransitionName)).toBe('none');
});

test('Calm: no morph (no goal pair is named)', async ({page}) => {
  await setMotion(page, 'calm');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await loadShowcase(page);
  await openFirstGoal(page);
  await page.waitForTimeout(600);
  expect((await seen(page)).filter(p => p.includes('zg-goal-'))).toEqual([]);
});

for (const mode of ['Motion Off', 'reduced motion'] as const) {
  test(`${mode}: no view transition at all when a goal opens`, async ({page}) => {
    if (mode === 'Motion Off') { await setMotion(page, 'off'); await page.emulateMedia({reducedMotion: 'no-preference'}); }
    else await page.emulateMedia({reducedMotion: 'reduce'});
    await loadShowcase(page);
    await openFirstGoal(page);
    await page.waitForTimeout(600);
    expect((await seen(page)).filter(p => p.startsWith('::view-transition'))).toEqual([]);
    expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('undefined');
  });
}
