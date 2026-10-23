import {expect, test, type Page} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist, type Checklist} from '../lib/checklist/schema';
import {seedChecklist, settled} from './checklist-fixtures';
import {hard, kinds, type Drawn} from '../lib/path/river-rules.test-helper';
import type {FlowNode, FlowSegment} from '../lib/path/flow-geometry';

/**
 * Session AG Polish 3 (ADR-032; owner Part 1 and amendments 2 and 4): the phone's river, on 390 × 844 and 360 × 780 phones
 * with three sample paths (thirteen items over four orbits with long names; six short ones in one orbit; two orbits of
 * three and two):
 * - the river (owner amendment 7), read from the drawn path data: the hard rules (never upward, no radius under 40 px ×
 *   width/390, inside the column, clear of every other ring, name tab and banner, planets top-in and bottom-out); a drift,
 *   a sweep and a bow somewhere in the first two screens; and the three paths' first views different;
 * - the first screen, below the first orbit's banner and above the timer row, shows 3–4 whole nodes (at least 3 at 360);
 * - nothing jumps on the first open: the path shows only once it is laid out, and every node stands where it first
 *   showed a second later;
 * - ZIGi's box overlaps no point of the line, no node, no name tab and no NEXT badge;
 * - the current node, once the path has moved to it, stands clear of the timer row.
 */
const LONG: [string, string][] = [
  ['Take Vitamins & Creatine', 'morning'], ['Water', 'morning'], ['Read ten pages', 'morning'], ['Meditate ten minutes', 'morning'], ['Exercise', 'morning'],
  ['Walk 8,000 steps', 'afternoon'], ['Play Piano', 'afternoon'], ['Cold shower', 'afternoon'],
  ['Journal three lines before bed', 'evening'], ['Stretch', 'evening'], ['No sugar today', 'evening'],
  ['Learn Spanish', 'anytime'], ['Save €10 for the trip', 'anytime'],
];
const SHORT: [string, string][] = [['Water', 'morning'], ['Weigh in', 'morning'], ['Log breakfast', 'morning'], ['Read', 'morning'], ['Walk', 'morning'], ['Stretch', 'morning']];
const TWO: [string, string][] = [['Fictional sunrise', 'morning'], ['Fictional dawn', 'morning'], ['Fictional tea', 'morning'], ['Fictional dusk', 'evening'], ['Fictional moon', 'evening']];
const PATHS = {long: LONG, short: SHORT, two: TWO} as const;
function pathOf(items: readonly [string, string][]): Checklist {
  let r = emptyChecklist(), n = 0;
  for (const [label, section] of items) r = addCustom(r, {label, colour: 'cyan', section}, {id: `ck_river-${++n}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, n))});
  return r;
}
async function open(page: Page, items: readonly [string, string][]) {
  await seedChecklist(page, {path: pathOf(items)});
  // (From the very first frame: whether the path shows, and where each node stands the first frame it does, then a second later.)
  await page.addInitScript(() => {
    const w = window as unknown as {__river: {hiddenBefore: boolean; first: number[][] | null; later: number[][] | null}};
    w.__river = {hiddenBefore: true, first: null, later: null};
    const read = () => [...document.querySelectorAll('.path-stage .path-dot')].map(d => { const r = d.getBoundingClientRect(), s = d.closest('.path-stage')!.getBoundingClientRect(); return [Math.round((r.left - s.left) * 10) / 10, Math.round((r.top - s.top) * 10) / 10]; });
    const tick = () => {
      const stage = document.querySelector<HTMLElement>('.path-stage[data-variant=orbit]');
      if (stage && stage.querySelector('.path-dot')) {
        const shown = getComputedStyle(stage).visibility !== 'hidden';
        if (shown && !w.__river.first) { w.__river.first = read(); window.setTimeout(() => { w.__river.later = read(); }, 1000); }
        if (!shown && w.__river.first) w.__river.hiddenBefore = false;
      }
      if (!w.__river.later) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
  await expect(page.locator('.path-stage[data-ready][data-lanes]')).toHaveCount(1, {timeout: 15_000});
  await expect(page.locator('.path-stage[data-settled]')).toHaveCount(1, {timeout: 15_000});
}

for (const [width, height] of [[390, 844], [360, 780]] as const) test.describe(`a ${width} × ${height} phone`, () => {
  test.beforeEach(async ({page}, info) => {
    test.skip(info.project.name !== 'mobile', 'the phone layout');
    await page.setViewportSize({width, height});
  });

  for (const name of ['long', 'short'] as const) test(`the first screen shows ${width === 390 ? '3–4' : 'at least 3'} whole nodes, and nothing jumps on opening (${name})`, async ({page}) => {
    await open(page, PATHS[name]);
    const view = await page.evaluate(() => {
      const banner = document.querySelector('.path-stage .orbit-banner')!.getBoundingClientRect(), dock = document.querySelector('.checklist-dock')!.getBoundingClientRect();
      return {seen: [...document.querySelectorAll('.path-stage .path-dot')].map(d => d.getBoundingClientRect()).filter(r => r.top >= banner.bottom - .5 && r.bottom <= dock.top + .5).length};
    });
    expect(view.seen, 'whole nodes between the first banner and the timer row').toBeGreaterThanOrEqual(3);
    if (width === 390) expect(view.seen).toBeLessThanOrEqual(4);
    // Owner amendment 2: hidden until laid out, then never moving.
    await expect.poll(() => page.evaluate(() => (window as unknown as {__river: {later: unknown}}).__river.later !== null), {timeout: 5000}).toBe(true);
    const river = await page.evaluate(() => (window as unknown as {__river: {hiddenBefore: boolean; first: number[][]; later: number[][]}}).__river);
    expect(river.hiddenBefore, 'never hidden again once shown').toBe(true);
    expect(river.first.length).toBe(PATHS[name].length);
    river.first.forEach((p, i) => { expect(Math.abs(p[0]! - river.later[i]![0]!), `node ${i} across`).toBeLessThanOrEqual(1); expect(Math.abs(p[1]! - river.later[i]![1]!), `node ${i} down`).toBeLessThanOrEqual(1); });
  });

  test('the river: the hard rules; a drift, a sweep and a bow in the first two screens; three paths, three different first views (owner amendment 7)', async ({page}) => {
    const firsts: string[] = [];
    for (const name of ['long', 'short', 'two'] as const) {
      await open(page, PATHS[name]);
      const m = await page.evaluate(() => {
        const svg = document.querySelector('.path-stage svg.orbit-flow')!, o = svg.getBoundingClientRect();
        const rel = (r: DOMRect) => ({left: r.left - o.left, right: r.right - o.left, top: r.top - o.top, bottom: r.bottom - o.top});
        const segments = [...svg.querySelectorAll('.orbit-flow-segment')].map(g => {
          const id = g.getAttribute('data-segment')!, kind = g.getAttribute('data-kind')!, [from, to] = kind === 'step' ? id.split('>') : kind === 'lead' ? [null, id.slice(5)] : [id.slice(5), null];
          return {id, kind, from, to, d: g.querySelector('.orbit-flow-core')!.getAttribute('d')!};
        });
        const nodes = [...document.querySelectorAll<HTMLElement>('.path-stage [data-path-point]')].map(el => { const r = el.getBoundingClientRect(); return {id: el.dataset.pathPoint!, x: r.left + r.width / 2 - o.left, y: r.top + r.height / 2 - o.top, r: (el.offsetWidth || r.width) / 2}; });
        const boxes = [...[...document.querySelectorAll('.path-stage .orbit-tab')].map((t, i) => ({id: `tab ${i}`, ...rel(t.getBoundingClientRect())})),
          ...[...document.querySelectorAll('.path-stage .orbit-banner > .habit-section-summary')].map((t, i) => ({id: `banner ${i}`, ...rel(t.getBoundingClientRect())}))];
        const dock = document.querySelector('.checklist-dock')!.getBoundingClientRect().top;
        return {w: o.width, segments, nodes, boxes, screen: dock - o.top};
      });
      // (Each station's sides, read from where the line meets it: left or right of its centre, or its top and bottom.)
      const at = (d: string, end: boolean) => { const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number); return end ? {x: n.at(-2)!, y: n.at(-1)!} : {x: n[0]!, y: n[1]!}; };
      const side = (p: {x: number; y: number}, n: {x: number; y: number}) => p.x < n.x - 2 ? 'left' : p.x > n.x + 2 ? 'right' : p.y < n.y ? 'top' : 'bottom';
      const nodes = m.nodes.map(n => {
        const into = m.segments.find(q => q.to === n.id), out = m.segments.find(q => q.from === n.id);
        return {...n, colour: '', done: false, inSide: into ? side(at(into.d, true), n) : 'top', outSide: out ? side(at(out.d, false), n) : 'bottom'} as FlowNode;
      });
      const segments = m.segments.map(q => ({...q, x1: 0, y1: 0, x2: 0, y2: 0, fromColour: '', toColour: '', fromLit: false, toLit: false}) as FlowSegment);
      const d: Drawn = {w: m.w, vw: width, nodes, boxes: m.boxes, segments};
      expect(hard(d), `${name}: the hard rules`).toEqual([]);
      // (The first two screens: the stretches that end there.)
      const early = segments.filter(q => { const to = nodes.find(n => n.id === q.to); return !!to && to.y < 2 * m.screen; });
      const seen = kinds({...d, segments: early});
      for (const k of ['drift', 'sweep', 'bow'] as const) expect(seen, `${name}: a ${k} in the first two screens`).toContain(k);
      firsts.push(kinds({...d, segments: segments.filter(q => { const to = nodes.find(n => n.id === q.to); return !!to && to.y < m.screen; })}).join(' '));
    }
    expect(new Set(firsts).size, `three first views: ${firsts.join(' | ')}`).toBe(3);
  });

  test('ZIGi stands clear of the line, every node, every name tab and the NEXT badge (three sample paths)', async ({page}) => {
    for (const name of ['long', 'short', 'two'] as const) {
      await open(page, PATHS[name]);
      await expect(page.locator('[data-next] .path-zigi[data-alive] .path-zigi-figure')).toHaveCount(1);
      await page.waitForTimeout(700);
      const hits = await page.evaluate(() => {
        const box = (el: Element) => { const r = el.getBoundingClientRect(); return {left: r.left, right: r.right, top: r.top, bottom: r.bottom}; };
        const z = box(document.querySelector('[data-next] .path-zigi[data-alive] .path-zigi-figure')!), out: string[] = [];
        const hit = (b: {left: number; right: number; top: number; bottom: number}) => z.left < b.right && z.right > b.left && z.top < b.bottom && z.bottom > b.top;
        for (const d of document.querySelectorAll('.path-stage .path-dot')) if (hit(box(d))) out.push(`node ${d.getAttribute('data-step')}`);
        for (const t of document.querySelectorAll('.path-stage .orbit-tab')) if (hit(box(t))) out.push(`tab ${t.textContent}`);
        for (const t of document.querySelectorAll('.path-stage .path-next-tag')) if (hit(box(t))) out.push('the NEXT badge');
        const svg = document.querySelector('.path-stage svg.orbit-flow')!, o = svg.getBoundingClientRect();
        for (const p of svg.querySelectorAll<SVGPathElement>('.orbit-flow-core')) {
          const len = p.getTotalLength();
          for (let l = 0; l <= len; l += 2) { const q = p.getPointAtLength(l), x = o.left + q.x, y = o.top + q.y; if (x > z.left && x < z.right && y > z.top && y < z.bottom) { out.push(`the line (${p.parentElement!.getAttribute('data-segment')})`); break; } }
        }
        return out;
      });
      expect(hits, `${name}: ZIGi's box`).toEqual([]);
    }
  });

  test('the current node, once the path moves to it, stands clear of the timer row', async ({page}) => {
    await open(page, LONG);
    const stage = page.locator('.path-stage');
    // Tick the morning: the path glides on to the next orbit, whose first node is then the current one.
    for (const [label] of LONG.slice(0, 5)) await stage.getByRole('button', {name: `${label}: not done yet`, exact: true}).click();
    await expect(page.locator('[data-next] .path-dot')).toHaveAttribute('data-step', 'ck_river-6');
    await page.waitForTimeout(2600);
    const at = await page.evaluate(() => ({node: document.querySelector('[data-next] .path-dot')!.getBoundingClientRect().bottom, dock: document.querySelector('.checklist-dock')!.getBoundingClientRect().top, head: document.querySelector('.checklist-topbar')!.getBoundingClientRect().bottom}));
    expect(at.node, 'above the timer row').toBeLessThanOrEqual(at.dock);
    expect(at.node - 62, 'below the top bar').toBeGreaterThanOrEqual(at.head);
  });
});
