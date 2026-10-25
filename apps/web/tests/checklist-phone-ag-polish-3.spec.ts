import {expect, test, type Page} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist, type Checklist} from '../lib/checklist/schema';
import {seedChecklist, settled} from './checklist-fixtures';
import {COMPUTER, phoneAcross, phoneTransform, syRange} from '../lib/path/phone-scale';

/**
 * Session AG Polish 3 (ADR-032 L20; owner amendment 8, "phone = computer × scale", and amendments 2 and 4): the phone's
 * path on 390 × 844 and 360 × 780 phones with sample paths (thirteen items over four orbits with long names; six short
 * ones in one orbit; two orbits of three and two):
 * - every node is the computer's own — read from the real computer at 1440 × 900 — with x stretched by one kx per path
 *   (its outermost rings 8–14 px from the edges) and y × sy, sy in [2 × sx, 1] (amendments 10, 10b); the line meets
 *   each ring on its rim with the computer's stroke widths and glow; each tab one short word on one line, inside the
 *   column and over nothing (no line, ring, tab, banner or planet); no node within 10 px of another;
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

  for (const name of ['long', 'short'] as const) test(`nothing jumps on opening (${name})`, async ({page}) => {
    await open(page, PATHS[name]);
    // Owner amendment 2: hidden until laid out, then never moving.
    await expect.poll(() => page.evaluate(() => (window as unknown as {__river: {later: unknown}}).__river.later !== null), {timeout: 5000}).toBe(true);
    const river = await page.evaluate(() => (window as unknown as {__river: {hiddenBefore: boolean; first: number[][]; later: number[][]}}).__river);
    expect(river.hiddenBefore, 'never hidden again once shown').toBe(true);
    expect(river.first.length).toBe(PATHS[name].length);
    river.first.forEach((p, i) => { expect(Math.abs(p[0]! - river.later[i]![0]!), `node ${i} across`).toBeLessThanOrEqual(1); expect(Math.abs(p[1]! - river.later[i]![1]!), `node ${i} down`).toBeLessThanOrEqual(1); });
  });

  for (const name of ['long', 'short'] as const) test(`every node is the computer's × (kx, sy); the line meets each ring at the computer's stroke; one short word per tab, inside the column and over nothing (${name}; owner amendments 8, 10, 10b)`, async ({page, browser}) => {
    const readPath = () => {
      const stage = document.querySelector<HTMLElement>('.path-stage[data-variant=orbit]')!, o = stage.getBoundingClientRect();
      const centre = (el: Element) => { const r = el.getBoundingClientRect(); return {x: r.left + r.width / 2 - o.left, y: r.top + r.height / 2 - o.top, r: r.width / 2}; };
      const nodes = [...stage.querySelectorAll('.path-dot')].map(d => ({id: d.getAttribute('data-step')!, ...centre(d)}));
      const planets = [...stage.querySelectorAll('[data-path-point^="planet:"]')].map(centre);
      const segments = [...stage.querySelectorAll('.orbit-flow-segment')].map(g => ({id: g.getAttribute('data-segment')!, d: g.querySelector('.orbit-flow-core')!.getAttribute('d')!}));
      const stroke = (sel: string) => getComputedStyle(stage.querySelector(sel)!).strokeWidth;
      // (The line's points every 2 px, each tab's box and each banner's pill, on the stage.)
      const pts = [...stage.querySelectorAll<SVGPathElement>('.orbit-flow-core')].flatMap(path => { const n = path.getTotalLength(), m = path.getScreenCTM()!, out: {x: number; y: number}[] = []; for (let l = 0; l <= n; l += 2) { const q = path.getPointAtLength(l); out.push({x: q.x * m.a + m.e - o.left, y: q.y * m.d + m.f - o.top}); } return out; });
      const box = (el: Element) => { const r = el.getBoundingClientRect(); return {l: r.left - o.left, r: r.right - o.left, t: r.top - o.top, b: r.bottom - o.top}; };
      const tabs = [...stage.querySelectorAll<HTMLElement>('.orbit-tab')].map(t => { const text = t.querySelector<HTMLElement>('.path-label-text')!; return {label: t.title, shown: text.textContent ?? '', ...box(t), lines: Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)), cut: text.scrollWidth > text.clientWidth + 1}; });
      const pills = [...stage.querySelectorAll('[data-path-box^="banner:"]')].map(box);
      return {w: o.width, sy: Number(stage.dataset.sy), kx: Number(stage.dataset.kx), nodes, planets, segments, strokes: [stroke('.orbit-flow-core'), stroke('.orbit-flow-halo'), stroke('.orbit-flow-glow path')],
        blur: stage.querySelector('feGaussianBlur')!.getAttribute('stdDeviation'), planetR: planets[0]!.r, planetY: planets[0]!.y, pts, tabs, pills};
    };
    // The computer's own path: the real page at 1440 × 900 (its stage is the virtual column).
    const desk = await browser.newContext({viewport: {width: 1440, height: 900}}), dp = await desk.newPage();
    await seedChecklist(dp, {path: pathOf(PATHS[name])}); await dp.goto('/app/checklist'); await settled(dp);
    await expect(dp.locator('.path-stage[data-settled]')).toHaveCount(1, {timeout: 15_000});
    const computer = await dp.evaluate(readPath); await desk.close();
    expect(computer.w, 'the virtual column is the computer\'s stage').toBe(COMPUTER.w);
    await open(page, PATHS[name]);
    const phone = await page.evaluate(readPath);
    // Down (amendment 10): y × sy, sy at least twice the width's scale and at most 1. Across (10b): one stretch kx per path.
    const {sx, dy} = phoneTransform(phone.w, phone.sy, computer.planetY, Math.max(phone.planetR + 5, phone.planetR));
    expect(phone.sy, 'sy ≥ 2 × sx').toBeGreaterThanOrEqual(syRange(phone.w).min - 1e-4); expect(phone.sy, 'sy ≤ 1').toBeLessThanOrEqual(1);
    expect(sx, 'sx fits the width').toBeGreaterThan(0);
    const across = phoneAcross(phone.w, computer.nodes.map(n => n.x));
    expect(Math.abs(phone.kx - across.kx), 'kx').toBeLessThanOrEqual(1e-3);
    const off: string[] = [];
    computer.nodes.forEach((c, i) => {
      const p = phone.nodes[i]!;
      if (p.id !== c.id) off.push(`node ${i}: ${p.id} vs ${c.id}`);
      if (Math.abs(p.x - across.at(c.x)) > .5) off.push(`${c.id} across: ${p.x.toFixed(1)} vs ${across.at(c.x).toFixed(1)}`);
      if (Math.abs(p.y - (c.y * phone.sy + dy)) > .5) off.push(`${c.id} down: ${p.y.toFixed(1)} vs ${(c.y * phone.sy + dy).toFixed(1)}`);
    });
    expect(off, `the computer's nodes × (kx ${phone.kx}, sy ${phone.sy})`).toEqual([]);
    const xs = phone.nodes.map(n => n.x), r = phone.nodes[0]!.r;
    expect(Math.min(...xs) - r, 'the leftmost ring 8–14 px from the edge').toBeGreaterThanOrEqual(8); expect(Math.min(...xs) - r).toBeLessThanOrEqual(14);
    expect(phone.w - Math.max(...xs) - r, 'the rightmost ring 8–14 px from the edge').toBeGreaterThanOrEqual(8); expect(phone.w - Math.max(...xs) - r).toBeLessThanOrEqual(14);
    // The line: the computer's own stretches, meeting each ring on its rim; the computer's stroke widths and glow.
    expect(phone.segments.map(q => q.id), 'the same stretches').toEqual(computer.segments.map(q => q.id));
    const rings = [...phone.nodes, ...phone.planets], ends: string[] = [];
    for (const q of phone.segments) {
      const n = (q.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number), at = [{x: n[0]!, y: n[1]!, end: 'start'}, {x: n.at(-2)!, y: n.at(-1)!, end: 'end'}];
      for (const e of at) if (!(q.id.startsWith('lead:') && e.end === 'start') && !(q.id.startsWith('tail') && e.end === 'end') && !rings.some(g => Math.abs(Math.hypot(e.x - g.x, e.y - g.y) - g.r) <= 1.5)) ends.push(`${q.id} ${e.end}`);
    }
    expect(ends, 'every stretch starts and ends on a ring').toEqual([]);
    expect(phone.pts.every(q => q.x >= 0 && q.x <= phone.w), 'the line inside the column').toBe(true);
    expect(phone.strokes, 'the computer\'s stroke widths, never scaled down').toEqual(computer.strokes);
    expect(phone.blur, 'the computer\'s glow').toBe(computer.blur);
    // Amendment 10, step 4: one short word on each tab (12 letters at most), the full name in its title; one line.
    for (const t of phone.tabs) {
      expect(t.shown, `${t.label}: one word`).toMatch(/^\S{1,12}$/); expect(t.cut, `${t.label}: nothing cut`).toBe(false); expect(t.lines, `${t.label}: one line`).toBe(1);
      expect(t.l, `${t.label}: inside the column`).toBeGreaterThanOrEqual(0); expect(t.r).toBeLessThanOrEqual(phone.w);
    }
    expect(phone.tabs.map(t => t.label), 'the full names stay in the titles').toEqual(PATHS[name].map(([label]) => label));
    // Amendment 10, step 5: the overlap checks.
    const faults: string[] = [], hit = (a: {l: number; r: number; t: number; b: number}, b: {l: number; r: number; t: number; b: number}) => a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
    const ringHit = (b: {l: number; r: number; t: number; b: number}, c: {x: number; y: number; r: number}) => Math.max(b.l - c.x, 0, c.x - b.r) ** 2 + Math.max(b.t - c.y, 0, c.y - b.b) ** 2 < (c.r - 1) ** 2;
    phone.tabs.forEach((t, i) => {
      if (phone.pts.some(q => q.x > t.l + 1 && q.x < t.r - 1 && q.y > t.t + 1 && q.y < t.b - 1)) faults.push(`${t.shown}: over the line`);
      phone.nodes.forEach((n, k) => { if (k !== i && ringHit(t, n)) faults.push(`${t.shown}: over ${n.id}'s ring`); });
      for (const p of phone.planets) if (ringHit(t, p)) faults.push(`${t.shown}: over a planet`);
      for (const p of phone.pills) if (hit(t, p)) faults.push(`${t.shown}: over a banner`);
      for (const u of phone.tabs.slice(i + 1)) if (hit(t, u)) faults.push(`${t.shown}: over ${u.shown}`);
    });
    phone.nodes.forEach((n, i) => {
      for (const m of phone.nodes.slice(i + 1)) if (Math.hypot(n.x - m.x, n.y - m.y) < n.r + m.r + 10 - .5) faults.push(`${n.id} within 10 px of ${m.id}`);
      for (const p of phone.pills) if (ringHit(p, n)) faults.push(`${n.id} over a banner`);
      for (const p of phone.planets) if (Math.hypot(n.x - p.x, n.y - p.y) < n.r + p.r) faults.push(`${n.id} over a planet`);
    });
    expect(faults, 'nothing overlaps').toEqual([]);
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
