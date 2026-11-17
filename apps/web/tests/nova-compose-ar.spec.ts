import {expect, test, type Page} from '@playwright/test';
import {hydrated} from './ah-helpers';
import {NOON, NOVA_KEY, frame} from './grok53/hud/hud-helpers';

/**
 * Session AR (ADR-041 P3, S1–S4): the composed stage — "a star with satellites".
 * - P3: beside the star every widget has a tier (hero, supporting, compact); panels differ in size by structure; the
 *   right wing is the left one upside down; the stored S / M / L is untouched and shows while arranging.
 * - S1: no widget covers the star's bezel, and the bezel lies inside the star's own column.
 * - S2: one or two widgets → the large star (its bezel at least 45 % of the stage); the full Showcase → never smaller
 *   than before this session; at 1440 from four widgets each wing is a hero and a supporting panel; the change of size is
 *   one transform, and instant with reduced motion.
 * - S3: a widget made on request arrives as its wing's hero; two requests in a row are the two heroes.
 */
test.skip(({isMobile}) => isMobile, 'computer layout: runs in the desktop project');
test.use({timezoneId: 'Europe/Brussels'});

type Stored = {id: string; size: 'S' | 'M' | 'L'}[];
const PILLARS: Stored = [{id: 'health-hud', size: 'M'}, {id: 'habits-hud', size: 'M'}, {id: 'goals-hud', size: 'M'}, {id: 'wealth-hud', size: 'M'}];
/** The Showcase with NOVA open; `stored` replaces the Showcase's own arrangement (its records live in the session's storage). */
async function showcaseNova(page: Page, stored?: Stored) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/app/settings'); await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  if (stored) await page.evaluate(([key, widgets]) => {
    const some = Object.keys(sessionStorage).find(k => /^zigoals:showcase:v1:[^:]+:/.test(k))!, prefix = some.match(/^zigoals:showcase:v1:[^:]+:/)![0];
    sessionStorage.setItem(prefix + key, JSON.stringify({version: 1, openingSeen: true, layout: 'orbit', widgets: (widgets as Stored).map((w, slot) => ({...w, slot}))}));
    // Nothing made on request stands on the stage: the arrangement is exactly `stored`.
    const stage = prefix + 'zigoals:nova-stage:v1', record = JSON.parse(sessionStorage.getItem(stage) ?? '{"version":1}');
    sessionStorage.setItem(stage, JSON.stringify({...record, made: [], hidden: []}));
  }, [NOVA_KEY, stored] as const);
  await page.goto('/app/nova'); await hydrated(page);
  await expect(frame(page)).toHaveAttribute('data-look', 'holo');
  await expect(frame(page)).toHaveAttribute('data-opening', 'done', {timeout: 10_000});
  await settled(page);
}
/** Finite animations are over and the star has reported (its bezel is drawn). */
async function settled(page: Page) {
  await expect(page.locator('.nova-orb-button[data-star] .cc-bezel')).toBeVisible({timeout: 15_000});
  await frame(page).evaluate(el => Promise.all(el.getAnimations({subtree: true}).filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))));
}
type Box = {x: number; y: number; w: number; h: number};
type Panel = Box & {id: string; tier: string | null; size: string; side: string | null};
const stageOf = (page: Page) => page.evaluate(() => {
  const box = (el: Element | null) => { if (!el) return null; const r = el.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; };
  const panels = [...document.querySelectorAll<HTMLElement>('.nova-orbit-main .nova-widget')].map(el => ({...box(el)!, id: el.dataset.widget!, tier: el.dataset.tier ?? null, size: el.dataset.size!, side: el.dataset.side ?? null}));
  // `bezel`: the bezel's box, the star's size as ADR-041 counts it (main's was 377 px at 1440). `ring`: the bezel's own
  // ellipse as drawn, what a panel must never cover — worked out from the drawing (nova-stage.tsx: its outermost mark is an
  // ellipse of 100.5 by 44.2 in a box of 200, turned 21.8 degrees, so it reaches 0.475 of the box sideways and 0.28 up
  // and down from the centre); the browser reports a turned ellipse by its turned box, which is wider than the line.
  const bz = box(document.querySelector('.cc-bezel'))!, ring = {x: bz.x + bz.w * 0.025, y: bz.y + bz.h * 0.22, w: bz.w * 0.95, h: bz.h * 0.56};
  return {main: box(document.querySelector('.nova-orbit-main'))!, centre: box(document.querySelector('.nova-orbit-centre'))!, bezel: bz, ring, canvas: box(document.querySelector('.nova-orb-button canvas.nova-star, .nova-orb-button .nova-star-picture')), panels,
    band: [...document.querySelectorAll<HTMLElement>('.nova-orbit-band .nova-widget')].map(el => el.dataset.widget!), composed: document.querySelector('.nova-orbit-main')!.hasAttribute('data-compose')};
}) as Promise<{main: Box; centre: Box; bezel: Box; ring: Box; canvas: Box | null; panels: Panel[]; band: string[]; composed: boolean}>;
const wing = (panels: Panel[], side: 'left' | 'right') => panels.filter(p => p.side === side).sort((a, b) => a.y - b.y);
const overlap = (a: Box, b: Box) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

test('P3, S1 at 1440 × 900: the Showcase is a hero and a supporting panel a wing, the right wing upside down; nothing covers the bezel', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await showcaseNova(page);
  const s = await stageOf(page);
  expect(s.composed).toBe(true);
  const left = wing(s.panels, 'left'), right = wing(s.panels, 'right');
  expect(left.map(p => p.tier)).toEqual(['hero', 'supporting']);
  expect(right.map(p => p.tier)).toEqual(['supporting', 'hero']); // upside down: the heroes stand top left and bottom right
  for (const [hero, support] of [[left[0]!, left[1]!], [right[1]!, right[0]!]] as const) {
    expect(hero.h, `${hero.id} is taller than ${support.id} by structure`).toBeGreaterThan(support.h * 1.35);
    expect(Math.abs(hero.w - support.w)).toBeLessThanOrEqual(1);
  }
  // One top line and one bottom line for both wings (the wings are full).
  expect(Math.abs(left[0]!.y - right[0]!.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(left[1]!.y + left[1]!.h - (right[1]!.y + right[1]!.h))).toBeLessThanOrEqual(1);
  // The four pillar HUDs stay beside the star; the rest rests on the band.
  expect(s.panels.map(p => p.id).sort()).toEqual(['goals-hud', 'habits-hud', 'health-hud', 'wealth-hud']);
  expect(s.band.length).toBeGreaterThan(0);
  // S1: the bezel is inside the star's own column and no panel touches it.
  expect(s.bezel.x).toBeGreaterThanOrEqual(s.centre.x - 0.5); expect(s.bezel.x + s.bezel.w).toBeLessThanOrEqual(s.centre.x + s.centre.w + 0.5);
  for (const p of s.panels) expect(overlap(p, s.ring), `${p.id} over the bezel`).toBe(false);
  // Every panel is whole in the window and inside the stage's first view.
  for (const p of s.panels) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x + p.w).toBeLessThanOrEqual(1440.5); expect(p.y + p.h, `${p.id} ends above the command field`).toBeLessThanOrEqual(s.main.y + s.main.h + 1); }
});

test('S2, "the star makes room" at 1440 × 900: two widgets → the bezel is at least 45 % of the stage; four → a hero and a supporting panel a wing; the full Showcase → no smaller than before', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await showcaseNova(page, PILLARS.slice(0, 2));
  const two = await stageOf(page);
  expect(two.panels.map(p => p.tier)).toEqual(['hero', 'hero']);
  expect(two.bezel.w / two.main.w, 'the large star').toBeGreaterThanOrEqual(0.45);
  for (const p of two.panels) expect(overlap(p, two.ring), `${p.id} over the bezel`).toBe(false);
  expect(two.bezel.x).toBeGreaterThanOrEqual(two.centre.x - 0.5); expect(two.bezel.x + two.bezel.w).toBeLessThanOrEqual(two.centre.x + two.centre.w + 0.5);

  await showcaseNova(page, PILLARS);
  const four = await stageOf(page);
  expect(wing(four.panels, 'left').map(p => p.tier)).toEqual(['hero', 'supporting']);
  expect(wing(four.panels, 'right').map(p => p.tier)).toEqual(['supporting', 'hero']);
  expect(four.bezel.w).toBeLessThan(two.bezel.w); // it made room
  expect(four.panels[0]!.w).toBeGreaterThan(two.panels[0]!.w); // and the wings took it

  await showcaseNova(page);
  const full = await stageOf(page);
  expect(full.bezel.w).toBeLessThanOrEqual(four.bezel.w);
  // "Never below its size on main": at 1440 × 900 with the left bar open main's bezel measured 377 px and its canvas 511 px.
  expect(full.bezel.w).toBeGreaterThanOrEqual(376.5);
  expect(full.canvas!.w).toBeGreaterThanOrEqual(510.5);
  for (const p of full.panels) expect(overlap(p, full.ring), `${p.id} over the bezel`).toBe(false);
});

test('S3: a request’s widget arrives as its wing’s hero; the next request takes the other wing; the stored sizes are untouched', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await showcaseNova(page, PILLARS);
  const field = page.locator('.nova-command input');
  await field.fill('Show my habits this week'); await field.press('Enter');
  const first = page.locator('.nova-orbit-main .nova-widget[data-widget=habit-week]');
  await expect(first).toHaveAttribute('data-tier', 'hero', {timeout: 15_000});
  await settled(page);
  await field.fill('Show my net worth'); await field.press('Enter');
  const second = page.locator('.nova-orbit-main .nova-widget[data-widget=net-worth]');
  await expect(second).toHaveAttribute('data-tier', 'hero', {timeout: 15_000});
  await settled(page);
  await expect(first).toHaveAttribute('data-tier', 'hero'); // the earlier request is still its own wing's hero
  expect(await first.getAttribute('data-side')).not.toBe(await second.getAttribute('data-side'));
  const s = await stageOf(page);
  // Older widgets stepped down: each wing still starts with exactly one hero, and what does not fit rests on the band.
  expect(s.panels.filter(p => p.tier === 'hero')).toHaveLength(2);
  expect(s.panels.filter(p => p.tier === 'supporting').length).toBeGreaterThanOrEqual(2);
  expect(s.panels.length + s.band.length).toBe(6);
  for (const p of s.panels) expect(overlap(p, s.ring), `${p.id} over the bezel`).toBe(false);
  // The person's own sizes are as stored: a tier is drawn, never written.
  const stored = await page.evaluate(key => { const k = Object.keys(sessionStorage).find(x => x.endsWith(`:${key}`))!; return (JSON.parse(sessionStorage.getItem(k)!).widgets as {id: string; size: string}[]).map(w => `${w.id}:${w.size}`); }, NOVA_KEY);
  expect(stored).toEqual(PILLARS.map(w => `${w.id}:${w.size}`));
});

for (const motion of ['full', 'reduced'] as const) test(`S2: the star’s change of size is one transform (${motion === 'full' ? 'Full motion' : 'instant with reduced motion'})`, async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  if (motion === 'reduced') await page.emulateMedia({reducedMotion: 'reduce'});
  await page.clock.install({time: NOON});
  // Every animation started on the star's button from here on, by the properties its keyframes name.
  await page.addInitScript(() => {
    const seen: string[][] = []; (window as Window & {__arStar?: string[][]}).__arStar = seen;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) {
      if (this.matches('.nova-orb-button')) seen.push([...new Set((Array.isArray(keyframes) ? keyframes : [keyframes ?? {}]).flatMap(k => Object.keys(k)))]);
      return animate.call(this, keyframes, options);
    };
  });
  await showcaseNova(page, PILLARS.slice(0, 2));
  const before = (await stageOf(page)).bezel.w;
  await page.evaluate(() => { (window as Window & {__arStar?: string[][]}).__arStar!.length = 0; });
  const field = page.locator('.nova-command input');
  await field.fill('Show my habits this week'); await field.press('Enter');
  await expect(page.locator('.nova-orbit-main .nova-widget[data-widget=habit-week]')).toHaveAttribute('data-tier', 'hero', {timeout: 15_000});
  await expect.poll(async () => (await stageOf(page)).bezel.w, {timeout: 10_000}).toBeLessThan(before - 4); // three widgets: the star made room
  const seen = await page.evaluate(() => (window as Window & {__arStar?: string[][]}).__arStar!);
  if (motion === 'full') { expect(seen.length, 'one motion').toBe(1); expect(seen[0]).toEqual(['transform']); }
  else expect(seen, 'no motion at all').toEqual([]);
});

test('P3: while arranging, panels show in their stored sizes on the earlier rows (a place means the same before and after a move)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await showcaseNova(page, [{id: 'health-hud', size: 'L'}, {id: 'habits-hud', size: 'S'}, {id: 'goals-hud', size: 'M'}]);
  // Composed: the Large one is a hero; the Small one alone on its wing is drawn as that wing's hero.
  await expect(page.locator('.nova-widget[data-widget=health-hud]')).toHaveAttribute('data-tier', 'hero');
  await expect(page.locator('.nova-widget[data-widget=habits-hud]')).toHaveAttribute('data-tier', 'hero');
  await expect(page.locator('.nova-widget[data-widget=habits-hud]')).toHaveAttribute('data-size', 'M');
  await page.getByRole('button', {name: /View controls/}).click();
  await page.getByRole('button', {name: /^Arrange/}).first().click();
  await expect(frame(page)).toHaveAttribute('data-editing', /.*/);
  for (const [id, size] of [['health-hud', 'L'], ['habits-hud', 'S'], ['goals-hud', 'M']] as const) {
    const el = page.locator(`.nova-widget[data-widget=${id}]`);
    await expect(el).toHaveAttribute('data-size', size);
    await expect(el).not.toHaveAttribute('data-tier', /.+/);
  }
  expect((await stageOf(page)).composed).toBe(false);
});

test('the read-outs: with one or two widgets at 1920 × 1080 the four read-outs under the star are a list, clear of the command field; from three widgets they step aside', async ({page}) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await page.clock.install({time: NOON});
  await showcaseNova(page, PILLARS.slice(0, 2));
  const list = page.getByRole('list', {name: 'Today’s core'});
  await expect(list).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(4);
  await expect(list.locator('li .holo-core-bar')).toHaveCount(4);
  const foot = (await page.locator('.nova-foot').boundingBox())!, box = (await list.boundingBox())!;
  expect(box.y + box.height, 'the read-outs end above the command field').toBeLessThanOrEqual(foot.y + 0.5);
  const s = await stageOf(page);
  expect(overlap({x: box.x, y: box.y, w: box.width, h: box.height}, s.ring), 'the read-outs stand under the bezel, not on it').toBe(false);
  await showcaseNova(page, PILLARS);
  await expect(page.locator('.holo-core-readout')).toBeHidden();
  await expect(page.locator('.holo-core-readout li')).toHaveCount(4);
});

test('D26, the star’s base at 2560 × 1440: the next widgets stand under NOVA’s words as compact plates, clear of the words and the bezel; an answer takes their place', async ({page}) => {
  await page.setViewportSize({width: 2560, height: 1440});
  await page.clock.install({time: NOON});
  await showcaseNova(page);
  const plates = () => page.locator('.nova-orbit-main > .nova-orbit-base .nova-widget').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(), body = el.querySelector('.nova-widget-body')!; return {id: (el as HTMLElement).dataset.widget!, tier: (el as HTMLElement).dataset.tier, size: (el as HTMLElement).dataset.size, x: r.left, y: r.top, w: r.width, h: r.height, over: body.scrollHeight - body.clientHeight}; }));
  const base = await plates(), s = await stageOf(page);
  expect(base.length).toBeGreaterThanOrEqual(2);
  const words = (await page.locator('.nova-dayline').boundingBox())!, foot = (await page.locator('.nova-foot').boundingBox())!;
  for (const p of base) {
    expect(p.tier, p.id).toBe('compact'); expect(p.size, p.id).toBe('S');
    expect(p.y, `${p.id} stands under NOVA’s words`).toBeGreaterThanOrEqual(words.y + words.height + 8);
    expect(p.y + p.h, `${p.id} ends above the command field`).toBeLessThanOrEqual(foot.y + 0.5);
    expect(p.x, `${p.id} inside the star’s column`).toBeGreaterThanOrEqual(s.centre.x - 0.5); expect(p.x + p.w).toBeLessThanOrEqual(s.centre.x + s.centre.w + 0.5);
    expect(overlap(p, s.ring), `${p.id} over the bezel`).toBe(false);
    expect(p.h).toBeGreaterThanOrEqual(112); expect(p.over, `${p.id}: nothing hidden under its edge`).toBeLessThanOrEqual(1);
  }
  // Ten widgets: six in the wings, the plates under the star, the rest on the band; the star is no smaller for it.
  expect(s.panels.filter(p => p.side).length + base.length + s.band.length).toBe(10);
  expect(s.bezel.w).toBeGreaterThanOrEqual(918.5);
  // An answer under the star is the star's base: the plates rest on the band while it stands.
  const field = page.locator('.nova-command input');
  await field.fill('Show my net worth'); await field.press('Enter');
  await expect(page.locator('.ns-answer')).toBeVisible({timeout: 15_000});
  await expect(page.locator('.nova-orbit-main > .nova-orbit-base')).toHaveCount(0);
});

test('P3 at 2560 × 1440: a wing is a Large hero, a supporting panel and a compact plate, each smaller than the one before', async ({page}) => {
  await page.setViewportSize({width: 2560, height: 1440});
  await page.clock.install({time: NOON});
  await showcaseNova(page);
  const s = await stageOf(page);
  for (const side of ['left', 'right'] as const) {
    const panels = wing(s.panels, side), order = side === 'left' ? panels : [...panels].reverse();
    expect(order.map(p => p.tier), side).toEqual(['hero', 'supporting', 'compact']);
    expect(order.map(p => p.size), side).toEqual(['L', 'M', 'S']);
    expect(order[0]!.h).toBeGreaterThan(order[1]!.h * 1.35); expect(order[1]!.h).toBeGreaterThan(order[2]!.h * 1.6);
    for (const p of panels) { expect(overlap(p, s.ring), `${p.id} over the bezel`).toBe(false); expect(p.y + p.h).toBeLessThanOrEqual(s.main.y + s.main.h + 1); }
  }
  // Never below main: at 2560 × 1440 with the left bar open its bezel measured 919 px.
  expect(s.bezel.w).toBeGreaterThanOrEqual(918.5);
});
