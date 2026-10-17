import {expect, test, type Page} from '@playwright/test';

/**
 * Session AD (the owner's brief Part 1.5, ADR-026; owner amendment 1): the footer's one opening moment. The first time
 * the banner comes into view in a visit: each word of "Goals · Habits · Health" appears together with its step's bubble,
 * in order, as the line reaches it; then "= Wealth" arrives and the wordmark shines once; the planet's flare rises and
 * blooms in pink and magenta, then its layer leaves. About 2.5–4 s, transform and opacity only, no layout shift. Once per
 * visit; reduced motion and Motion Off show the final state, still.
 */
type Start = {name: string; key: string; t: number};
type Log = {starts: Start[]; intro: {state: string; t: number}[]; shift: number; props: Set<string>};

async function record(page: Page) {
  await page.addInitScript(() => {
    const log = {starts: [] as {name: string; key: string; t: number}[], intro: [] as {state: string; t: number}[], shift: 0, props: [] as string[]};
    Object.assign(window, {footerLog: log});
    document.addEventListener('animationstart', event => {
      const el = event.target as Element; if (!el.closest?.('.site-footer')) return;
      const key = el.matches('.site-footer-word') ? `word${el.getAttribute('data-word')}` : el.matches('.site-footer-node') ? `node${el.closest('li')?.getAttribute('data-step')}` : el.matches('.site-footer-result') ? 'wealth' : el.matches('.site-footer-shine') ? 'shine' : el.matches('.site-footer-reveal') ? 'line' : el.className.toString();
      log.starts.push({name: event.animationName, key: event.pseudoElement ? `${key}${event.pseudoElement}` : key, t: performance.now()});
      for (const a of el.getAnimations()) for (const frame of (a.effect as KeyframeEffect | null)?.getKeyframes() ?? []) for (const prop of Object.keys(frame)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(prop)) log.props.push(prop);
    }, true);
    new MutationObserver(() => { const f = document.querySelector<HTMLElement>('.site-footer'); const state = f?.dataset.intro; if (state && log.intro.at(-1)?.state !== state) log.intro.push({state, t: performance.now()}); }).observe(document, {subtree: true, attributes: true, attributeFilter: ['data-intro']});
    try { new PerformanceObserver(list => { for (const e of list.getEntries() as (PerformanceEntry & {value: number; hadRecentInput: boolean})[]) if (!e.hadRecentInput && document.querySelector('.site-footer')?.getAttribute('data-intro') === 'play') log.shift += e.value; }).observe({type: 'layout-shift', buffered: false}); } catch { /* no layout-shift entries in this engine */ }
  });
}
const log = (page: Page) => page.evaluate(() => { const l = (window as unknown as {footerLog: {starts: Start[]; intro: Log['intro']; shift: number; props: string[]}}).footerLog; return {...l, props: [...new Set(l.props)]}; });
async function openFooter(page: Page) {
  await page.goto('/app');
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
  const footer = page.locator('footer.site-footer');
  await expect(footer).toHaveAttribute('data-intro', /ready|done/, {timeout: 15000});
  await footer.locator('.site-footer-stage').scrollIntoViewIfNeeded();
  return footer;
}

test('plays once: each word with its bubble in turn, then "= Wealth" with the wordmark’s shine and the pink flare; then rests', async ({page}) => {
  await record(page);
  const footer = await openFooter(page);
  await expect(footer).toHaveAttribute('data-intro', 'play');
  // The flare's layer appears during the moment, in pink and magenta (never white or yellow), and leaves after it.
  const core = footer.locator('.site-footer-star-core');
  await expect(core).toBeAttached({timeout: 6000});
  const gradient = await core.evaluate(el => getComputedStyle(el).backgroundImage);
  for (const [r, g, b] of [...gradient.matchAll(/rgba?\((\d+), (\d+), (\d+)/g)].map(m => m.slice(1).map(Number))) {
    expect(r! >= 0xb0 && g! >= 0xe0 && b! >= 0xe0, `no white stop: ${gradient}`).toBe(false);
    expect(r! > 0xc0 && g! > 0xa0 && b! < 0x90, `no yellow stop: ${gradient}`).toBe(false);
  }
  await expect(footer).toHaveAttribute('data-intro', 'done', {timeout: 8000});
  await expect(core).toHaveCount(0);
  const {starts, intro, shift, props} = await log(page);
  const first = (key: string, name?: string) => starts.find(s => s.key === key && (!name || s.name === name))?.t ?? Number.NaN;
  // Each word starts together with its bubble (the same delay), and in order.
  for (const i of [0, 1, 2]) expect(Math.abs(first(`word${i}`) - first(`node${i}`)), `word ${i} with bubble ${i}`).toBeLessThan(80);
  expect(first('word0')).toBeLessThan(first('word1'));
  expect(first('word1')).toBeLessThan(first('word2'));
  // "= Wealth" after Health, and the wordmark shines with it.
  expect(first('wealth')).toBeGreaterThan(first('word2'));
  expect(Math.abs(first('shine') - first('wealth'))).toBeLessThan(80);
  // The whole moment: about 2.5–4 s from its start to rest.
  const play = intro.find(s => s.state === 'play')!.t, done = intro.find(s => s.state === 'done')!.t;
  expect(done - play).toBeGreaterThan(2500);
  expect(done - play).toBeLessThan(4300);
  // Only transform and opacity move; nothing shifts the layout.
  expect(props.filter(p => !['transform', 'opacity'].includes(p)), JSON.stringify(props)).toEqual([]);
  expect(shift).toBeLessThan(0.001);
  // At rest: every word, bubble and line in its final place.
  for (const sel of ['.site-footer-word', '.site-footer-result', '.site-footer-node', '.site-footer-reveal']) for (const el of await footer.locator(sel).all()) {
    expect(await el.evaluate(e => getComputedStyle(e).opacity)).toBe('1');
    expect(await el.evaluate(e => getComputedStyle(e).transform)).toBe('none');
  }
  // Once per visit: the next page of the same visit shows the banner at rest at once.
  await page.goto('/app/goals');
  const again = page.locator('footer.site-footer');
  await again.scrollIntoViewIfNeeded();
  await expect(again).toHaveAttribute('data-intro', 'done');
  expect(await again.evaluate(f => f.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
});

test('a new visit plays it again', async ({browser}) => {
  for (let visit = 0; visit < 2; visit++) {
    const context = await browser.newContext(), page = await context.newPage();
    const footer = await openFooter(page);
    await expect(footer).toHaveAttribute('data-intro', 'play');
    await context.close();
  }
});

for (const mode of ['reduced motion', 'Motion Off'] as const) {
  test(`${mode}: the final state, still`, async ({browser}) => {
    const context = await browser.newContext(mode === 'reduced motion' ? {reducedMotion: 'reduce'} : {});
    const page = await context.newPage();
    if (mode === 'Motion Off') await page.addInitScript(() => localStorage.setItem('zigoals:motion:v1', 'off'));
    const footer = await openFooter(page);
    await expect(footer).toHaveAttribute('data-intro', 'done');
    await page.waitForTimeout(400);
    expect(await footer.evaluate(f => f.getAnimations({subtree: true}).length)).toBe(0);
    await expect(footer.locator('.site-footer-star-layer')).toHaveCount(0);
    for (const sel of ['.site-footer-word', '.site-footer-result', '.site-footer-tagline']) for (const el of await footer.locator(sel).all()) expect(await el.evaluate(e => getComputedStyle(e).opacity)).toBe('1');
    await context.close();
  });
}

test('the wordmark: the owner’s transparent image, lazy, crisp at 2x, its box reserved', async ({browser}) => {
  const context = await browser.newContext({deviceScaleFactor: 2}), page = await context.newPage();
  await page.goto('/app');
  const img = page.locator('footer.site-footer').getByRole('img', {name: 'ZIGoals', exact: true});
  await expect(img).toHaveAttribute('loading', 'lazy');
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  const {natural, shown, src} = await img.evaluate((i: HTMLImageElement) => ({natural: i.naturalWidth, shown: i.getBoundingClientRect().width, src: i.currentSrc}));
  // The file chosen for this 2x screen is at least twice the width it is shown at (naturalWidth is density-corrected).
  const file = Number(/igoals-wordmark-(\d+)\.(avif|webp)$/.exec(src)?.[1]);
  expect(file).toBeGreaterThanOrEqual(shown * 2 - 1);
  expect(natural).toBeGreaterThan(0);
  expect(shown).toBeGreaterThanOrEqual(200);
  // Its box is reserved before the image arrives (no layout shift): the holder's height follows the image's own ratio.
  const holder = await page.locator('.site-footer-logo').boundingBox();
  expect(Math.abs(holder!.height - holder!.width * 112 / 360)).toBeLessThan(1.5);
  await context.close();
});

test('the banner ends where the planet ends: the whole planet, never cropped', async ({page}) => {
  await page.goto('/app');
  const footer = page.locator('footer.site-footer'), art = footer.locator('.site-footer-art');
  await footer.scrollIntoViewIfNeeded();
  const {f, a, size} = await footer.evaluate(el => ({f: el.getBoundingClientRect().toJSON(), a: el.querySelector('.site-footer-art')!.getBoundingClientRect().toJSON(), size: getComputedStyle(el.querySelector('.site-footer-art')!).backgroundSize}));
  expect(size).toMatch(/^100%( auto)?$/);
  expect(Math.abs(a.width - f.width)).toBeLessThan(1);
  expect(Math.abs(a.height - a.width * 689 / 1000)).toBeLessThan(2);
  await expect(art).toHaveCSS('pointer-events', 'none');
  const phone = (page.viewportSize()?.width ?? 0) < 768;
  // On computers and tablets the banner is the planet's own height (taller only when its content needs it); the social row
  // sits at its very bottom.
  if (!phone) expect(f.height).toBeGreaterThanOrEqual(a.height - 1);
  const social = await footer.locator('.site-footer-social').boundingBox();
  expect(f.y + f.height - (social!.y + social!.height)).toBeLessThan(phone ? 140 : 60);
});
