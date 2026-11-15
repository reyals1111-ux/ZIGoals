import {expect, test, type Page} from '@playwright/test';
import {WIDGETS} from '../lib/nova/widgets/catalog';

/**
 * Session AM-2 (ADR-038 "AM-2"): NOVA, stunning. What this pass must never lose again:
 * - E1–E4: the centre star is drawn and proven drawn; software rendering, a low battery and a light device only slow it;
 *   it is one still frame only for Motion Off and reduced motion; where WebGL cannot draw it the still picture of the same
 *   galaxy stands in; and an honest line under the star says which rule is at work.
 * Fictional data only.
 */
const NOVA_KEY = 'zigoals:nova:v1';
async function fresh(page: Page, extra: Record<string, string> = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [NOVA_KEY]: JSON.stringify({version: 1, openingSeen: true}), ...extra});
}
const frame = (page: Page) => page.locator('.nova-frame');
async function open(page: Page) { await page.goto('/app/nova'); await expect(frame(page)).toHaveAttribute('data-opening', 'done'); await expect(page.locator('.nova-command input')).toBeVisible(); }
const why = (page: Page) => page.locator('.nova-star-why');
const framesDrawn = (page: Page) => page.evaluate(() => (window as unknown as {__zgHudFrames?: number}).__zgHudFrames ?? 0);

test.describe('AM-2: the centre star is always there, and says how it is drawn', () => {
  test.skip(({isMobile}) => isMobile, 'computer layouts');
  test.use({viewport: {width: 1440, height: 900}});

  test('E1, E2: the star runs, is proven drawn, and software rendering only slows it (with its line)', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page);
    await open(page);
    const star = page.locator('canvas.nova-star');
    await expect(star).toBeVisible();
    await expect(star).toHaveAttribute('data-star', 'active');
    await expect(star).toHaveAttribute('data-star-proven', '');
    // The SVG orb gives way to it, and the canvas really holds light at its core (a screenshot would not tell an empty canvas from the sky).
    await expect(page.locator('.nova-orb-button')).toHaveAttribute('data-star', '');
    const core = await star.evaluate((el: HTMLCanvasElement) => { const gl = el.getContext('webgl')!, px = new Uint8Array(4); gl.readPixels(Math.floor(el.width / 2), Math.floor(el.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [...px]; });
    expect(core[3]).toBeGreaterThan(200);
    expect(core[0]! + core[1]! + core[2]!).toBeGreaterThan(500);
    const software = await star.evaluate(el => el.hasAttribute('data-star-software'));
    if (software) await expect(why(page)).toHaveText('Slow star: this browser draws it without graphics hardware');
    else await expect(why(page)).toHaveCount(0);
    // It is alive: frames keep coming while NOVA is in view.
    const before = await framesDrawn(page);
    await page.waitForTimeout(1500);
    expect(await framesDrawn(page)).toBeGreaterThan(before + 3);
  });

  test('E5: a spec can hold the star live and in a state (the capture switches)', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.addInitScript(() => { (window as unknown as {__zgStarLive?: boolean; __zgStarHold?: string}).__zgStarLive = true; (window as unknown as {__zgStarHold?: string}).__zgStarHold = 'thinking'; });
    await fresh(page);
    await open(page);
    const star = page.locator('canvas.nova-star');
    await expect(star).toHaveAttribute('data-star', 'active');
    await expect(star).toHaveAttribute('data-star-fps', '30');
    await expect(page.locator('.nova-orb-state')).toHaveAttribute('data-state', 'thinking');
    await expect(why(page)).toHaveCount(0);
  });

  test('E4: Motion Off and reduced motion are one still frame each, with their own lines', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page, {'zigoals:motion:v1': 'off'});
    await open(page);
    await expect(page.locator('canvas.nova-star')).toHaveAttribute('data-star', 'still');
    await expect(page.locator('canvas.nova-star')).toHaveAttribute('data-star-proven', '');
    await expect(why(page)).toHaveText('Still star: Motion is Off in ZIGoals');
    const before = await framesDrawn(page);
    await page.waitForTimeout(1200);
    expect(await framesDrawn(page)).toBe(before);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await fresh(page);
    await open(page);
    await expect(page.locator('canvas.nova-star')).toHaveAttribute('data-star', 'still');
    await expect(why(page)).toHaveText('Still star: your device asks for reduced motion');
  });

  test('E3: without WebGL the still picture of the same galaxy stands in, and says why', async ({page}) => {
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) { return /webgl/i.test(kind) ? null : (real as (...a: unknown[]) => unknown).call(this, kind, ...rest); } as typeof real;
    });
    await fresh(page);
    await open(page);
    const picture = page.locator('.nova-star-picture');
    await expect(picture).toBeVisible();
    await expect(page.locator('canvas.nova-star')).toHaveCount(0);
    expect(await picture.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(300);
    await expect(page.locator('.nova-orb-button')).toHaveAttribute('data-star', ''); // the SVG orb stays the last resort only
    await expect(why(page)).toHaveText('Still picture: this browser has no WebGL');
  });

  test('E1: a driver that draws an empty frame is a failure with its own words, not an empty canvas', async ({page}) => {
    // What the owner's computer showed in Session AM: the shader compiles, the frame holds nothing. Here the read-back is
    // made to see an empty frame; the star must give way to the picture and say so.
    await page.addInitScript(() => {
      const real = WebGLRenderingContext.prototype.readPixels as (...a: unknown[]) => void;
      WebGLRenderingContext.prototype.readPixels = function (this: WebGLRenderingContext, ...a: unknown[]) { real.apply(this, a); const out = a[6] as Uint8Array | null; out?.fill(0); } as typeof WebGLRenderingContext.prototype.readPixels;
    });
    await fresh(page);
    await open(page);
    await expect(page.locator('.nova-star-picture')).toBeVisible();
    await expect(page.locator('canvas.nova-star')).toHaveCount(0);
    await expect(why(page)).toHaveText('Still picture: the graphics driver drew an empty frame');
  });

  test('E3: a lost graphics context is waited for; the picture stands in, and the star returns with the context', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page);
    await open(page);
    const star = page.locator('canvas.nova-star');
    await expect(star).toHaveAttribute('data-star-proven', '');
    await star.evaluate((el: HTMLCanvasElement) => { (window as unknown as {__lose?: WEBGL_lose_context | null}).__lose = el.getContext('webgl')!.getExtension('WEBGL_lose_context'); (window as unknown as {__lose?: WEBGL_lose_context | null}).__lose?.loseContext(); });
    await expect(page.locator('.nova-star-picture')).toBeVisible({timeout: 6000});
    await expect(why(page)).toHaveText('Still picture: the graphics context was lost');
    await page.evaluate(() => (window as unknown as {__lose?: WEBGL_lose_context | null}).__lose?.restoreContext());
    await expect(page.locator('.nova-star-picture')).toHaveCount(0);
    await expect(star).toBeVisible();
    await expect(star).toHaveAttribute('data-star', 'active');
  });
});

/**
 * AM-2 (F2): Pin, Hide and Close are three keys in the head of EVERY widget on a computer — every kind of the catalogue
 * (the widgets NOVA makes on request, the earlier HUD panels, the Showcase's arrangement), at every width and in every
 * layout — directly in the head, never behind a menu. In Session AM they folded under "More" below 312 px of panel and the
 * owner could not close or hide a widget. The catalogue itself is the list, so a new kind is covered the day it is added.
 */

const KINDS = WIDGETS.map(w => ({id: w.id, title: w.title}));
const SIZES = ['S', 'M', 'L'] as const;
/** The catalogue in batches a NOVA record may hold (24 widgets at most), sizes mixed so every kind meets narrow and wide panels across the batches. */
const batches = (per: number) => Array.from({length: Math.ceil(KINDS.length / per)}, (_, b) => KINDS.slice(b * per, b * per + per).map((k, i) => ({id: k.id, size: SIZES[(i + b) % 3]!, slot: i})));
const arranged = (widgets: {id: string; size: string; slot: number}[], layout = 'orbit') => ({[NOVA_KEY]: JSON.stringify({version: 1, openingSeen: true, layout, widgets}), 'zigoals:earn-prefs:v1': JSON.stringify({version: 1, pageShown: true})}); // the chain is chosen (tests/chain-choice.ts), so the Markets widget exists too
type KeyReport = {id: string; problems: string[]};
/** For every widget on the stage: its three keys by their accessible names, each visible, at least 44 px, inside the widget's head, and the thing a tap at its middle lands on. */
const keysOnStage = (page: Page, kinds: {id: string; title: string}[]) => page.evaluate(async list => {
  const out: KeyReport[] = [];
  for (const {id, title} of list) {
    const widget = document.querySelector<HTMLElement>(`.nova-stage-area article.nova-widget[data-widget="${id}"]`), problems: string[] = [];
    if (!widget) { out.push({id, problems: ['not on the stage']}); continue; }
    widget.scrollIntoView({block: 'start', behavior: 'instant' as ScrollBehavior}); // its head in view (a tall band widget is taller than the stage's window)
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    const head = widget.querySelector<HTMLElement>('.nova-widget-head')!.getBoundingClientRect(), box = widget.getBoundingClientRect();
    for (const name of [`Unpin ${title}`, `Hide ${title} in the dock`, `Close ${title}`]) {
      const key = [...widget.querySelectorAll<HTMLButtonElement>('.nova-widget-head button')].find(b => b.getAttribute('aria-label') === name);
      if (!key) { problems.push(`no "${name}" button in the head`); continue; }
      const r = key.getBoundingClientRect(), style = getComputedStyle(key), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) < 0.99) problems.push(`"${name}" is not shown`);
      if (r.width < 43.5 || r.height < 43.5) problems.push(`"${name}" is ${Math.round(r.width)}×${Math.round(r.height)} px`);
      if (cx < box.left || cx > box.right || cy < head.top - 12 || cy > head.bottom + 12) problems.push(`"${name}" is outside its widget's head`);
      if (cx < 0 || cx > innerWidth || cy < 0 || cy > innerHeight) problems.push(`"${name}" is outside the window`);
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || !(hit === key || key.contains(hit))) problems.push(`a tap on "${name}" lands on ${hit ? `<${hit.tagName.toLowerCase()} class="${(hit as HTMLElement).className}">` : 'nothing'}`);
      // The key's own glyph is in view too (not clipped away by the head).
      const glyph = key.querySelector('svg')?.getBoundingClientRect();
      if (!glyph || glyph.width < 12 || glyph.top < head.top - 2 || glyph.bottom > head.bottom + 14) problems.push(`"${name}" shows no glyph`);
    }
    if (widget.querySelector('.ns-more, [aria-label^="More for"]')) problems.push('a "More" menu is back');
    out.push({id, problems});
  }
  return out;
}, kinds);

test.describe('AM-2 (F2): Pin, Hide and Close on every widget', () => {
  test.skip(({isMobile}) => isMobile, 'computer layouts');
  for (const [width, height] of [[2560, 1440], [1440, 900], [1024, 768], [760, 900]] as const) {
    for (const layout of ['orbit', 'bento'] as const) {
      test(`every kind of the catalogue shows its three keys in its head at ${width} × ${height}, ${layout}`, async ({page}) => {
        test.setTimeout(120_000);
        await page.setViewportSize({width, height});
        const seen = new Set<string>();
        for (const batch of batches(12)) {
          await fresh(page, arranged(batch, layout));
          await open(page);
          const ids = new Set(batch.map(w => w.id)), kinds = KINDS.filter(k => ids.has(k.id));
          await expect(page.locator('.nova-stage-area article.nova-widget')).toHaveCount(batch.length);
          const report = await keysOnStage(page, kinds);
          expect(report.filter(r => r.problems.length), `${layout} at ${width} px`).toEqual([]);
          for (const r of report) seen.add(r.id);
        }
        expect([...seen].sort()).toEqual(KINDS.map(k => k.id).sort()); // every kind, none skipped
      });
    }
  }
  test('Focus shows its three widgets with their keys too', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    const batch = batches(3)[0]!;
    await fresh(page, arranged(batch, 'focus'));
    await open(page);
    const report = await keysOnStage(page, KINDS.filter(k => batch.some(w => w.id === k.id)));
    expect(report.filter(r => r.problems.length)).toEqual([]);
  });

  test('each kind’s keys do their work: close (with Undo), hide to the dock and back, unpin and pin', async ({page}) => {
    test.setTimeout(240_000);
    await page.setViewportSize({width: 1440, height: 900});
    const widget = (id: string) => page.locator(`.nova-stage-area article.nova-widget[data-widget="${id}"]`);
    for (const batch of batches(12)) {
      await fresh(page, arranged(batch));
      await open(page);
      for (const {id} of batch) {
        const title = KINDS.find(k => k.id === id)!.title, head = widget(id).locator('.nova-widget-head');
        await widget(id).scrollIntoViewIfNeeded();
        // Close, then Undo: the widget is back where it was, still pinned.
        await head.getByRole('button', {name: `Close ${title}`, exact: true}).click();
        await expect(widget(id), id).toHaveCount(0);
        await page.getByRole('button', {name: 'Undo'}).first().click();
        await expect(widget(id), id).toBeVisible();
        await expect(widget(id)).toHaveAttribute('data-pinned', '');
        // Hide: a chip in the dock; a tap brings it back.
        await widget(id).scrollIntoViewIfNeeded();
        await head.getByRole('button', {name: `Hide ${title} in the dock`, exact: true}).click();
        await expect(widget(id), id).toHaveCount(0);
        await page.getByRole('group', {name: 'Dock: hidden widgets'}).getByRole('button', {name: `Show ${title} again`, exact: true}).click();
        await expect(widget(id), id).toBeVisible();
        // Unpin and pin: the key says which it is.
        await widget(id).scrollIntoViewIfNeeded();
        await head.getByRole('button', {name: `Unpin ${title}`, exact: true}).click();
        await expect(head.getByRole('button', {name: `Pin ${title}`, exact: true})).toHaveAttribute('aria-pressed', 'false');
        await expect(widget(id)).not.toHaveAttribute('data-pinned', '');
        await head.getByRole('button', {name: `Pin ${title}`, exact: true}).click();
        await expect(head.getByRole('button', {name: `Unpin ${title}`, exact: true})).toHaveAttribute('aria-pressed', 'true');
      }
    }
  });

  test('a widget made by a request and the Showcase’s arrangement carry the same keys', async ({page}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({width: 1440, height: 900});
    // Made on request (not pinned): Pin is offered, and the three keys are in the head.
    await fresh(page);
    await open(page);
    const field = page.locator('.nova-command input');
    for (const words of ['Show my habits this week', 'Show my net worth', 'show the time']) { await field.fill(words); await field.press('Enter'); await page.waitForTimeout(400); }
    for (const [id, title] of [['habit-week', 'Habits this week'], ['net-worth', 'Tracked wealth'], ['time', 'Time']] as const) {
      const head = page.locator(`.nova-stage-area article.nova-widget[data-widget="${id}"] .nova-widget-head`);
      await expect(head).toBeVisible();
      for (const name of [`Pin ${title}`, `Hide ${title} in the dock`, `Close ${title}`]) await expect(head.getByRole('button', {name, exact: true})).toBeVisible();
      await expect(page.getByRole('button', {name: `More for ${title}`})).toHaveCount(0);
    }
    // The Showcase: its Command arrangement, every panel.
    await page.goto('/app/settings');
    await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
    await page.waitForURL('**/app');
    await open(page);
    const shown = await page.locator('.nova-stage-area article.nova-widget').evaluateAll(els => els.map(el => (el as HTMLElement).dataset.widget!));
    expect(shown.length).toBeGreaterThanOrEqual(8);
    const report = await keysOnStage(page, KINDS.filter(k => shown.includes(k.id)));
    expect(report.filter(r => r.problems.length)).toEqual([]);
  });
});

/**
 * AM-2 (B2, the owner's rule): glow stays cheap. Inside NOVA only `transform` and `opacity` are animated; bloom and glow
 * are static (no animated box-shadow, filter, backdrop-filter, clip-path, background or colour); the widget plane has
 * no backdrop-filter at all. Read from the running page: every animation the browser is running, with the properties
 * its keyframes change, on the Showcase's full stage, while a widget is being made, and with the conversation open.
 */
type Running = {name: string; on: string; props: string[]};
const CHEAP = new Set(['transform', 'opacity']);
/** Every running animation inside NOVA and what it animates. A transition counts too (its property is its name). */
const runningInNova = (page: Page) => page.evaluate(() => {
  const root = document.querySelector('.nova-root');
  return document.getAnimations().filter(a => a.playState === 'running' && root?.contains((a.effect as KeyframeEffect | null)?.target ?? null)).map(a => {
    const effect = a.effect as KeyframeEffect, target = effect.target as Element, props = new Set<string>();
    for (const frame of effect.getKeyframes()) for (const key of Object.keys(frame)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(key)) props.add(key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`));
    return {name: (a as CSSAnimation).animationName ?? `transition:${(a as CSSTransition).transitionProperty}`, on: `${target.tagName.toLowerCase()}.${String((target as SVGElement).className?.baseVal ?? target.className).split(' ').filter(Boolean).join('.')}${effect.pseudoElement ?? ''}`, props: [...props]};
  });
});
/** Short colour and background transitions on a press or a hover are allowed (≤ 150 ms, never a loop): they are told apart by being transitions. */
const costly = (list: Running[]) => list.filter(a => !a.name.startsWith('transition:') && a.props.some(p => !CHEAP.has(p)));

test.describe('AM-2 (B2): glow stays cheap', () => {
  test.skip(({isMobile}) => isMobile, 'computer layouts');
  test.use({viewport: {width: 1440, height: 900}});

  test('on the Showcase’s full stage only transform and opacity are animated, and no widget has a backdrop-filter', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
    await page.goto('/app/settings');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
    await page.reload();
    await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
    await page.waitForURL('**/app');
    await open(page);
    await expect(frame(page)).toHaveAttribute('data-hud-motion', 'full');
    await expect(page.locator('.nova-stage-area article.nova-widget').first()).toBeVisible();
    // Sampled over two seconds, so a loop that starts late (a sheen's delay, an ornament) is seen too.
    const seen: Running[] = [];
    for (let i = 0; i < 8; i++) { seen.push(...await runningInNova(page)); await page.waitForTimeout(250); }
    expect(seen.length, 'the stage is alive: ornaments move').toBeGreaterThan(0);
    expect(costly(seen)).toEqual([]);
    // Loops are ornaments' only: every infinite animation animates transform or opacity alone (transitions cannot loop).
    const filters = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.nova-stage-area article.nova-widget, .nova-stage-area article.nova-widget *')].filter(el => { const s = getComputedStyle(el), b = s.backdropFilter || (s as unknown as {webkitBackdropFilter?: string}).webkitBackdropFilter || 'none'; return b !== 'none'; }).map(el => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`));
    expect(filters, 'backdrop-filter on the widget plane').toEqual([]);
    const pseudo = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.nova-stage-area article.nova-widget')].flatMap(el => ['::before', '::after'].filter(p => { const s = getComputedStyle(el, p), b = s.backdropFilter || 'none'; return b !== 'none'; }).map(p => `${el.dataset.widget}${p}`)));
    expect(pseudo, 'backdrop-filter on a widget’s plate or rim').toEqual([]);
  });

  test('while a widget is being made, and when it settles, nothing costly is animated and nothing of the making loops', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page);
    await open(page);
    const field = page.locator('.nova-command input');
    await field.fill('Show my habits this week'); await field.press('Enter');
    const made = page.locator('.nova-stage-area article.nova-widget[data-widget="habit-week"]');
    await expect(made).toBeVisible();
    const during: Running[] = [];
    for (let i = 0; i < 6; i++) { during.push(...await runningInNova(page)); await page.waitForTimeout(120); }
    // The one exception, once, while it is made (ADR-038 AM-2 F3): a ring or a line may draw itself with stroke-dashoffset.
    expect(costly(during.map(a => ({...a, props: a.props.filter(p => p !== 'stroke-dashoffset')})))).toEqual([]);
    // After the moment (≤ 900 ms, plus the answer's own entrance) nothing of the making is still running: it ran once.
    await page.waitForTimeout(1600);
    const after = await runningInNova(page);
    expect(after.filter(a => /^ns-(made|flash|scan|snap|rise|fade|beam)/.test(a.name))).toEqual([]);
    expect(costly(after)).toEqual([]);
  });
});
