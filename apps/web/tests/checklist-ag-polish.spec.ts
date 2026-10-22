import {expect, test, type Page} from '@playwright/test';
import {NEBULA_GLYPH_STOPS} from '../components/orbit-path/nebula-glyph';
import {CHECKLIST_KEY} from '../lib/af-checklist-keys';
import {TITLE, seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AG Polish (ADR-030): the Checklist, finished. Part 1 — every node's glyph is drawn in the nebula colour flow
 * (never its node's colour); a node not yet done is matte (a grey ring faintly tinted, no glow, ≥ 3:1 against the night
 * sky) and lights in full once done; no gold or yellow on any Checklist surface (the streak flame keeps its warm orange,
 * owner amendment 1); a node's progress arc is exactly concentric with its ring at every width.
 */
const overlay = (page: Page) => page.locator('dialog.checklist-overlay');
/** In the page: any CSS colour as [r, g, b, a] (0–255, a 0–1), through a canvas so oklch(), color() and color-mix() resolve. */
const COLOUR_TOOLS = `
  window.__rgba = (() => { const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d', {willReadFrequently: true});
    return s => { x.clearRect(0, 0, 1, 1); x.fillStyle = 'rgba(0,0,0,0)'; x.fillStyle = s; x.fillRect(0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; }; })();
  window.__lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  window.__hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return [h, s, l]; };
`;
async function open(page: Page, path?: Parameters<typeof seedChecklist>[1]) {
  // (The colour helpers arrive as an init script: the app's Trusted Types policy refuses script text added later.)
  await page.addInitScript({content: COLOUR_TOOLS});
  await seedChecklist(page, path);
  await page.goto('/app/checklist'); await settled(page);
  await expect(overlay(page)).toHaveAttribute('data-loaded');
  await expect(page.locator('.path-stage[data-settled]')).toHaveCount(1, {timeout: 10_000});
}


test('1a: every node\'s glyph is drawn in the nebula colour flow, not in its node\'s colour', async ({page}) => {
  await open(page);
  const glyphs = await page.evaluate(() => [...document.querySelectorAll('.path-stage .path-dot')].map(dot => {
    const svg = dot.querySelector('svg.nebula-glyph'), path = svg?.querySelector('path'), ref = path?.getAttribute('stroke') ?? '';
    const id = /^url\(#(.+)\)$/.exec(ref)?.[1], grad = id ? document.getElementById(id) : null;
    return {dot: dot.getAttribute('data-step'), has: !!svg, ref, gradient: grad?.tagName ?? null, stops: grad ? [...grad.querySelectorAll('stop')].map(s => [Number(s.getAttribute('offset')), s.getAttribute('stop-color')]) : [],
      node: getComputedStyle(dot).getPropertyValue('--node').trim()};
  }));
  expect(glyphs.length, 'the path has its nodes').toBeGreaterThanOrEqual(4);
  for (const g of glyphs) {
    expect(g.has, `${g.dot}: a nebula glyph`).toBe(true);
    expect(g.ref, `${g.dot}: stroked with a gradient`).toMatch(/^url\(#.+\)$/);
    expect(g.gradient, `${g.dot}: the gradient exists`).toBe('linearGradient');
    expect(g.stops, `${g.dot}: the nebula flow's stops`).toEqual(NEBULA_GLYPH_STOPS.map(s => [s.offset, s.hex]));
    expect(g.ref).not.toContain(g.node);
  }
  // The finale wears it too.
  await expect(page.locator('.path-finale svg.nebula-glyph')).toHaveCount(1);
});

test('1c: an unreached node is matte (grey ring, faint tint, no glow, ≥ 3:1 on the night sky); a done node is full neon', async ({page}) => {
  await open(page);
  const read = (name: string) => page.getByRole('button', {name, exact: true}).evaluate(el => {
    const w = window as unknown as {__rgba: (s: string) => number[]; __lum: (c: number[]) => number; __hsl: (c: number[]) => number[]};
    const cs = getComputedStyle(el), ring = w.__rgba(cs.borderTopColor), node = w.__rgba(cs.getPropertyValue('--node').trim());
    const sky = w.__rgba('#0a1130'), ratio = (a: number[], b: number[]) => { const [x, y] = [w.__lum(a), w.__lum(b)].sort((p, q) => q - p); return (x! + .05) / (y! + .05); };
    const glows = (cs.boxShadow.match(/(?:rgba?|color|oklch|oklab)\([^)]*\)[^,]*?\s(\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px(?:,|$)/g) ?? []).length;
    const chroma = (c: number[]) => (Math.max(c[0]!, c[1]!, c[2]!) - Math.min(c[0]!, c[1]!, c[2]!)) / 255;
    return {ring, node, sat: chroma(ring), nodeSat: chroma(node), contrast: ratio(ring, sky), shadow: cs.boxShadow, glows};
  });
  const before = await read(`${TITLE.stretch}: not done yet`);
  expect(before.contrast, 'the matte ring reads on the night sky').toBeGreaterThanOrEqual(3);
  // (The first node is next: a touch brighter than the rest, still matte.)
  expect(before.sat!, 'the matte ring is grey with a faint tint').toBeLessThan(before.nodeSat! * .6);
  expect(before.ring).not.toEqual(before.node);
  // Every unreached node, whatever its hue, reads the same way.
  const all = await page.locator('.path-stage .path-dot:not([data-lit]):not([data-next])').evaluateAll(dots => dots.map(el => {
    const w = window as unknown as {__rgba: (s: string) => number[]; __lum: (c: number[]) => number};
    const cs = getComputedStyle(el), ring = w.__rgba(cs.borderTopColor), node = w.__rgba(cs.getPropertyValue('--node').trim()), sky = w.__rgba('#0a1130');
    const chroma = (c: number[]) => (Math.max(c[0]!, c[1]!, c[2]!) - Math.min(c[0]!, c[1]!, c[2]!)) / 255, [x, y] = [w.__lum(ring), w.__lum(sky)].sort((p, q) => q - p);
    return {id: el.getAttribute('data-step'), contrast: (x! + .05) / (y! + .05), chroma: chroma(ring), nodeChroma: chroma(node)};
  }));
  expect(all.length).toBeGreaterThanOrEqual(3);
  for (const n of all) { expect(n.contrast, `${n.id}: ≥ 3:1`).toBeGreaterThanOrEqual(3); expect(n.chroma, `${n.id}: matte`).toBeLessThan(n.nodeChroma * .5); }
  // (No coloured glow while unreached: its only shadows are the dark rim and the glass's inner edge.)
  expect(before.shadow).not.toMatch(/\b(1[6-9]|[2-9]\d)px\b/);
  await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
  // (Read once the ring's 320 ms colour change has finished, with the pointer off the node: hover wakes a ring.)
  await page.mouse.move(2, 400);
  await expect.poll(async () => { const a = await read(`${TITLE.stretch}: done`); return JSON.stringify(a.ring) === JSON.stringify(a.node); }, {message: 'lit: the ring in its full colour'}).toBe(true);
  const after = await read(`${TITLE.stretch}: done`);
  expect(after.shadow, 'lit: its glow').toMatch(/\b(3\d|4\d)px\b/);
  const glyph = await page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true}).locator('svg.nebula-glyph').evaluate(el => getComputedStyle(el).opacity);
  expect(Number(glyph), 'lit: the glyph bright').toBe(1);
});

test('1d: no gold or yellow on any Checklist surface (path, finale, timers, history; the flame keeps its warm orange)', async ({page}) => {
  // (The fixture's custom item is stored gold: it shows in the nebula palette, its stored colour untouched.)
  await open(page);
  await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
  const found = await overlay(page).evaluate(root => {
    const w = window as unknown as {__rgba: (s: string) => number[]; __hsl: (c: number[]) => number[]};
    const COLOUR = /(?:rgba?|color|oklch|oklab|lab|lch)\([^()]*\)/g, hits: string[] = [];
    const props = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'box-shadow', 'text-shadow', 'background-image', 'fill', 'stroke', 'stop-color', 'filter'];
    for (const el of [root, ...root.querySelectorAll('*')]) {
      // The streak flame keeps its warm orange (owner amendment 1); ZIGi's art is its own.
      if (el.closest('.checklist-streak, .zigi, .path-zigi, img')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      for (const prop of props) {
        const value = cs.getPropertyValue(prop); if (!value || value === 'none') continue;
        // (Text colour counts only where the element draws text of its own.)
        if (prop === 'color' && ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim())) continue;
        for (const m of value.match(COLOUR) ?? []) {
          const c = w.__rgba(m); if (c[3]! < .15) continue;
          const [h, s, l] = w.__hsl(c);
          if (h! >= 35 && h! <= 65 && s! > .35 && l! > .25 && l! < .92) hits.push(`${el.tagName.toLowerCase()}.${String(el.getAttribute('class') ?? '').split(' ')[0]} ${prop}: ${m}`);
        }
      }
    }
    return hits;
  });
  expect(found, 'no gold or yellow in the Checklist').toEqual([]);
  // The stored colour is never rewritten.
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), CHECKLIST_KEY);
  expect(JSON.stringify(stored)).toContain('"colour":"gold"');
});

test('1e: a node\'s progress arc is exactly concentric with its ring at every width (centre within 1 px)', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'one browser walks every width');
  await open(page);
  // A count habit part done: 5 of 20 push-ups.
  await page.getByRole('button', {name: `${TITLE.push}: not done yet`, exact: true}).click();
  const form = page.getByRole('form', {name: `Log ${TITLE.push}`});
  await form.getByRole('textbox').or(form.getByRole('spinbutton')).first().fill('5');
  await form.getByRole('button', {name: /^Log 5/}).click();
  await expect(page.locator('.path-dot[data-partial] .path-dot-ring')).toHaveCount(1);
  for (const width of [320, 375, 390, 430, 768, 1440]) {
    await page.setViewportSize({width, height: width < 700 ? 844 : 900});
    await page.waitForTimeout(450);
    const m = await page.locator('.path-dot[data-partial]').evaluate(dot => {
      const d = dot.getBoundingClientRect(), c = dot.querySelector('.path-dot-ring circle')!.getBoundingClientRect(), border = parseFloat(getComputedStyle(dot).borderTopWidth);
      // (The ring's own track: the middle of its border; the dot may be scaled as the next node, so in drawn pixels.)
      const scale = d.width / (dot as HTMLElement).offsetWidth;
      return {dx: c.x + c.width / 2 - (d.x + d.width / 2), dy: c.y + c.height / 2 - (d.y + d.height / 2), r: c.width / 2, track: (d.width / 2 - border * scale / 2)};
    });
    expect(Math.abs(m.dx), `${width} px: centred across`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.dy), `${width} px: centred down`).toBeLessThanOrEqual(1);
    expect(Math.abs(m.r - m.track), `${width} px: on the ring's own track`).toBeLessThanOrEqual(1.5);
  }
});

/** Session AG Polish Parts 3–4: the Habits banners on the orbits, and each orbit's planet on the line. */
const PLANET_BY_HEX: Record<string, string[]> = {'#23eaff': ['05'], '#459dff': ['06'], '#f06dff': ['07'], '#9273ff': ['09'], '#26e8bd': ['04', '08', '10'], '#ff74be': ['07', '09']};
test('3: each orbit wears the Habits page\'s section banner — symbol, "… Orbit" in the nebula flow, the count right after it', async ({page}) => {
  await open(page);
  const banners = page.locator('.path-stage .orbit-banner');
  await expect(banners).toHaveCount(3);
  await expect(page.locator('.path-stage').getByRole('heading', {level: 2})).toHaveText(['Morning Orbit', 'Afternoon Orbit', 'Evening Orbit']);
  expect(await banners.evaluateAll(els => els.map(b => [b.classList.contains(`habit-section-${b.closest('.path-section')!.getAttribute('data-section')}`), b.querySelector('.habit-section-summary .habit-section-mark')?.textContent, !!b.querySelector('.habit-section-title .nebula-flow')]))).toEqual([[true, '☀', true], [true, '◐', true], [true, '☾', true]]);
  // The count chip in the visible part, right after the title.
  const gap = await banners.first().evaluate(b => { const t = b.querySelector('.habit-section-title')!.getBoundingClientRect(), c = b.querySelector('.habit-section-count')!.getBoundingClientRect(); return {gap: c.left - t.right, text: b.querySelector('.habit-section-count [aria-hidden]')!.textContent}; });
  expect(gap.gap).toBeGreaterThanOrEqual(0); expect(gap.gap).toBeLessThanOrEqual(24); expect(gap.text).toBe('0 of 2');
  await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
  await page.getByRole('button', {name: 'Water: not done yet', exact: true}).click();
  const form = page.getByRole('form', {name: 'Log Water'});
  if (await form.count()) await form.getByRole('button', {name: /^Log /}).click();
  await expect(banners.first().locator('.habit-section-count [aria-hidden]')).toHaveText('Complete ✓');
});

test('4: each orbit has its planet, chosen by its first node\'s hue, matte until the orbit is complete, then lit', async ({page}) => {
  await open(page);
  const facts = await page.locator('.path-stage .path-section').evaluateAll(sections => sections.map(s => ({id: s.getAttribute('data-section'), planet: s.querySelector('.orbit-planet')?.getAttribute('data-planet') ?? null, lit: s.querySelector('.orbit-planet')?.hasAttribute('data-lit') ?? null,
    first: getComputedStyle(s.querySelector('.path-dot')!).getPropertyValue('--node').trim(), hidden: s.querySelector('.orbit-planet')?.getAttribute('aria-hidden'), img: (() => { const i = s.querySelector('.orbit-planet img'); return i ? [i.getAttribute('loading'), i.getAttribute('decoding')] : null; })()})));
  for (const f of facts) {
    const hex = /#[0-9a-f]{6}/i.exec(f.first)?.[0]?.toLowerCase() ?? '';
    expect(PLANET_BY_HEX[hex], `${f.id}: its first node's colour ${f.first}`).toContain(f.planet);
    expect(f.lit, `${f.id}: matte before its orbit is complete`).toBe(false);
    expect(f.hidden).toBe('true'); expect(f.img).toEqual(['lazy', 'async']);
  }
  // The morning: tick its two nodes; its planet lights, the others stay matte.
  await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
  await page.getByRole('button', {name: 'Water: not done yet', exact: true}).click();
  const form = page.getByRole('form', {name: 'Log Water'});
  if (await form.count()) await form.getByRole('button', {name: /^Log /}).click();
  await expect(page.locator('.path-section[data-section=morning] .orbit-planet')).toHaveAttribute('data-lit', '');
  await expect(page.locator('.path-section[data-section=afternoon] .orbit-planet')).not.toHaveAttribute('data-lit', '');
  // Reload: lit and still (no replay of the completion).
  await page.reload(); await settled(page);
  await expect(page.locator('.path-section[data-section=morning] .orbit-planet')).toHaveAttribute('data-lit', '');
  await expect(page.locator('.path-section[data-section=morning] .orbit-planet')).not.toHaveAttribute('data-just', '');
});

test('4: the line meets each planet at its top rim and leaves from its bottom rim, and is never drawn across it', async ({page}) => {
  await open(page);
  const m = await page.locator('.path-stage').evaluate(stage => {
    const base = stage.getBoundingClientRect(), out: {id: string; issues: string[]}[] = [];
    for (const sphere of stage.querySelectorAll<HTMLElement>('.orbit-planet-sphere')) {
      const id = sphere.dataset.pathPoint!, r = sphere.getBoundingClientRect(), c = {x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top}, rad = r.width / 2, issues: string[] = [];
      const into = stage.querySelector<SVGPathElement>(`.orbit-flow-segment[data-segment$=">${CSS.escape(id)}"] .orbit-flow-core, .orbit-flow-segment[data-segment="lead:${CSS.escape(id)}"] .orbit-flow-core`);
      const from = stage.querySelector<SVGPathElement>(`.orbit-flow-segment[data-segment^="${CSS.escape(id)}>"] .orbit-flow-core`);
      if (!into || !from) { out.push({id, issues: ['missing stretch']}); continue; }
      const end = into.getPointAtLength(into.getTotalLength()), start = from.getPointAtLength(0);
      if (Math.hypot(end.x - c.x, end.y - (c.y - rad)) > 1.5) issues.push(`enters at ${end.x},${end.y} not the top rim ${c.x},${c.y - rad}`);
      if (Math.hypot(start.x - c.x, start.y - (c.y + rad)) > 1.5) issues.push(`leaves at ${start.x},${start.y} not the bottom rim`);
      for (const seg of stage.querySelectorAll<SVGPathElement>('.orbit-flow-core')) { const L = seg.getTotalLength(); for (let k = 0; k <= 60; k++) { const p = seg.getPointAtLength(L * k / 60); if (Math.hypot(p.x - c.x, p.y - c.y) < rad - 1.5) { issues.push(`${seg.parentElement!.getAttribute('data-segment')} crosses it`); break; } } }
      out.push({id, issues});
    }
    return out;
  });
  expect(m.length).toBe(3);
  for (const p of m) expect(p.issues, p.id).toEqual([]);
});
