import {expect, test, type Locator, type Page} from '@playwright/test';
import {audit} from './a11y-audit';

// Session X Part 12: WCAG 2.2 AA across every page, both projects, empty and with the Showcase. Checks that a browser can
// decide by itself (names, labels, structure, titles, keyboard, focus, reflow, text spacing, target size, contrast,
// motion, consistent help); the judgement calls are in docs/accessibility/WCAG_X.md. Each test gathers every page's
// findings and reports them together. ZIGi's own surfaces (launcher, panel, Meet ZIGi) belong to the X-LOCAL lane and are
// excluded here; findings there go to the handoff.
const PAGES: [path: string, title: string][] = [
  ['/app', 'Today'], ['/app/goals', 'Goals'], ['/app/goals/new', 'Create a goal'], ['/app/habits', 'Habits'], ['/app/health', 'Health'],
  ['/app/wealth', 'Wealth'], ['/app/portfolio', 'Portfolio'], ['/app/markets', 'Markets'], ['/app/staking', 'Staking'],
  ['/app/ecosystem', 'Ecosystem'], ['/app/activity', 'Activity'], ['/app/chess', 'Chess'], ['/app/settings', 'Settings'],
  ['/app/help', 'Help'], ['/app/welcome', 'Welcome'],
];
// Health's own views load on demand after a placeholder; each is checked once its heading is there. Same page title.
const SLEEP: [path: string, heading: string] = ['/app/health?view=sleep', 'Your sleep, your rhythm.'];
const MEDITATION: [path: string, heading: string] = ['/app/health?view=meditation', 'Breathe. Be here.'];
const VIEWS: [path: string, heading: string][] = [SLEEP, MEDITATION, ['/app/health?view=devices', 'Your devices, honestly.']];
/** Every page, then Health's views, with the heading that says the view has arrived. */
const ALL: [path: string, heading?: string][] = [...PAGES.map(([path]) => [path] as [string]), ...VIEWS];
const ZIGI = '.ai-launcher, .ai-panel, .ai-edge-tab, [data-testid="ai-launcher"], [class*="zigi"]';
type Findings = Record<string, unknown[]>;
const add = (all: Findings, key: string, items: unknown[]) => { if (items.length) all[key] = [...(all[key] ?? []), ...items]; };

async function offline(page: Page) { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); }
async function showcase(page: Page) {
  await offline(page);
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
async function open(page: Page, path: string, heading?: string) {
  await page.goto(path);
  await expect(page.locator('main h1').first()).toBeVisible();
  if (heading) await expect(page.locator('main h1').first()).toHaveText(heading);
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  // Streaming has finished: React keeps a streamed part in a hidden holder at the end of the page (ids and all) until it
  // swaps it in, so the page is checked once no holder is left.
  await expect(page.locator('div[hidden][id^="S:"]')).toHaveCount(0);
}
/** The page's own regions for the audit: main, the navigation and the phone bars; never ZIGi's surfaces. */
function regions(page: Page): Locator { return page.locator('main, nav, header').filter({hasNot: page.locator(ZIGI)}); }

for (const state of ['empty', 'showcase'] as const) {
  test(`names, labels, structure and titles on every page (${state})`, async ({page}) => {
    test.setTimeout(240_000);
    if (state === 'showcase') await showcase(page); else await offline(page);
    const titles = new Set<string>(), findings: Findings = {};
    for (const [path, name] of PAGES) {
      await open(page, path);
      if (await page.evaluate(() => document.documentElement.lang) !== 'en') add(findings, path, ['lang is not en']);
      const title = await page.title();
      if (title !== `${name} · ZIGoals Alpha`) add(findings, path, [`title "${title}"`]);
      titles.add(title);
      const h1 = await page.locator('main h1').count();
      if (h1 !== 1) add(findings, path, [`${h1} h1 elements`]);
      for (const region of await regions(page).all()) if (await region.isVisible()) add(findings, path, await audit(region));
    }
    for (const [path, heading] of VIEWS) {
      await open(page, path, heading);
      if (await page.title() !== 'Health · ZIGoals Alpha') add(findings, path, [`title "${await page.title()}"`]);
      if (await page.locator('main h1').count() !== 1) add(findings, path, [`${await page.locator('main h1').count()} h1 elements`]);
      for (const region of await regions(page).all()) if (await region.isVisible()) add(findings, path, await audit(region));
    }
    expect(findings).toEqual({});
    expect(titles.size).toBe(PAGES.length);
  });
}

test('keyboard: the skip link comes first and works; focus is always visible, never trapped and never hidden behind the bars', async ({page}) => {
  test.setTimeout(300_000);
  await showcase(page);
  const findings: Findings = {};
  for (const [path, heading] of ALL) {
    await open(page, path, heading);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Tab');
    if (!await page.getByRole('link', {name: 'Skip to content', exact: true}).evaluate(el => el === document.activeElement)) { add(findings, path, ['the first Tab does not reach "Skip to content"']); continue; }
    await page.keyboard.press('Enter');
    // 2.4.1: after the skip link, the next Tab lands in the content (the browser moves its focus starting point there).
    await page.keyboard.press('Tab');
    if (!await page.evaluate(() => !!document.getElementById('main')?.contains(document.activeElement))) add(findings, path, ['after the skip link, Tab does not land in the content']);
    await page.evaluate(() => { const w = window as unknown as {wcagLast?: Element; wcagSame?: number}; delete w.wcagLast; w.wcagSame = 0; });
    for (let i = 0; i < 25; i++) {
      const state = await page.evaluate(zigi => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el), r = el.getBoundingClientRect();
        const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow !== 'none' && s.boxShadow !== '');
        // 2.4.11 (minimum): the focused control is not entirely hidden. Five points (centre and four inner corners) are
        // sampled; it counts as hidden only when every one lands on something that is not the control, its label or its
        // own wrapper (a visually hidden native input under its drawn switch is the switch).
        const own = (hit: Element | null) => !!hit && (el.contains(hit) || hit.contains(el) || !!(el as HTMLInputElement).labels && [...(el as HTMLInputElement).labels!].some(l => l.contains(hit)) || (!!el.parentElement && el.parentElement.contains(hit) && el.parentElement.matches('label, .switch, [class*="switch"], [class*="toggle"]')));
        const clampX = (x: number) => Math.min(Math.max(x, 0), innerWidth - 1), clampY = (y: number) => Math.min(Math.max(y, 0), innerHeight - 1);
        const points = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]];
        const covered = points.every(([x, y]) => { const hit = document.elementFromPoint(clampX(x!), clampY(y!)); return !!hit && !own(hit); });
        const where = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}"`;
        // 2.1.2: a trap is focus that Tab cannot move. A date or time field takes one Tab per segment (day, month, year;
        // hours, minutes, AM/PM) before it moves on, so it may stay five times; anything else twice (one Tab can land
        // while the page is busy re-rendering under load).
        const w = window as unknown as {wcagLast?: Element; wcagSame?: number};
        w.wcagSame = w.wcagLast === el ? (w.wcagSame ?? 0) + 1 : 0; w.wcagLast = el;
        const segmented = el instanceof HTMLInputElement && /^(date|time|datetime-local|month|week)$/.test(el.type);
        const stuck = w.wcagSame >= (segmented ? 5 : 2);
        return {where, zigi: !!el.closest(zigi), visible: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight, ring, covered, stuck};
      }, ZIGI);
      if (!state) break;
      if (!state.zigi) {
        if (!state.visible) add(findings, path, [`${state.where}: not on screen when focused`]);
        if (!state.ring) add(findings, path, [`${state.where}: no focus indicator`]);
        if (state.covered) add(findings, path, [`${state.where}: hidden behind something when focused (2.4.11)`]);
      }
      if (state.stuck) { add(findings, path, [`focus stuck on ${state.where}`]); break; }
      await page.keyboard.press('Tab');
    }
  }
  expect(findings).toEqual({});
});

test('reflow at 320 px and at 200 % zoom (640 px), and text spacing (1.4.10, 1.4.4, 1.4.12): nothing scrolls sideways', async ({page}) => {
  test.setTimeout(300_000);
  await showcase(page);
  const findings: Findings = {};
  const wide = () => page.evaluate(() => document.documentElement.scrollWidth);
  for (const width of [320, 640]) {
    await page.setViewportSize({width, height: width === 320 ? 640 : 400});
    for (const [path, heading] of ALL) {
      await open(page, path, heading);
      await page.waitForTimeout(300);
      const w = await wide();
      if (w > width) add(findings, `${path} at ${width}`, [`${w} px wide`]);
    }
  }
  await page.setViewportSize({width: 390, height: 844});
  for (const [path, heading] of ALL) {
    await open(page, path, heading);
    await page.addStyleTag({content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }'});
    await page.waitForTimeout(300);
    const w = await wide();
    if (w > 390) add(findings, `${path} with text spacing`, [`${w} px wide`]);
  }
  expect(findings).toEqual({});
});

/** 2.5.8 inside the page: each shown control under 24 × 24 px whose 24 px circle meets another target or circle. */
function crowdedTargets(zigi: string): string[] {
  type Box = {l: number; t: number; r: number; b: number};
  const targets: {el: HTMLElement; box: Box; name: string; inline: boolean}[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('main a[href], main button, main input:not([type=hidden]), main select, main textarea, main summary, main [role=button], main [role=tab], main [role=switch], nav a[href], nav button')) {
    // Only what is shown: a control inside a closed disclosure still has a layout box but cannot be hit.
    if (el.closest(zigi) || el.closest('[hidden], [inert]') || !el.checkVisibility({visibilityProperty: true})) continue;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    let box: Box = {l: r.left, t: r.top, r: r.right, b: r.bottom};
    // A control's clickable label is part of its target (WCAG 2.5.8, Understanding: "the label is part of the target").
    for (const label of [...((el as HTMLInputElement).labels ?? [])]) { const q = label.getBoundingClientRect(); if (q.width && q.height) box = {l: Math.min(box.l, q.left), t: Math.min(box.t, q.top), r: Math.max(box.r, q.right), b: Math.max(box.b, q.bottom)}; }
    // The inline exception: a link in a sentence (its block holds other text).
    let inline = false;
    if (el.tagName === 'A' && s.display === 'inline') { const block = el.parentElement?.closest('p, li, dd, td'); inline = !!block && (block.textContent ?? '').trim().length > (el.textContent ?? '').trim().length; }
    targets.push({el, box, inline, name: `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 32)}"`});
  }
  const size = (b: Box) => [b.r - b.l, b.b - b.t] as const;
  const undersized = targets.filter(t => !t.inline && (size(t.box)[0] < 24 || size(t.box)[1] < 24));
  const centre = (b: Box) => [(b.l + b.r) / 2, (b.t + b.b) / 2] as const;
  const circleHitsBox = (c: readonly [number, number], b: Box) => { const x = Math.max(b.l, Math.min(c[0], b.r)), y = Math.max(b.t, Math.min(c[1], b.b)); return (x - c[0]) ** 2 + (y - c[1]) ** 2 < 12 * 12; };
  const out: string[] = [];
  // The spacing exception: a 24 px circle centred on each undersized target meets no other target and no other such circle.
  for (const t of undersized) {
    const c = centre(t.box);
    const crowded = targets.some(o => o !== t && !o.el.contains(t.el) && !t.el.contains(o.el) && (undersized.includes(o) ? Math.hypot(centre(o.box)[0] - c[0], centre(o.box)[1] - c[1]) < 24 : circleHitsBox(c, o.box)));
    if (crowded) { const [w, h] = size(t.box); out.push(`${t.name} ${Math.round(w)}×${Math.round(h)}`); }
  }
  return out;
}

test('target size (2.5.8): every control is at least 24 × 24 px, or has room around it, or is a link in a sentence', async ({page}) => {
  test.setTimeout(240_000);
  await showcase(page);
  const findings: Findings = {};
  for (const [path, heading] of ALL) {
    await open(page, path, heading);
    const shown = await page.evaluate(crowdedTargets, ZIGI);
    add(findings, path, shown);
    // Then with every closed disclosure in the page open, so what each one holds is measured too.
    if (await page.evaluate(zigi => { const closed = [...document.querySelectorAll<HTMLDetailsElement>('main details:not([open])')].filter(d => !d.closest(zigi)); closed.forEach(d => { d.open = true; }); return closed.length; }, ZIGI)) {
      add(findings, `${path} (disclosures open)`, (await page.evaluate(crowdedTargets, ZIGI)).filter(item => !shown.includes(item)));
    }
  }
  expect(findings).toEqual({});
});

test('reduced motion and Motion Off: nothing keeps moving on any page (2.3.3, 2.2.2)', async ({page}) => {
  test.setTimeout(300_000);
  await showcase(page);
  const findings: Findings = {};
  for (const mode of ['reduced', 'off'] as const) {
    if (mode === 'reduced') await page.emulateMedia({reducedMotion: 'reduce'});
    else { await page.emulateMedia({reducedMotion: 'no-preference'}); await page.evaluate(() => { localStorage.setItem('zigoals:motion:v1', 'off'); window.dispatchEvent(new Event('zigoals-motion')); }); }
    for (const [path, heading] of ALL) {
      await open(page, path, heading);
      await page.waitForTimeout(2500);
      const moving = await page.evaluate(zigi => document.getAnimations().filter(a => a.playState === 'running' && !(a instanceof CSSTransition) && !((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest?.(zigi)).map(a => `${String(((a.effect as KeyframeEffect | null)?.target as Element | null)?.className ?? '?').slice(0, 40)} ${(a as CSSAnimation).animationName ?? ''}`), ZIGI);
      add(findings, `${path} (${mode})`, moving);
    }
  }
  expect(findings).toEqual({});
});

test('consistent help (3.2.6): the help mechanisms repeated on every page keep their place', async ({page, isMobile}) => {
  test.setTimeout(150_000);
  await showcase(page);
  // Repeated on every page: the way to Settings (where Help & diagnostics and Send feedback live) in the main navigation
  // or the phone's top bar, in the same position relative to the rest. ZIGi's launcher is X-LOCAL's and checked there.
  const places = new Set<string>();
  for (const [path, heading] of ALL) {
    await open(page, path, heading);
    places.add(await page.evaluate(phone => {
      const links = phone ? [...document.querySelectorAll('.phone-topbar a')] : [...document.querySelectorAll('nav[aria-label="Main navigation"] a')];
      // By its name: on Help the phone bar's back link ("Back to Settings") goes to the same address.
      const settings = links.find(a => a.getAttribute('href') === '/app/settings' && (!phone || a.getAttribute('aria-label') === 'Settings'));
      return `settings:${settings ? links.indexOf(settings) - links.length : 'none'}`;
    }, isMobile));
  }
  expect([...places]).toHaveLength(1);
  expect([...places][0]).not.toContain('none');
});

// 1.4.3: text against the background it is drawn on. Backgrounds are composited from the element up to the page (alpha
// included); a gradient behind the text counts by its colour stops (the worst one), an image behind it is skipped and
// counted. Gradient text (background-clip: text) is measured stop by stop, its layers drawn over each other, against what
// is behind the element. Text in a disabled control is exempt (1.4.3's inactive-component exception). Large text
// (24 px, or 18.67 px bold) needs 3:1.
// Each entry: the page, what is measured there (main unless named; the music panel is its own dialog), and for a Health
// view the heading that says it has arrived.
const CONTRAST_PAGES: [path: string, root?: string, heading?: string][] = [
  [SLEEP[0], undefined, SLEEP[1]], [MEDITATION[0], undefined, MEDITATION[1]], ['/app/portfolio'], ['/app/settings'], ['/app/chess'], ['/app', '.music-panel'],
];
test('contrast of text (1.4.3) in Sleep, Meditation, Chess, Music, Portfolio and Settings', async ({page}) => {
  test.setTimeout(240_000);
  await showcase(page);
  const findings: Findings = {};
  for (const [path, rootSelector, heading] of CONTRAST_PAGES) {
    await open(page, path, heading);
    // The Showcase shows the music button; its panel is what is measured on Today.
    if (rootSelector === '.music-panel') { await page.getByRole('button', {name: 'Open the music player', exact: true}).click(); await expect(page.locator(rootSelector)).toBeVisible(); }
    // The settled colours: a switch that takes its saved state after loading fades its colours for a moment.
    await page.waitForFunction(() => !document.getAnimations().some(a => a instanceof CSSTransition && a.playState === 'running'));
    const result = await page.evaluate(([zigi, rootSelector]) => {
      type RGBA = {r: number; g: number; b: number; a: number};
      type RGB = {r: number; g: number; b: number};
      const parse = (c: string): RGBA | null => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1]!.split(/[ ,/]+/).filter(Boolean).map(Number); return {r: p[0]!, g: p[1]!, b: p[2]!, a: p[3] ?? 1}; };
      const stops = (image: string) => [...image.matchAll(/rgba?\([^)]+\)/g)].map(m => parse(m[0])).filter((c): c is RGBA => !!c);
      const over = (top: RGBA, under: RGB): RGB => ({r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a)});
      /** One translucent colour over another, keeping the alpha (for gradient layers drawn over each other). */
      const overAlpha = (top: RGBA, under: RGBA): RGBA => { const a = top.a + under.a * (1 - top.a); if (!a) return {r: 0, g: 0, b: 0, a: 0}; const mix = (x: number, y: number) => (x * top.a + y * under.a * (1 - top.a)) / a; return {r: mix(top.r, under.r), g: mix(top.g, under.g), b: mix(top.b, under.b), a}; };
      /** The layers of a background-image list (top first), split at the commas between layers only. */
      const layers = (image: string) => { const out: string[] = []; let depth = 0, start = 0; for (let i = 0; i < image.length; i++) { const ch = image[i]; if (ch === '(') depth++; else if (ch === ')') depth--; else if (ch === ',' && !depth) { out.push(image.slice(start, i)); start = i + 1; } } out.push(image.slice(start)); return out.map(l => l.trim()).filter(Boolean); };
      /** Gradient text's colours: every stop of the bottom layer, with each stop of the layers above drawn over them (a
       *  transparent stop leaves the colour below it). */
      const textStops = (image: string) => { const all = layers(image).map(stops).filter(l => l.length).reverse(); let options = all[0] ?? []; for (const layer of all.slice(1)) options = layer.flatMap(c => options.map(o => overAlpha(c, o))); return options; };
      const lum = (c: RGB) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const ratio = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
      const base = parse(getComputedStyle(document.body).backgroundColor) ?? {r: 2, g: 9, b: 24, a: 1};
      /** The colours that may sit behind an element (several when a gradient is in the stack), or null over an image. */
      const behind = (start: Element | null): RGB[] | null => {
        const layers: RGBA[][] = [];
        for (let e: Element | null = start; e; e = e.parentElement) {
          const cs = getComputedStyle(e);
          const bg = parse(cs.backgroundColor);
          if (cs.backgroundImage !== 'none') { if (!/gradient/.test(cs.backgroundImage)) return null; const s = stops(cs.backgroundImage); if (s.length) layers.push(s); }
          if (bg && bg.a > 0) layers.push([bg]);
          if (bg && bg.a === 1) break;
        }
        let options: RGB[] = [base];
        for (const layer of layers.reverse()) options = layer.flatMap(c => options.map(o => over(c, o)));
        return options;
      };
      const failures: string[] = []; let skipped = 0, checked = 0;
      const root = rootSelector ? document.querySelector(rootSelector)! : document.querySelector('main')!;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), seen = new Set<Element>();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement; if (!el || seen.has(el) || !(node.textContent ?? '').trim()) continue; seen.add(el);
        if (el.closest(zigi) || el.closest('[aria-hidden="true"], [hidden], svg')) continue;
        // 1.4.3's exception: text in an inactive (disabled) control has no contrast requirement.
        if (el.closest('button:disabled, input:disabled, select:disabled, textarea:disabled, fieldset:disabled, [aria-disabled="true"]')) continue;
        const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || !el.getClientRects().length) continue;
        let opacity = 1; for (let e: Element | null = el; e; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
        const size = parseFloat(s.fontSize), bold = Number(s.fontWeight) >= 700, large = size >= 24 || (bold && size >= 18.66), need = large ? 3 : 4.5;
        // Gradient text: the text's colours are the clipped gradient's stops, drawn over what is behind the element.
        const clip = (s as CSSStyleDeclaration & {webkitBackgroundClip?: string}).webkitBackgroundClip || s.backgroundClip;
        // One clip value per background layer ("text, text" for a two-layer gradient).
        const gradientText = /\btext\b/.test(clip) && s.backgroundImage !== 'none';
        const textColours = gradientText ? textStops(s.backgroundImage) : [parse(s.color)!];
        const backs = gradientText ? behind(el.parentElement) : behind(el);
        if (!backs || !textColours.length) { skipped++; continue; }
        let worst = Infinity;
        for (const t of textColours) for (const b of backs) worst = Math.min(worst, ratio(over({...t, a: t.a * opacity}, b), b));
        checked++;
        if (worst < need) failures.push(`${el.tagName.toLowerCase()}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} "${(el.textContent ?? '').trim().slice(0, 30)}" ${worst.toFixed(2)}:1`);
      }
      return {failures, skipped, checked};
    }, [ZIGI, rootSelector ?? ''] as const);
    test.info().annotations.push({type: 'contrast', description: `${path}: ${result.checked} checked, ${result.skipped} over an image`});
    add(findings, path, result.failures);
  }
  expect(findings).toEqual({});
});
