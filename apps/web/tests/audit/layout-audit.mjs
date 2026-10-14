// Session AB-Design Phase 2 — the closing pass's layout audit (owner follow-up, item 2). Dev tooling, not part of the
// test suite (a .mjs outside the *.spec.ts pattern): it visits every route and every state we can open — dialogs, sheets,
// menus — in the Showcase and on a new, empty device, at 320, 390, 430, 768, 1024, 1280, 1440 and 1920 px in Chrome and
// at 390 px in WebKit, and reports, per state and width:
//   scroll    the page scrolls sideways;
//   clip      text cut off (scrollWidth > clientWidth with overflow hidden/clip, or an ellipsis);
//   spill     text running past the card (panel/article/section/dialog) that holds it;
//   overlap   two pieces of text, or text and an icon, overlapping inside one card;
//   wrap      a number (amount, %, count) broken onto two lines;
//   ring      a progress ring's label outside its inner circle;
//   target    a control smaller than 44 × 44 px (inline links inside a sentence are not standalone targets);
//   contrast  text below 4.5:1 (3:1 for large text) against the pixels actually behind it (one screenshot per state).
// ZIGi's launcher, the music button and Point & tell float over content by the owner's decision and are left out.
// Usage (from apps/web, a production build running):
//   node tests/audit/layout-audit.mjs <base> <out-dir> [--only=<regex>] [--widths=320,390] [--engine=chrome|webkit]
import {chromium, webkit, devices} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';

const [base, out, ...flags] = process.argv.slice(2);
const flag = name => flags.find(f => f.startsWith(`--${name}=`))?.split('=')[1];
const only = flag('only') ? new RegExp(flag('only')) : null;
const engine = flag('engine') ?? 'chrome';
const WIDTHS = (flag('widths') ?? (engine === 'webkit' ? '390' : '320,390,430,768,1024,1280,1440,1920')).split(',').map(Number);
mkdirSync(out, {recursive: true});

// ---- a small PNG reader (8-bit RGB/RGBA, non-interlaced: what Chrome and WebKit screenshots are) ----
function readPng(buf) {
  let pos = 8, width = 0, height = 0, type = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); type = data[9]; }
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    pos += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), stride = width * bpp, px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[o + x - bpp] : 0, b = y ? px[o - stride + x] : 0, c = y && x >= bpp ? px[o - stride + x - bpp] : 0;
      let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[o + x] = v & 255;
    }
  }
  return {width, height, at: (x, y) => { const i = (Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))) * bpp; return [px[i], px[i + 1], px[i + 2]]; }};
}
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

// ---- the states ----
const click = async (p, loc) => { await loc.first().click({timeout: 5000}); await p.waitForTimeout(700); };
const btn = (p, name) => p.getByRole('button', {name, exact: true});
const healthView = name => async p => { await click(p, p.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name, exact: true})); await p.waitForTimeout(800); };
const firstHref = (prefix) => async p => { const href = await p.locator(`a[href^="${prefix}"]`).first().getAttribute('href'); if (href) { await p.goto(base + href); await p.waitForTimeout(1500); } };
const STATES = [
  // Today
  {name: 'today', path: '/app'},
  {name: 'today-folded', path: '/app', steps: async p => click(p, btn(p, 'Hide the welcome header')), after: async p => click(p, btn(p, 'Show the welcome header'))},
  {name: 'quick-add', path: '/app', steps: async p => click(p, p.locator('.quick-add-trigger').filter({visible: true}))},
  {name: 'add-widget', path: '/app', steps: async p => { await click(p, btn(p, 'Customize Today')); await click(p, btn(p, 'Add widget')); }},
  {name: 'how-to', path: '/app', steps: async p => click(p, p.getByRole('button', {name: 'See how it works'}))},
  {name: 'search', path: '/app', steps: async p => { await p.keyboard.press('/'); await p.waitForTimeout(600); await p.keyboard.type('wa'); await p.waitForTimeout(600); }},
  {name: 'zigi-chat', path: '/app', steps: async p => click(p, p.getByRole('button', {name: /^Open ZIGi/}))},
  {name: 'more-sheet', path: '/app', phone: true, steps: async p => click(p, btn(p, 'More'))},
  {name: 'chip-popover', path: '/app', steps: async p => click(p, p.getByRole('complementary', {name: 'Showcase data'}).getByRole('button'))},
  // Goals
  {name: 'goals', path: '/app/goals'},
  {name: 'goals-board', path: '/app/goals?view=board'},
  {name: 'goals-tree', path: '/app/goals?view=tree'},
  {name: 'goal-card-details', path: '/app/goals', steps: async p => click(p, p.locator('.unified-goal-card .goal-card-more > summary'))},
  {name: 'goal-art-picker', path: '/app/goals', steps: async p => { await click(p, p.locator('.unified-goal-card').getByRole('button', {name: /^Options for/})); await click(p, p.getByRole('button', {name: 'Change artwork'})); }},
  {name: 'goal-page', path: '/app/goals/tracked/9201'},
  {name: 'goal-new', path: '/app/goals/new'},
  {name: 'goal-templates', path: '/app/goals/templates'},
  {name: 'goal-average', path: '/app/goals', steps: firstHref('/app/goals/average/')},
  {name: 'goal-average-new', path: '/app/goals/average/new'},
  {name: 'goal-positions', path: '/app/goals/positions'},
  // Habits
  {name: 'habits', path: '/app/habits'},
  {name: 'habit-details', path: '/app/habits', steps: async p => click(p, p.locator('article.habit-card details.habit-more > summary'))},
  {name: 'habit-new', path: '/app/habits', steps: async p => click(p, p.getByRole('button', {name: /New habit/}).filter({visible: true}))},
  {name: 'habit-year', path: '/app/habits', steps: async p => click(p, p.getByRole('button', {name: /year view/i}))},
  {name: 'routine-player', path: '/app/habits', steps: async p => click(p, p.getByRole('button', {name: /^(Start|Resume|Play again)$/}))},
  // Health
  {name: 'health', path: '/app/health'},
  {name: 'health-planner', path: '/app/health', steps: healthView('Planner')},
  {name: 'health-insights', path: '/app/health', steps: healthView('Insights')},
  {name: 'health-import', path: '/app/health', steps: healthView('Import')},
  {name: 'health-weight', path: '/app/health', steps: healthView('Weight')},
  {name: 'health-measurements', path: '/app/health', steps: healthView('Measurements')},
  {name: 'health-targets', path: '/app/health', steps: healthView('Targets')},
  {name: 'health-library', path: '/app/health', steps: healthView('Foods & recipes')},
  {name: 'health-sleep', path: '/app/health?view=sleep'},
  {name: 'health-meditation', path: '/app/health?view=meditation'},
  {name: 'health-devices', path: '/app/health?view=devices'},
  {name: 'counters-manage', path: '/app/health', steps: async p => { await click(p, p.getByRole('button', {name: 'Options for Quick counters'})); await click(p, p.getByRole('button', {name: /Manage counters/})); }},
  // Wealth and the money pages
  {name: 'wealth', path: '/app/wealth'},
  {name: 'wealth-add', path: '/app/wealth', steps: async p => click(p, p.locator('.wealth-heading .pillar-hero-buttons').getByRole('button', {name: '+ Add asset'}))},
  {name: 'wealth-asset', path: '/app/wealth', steps: firstHref('/app/wealth/asset/')},
  {name: 'calculator', path: '/app/wealth/calculator'},
  {name: 'markets', path: '/app/markets'},
  {name: 'staking', path: '/app/staking'},
  {name: 'portfolio', path: '/app/portfolio'},
  {name: 'portfolio-coin', path: '/app/portfolio', steps: firstHref('/app/portfolio/coin/')},
  {name: 'activity', path: '/app/activity'},
  {name: 'ecosystem', path: '/app/ecosystem'},
  {name: 'chess', path: '/app/chess'},
  // The rest
  {name: 'journey', path: '/app/journey'},
  {name: 'review-week', path: '/app/review'},
  {name: 'review-month', path: '/app/review', steps: async p => click(p, p.getByRole('button', {name: 'This month'}))},
  {name: 'settings', path: '/app/settings'},
  {name: 'settings-data', path: '/app/settings/data'},
  {name: 'settings-reminders', path: '/app/settings/reminders'},
  {name: 'help', path: '/app/help'},
  {name: 'zigi-page', path: '/app/zigi'},
  {name: 'share', path: '/app/share'},
  {name: 'not-found', path: '/app/no-such-page'},
  // A new, empty device
  {name: 'empty-today', path: '/app', fresh: true},
  {name: 'empty-welcome', path: '/app/welcome', fresh: true},
  {name: 'empty-goals', path: '/app/goals', fresh: true},
  {name: 'empty-habits', path: '/app/habits', fresh: true},
  {name: 'empty-health', path: '/app/health', fresh: true},
  {name: 'empty-wealth', path: '/app/wealth', fresh: true},
  {name: 'empty-portfolio', path: '/app/portfolio', fresh: true},
  {name: 'empty-journey', path: '/app/journey', fresh: true},
  {name: 'empty-review', path: '/app/review', fresh: true},
];

// ---- the checks, run in the page ----
function inspect() {
  const EXCLUDE = '.ai-launcher, .ai-launcher-root, [class*="ai-launcher"], .music-launcher, [class*="music-launcher"], [data-point-tell], .zigi-edge-tab, .sr-only, .visually-hidden';
  const out = [];
  const W = innerWidth;
  // Visible: rendered, not inside a closed <details> (other than its summary), not off the page, and not scrolled out of an
  // ancestor that clips (a swipeable row shows only what is in it).
  const inClosedDetails = el => { const d = el.closest('details:not([open])'); return !!d && !el.closest('summary'); };
  const outOfClip = el => { const r = el.getBoundingClientRect(); for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const st = getComputedStyle(a); if (st.overflowX !== 'visible' || st.overflowY !== 'visible') { const c = a.getBoundingClientRect(); if (r.right <= c.left + 1 || r.left >= c.right - 1 || r.bottom <= c.top + 1 || r.top >= c.bottom - 1) return true; } } return false; };
  const shown = el => { if (el.closest(EXCLUDE) || el.closest('[hidden], [inert], [aria-hidden="true"]') || inClosedDetails(el)) return false; const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; if (r.bottom + scrollY <= 0 || r.right + scrollX <= 0 || r.left >= document.documentElement.scrollWidth) return false; return !outOfClip(el); };
  const clipped = el => { const s = getComputedStyle(el); return el.getAttribute('clip-path') || s.clipPath !== 'none' && s.clipPath.includes('inset(50%') || (s.position === 'absolute' && el.getBoundingClientRect().width <= 1); };
  const desc = el => { const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : (el.className?.baseVal ?? ''); return `${el.tagName.toLowerCase()}${c ? '.' + c : ''} "${(el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`; };
  const hasOwnText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  const texts = [...document.querySelectorAll('body *')].filter(el => !(el instanceof SVGElement) && hasOwnText(el) && shown(el) && !clipped(el));
  // scroll
  const over = document.documentElement.scrollWidth - W; if (over > 1) out.push({k: 'scroll', w: `${over}px wider than the window`});
  // clip
  for (const el of texts) {
    const s = getComputedStyle(el);
    if (s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) out.push({k: 'clip', w: `${desc(el)} ends in an ellipsis`});
    else if (['hidden', 'clip'].includes(s.overflowX) && el.scrollWidth > el.clientWidth + 2 && !el.closest('[role="listbox"], .phone-tabs')) out.push({k: 'clip', w: `${desc(el)} is cut off (${el.scrollWidth} > ${el.clientWidth})`});
  }
  // spill: text past its card
  const CARD = '.panel, article, dialog, [role="dialog"], .aa-empty, .glass-card';
  for (const el of texts) {
    const card = el.closest(CARD); if (!card) continue;
    let scroller = el.parentElement; while (scroller && scroller !== card) { const ox = getComputedStyle(scroller).overflowX; if (ox !== 'visible') break; scroller = scroller.parentElement; }
    if (scroller && scroller !== card) continue; // inside its own scroller (a swipeable row): fine
    const r = el.getBoundingClientRect(), c = card.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(el); const t = range.getBoundingClientRect();
    if (t.right > c.right + 2 || t.left < c.left - 2) out.push({k: 'spill', w: `${desc(el)} runs ${Math.round(Math.max(t.right - c.right, c.left - t.left))}px past ${desc(card).split(' ')[0]}`});
    void r;
  }
  // overlap: text runs against text or icons inside one card
  const boxes = [];
  for (const el of texts) { const range = document.createRange(); for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue; range.selectNodeContents(n); for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) boxes.push({el, r, card: el.closest(CARD) ?? document.body}); } }
  const icons = [...document.querySelectorAll('svg, img')].filter(el => shown(el) && !el.closest('.glass-ring-art, .scene-art, .site-footer-art, .site-footer-line, [class*="chart"], [class*="sparkline"], .glass-ring') && el.getBoundingClientRect().width < 64).map(el => ({el, r: el.getBoundingClientRect(), card: el.closest(CARD) ?? document.body, icon: true}));
  const all = [...boxes, ...icons];
  const seen = new Set();
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j]; if (a.card !== b.card || a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    if (a.icon && b.icon) continue;
    const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (x > 2 && y > 3) { const key = `${desc(a.el)}|${desc(b.el)}`; if (seen.has(key)) continue; seen.add(key); out.push({k: 'overlap', w: `${desc(a.el)} overlaps ${desc(b.el)} (${Math.round(x)}×${Math.round(y)})`}); }
  }
  // wrap: numbers on two lines
  const NUM = /^[\s+−\-–]*(US\$|€|\$|£)?\s?[\d.,  ]+\s?(%|kcal|kg|lb|mL|ml|h|min|XP|ZIG|USD|EUR|€|\$)?$/;
  for (const el of texts) { const t = (el.textContent ?? '').trim(); if (!NUM.test(t) || !/\d/.test(t)) continue; const range = document.createRange(); range.selectNodeContents(el); const tops = new Set([...range.getClientRects()].filter(r => r.width > 1).map(r => Math.round(r.top))); if (tops.size > 1) out.push({k: 'wrap', w: `${desc(el)} breaks onto ${tops.size} lines`}); }
  // ring
  for (const g of document.querySelectorAll('.glass-ring')) {
    if (!shown(g) || !(g.textContent ?? '').trim()) continue;
    const R = g.getBoundingClientRect(), cx = R.left + R.width / 2, cy = R.top + R.height / 2, arc = g.querySelector('.glass-ring-arc, .glass-ring-track'), band = arc ? parseFloat(getComputedStyle(arc).strokeWidth) : 10, inner = R.width / 2 - band;
    const range = document.createRange(); let worst = -Infinity;
    for (const el of g.querySelectorAll(':scope > :not(svg)')) { range.selectNodeContents(el); for (const r of range.getClientRects()) { if (r.width < 1) continue; for (const [x, y] of [[r.left, r.top + r.height * .2], [r.right, r.top + r.height * .2], [r.left, r.bottom - r.height * .2], [r.right, r.bottom - r.height * .2]]) worst = Math.max(worst, Math.hypot(x - cx, y - cy) - inner); } }
    if (worst > 0) out.push({k: 'ring', w: `${desc(g)} label reaches ${Math.round(worst * 10) / 10}px into the band (ring ${Math.round(R.width)}px)`});
  }
  // target
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], [role=option]')) {
    if (!shown(el)) continue; const r = el.getBoundingClientRect();
    if (r.width >= 44 && r.height >= 44) continue;
    const s = getComputedStyle(el);
    if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label') && el.closest('label').getBoundingClientRect().height >= 44) continue;
    if (el.matches('input[type=checkbox], input[type=radio]') && (s.opacity === '0' || r.width <= 1)) continue;
    if (el.tagName === 'A' && s.display === 'inline' && el.parentElement && [...el.parentElement.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; // a link inside a sentence
    if (el.closest('table, .data-table, [role=listbox]') && r.height >= 40) continue;
    out.push({k: 'target', w: `${desc(el)} is ${Math.round(r.width)}×${Math.round(r.height)}`});
  }
  // contrast samples for the Node side: text colour and box (page coordinates)
  const samples = [];
  for (const el of texts) {
    const s = getComputedStyle(el); if (el.closest('button:disabled, [aria-disabled="true"], .site-footer-art')) continue;
    if (s.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || s.color === 'rgba(0, 0, 0, 0)' || s.backgroundClip === 'text') continue; // gradient text: checked by eye
    // rgb()/rgba() give 0–255 channels; color(srgb r g b / a) (what color-mix computes to) gives 0–1.
    const srgb = s.color.startsWith('color(srgb'), m = s.color.replace(/^color\(srgb/, '').match(/[\d.]+/g); if (!m) continue;
    const alpha = m[3] === undefined ? 1 : +m[3]; if (srgb) for (let i = 0; i < 3; i++) m[i] = String(Math.round(+m[i] * 255));
    const range = document.createRange(); range.selectNodeContents(el); const r = range.getBoundingClientRect(); if (r.width < 4 || r.height < 6) continue;
    const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
    samples.push({d: desc(el), c: [+m[0], +m[1], +m[2]], a: alpha * +s.opacity, x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, large: size >= 24 || (bold && size >= 18.66)});
  }
  return {out, samples};
}

function contrast(png, samples) {
  const found = [];
  for (const s of samples) {
    // The background: the most common colour on the box's edge just outside the glyphs, read from the screenshot.
    const pts = []; const step = Math.max(2, Math.round(s.w / 12));
    for (let x = s.x; x <= s.x + s.w; x += step) { pts.push(png.at(Math.round(x), Math.round(s.y - 1)), png.at(Math.round(x), Math.round(s.y + s.h + 1))); }
    for (let y = s.y; y <= s.y + s.h; y += Math.max(2, Math.round(s.h / 4))) { pts.push(png.at(Math.round(s.x - 2), Math.round(y)), png.at(Math.round(s.x + s.w + 2), Math.round(y))); }
    if (!pts.length) continue;
    const text = s.c, far = pts.filter(p => ratio(p, text) > 1.2);
    if (!far.length) continue;
    // the darkest-to-text worst case among the edge pixels (a light background behind light text is what matters)
    const bg = far.sort((a, b) => ratio(a, text) - ratio(b, text))[Math.floor(far.length * .2)];
    const mix = text.map((v, i) => v * s.a + bg[i] * (1 - s.a));
    const r = ratio(mix, bg), need = s.large ? 3 : 4.5;
    if (r < need) found.push({k: 'contrast', w: `${s.d} ${r.toFixed(2)}:1 (needs ${need}:1)`});
  }
  return found;
}

const launcher = engine === 'webkit' ? webkit : chromium;
const browser = await launcher.launch(engine === 'webkit' ? {} : {channel: 'chrome'});
const report = {base, engine, widths: WIDTHS, at: new Date().toISOString(), states: {}};
for (const width of WIDTHS) {
  const phone = width < 768;
  for (const fresh of [false, true]) {
    const todo = STATES.filter(s => !!s.fresh === fresh && (!s.phone || phone) && (!only || only.test(s.name)));
    if (!todo.length) continue;
    const ctx = await browser.newContext({...(phone ? devices['iPhone 13'] : {}), viewport: {width, height: phone ? 844 : 900}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
    await ctx.route('**/api/**', r => r.fulfill({status: 503, json: {error: 'audit fixture offline'}}));
    const p = await ctx.newPage();
    if (!fresh) { await p.goto(base + '/app/settings'); await btn(p, 'Load Showcase Demo').click(); await p.waitForURL('**/app'); await p.waitForTimeout(800); }
    for (const st of todo) {
      const key = `${st.name}@${width}${engine === 'webkit' ? '-webkit' : ''}`;
      try {
        await p.goto(base + st.path, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 8000}).catch(() => {}); await p.waitForTimeout(900);
        // Every lazy part on the way down, then back to the top.
        await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } scrollTo(0, 0); });
        if (st.steps) await st.steps(p);
        await p.waitForTimeout(500);
        const {out, samples} = await p.evaluate(inspect);
        const shot = await p.screenshot({fullPage: true, type: 'png', animations: 'disabled', caret: 'hide'});
        const all = [...out, ...contrast(readPng(shot), samples)];
        report.states[key] = all;
        console.log(`${key}: ${all.length ? all.length + ' finding(s)' : 'clean'}`);
        if (st.after) await st.after(p).catch(() => {});
        await p.keyboard.press('Escape').catch(() => {});
      } catch (e) { report.states[key] = [{k: 'error', w: String(e).split('\n')[0]}]; console.log(`${key}: could not run (${String(e).split('\n')[0]})`); }
    }
    await ctx.close();
  }
}
await browser.close();
const counts = {}; for (const list of Object.values(report.states)) for (const f of list) counts[f.k] = (counts[f.k] ?? 0) + 1;
report.counts = counts;
writeFileSync(`${out}/layout-audit-${engine}.json`, JSON.stringify(report, null, 1));
const md = [`# Layout audit (${engine}) — ${report.at}`, '', `Base: ${base}. Widths: ${WIDTHS.join(', ')}. States: ${Object.keys(report.states).length}.`, '', `Findings by kind: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(' · ') || 'none'}.`, '',
  ...Object.entries(report.states).filter(([, l]) => l.length).flatMap(([k, l]) => [`## ${k}`, ...l.map(f => `- **${f.k}** ${f.w}`), ''])].join('\n');
writeFileSync(`${out}/layout-audit-${engine}.md`, md);
console.log('counts', JSON.stringify(counts));
