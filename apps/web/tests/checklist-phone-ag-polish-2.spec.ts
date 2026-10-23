import {expect, test, type Page} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist, type Checklist} from '../lib/checklist/schema';
import {seedChecklist, settled} from './checklist-fixtures';
import {read} from '../lib/path/river-rules.test-helper';
import type {FlowSegment} from '../lib/path/flow-geometry';

/**
 * Session AG Polish 2 (ADR-031; owner Part 1, references 03–06): the phone path. With twelve items and long names, at
 * 320, 375, 390 and 430 px:
 * - 1a the line is the computer's river (Session AG Polish 3, ADR-032; it replaced amendment 5's ribbon): each stretch two
 *   cubics joined smoothly at a waypoint (owner amendment 6), never upward, never a radius under 40 px × width / 390, through each node within 60° of the way it came,
 *   top-in and bottom-out at each planet; the nodes reach both outer thirds; the line inside the stage and over no tab, node,
 *   planet or banner;
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
type Pt = {x: number; y: number};
const unit = (v: Pt) => { const l = Math.hypot(v.x, v.y) || 1; return {x: v.x / l, y: v.y / l}; };
const angle = (a: Pt, b: Pt) => Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y))) * 180 / Math.PI;
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
    // (Every stretch's own curve, its ends' rings and the banners, in the line's own coordinates.)
    const flow = [...svg.querySelectorAll('.orbit-flow-segment')].map(g => ({id: g.getAttribute('data-segment')!, kind: g.getAttribute('data-kind')!, d: g.querySelector('.orbit-flow-core')!.getAttribute('d')!}));
    const rings: Record<string, {x: number; y: number; r: number}> = {};
    for (const el of stage.querySelectorAll<HTMLElement>('[data-path-point]')) { const r = el.getBoundingClientRect(); rings[el.dataset.pathPoint!] = {x: r.left + r.width / 2 - so.left, y: r.top + r.height / 2 - so.top, r: (el.offsetWidth || r.width) / 2}; }
    const local = (b: {left: number; right: number; top: number; bottom: number}) => ({left: b.left - so.left, right: b.right - so.left, top: b.top - so.top, bottom: b.bottom - so.top});
    const dialog = stage.closest('dialog')!;
    return {stage: sb, steps, banners, zigi: fig ? box(fig) : null, segments, flow, rings, local: {banners: banners.map(b => local(b.words)), tabs: steps.map(s => ({id: s.id, ...local(s.tab)}))}, svgW: so.width, sideways: dialog.scrollWidth - dialog.clientWidth};
  });
}

for (const width of [320, 375, 390, 430]) test.describe(`a ${width} px phone`, () => {
  test.beforeEach(async ({page}, info) => {
    test.skip(info.project.name !== 'mobile', 'the phone layout');
    await page.setViewportSize({width, height: 844});
    await open(page);
  });

  // Session AG Polish 3 (ADR-032; owner Part 1), moved: the ribbon's rules (one cubic leaning through each ring, tangent
  // to it, on within 5°, mean travel ≥ 30 %, no near-vertical run) are replaced by the owner's river rules — the line flows
  // THROUGH each node, meeting its ring wherever it flows: each stretch two cubics through a waypoint (amendment 6), never upward, no radius under
  // 40 px × width / 390, on within 60° through a node, top-in and bottom-out at a planet, over no tab, node, planet or
  // banner, inside the stage; the nodes reach both outer thirds in short steps and wide sweeps.
  test('1a: the river across the width — every stretch smooth and downward, through each node, over nothing', async ({page}) => {
    const m = await measure(page);
    expect(m.sideways, 'no sideways scroll').toBeLessThanOrEqual(0);
    const xs = m.steps.map(s => (s.dot.left + s.dot.right) / 2 - m.stage.left), travel = xs.slice(1).map((x, i) => Math.abs(x - xs[i]!));
    expect(Math.min(...xs), 'a node in the left third').toBeLessThan(m.stage.w / 3);
    expect(Math.max(...xs), 'a node in the right third').toBeGreaterThan(m.stage.w * 2 / 3);
    expect(new Set(travel.map(t => Math.round(t / 12))).size, 'short steps and wide sweeps, not one step size').toBeGreaterThan(2);
    expect(m.segments.length, 'a stretch between each two neighbours and each planet').toBeGreaterThanOrEqual(NAMES.length);
    const outside: string[] = [];
    for (const s of m.segments) if (s.pts.some(q => q.x < m.stage.left - .5 || q.x > m.stage.right + .5)) outside.push(s.id);
    expect(outside, 'the line inside the stage').toEqual([]);
    const least = 40 * width / 390 - .5, shape: string[] = [], tight: string[] = [], up: string[] = [], joins: string[] = [], rings: string[] = [], over: string[] = [];
    // (Owner amendment 6: each stretch two cubics joined smoothly at a waypoint — the computer's shape.)
    const curves = read(m.flow.map(s => ({...s, from: null, to: null, x1: 0, y1: 0, x2: 0, y2: 0, fromColour: '', toColour: '', fromLit: false, toLit: false, kind: s.kind as FlowSegment['kind']})));
    for (const {s, cs, pts, minR} of curves) {
      if (s.kind === 'step' && cs.length !== 2) shape.push(`${s.id}: ${cs.length} cubic(s)`);
      let low = -Infinity;
      for (const p of pts) { if (p.y < low - 1) { up.push(s.id); break; } low = Math.max(low, p.y); }
      if (minR < least) tight.push(`${s.id}: ${Math.round(minR)} px`);
      const [from, to] = s.kind === 'step' ? s.id.split('>') : s.kind === 'lead' ? ['', s.id.slice(5)] : [s.id.slice(5), ''];
      for (const p of pts.slice(2, -2)) {
        for (const b of [...m.local.banners, ...m.local.tabs]) if (p.x > b.left + 1 && p.x < b.right - 1 && p.y > b.top + 1 && p.y < b.bottom - 1) over.push(`${s.id} over ${'id' in b ? `${b.id}'s tab` : 'a banner'}`);
        for (const [id, q] of Object.entries(m.rings)) if (id !== from && id !== to && Math.hypot(p.x - q.x, p.y - q.y) < q.r + 2) over.push(`${s.id} over ${id}`);
      }
    }
    // Each end on its ring's rim; through a node on within 60° of the way it came; a planet straight down at both rims.
    for (let i = 0; i + 1 < curves.length; i++) {
      const a = curves[i]!, b = curves[i + 1]!, end = a.pts.at(-1)!, start = b.pts[0]!, tin = unit(a.end), tout = unit(b.start);
      const at = a.s.kind === 'lead' ? a.s.id.slice(5) : a.s.id.split('>')[1]!, planet = at.startsWith('planet:');
      if (angle(tin, tout) > (planet ? 5 : 60)) joins.push(`${at}: ${angle(tin, tout).toFixed(1)}°`);
      const q = m.rings[at]; if (!q) continue;
      for (const [p, t] of [[end, tin], [start, tout]] as const) {
        if (Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - q.r) > 1.5) rings.push(`${at}: the line meets it ${Math.round(Math.hypot(p.x - q.x, p.y - q.y) - q.r)} px off its rim`);
        if (planet && Math.abs(t.x) > Math.sin(5 * Math.PI / 180)) rings.push(`${at}: not straight down at its rim`);
      }
    }
    expect(shape, 'each stretch two cubics through a waypoint').toEqual([]);
    expect(up, 'never climbing back up').toEqual([]);
    expect(tight, `no radius of curvature under ${least.toFixed(1)} px`).toEqual([]);
    expect(joins, 'one stream through each node (within 60°), straight down through each planet').toEqual([]);
    expect(rings, 'each end on its ring\'s rim, top-in and bottom-out at a planet').toEqual([]);
    expect([...new Set(over)], 'the line over no tab, node, planet or banner').toEqual([]);
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
