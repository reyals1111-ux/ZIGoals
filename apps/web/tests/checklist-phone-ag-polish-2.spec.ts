import {expect, test, type Page} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist, type Checklist} from '../lib/checklist/schema';
import {seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AG Polish 2 (ADR-031; owner Part 1, references 03–06): the phone path. With twelve items and long names, at
 * 320, 375, 390 and 430 px:
 * - 1a the line flows like the computer's: neighbours travel across the width (on average a quarter of the stage or more),
 *   every stretch bends (no near-straight vertical run over 40 % of it), and the line stays inside the stage;
 * - 1b/1c each orbit's planet stands beside its compact banner, at its height, at least 1.4 × a node;
 * - 1d every name shows whole — never cut, never "…" — and no tab covers the line, a node, a planet, a banner or ZIGi;
 * - 1e ZIGi touches no node, tab, planet or banner; nothing scrolls sideways.
 */
const NAMES: [string, string][] = [
  ['Take Vitamins & Creatine', 'morning'], ['Water', 'morning'], ['Read ten pages', 'morning'], ['Meditate ten minutes', 'morning'], ['Exercise', 'morning'],
  ['Walk 8,000 steps', 'afternoon'], ['Play Piano', 'afternoon'], ['Cold shower', 'afternoon'],
  ['Journal three lines before bed', 'evening'], ['Stretch', 'evening'], ['No sugar today', 'evening'],
  ['Learn Spanish', 'anytime'], ['Save €10 for the trip', 'anytime'],
];
function longPath(): Checklist {
  let r = emptyChecklist(), n = 0;
  for (const [label, section] of NAMES) r = addCustom(r, {label, colour: 'cyan', section}, {id: `ck_phone2-${++n}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, n))});
  return r;
}
type Box = {left: number; right: number; top: number; bottom: number};
const overlap = (a: Box, b: Box, pad = 0) => a.left < b.right - pad && a.right > b.left + pad && a.top < b.bottom - pad && a.bottom > b.top + pad;
async function open(page: Page) {
  await seedChecklist(page, {path: longPath()});
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
}
/** Everything the phone's checks read, from one settled layout. */
async function measure(page: Page) {
  await expect(page.locator('.path-stage[data-lanes]')).toHaveCount(1);
  await expect(page.locator('.path-stage[data-settled]')).toHaveCount(1, {timeout: 10_000});
  await page.waitForTimeout(700);
  return page.locator('.path-stage').evaluate(stage => {
    const box = (el: Element) => { const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: r.width, h: r.height}; };
    const sb = box(stage);
    const steps = [...stage.querySelectorAll('.path-step')].map(step => {
      const tab = step.querySelector('.orbit-tab') as HTMLElement, text = step.querySelector('.path-label-text') as HTMLElement, cs = getComputedStyle(tab), ts = getComputedStyle(text);
      return {id: step.querySelector('.path-dot')!.getAttribute('data-step'), label: tab.getAttribute('title') ?? '', shown: text.textContent ?? '', dot: box(step.querySelector('.path-dot')!), tab: box(tab), wrap: tab.hasAttribute('data-wrap'),
        lineH: parseFloat(cs.lineHeight) || 18, cut: text.scrollWidth > text.clientWidth + 1 || tab.scrollWidth > tab.clientWidth + 1 || (text.scrollHeight > text.clientHeight + 1 && ts.overflow !== 'visible'),
        ellipsis: [cs, ts].some(c => c.textOverflow === 'ellipsis' && c.overflow !== 'visible' && c.overflowX !== 'visible') || /…/.test(text.textContent ?? '')};
    });
    const banners = [...stage.querySelectorAll('.orbit-banner')].map(b => ({words: box(b.querySelector('.habit-section-summary')!), sphere: b.querySelector('.orbit-planet-sphere') ? box(b.querySelector('.orbit-planet-sphere')!) : null}));
    const fig = stage.querySelector('.path-zigi[data-alive] .path-zigi-figure');
    const svg = stage.querySelector('svg.orbit-flow')!, so = svg.getBoundingClientRect();
    const segments = [...svg.querySelectorAll('.orbit-flow-segment[data-kind=step] .orbit-flow-core')].map(p => {
      const path = p as SVGPathElement, len = path.getTotalLength(), pts: {x: number; y: number}[] = [];
      for (let l = 0; l <= len; l += 1) { const q = path.getPointAtLength(l); pts.push({x: so.left + q.x, y: so.top + q.y}); }
      return {id: p.parentElement!.getAttribute('data-segment')!, len, pts};
    });
    const dialog = stage.closest('dialog')!;
    return {stage: sb, steps, banners, zigi: fig ? box(fig) : null, segments, sideways: dialog.scrollWidth - dialog.clientWidth};
  });
}

for (const width of [320, 375, 390, 430]) test.describe(`a ${width} px phone`, () => {
  test.beforeEach(async ({page}, info) => {
    test.skip(info.project.name !== 'mobile', 'the phone layout');
    await page.setViewportSize({width, height: 844});
    await open(page);
  });

  test('1a: the line flows across the width — wide and short sweeps, every stretch bent, inside the stage', async ({page}) => {
    const m = await measure(page);
    expect(m.sideways, 'no sideways scroll').toBeLessThanOrEqual(0);
    const xs = m.steps.map(s => (s.dot.left + s.dot.right) / 2), travel = xs.slice(1).map((x, i) => Math.abs(x - xs[i]!));
    const mean = travel.reduce((a, b) => a + b, 0) / travel.length;
    expect(mean / m.stage.w, `mean sideways travel ${Math.round(mean)} px of ${Math.round(m.stage.w)}`).toBeGreaterThanOrEqual(.25);
    expect(new Set(travel.map(t => Math.round(t / 12))).size, 'wide and short sweeps, not one step size').toBeGreaterThan(2);
    expect(m.segments.length, 'a stretch between each two neighbours and each planet').toBeGreaterThanOrEqual(NAMES.length);
    const straight: string[] = [], outside: string[] = [];
    for (const s of m.segments) {
      // The longest run of the stretch that stays within a 4 px wide vertical band: a near-straight vertical piece.
      let longest = 0;
      for (let i = 0; i < s.pts.length; i++) { let lo = s.pts[i]!.x, hi = lo, j = i; while (j + 1 < s.pts.length) { const x = s.pts[j + 1]!.x; lo = Math.min(lo, x); hi = Math.max(hi, x); if (hi - lo > 4) break; j++; } longest = Math.max(longest, j - i); }
      if (longest / s.len > .4) straight.push(`${s.id}: ${Math.round(longest)} of ${Math.round(s.len)} px`);
      if (s.pts.some(q => q.x < m.stage.left - .5 || q.x > m.stage.right + .5)) outside.push(s.id);
    }
    expect(straight, 'no stretch with a straight vertical run over 40 % of it').toEqual([]);
    expect(outside, 'the line inside the stage').toEqual([]);
  });

  test('1b–1e: whole names, planets beside their banners, nothing overlapping, tabs clear of the line', async ({page}) => {
    const m = await measure(page);
    expect(m.steps).toHaveLength(NAMES.length);
    for (const s of m.steps) {
      expect(s.shown, `${s.id}: the whole name`).toBe(s.label);
      expect(s.cut, `${s.id} (${s.label}): nothing cut`).toBe(false);
      expect(s.ellipsis, `${s.id} (${s.label}): no ellipsis`).toBe(false);
      if (!s.wrap) expect(s.tab.h, `${s.id}: one line`).toBeLessThan(s.lineH * 2);
      expect(s.tab.left, `${s.id}: on screen`).toBeGreaterThanOrEqual(0); expect(s.tab.right).toBeLessThanOrEqual(width);
    }
    // Only a very long name on the narrowest phone may wrap (owner Part 1d).
    if (width >= 375) expect(m.steps.filter(s => s.wrap).map(s => s.label), 'one line each').toEqual([]);
    const node = Math.min(...m.steps.map(s => s.dot.w));
    for (const b of m.banners) {
      expect(b.sphere, 'every orbit has its planet').not.toBeNull();
      const p = b.sphere!, cy = (p.top + p.bottom) / 2;
      expect(cy, 'the planet at its banner\'s height').toBeGreaterThanOrEqual(b.words.top); expect(cy).toBeLessThanOrEqual(b.words.bottom);
      expect(p.left, 'beside the banner, not under it').toBeGreaterThanOrEqual(b.words.right - .5);
      // (The owner's change of 22 Oct: at 320 px the planet may give the one-row banner room, down to about 1.3 × a node.)
      expect(p.w, `a planet as big as on a computer (≥ ${width < 360 ? 1.3 : 1.4} × the ${node} px node)`).toBeGreaterThanOrEqual(node * (width < 360 ? 1.3 : 1.4));
    }
    const things: {id: string; b: Box; kind: string}[] = [
      ...m.steps.map(s => ({id: `${s.id} node`, b: s.dot, kind: 'node'})), ...m.steps.map(s => ({id: `${s.id} tab`, b: s.tab, kind: 'tab'})),
      ...m.banners.map((b, i) => ({id: `banner ${i}`, b: b.words, kind: 'banner'})), ...m.banners.flatMap((b, i) => b.sphere ? [{id: `planet ${i}`, b: b.sphere, kind: 'planet'}] : []),
    ];
    const overlaps: string[] = [];
    for (const s of m.steps) for (const o of things) {
      if (o.id.startsWith(`${s.id} `)) continue;
      if (overlap(s.tab, o.b, -2)) overlaps.push(`${s.id}'s tab on ${o.id}`);
      if (o.kind !== 'tab' && overlap(s.dot, o.b)) overlaps.push(`${s.id}'s node on ${o.id}`);
    }
    expect(overlaps, 'no tab or node overlaps anything').toEqual([]);
    expect(m.zigi, 'ZIGi beside the next node').not.toBeNull();
    expect(things.filter(o => overlap(m.zigi!, o.b)).map(o => o.id), 'ZIGi clear of everything').toEqual([]);
    // No tab sits on the line (sampled every pixel of every stretch).
    const under = new Set<string>();
    for (const seg of m.segments) for (const s of m.steps) { const t = s.tab; if (seg.pts.some(q => q.x > t.left + 1 && q.x < t.right - 1 && q.y > t.top + 1 && q.y < t.bottom - 1)) under.add(`${seg.id} under ${s.id}'s tab`); }
    expect([...under], 'no tab covers the line').toEqual([]);
  });
});

/** The owner's change to Part 1b (22 Oct): every orbit banner on a phone is ONE row — symbol, title, compact chip — beside
 *  its planet, in progress ("0/2") and complete ("✓ Done"; the check alone under 360 px), its words said in full. */
const FOUR: [string, string][] = [['Fictional sunrise', 'morning'], ['Fictional dawn', 'morning'], ['Fictional noon', 'afternoon'], ['Fictional tea', 'afternoon'], ['Fictional dusk', 'evening'], ['Fictional moon', 'evening'], ['Fictional any', 'anytime'], ['Fictional other', 'anytime']];
function fourOrbits(): Checklist { let r = emptyChecklist(), n = 0; for (const [label, section] of FOUR) r = addCustom(r, {label, colour: 'cyan', section}, {id: `ck_four-${++n}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, n))}); return r; }
for (const state of ['in progress', 'complete'] as const) test(`the phone banner is one row beside its planet, ${state}, at 320–430 px for all four orbits`, async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'the phone layout');
  test.setTimeout(90_000);
  await seedChecklist(page, {path: fourOrbits()});
  if (state === 'complete') await page.evaluate(() => {
    const d = new Date(), today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    localStorage.setItem('zigoals:checklist-days:v1', JSON.stringify({version: 1, days: {}, today: {date: today, ticks: [], custom: Array.from({length: 8}, (_, i) => `ck_four-${i + 1}`), nudged: []}}));
    localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, checklist: {celebratedOn: today}}));
  });
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({width, height: 844});
    await expect(page.locator('.path-stage[data-settled]')).toHaveCount(1, {timeout: 10_000});
    await page.waitForTimeout(500);
    const m = await page.locator('.path-stage').evaluate(stage => {
      const box = (el: Element) => { const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: r.width, h: r.height}; };
      const node = Math.min(...[...stage.querySelectorAll('.path-step:not([data-next]) .path-dot')].map(d => (d as HTMLElement).offsetWidth));
      const banners = [...stage.querySelectorAll('.orbit-banner')].map(b => {
        const words = b.querySelector('.habit-section-summary')!, mark = b.querySelector('.habit-section-mark')!, title = b.querySelector('.habit-section-title')!, chip = b.querySelector('.habit-section-count')!;
        const short = [...chip.querySelectorAll('[aria-hidden]')].find(e => getComputedStyle(e).display !== 'none');
        return {title: title.textContent, words: box(words), mark: box(mark), titleBox: box(title), chip: box(chip), shown: (short as HTMLElement | undefined)?.innerText.trim() ?? '', spoken: chip.querySelector('.sr-only')?.textContent ?? '',
          lineH: parseFloat(getComputedStyle(title).lineHeight), size: parseFloat(getComputedStyle(title).fontSize), cut: (title as HTMLElement).scrollWidth > (title as HTMLElement).clientWidth + 1 || (chip as HTMLElement).scrollWidth > (chip as HTMLElement).clientWidth + 1,
          sphere: box(b.querySelector('.orbit-planet-sphere')!)};
      });
      const dialog = stage.closest('dialog')!;
      return {node, banners, sideways: dialog.scrollWidth - dialog.clientWidth};
    });
    expect(m.sideways, `${width}: no sideways scroll`).toBeLessThanOrEqual(0);
    expect(m.banners.map(b => b.title)).toEqual(['Morning Orbit', 'Afternoon Orbit', 'Evening Orbit', 'Anytime Orbit']);
    for (const b of m.banners) {
      const at = `${width}, ${state}, ${b.title}`, mid = (r: {top: number; bottom: number}) => (r.top + r.bottom) / 2;
      // One row: the title on one line; symbol, title and chip on the same line; the banner one row tall.
      expect(b.titleBox.h, `${at}: the title on one line`).toBeLessThan(b.lineH * 1.5);
      expect(Math.abs(mid(b.mark) - mid(b.titleBox)), `${at}: symbol and title on one row`).toBeLessThanOrEqual(4);
      expect(Math.abs(mid(b.chip) - mid(b.titleBox)), `${at}: chip and title on one row`).toBeLessThanOrEqual(4);
      expect(b.words.h, `${at}: the banner one row tall`).toBeLessThanOrEqual(Math.max(b.mark.h, b.titleBox.h, b.chip.h) + 20);
      expect(b.size, `${at}: the title 16 px (15 at 320)`).toBe(width < 360 ? 15 : 16);
      expect(b.cut, `${at}: nothing cut`).toBe(false);
      // The compact chip, the whole said in words.
      expect(b.shown, `${at}: the compact chip`).toBe(state === 'complete' ? (width < 360 ? '✓' : '✓ Done') : '0/2');
      expect(b.spoken, `${at}: said in full`).toBe(state === 'complete' ? `${b.title} complete` : '0 of 2 complete');
      // Beside its planet, at its height; the planet clear of the words and clearly bigger than a node.
      expect(b.sphere.left, `${at}: the planet clear of the chip`).toBeGreaterThanOrEqual(Math.max(b.chip.right, b.titleBox.right) + 2);
      expect(mid(b.sphere), `${at}: the planet at the banner's height`).toBeGreaterThanOrEqual(b.words.top); expect(mid(b.sphere)).toBeLessThanOrEqual(b.words.bottom);
      expect(b.sphere.w, `${at}: the planet clearly bigger than a node`).toBeGreaterThanOrEqual(m.node * (width < 360 ? 1.3 : 1.4));
      expect(b.words.left, `${at}: on screen`).toBeGreaterThanOrEqual(0);
    }
  }
});
