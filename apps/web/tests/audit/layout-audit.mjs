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
//   target    a control smaller than 44 × 44 px on the touch layout (< 768 px), or than the WCAG 2.5.8 minimum of 24 × 24 px
//             on the pointer layout, or a smaller one whose 24 px circle meets no other target (WCAG 2.5.8's spacing
//             exception); inline links inside a sentence are not standalone targets; the pointer layout's passing controls
//             under 44 px are listed as advisory-target, which does not count as a finding;
//   covered   a line of text with another box painted over it (hit-tested at three points);
//   contrast  text below 4.5:1 (3:1 for large text) against the pixels actually behind it (one screenshot per state).
// ZIGi's launcher, the music button and Point & tell float over content by the owner's decision and are left out.
// Usage (from apps/web, a production build running):
//   node tests/audit/layout-audit.mjs <base> <out-dir> [--only=<regex>] [--widths=320,390] [--engine=chrome|webkit] [--stress] [--touch]
import {chromium, webkit, devices} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';

const [base, out, ...flags] = process.argv.slice(2);
const flag = name => flags.find(f => f.startsWith(`--${name}=`))?.split('=')[1];
const only = flag('only') ? new RegExp(flag('only')) : null;
const engine = flag('engine') ?? 'chrome';
const stress = flags.includes('--stress');
// --touch (owner, 2026-10-14): tablets are touch devices. The same states at 768 and 1024 px with touch emulation (a coarse
// primary pointer), where every target must be 44 × 44 px, as on phones.
const touch = flags.includes('--touch');
const WIDTHS = (flag('widths') ?? (touch ? '768,1024' : engine === 'webkit' ? '390' : '320,390,430,768,1024,1280,1440,1920')).split(',').map(Number);
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
  // The Showcase lists its routines as templates first: one is added, then started.
  {name: 'routine-player', path: '/app/habits', steps: async p => { const start = p.getByRole('button', {name: /^(Start|Resume|Play again)$/}); if (!await start.count()) { await click(p, p.getByRole('button', {name: 'Add routine', exact: true}).first()); await p.waitForTimeout(600); } await click(p, start.first()); }},
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
  // A coin's page link is inside its row's details: the first row opens, then its link is followed.
  {name: 'portfolio-coin', path: '/app/portfolio', steps: async p => { await click(p, p.locator('.data-coin-toggle').first()); await p.waitForTimeout(400); await firstHref('/app/portfolio/coin/')(p); }},
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

// ---- stress (item 3): the Showcase's own records, rewritten in place to the hard cases ----
// Names of 40+ characters, US$1,234,567,890.12 and its euro twin, a 4-digit counter day, a goal at 0 % — then every check.
function stressRecords() {
  const LONG = 'Build a calm emergency fund for the whole family';
  const key = suffix => Object.keys(sessionStorage).find(k => k.endsWith(suffix));
  const edit = (suffix, fn) => { const k = key(suffix); if (!k) return false; const v = JSON.parse(sessionStorage.getItem(k)); fn(v); sessionStorage.setItem(k, JSON.stringify(v)); return true; };
  const done = [];
  done.push(edit(':zigoals:platform:v1', p => {
    if (p.goals?.[0]) { p.goals[0].name = LONG; p.goals[0].target = '123456789012'; }
    if (p.goals?.[1]) p.goals[1].name = 'A sabbatical year to sail the Mediterranean coast';
    const usd = p.positions?.find(x => x.valuation?.currency === 'USD'), eur = p.positions?.find(x => x.valuation?.currency === 'EUR');
    if (usd) usd.valuation.value = '123456789012'; if (eur) eur.valuation.value = '98765432109';
  }));
  done.push(edit(':zigoals:habits:v1', h => { if (h.habits?.[0]) h.habits[0].title = 'Read twenty pages of a good book before bedtime'; }));
  done.push(edit(':zigoals:health:v1', h => {
    if (h.foods?.[0]) h.foods[0].name = 'Overnight oats with blueberries, almonds and honey';
    const day = h.exercise?.days?.at(-1); if (day) day.count = 9999;
  }));
  return done;
}

// ---- the checks, run in the page ----
function inspect() {
  const EXCLUDE = '.ai-launcher, .ai-launcher-root, [class*="ai-launcher"], .music-launcher, [class*="music-launcher"], [data-point-tell], .zigi-edge-tab, .sr-only, .visually-hidden';
  const out = [];
  const W = innerWidth;
  // Visible: rendered, not inside a closed <details> (other than its summary), not off the page, and not scrolled out of an
  // ancestor that clips (a swipeable row shows only what is in it).
  // Hidden inside any closed <details> unless it is that details' own summary (nested folds included).
  const inClosedDetails = el => { for (let d = el.parentElement?.closest('details:not([open])') ?? (el.matches('details:not([open])') ? el : null); d; d = d.parentElement?.closest('details:not([open])')) { const own = [...d.children].find(c => c.tagName === 'SUMMARY'); if (!own || !own.contains(el)) return true; } return false; };
  const outOfClip = el => { const r = el.getBoundingClientRect(); for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const st = getComputedStyle(a); if (st.overflowX !== 'visible' || st.overflowY !== 'visible') { const c = a.getBoundingClientRect(); if (r.right <= c.left + 1 || r.left >= c.right - 1 || r.bottom <= c.top + 1 || r.top >= c.bottom - 1) return true; } } return false; };
  const shown = el => { if (el.closest(EXCLUDE) || el.closest('[hidden], [inert], [aria-hidden="true"]') || inClosedDetails(el)) return false; const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return false; if (r.bottom + scrollY <= 0 || r.right + scrollX <= 0 || r.left >= document.documentElement.scrollWidth) return false; return !outOfClip(el); };
  const clipped = el => { const s = getComputedStyle(el); return el.getAttribute('clip-path') || s.clipPath !== 'none' && s.clipPath.includes('inset(50%') || (s.position === 'absolute' && el.getBoundingClientRect().width <= 1); };
  const desc = el => { const c = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : (el.className?.baseVal ?? ''); return `${el.tagName.toLowerCase()}${c ? '.' + c : ''} "${(el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`; };
  const hasOwnText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
  // With a modal dialog or sheet open, only it is checked (the page behind is dimmed and inert). Fixed and sticky chrome
  // (the bars, the dock) is the frame content scrolls under: it is hidden from the screenshot and left out of overlaps.
  const modal = [...document.querySelectorAll('dialog')].find(d => d.open && d.matches(':modal')) ?? document.querySelector('.phone-sheet[open], [role="dialog"][aria-modal="true"]');
  const scope = modal ?? document.body;
  const fixedOf = el => { for (let a = el; a && a !== document.body; a = a.parentElement) { const pos = getComputedStyle(a).position; if (pos === 'fixed' || pos === 'sticky') return a; } return null; };
  if (!modal) for (const el of document.querySelectorAll('body *')) { const pos = getComputedStyle(el).position; if (pos === 'fixed' || pos === 'sticky') el.setAttribute('data-audit-fixed', ''); }
  const texts = [...scope.querySelectorAll('*')].filter(el => !(el instanceof SVGElement) && hasOwnText(el) && shown(el) && !clipped(el) && (modal || !fixedOf(el)));
  // scroll
  const over = document.documentElement.scrollWidth - W; if (over > 1) out.push({k: 'scroll', w: `${over}px wider than the window`});
  // clip
  for (const el of texts) {
    const s = getComputedStyle(el);
    // An ellipsis is a design choice only where the full text is offered with it (its title; e.g. counter names, ADR-024 D20).
    if (s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1 && el.getAttribute('title') !== (el.textContent ?? '').trim()) out.push({k: 'clip', w: `${desc(el)} ends in an ellipsis`});
    else if (['hidden', 'clip'].includes(s.overflowX) && el.scrollWidth > el.clientWidth + 2 && !el.closest('[role="listbox"], .phone-tabs')) out.push({k: 'clip', w: `${desc(el)} is cut off (${el.scrollWidth} > ${el.clientWidth})`});
  }
  // spill: text past its card
  const CARD = '.panel, article, dialog, [role="dialog"], .aa-empty, .glass-card';
  for (const el of texts) {
    // A form control's text is drawn (and clipped) inside the control itself; its raw text node is never laid out.
    if (el.matches('textarea, select, option')) continue;
    const card = el.closest(CARD); if (!card) continue;
    let scroller = el.parentElement; while (scroller && scroller !== card) { const ox = getComputedStyle(scroller).overflowX; if (ox !== 'visible') break; scroller = scroller.parentElement; }
    if (scroller && scroller !== card) continue; // inside its own scroller (a swipeable row): fine
    const r = el.getBoundingClientRect(), c = card.getBoundingClientRect();
    // Only the element's own text runs (a screen-reader-only child is not on the page).
    const range = document.createRange(); let t = null;
    for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue; range.selectNodeContents(n); const b = range.getBoundingClientRect(); t = t ? {left: Math.min(t.left, b.left), right: Math.max(t.right, b.right)} : {left: b.left, right: b.right}; }
    if (!t) continue;
    if (t.right > c.right + 2 || t.left < c.left - 2) out.push({k: 'spill', w: `${desc(el)} runs ${Math.round(Math.max(t.right - c.right, c.left - t.left))}px past ${desc(card).split(' ')[0]}`});
    void r;
  }
  // covered: a control or an image painted over a line of text (the empty state's ZIGi over its title, a button over its
  // row's label). Hit-testing at three points of each line: the text's own element (or its descendants and ancestors) must
  // be on top. Not counted: SVG art (transparent where text sits), layers that take no pointer (images always count), and a stretched link's
  // pseudo-element (the hit lies outside the link's own box: the whole card is its target by design).
  { const force = document.createElement('style'); force.textContent = 'html { scroll-behavior: auto !important; } img { pointer-events: auto !important; }'; document.head.append(force);
    const coveredSeen = new Set(), done = new Set(), start = scrollY, H = document.documentElement.scrollHeight;
    for (let y0 = 0; ; y0 += innerHeight - 60) {
      if (!modal) scrollTo(0, y0);
      for (const el of texts) { if (done.has(el) || el.closest(EXCLUDE) || getComputedStyle(el).textOverflow === 'ellipsis') continue;
        for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue; const range = document.createRange(); range.selectNodeContents(n);
          for (const r of range.getClientRects()) { if (r.width < 8 || r.height < 6 || r.top < 0 || r.bottom > innerHeight) continue; done.add(el);
            let hits = 0, by = null; const y = r.top + r.height / 2;
            for (const x of [r.left + 4, r.left + r.width / 2, r.right - 4]) { if (x < 0 || x >= innerWidth) continue; const top = document.elementFromPoint(x, y); if (!top || top === el || el.contains(top) || top.contains(el) || top.closest(EXCLUDE) || fixedOf(top) || top.closest('svg')) continue; const b = top.getBoundingClientRect(); if (x < b.left || x > b.right || y < b.top || y > b.bottom) continue; /* a stretched link's pseudo-element: the whole card is its target, by design */
              if (top.closest('.card-options-panel, .showcase-chip-panel, .wealth-other-chip-panel, [role="menu"], [role="dialog"]:not(dialog), [popover]')) continue; /* an open popover or menu covers the page by design */
              const ts = getComputedStyle(top); let shown = 1; for (let a = top; a && a !== document.body; a = a.parentElement) shown *= +getComputedStyle(a).opacity; if (shown < .05) continue; /* an invisible control over its own label (a chip's checkbox) */
              const paints = top.tagName === 'IMG' || ts.backgroundColor !== 'rgba(0, 0, 0, 0)' || ts.backgroundImage !== 'none' || parseFloat(ts.borderTopWidth) > 0 || [...top.childNodes].some(t => { if (t.nodeType !== 3 || !t.textContent.trim()) return false; const q = document.createRange(); q.selectNodeContents(t); return [...q.getClientRects()].some(k => x >= k.left && x <= k.right && y >= k.top && y <= k.bottom); });
              if (!paints) continue; /* a transparent box (a link's taller hit area) paints nothing over the text */ hits++; by = top; }
            if (hits >= 1 && by) { const key = desc(el) + '|' + desc(by); if (!coveredSeen.has(key)) { coveredSeen.add(key); out.push({k: 'covered', w: `${desc(el)} is covered by ${desc(by)}`}); } }
          } } }
      if (modal || scrollY + innerHeight >= H - 1) break;
    }
    if (!modal) scrollTo(0, start);
    force.remove(); }
  // overlap: text runs against text or icons inside one card
  const boxes = [];
  for (const el of texts) { if (getComputedStyle(el).textOverflow === 'ellipsis') continue; /* reported as clip; its range runs past the cut */ const range = document.createRange(); for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue; range.selectNodeContents(n); for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) boxes.push({el, r, card: el.closest(CARD) ?? document.body}); } }
  const icons = [...scope.querySelectorAll('svg, img')].filter(el => shown(el) && (modal || !fixedOf(el)) && !el.closest('.glass-ring-art, .scene-art, .site-footer-art, .site-footer-line, [class*="chart"], [class*="sparkline"], .glass-ring') && el.getBoundingClientRect().width < 64).map(el => ({el, r: el.getBoundingClientRect(), card: el.closest(CARD) ?? document.body, icon: true}));
  const all = [...boxes, ...icons];
  const seen = new Set();
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j]; if (a.card !== b.card || a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    if (fixedOf(a.el) !== fixedOf(b.el)) continue; // a sticky header or footer passing over scrolling content: by design
    if (a.icon && b.icon) continue;
    const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (x > 2 && y > 3) { const key = `${desc(a.el)}|${desc(b.el)}`; if (seen.has(key)) continue; seen.add(key); out.push({k: 'overlap', w: `${desc(a.el)} overlaps ${desc(b.el)} (${Math.round(x)}×${Math.round(y)})`}); }
  }
  // wrap: numbers on two lines
  const NUM = /^[\s+−\-–]*(US\$|€|\$|£)?\s?[\d.,  ]+\s?(%|kcal|kg|lb|mL|ml|h|min|XP|ZIG|USD|EUR|€|\$)?$/;
  for (const el of texts) { const t = (el.textContent ?? '').trim(); if (!NUM.test(t) || !/\d/.test(t)) continue; const range = document.createRange(); range.selectNodeContents(el); // Lines are runs whose boxes overlap vertically: a smaller unit beside a big figure ("1000 ZIG") shares its line.
    const lines = []; for (const r of [...range.getClientRects()].filter(r => r.width > 1).sort((a, b) => a.top - b.top)) { const last = lines[lines.length - 1]; if (last && r.top < last.bottom - 2) last.bottom = Math.max(last.bottom, r.bottom); else lines.push({bottom: r.bottom}); }
    if (lines.length > 1) out.push({k: 'wrap', w: `${desc(el)} breaks onto ${lines.length} lines`}); }
  // ring
  for (const g of scope.querySelectorAll('.glass-ring')) {
    if (!shown(g) || !(g.textContent ?? '').trim()) continue;
    const R = g.getBoundingClientRect(), cx = R.left + R.width / 2, cy = R.top + R.height / 2, arc = g.querySelector('.glass-ring-arc, .glass-ring-track'), band = arc ? parseFloat(getComputedStyle(arc).strokeWidth) : 10, inner = R.width / 2 - band;
    const range = document.createRange(); let worst = -Infinity;
    for (const el of g.querySelectorAll(':scope > :not(svg)')) { range.selectNodeContents(el); for (const r of range.getClientRects()) { if (r.width < 1) continue; for (const [x, y] of [[r.left, r.top + r.height * .2], [r.right, r.top + r.height * .2], [r.left, r.bottom - r.height * .2], [r.right, r.bottom - r.height * .2]]) worst = Math.max(worst, Math.hypot(x - cx, y - cy) - inner); } }
    if (worst > 0) out.push({k: 'ring', w: `${desc(g)} label reaches ${Math.round(worst * 10) / 10}px into the band (ring ${Math.round(R.width)}px)`});
  }
  // target
  const TARGETS = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], [role=option]';
  const targetBoxes = [...scope.querySelectorAll(TARGETS)].filter(shown).map(e => ({e, r: e.getBoundingClientRect()}));
  // WCAG 2.5.8's spacing exception: an undersized target passes when a 24 px circle centred on it meets no other target.
  const spaced = (el, r) => { const cx = r.left + r.width / 2, cy = r.top + r.height / 2; return targetBoxes.every(({e, r: o}) => e === el || e.contains(el) || el.contains(e) || Math.hypot(Math.max(o.left - cx, 0, cx - o.right), Math.max(o.top - cy, 0, cy - o.bottom)) >= 12); };
  for (const el of scope.querySelectorAll(TARGETS)) {
    if (!shown(el)) continue; const r = el.getBoundingClientRect();
    // A coarse primary pointer (phones, tablets, any width) or the phone layout: 44 × 44 (owner, 2026-10-14). A fine pointer
    // (mouse, trackpad) on the larger layout: the WCAG 2.5.8 minimum of 24 × 24, its 24–44 px controls listed as advisory.
    const min = innerWidth < 768 || matchMedia('(pointer: coarse)').matches ? 44 : 24;
    if (r.width >= 44 && r.height >= 44) continue;
    if (min === 24 && r.width >= 24 && r.height >= 24) { out.push({k: 'advisory-target', w: `${desc(el)} is ${Math.round(r.width)}×${Math.round(r.height)} (pointer layout)`}); continue; }
    if (min === 24 && spaced(el, r)) { out.push({k: 'advisory-target', w: `${desc(el)} is ${Math.round(r.width)}×${Math.round(r.height)} (pointer layout, spaced: WCAG 2.5.8 spacing exception)`}); continue; }
    const s = getComputedStyle(el);
    if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label') && el.closest('label').getBoundingClientRect().height >= min) continue;
    if (el.matches('input[type=checkbox], input[type=radio]') && (s.opacity === '0' || r.width <= 1)) continue;
    if (el.tagName === 'A' && s.display === 'inline' && el.parentElement && [...el.parentElement.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; // a link inside a sentence
    if (el.closest('table, .data-table, [role=listbox]') && r.height >= 40) continue;
    out.push({k: 'target', w: `${desc(el)} is ${Math.round(r.width)}×${Math.round(r.height)}`});
  }
  // contrast samples for the Node side: text colour and box (page coordinates). Text under an open popover, menu or sticky
  // bar is what the popover covers, not what a reader sees: left out.
  const covers = [...scope.querySelectorAll('.card-options-panel, .showcase-chip-panel, .wealth-other-chip-panel, [role="menu"], [role="dialog"]:not(dialog), [popover]:popover-open')].filter(c => shown(c)).map(c => ({c, r: c.getBoundingClientRect()}))
    .concat([...scope.querySelectorAll('*')].filter(el => { const pos = getComputedStyle(el).position; return pos === 'sticky' && modal; }).map(c => ({c, r: c.getBoundingClientRect()})));
  // A popover's drop shadow darkens what is just around it too: 24 px of margin around each cover.
  const covered = el => { const r = el.getBoundingClientRect(); return covers.some(({c, r: k}) => !c.contains(el) && r.left < k.right + 24 && r.right > k.left - 24 && r.top < k.bottom + 24 && r.bottom > k.top - 24); };
  const samples = [];
  for (const el of texts) {
    if (covered(el)) continue;
    const s = getComputedStyle(el); if (el.closest('button:disabled, [aria-disabled="true"], .site-footer-art')) continue;
    if (s.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || s.color === 'rgba(0, 0, 0, 0)' || s.backgroundClip === 'text') continue; // gradient text: checked by eye
    // rgb()/rgba() give 0–255 channels; color(srgb r g b / a) (what color-mix computes to) gives 0–1.
    const srgb = s.color.startsWith('color(srgb'), m = s.color.replace(/^color\(srgb/, '').match(/[\d.]+/g); if (!m) continue;
    const alpha = m[3] === undefined ? 1 : +m[3]; if (srgb) for (let i = 0; i < 3; i++) m[i] = String(Math.round(+m[i] * 255));
    // One sample per line box: a wrapped inline run's bounding box would also cover its neighbours' glyphs.
    // The element's own text runs only (a swatch or an icon beside the words is not what the words sit on).
    const rects = []; for (const n of el.childNodes) { if (n.nodeType !== 3 || !n.textContent.trim()) continue; const range = document.createRange(); range.selectNodeContents(n); rects.push(...range.getClientRects()); }
    const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
    // Text scrolled out of its own scroller (a swipeable row of chips) is not on screen: only what the scroller shows counts.
    let clipBox = null; for (let e = el.parentElement; e; e = e.parentElement) { const ox = getComputedStyle(e).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') { clipBox = e.getBoundingClientRect(); break; } }
    for (const r of rects) { if (r.width < 4 || r.height < 6) continue;
      if (clipBox && (r.left < clipBox.left - 1 || r.right > clipBox.right + 1)) continue;
      samples.push({d: desc(el), c: [+m[0], +m[1], +m[2]], a: alpha * +s.opacity, x: r.left + (modal ? 0 : scrollX), y: r.top + (modal ? 0 : scrollY), w: r.width, h: r.height, large: size >= 24 || (bold && size >= 18.66)}); }
  }
  // Gradient text paints its background through the glyphs: marked so the background capture can leave it out.
  for (const el of texts) { const cs = getComputedStyle(el); if (/\btext\b/.test(cs.backgroundClip + ' ' + (cs.webkitBackgroundClip ?? ''))) el.setAttribute('data-audit-text-clip', ''); }
  return {out, samples, modal: !!modal};
}

function contrast(pngs, samples) {
  // pngs: [{top, png}] slices of the page (a single full-page capture tops out near 16,000 px, so tall pages come in slices)
  const found = [];
  for (const s of samples) {
    const slice = pngs.find(x => s.y - 4 >= x.top && s.y + s.h + 4 <= x.top + x.png.height); if (!slice) continue;
    const png = {at: (x, y) => slice.png.at(x, y - slice.top)};
    // The background: read inside the text's own line box on the capture without text, on a grid of points; the 10th
    // percentile towards the text's colour (one stray pixel is not the background, a light band behind light text is).
    const pts = [];
    for (const fx of [.06, .2, .35, .5, .65, .8, .94]) for (const fy of [.25, .5, .75]) pts.push(png.at(Math.round(s.x + s.w * fx), Math.round(s.y + s.h * fy)));
    if (!pts.length) continue;
    const text = s.c;
    const bg = pts.sort((a, b) => ratio(a, text) - ratio(b, text))[Math.floor(pts.length * .1)];
    const mix = text.map((v, i) => v * s.a + bg[i] * (1 - s.a));
    const r = ratio(mix, bg), need = s.large ? 3 : 4.5;
    if (r < need) found.push({k: 'contrast', w: `${s.d} ${r.toFixed(2)}:1 (needs ${need}:1)`});
  }
  return found;
}

const launcher = engine === 'webkit' ? webkit : chromium;
const browser = await launcher.launch(engine === 'webkit' ? {} : {channel: 'chrome'});
const report = {base, engine, widths: WIDTHS, at: new Date().toISOString(), states: {}, advisory: {}};
for (const width of WIDTHS) {
  const phone = width < 768;
  for (const fresh of [false, true]) {
    const todo = STATES.filter(s => !!s.fresh === fresh && (!s.phone || phone) && (!only || only.test(s.name)));
    if (!todo.length) continue;
    const ctx = await browser.newContext({...(phone ? devices['iPhone 13'] : {}), ...(touch ? {hasTouch: true} : {}), viewport: {width, height: phone ? 844 : 900}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
    await ctx.route('**/api/**', r => r.fulfill({status: 503, json: {error: 'audit fixture offline'}}));
    const p = await ctx.newPage();
    if (!fresh) { await p.goto(base + '/app/settings'); await btn(p, 'Load Showcase Demo').click(); await p.waitForURL('**/app'); await p.waitForTimeout(800); if (stress) console.log('stress records rewritten:', JSON.stringify(await p.evaluate(stressRecords))); }
    for (const st of todo) {
      const key = `${st.name}@${width}${engine === 'webkit' ? '-webkit' : ''}${touch ? '-touch' : ''}`;
      try {
        await p.goto(base + st.path, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 8000}).catch(() => {}); await p.waitForTimeout(900);
        // Every lazy part on the way down, then back to the top.
        await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } scrollTo(0, 0); });
        if (st.steps) await st.steps(p);
        await p.waitForTimeout(500);
        // A touch context (phones in Chrome, --touch): Chromium's full-page capture drops touch emulation for good (hover and
        // pointer media flip, hover-revealed controls vanish), so such pages are captured in viewport-sized chunks instead.
        // A scroll through the page first mounts what loads on sight, so the boxes measured next still hold during the chunks.
        const chunked = (phone || touch) && engine === 'chrome';
        if (chunked) { await p.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += innerHeight) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); }); await p.waitForTimeout(400); }
        const {out: found, samples, modal} = await p.evaluate(inspect);
        // The background capture: every glyph transparent (and gradient text's own fill removed), so what is read behind a text
        // is only what it sits on — never a neighbouring line's letters.
        const shotOpts = {type: 'png', animations: 'disabled', caret: 'hide', style: '[data-audit-fixed] { visibility: hidden !important; } *, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; } [data-audit-text-clip] { background: none !important; }'};
        const pngs = [];
        if (modal) pngs.push({top: 0, png: readPng(await p.screenshot(shotOpts))});
        else if (chunked) { const {h, vh} = await p.evaluate(() => ({h: document.documentElement.scrollHeight, vh: innerHeight})); const start = await p.evaluate(() => scrollY);
          for (let top = 0; ; top += vh - 120) { const at = await p.evaluate(t => { scrollTo(0, t); return scrollY; }, top); await p.waitForTimeout(80); pngs.push({top: at, png: readPng(await p.screenshot(shotOpts))}); if (at + vh >= h) break; }
          await p.evaluate(t => scrollTo(0, t), start); }
        else { const {h, w} = await p.evaluate(() => ({h: document.documentElement.scrollHeight, w: document.documentElement.clientWidth})); for (let top = 0; top < h; top += 7800) pngs.push({top, png: readPng(await p.screenshot({...shotOpts, fullPage: true, clip: {x: 0, y: top, width: w, height: Math.min(8000, h - top)}}))}); }
        const every = [...found, ...contrast(pngs, samples)], all = every.filter(f => f.k !== 'advisory-target');
        report.states[key] = all; report.advisory[key] = every.filter(f => f.k === 'advisory-target').map(f => f.w);
        console.log(`${key}: ${all.length ? all.length + ' finding(s)' : 'clean'}`);
        writeFileSync(`${out}/layout-audit-${engine}${stress ? '-stress' : ''}${touch ? '-touch' : ''}.partial.jsonl`, JSON.stringify({key, findings: all}) + '\n', {flag: 'a'});
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
const tag = `${engine}${stress ? '-stress' : ''}${touch ? '-touch' : ''}`;
writeFileSync(`${out}/layout-audit-${tag}.json`, JSON.stringify(report, null, 1));
const md = [`# Layout audit (${engine}${stress ? ', stress records' : ''}${touch ? ', touch (coarse pointer)' : ''}) — ${report.at}`, '', `Base: ${base}. Widths: ${WIDTHS.join(', ')}. States: ${Object.keys(report.states).length}.`, '', `Findings by kind: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(' · ') || 'none'}.`, '',
  ...Object.entries(report.states).filter(([, l]) => l.length).flatMap(([k, l]) => [`## ${k}`, ...l.map(f => `- **${f.k}** ${f.w}`), '']),
  ...(() => { const seen = new Map(); for (const [k, l] of Object.entries(report.advisory)) for (const w of l) { const id = w.replace(/\d+×\d+/, '#'); if (!seen.has(id)) seen.set(id, {w, k, n: 0}); seen.get(id).n++; }
    return seen.size ? ['## Advisory: pointer-layout controls between 24 and 44 px (not findings; owner item)', '', `${[...seen.values()].reduce((a, b) => a + b.n, 0)} occurrences of ${seen.size} distinct controls (WCAG 2.5.8 minimum met; 44 px is the touch layout's rule).`, '', ...[...seen.values()].map(v => `- ${v.w} (first at ${v.k}, ×${v.n})`), ''] : []; })()].join('\n');
writeFileSync(`${out}/layout-audit-${tag}.md`, md);
console.log('counts', JSON.stringify(counts));
