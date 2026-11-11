import {expect, test, type Page} from '@playwright/test';
import {openNovaConversation, withEarlierWidgets} from './nova-am';
import {defaultAiSettings} from '../lib/ai/settings';
import {novaAndZigi} from '../lib/nova/one-line';
import {OPEN_DAY} from '../lib/nova/day-line';

/**
 * Session AK P3 (docs/review/session-ak/NOVA_DESIGN_REVIEW.md, "Fixes"): NOVA's design polish, measured. The stage fits
 * the window with the star at its optical centre (ND-1, ND-9), widgets end where their content ends (ND-2), the greeting's
 * day line (ND-3), a one-row top bar (ND-4), one calm command field (ND-5), no stylesheet collision (ND-6), the open
 * conversation (ND-7), wide guide planets whose commands wrap (ND-8), Calm is opacity only (ND-10), coloured chip dots
 * (ND-12), the right panel's tiles and disclosure (ND-13), the left panel's foot (ND-14), the still sky on a low-end device
 * (ND-17), the guides' night band (ND-19), Ctrl K off Apple devices (ND-21) and the one-line setup banner (ND-23); and a
 * layout audit by bounding box at 1024, 1440 and 1920 px in Nebula, Light and Dark (inside the window, nothing on top of
 * a control: elementFromPoint at its centre). Fictional data only.
 */
const NOVA_KEY = 'zigoals:nova:v1';
type Theme = 'nebula' | 'light' | 'dark';
// Session AM (D2, deliberate): a record without a widget list used to read as AK's eight "Everyday" widgets; the stage now
// starts empty, so the record these tests start from arranges that same list first (tests/nova-am.ts), and each assertion stays.
const seen = (more: Record<string, unknown> = {}) => ({[NOVA_KEY]: JSON.stringify(withEarlierWidgets({version: 1, openingSeen: true, ...more}))});
const localBrain = () => ({'zigoals:ai:v1': JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'llama3.2:3b', localServer: 'ollama', baseUrl: 'http://127.0.0.1:11434'})});
async function fresh(page: Page, extra: Record<string, string> = {}, theme: Theme = 'nebula') {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('http://127.0.0.1:11434/**', route => route.fulfill({json: {models: [{name: 'llama3.2:3b', model: 'llama3.2:3b', details: {family: 'llama'}}]}, headers: {'access-control-allow-origin': '*'}}));
  await page.goto('/app/settings');
  const values: Record<string, string> = {'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), ...extra};
  if (theme !== 'nebula') values['zigoals:ui-prefs:v1'] = JSON.stringify({version: 1, theme});
  await page.evaluate(v => { localStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
/** The Showcase, as a person loads it (Settings → Load Showcase Demo), then NOVA as already seen. */
async function showcase(page: Page, nova: Record<string, unknown> = {}) {
  await fresh(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [NOVA_KEY, JSON.stringify({version: 1, openingSeen: true, ...nova})] as const);
}
async function openNova(page: Page) {
  await page.goto('/app/nova');
  await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done');
  await expect(page.locator('.nova-orb-button')).toBeVisible();
}
type Box = {x: number; y: number; width: number; height: number};
/** Session AK CI-4: every finite animation on the element, inside it and on its ancestors has finished (the left panel slides
 * in 18 px on every mount, nova.css `.nova-left`; measured mid-slide its foot read x = -6). */
const atRest = (page: Page, selector: string) => page.locator(selector).first().evaluate(el => {
  const all = el.getAnimations({subtree: true});
  for (let p = el.parentElement; p; p = p.parentElement) all.push(...p.getAnimations());
  return Promise.all(all.filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined)));
});
const box = async (page: Page, selector: string): Promise<Box> => { const b = await page.locator(selector).first().boundingBox(); expect(b, selector).not.toBeNull(); return b!; };
const inWindow = (page: Page, b: Box, what: string) => {
  const {width, height} = page.viewportSize()!;
  expect(b.x, `${what} left`).toBeGreaterThanOrEqual(-0.5); expect(b.y, `${what} top`).toBeGreaterThanOrEqual(-0.5);
  expect(b.x + b.width, `${what} right`).toBeLessThanOrEqual(width + 0.5); expect(b.y + b.height, `${what} bottom`).toBeLessThanOrEqual(height + 0.5);
};

test.describe('NOVA polish on a computer', () => {
  test.skip(({isMobile}) => isMobile, 'computer layouts');

  for (const [width, height] of [[1440, 900], [1920, 1080]] as const) for (const start of ['fresh', 'showcase'] as const) {
    test(`ND-1: the star, its state and the greeting are in the window, the orb at the stage's middle (${width} × ${height}, ${start})`, async ({page}) => {
      await page.setViewportSize({width, height});
      if (start === 'fresh') await fresh(page, seen()); else await showcase(page);
      await openNova(page);
      const foot = await box(page, '.nova-foot');
      for (const sel of ['.nova-orb-button', '.nova-orb-state', '.nova-greeting', '.nova-dayline']) {
        const b = await box(page, sel);
        inWindow(page, b, sel);
        expect(b.y + b.height, `${sel} above the command field`).toBeLessThanOrEqual(foot.y + 0.5);
      }
      const orb = await box(page, '.nova-orb-button'), area = await box(page, '.nova-stage-area');
      expect(Math.abs((orb.y + orb.height / 2) - (area.y + area.height / 2)), 'the orb at the stage area\'s middle').toBeLessThanOrEqual(area.height * 0.08);
      // The opening's ignition happens there too: the orb is centred between the side columns.
      const centre = await box(page, '.nova-orbit-centre');
      expect(Math.abs((orb.x + orb.width / 2) - (centre.x + centre.width / 2))).toBeLessThanOrEqual(2);
      // ND-2: every card ends where its content ends (no tall empty slab).
      const slack = await page.locator('.nova-orbit-main .nova-widget').evaluateAll(cards => cards.map(card => {
        const inner = card.querySelector('.nova-widget-inner')!.getBoundingClientRect(), outer = card.getBoundingClientRect();
        return {id: (card as HTMLElement).dataset.widget, empty: Math.round(outer.bottom - inner.bottom)};
      }));
      expect(slack.length).toBeGreaterThan(0);
      for (const s of slack) expect(s.empty, `${s.id}'s empty interior`).toBeLessThanOrEqual(96);
    });
  }

  test('ND-3, ND-23: the day line says the person\'s day (open on a fresh start, facts in the Showcase); the setup banner is one line', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await fresh(page, seen());
    await openNova(page);
    await expect(page.locator('.nova-dayline')).toHaveText(OPEN_DAY);
    const banner = page.getByRole('region', {name: 'Give NOVA a brain of its own'});
    await expect(banner).toContainText('It already answers simple questions on this device.');
    await expect(banner.getByRole('link', {name: 'Start the guide'})).toHaveAttribute('href', '/app/nova/setup');
    expect((await banner.boundingBox())!.height).toBeLessThanOrEqual(72);
    // What NOVA is next to ZIGi now lives on the guide's first planet ("Meet NOVA").
    await page.goto('/app/nova/setup');
    await page.getByRole('button', {name: /^Meet NOVA:/}).first().click();
    await expect(page.locator('[data-setup-panel="meet"]')).toContainText(novaAndZigi());
    await showcase(page);
    await openNova(page);
    const line = page.locator('.nova-dayline[data-ready]');
    await expect(line).toBeVisible();
    await expect(line).toHaveText(/next|left|to go|due|done/);
    expect(((await line.textContent()) ?? '').split(' · ').length).toBeLessThanOrEqual(3);
    await expect(line).not.toHaveAttribute('aria-live', /.+/);
  });

  for (const width of [1024, 1440, 1920]) test(`ND-4: the top bar is one row, at most 120 px, with the right panel closed and open (${width} px)`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    await fresh(page, seen());
    await openNova(page);
    for (const open of [false, true]) {
      if (open) { await page.getByRole('button', {name: 'Show Behind the intelligence'}).click(); await expect(page.locator('aside.nova-right:not([aria-busy])')).toBeVisible(); }
      expect((await box(page, '.nova-top')).height, `right panel ${open ? 'open' : 'closed'}`).toBeLessThanOrEqual(120);
      const rows = await page.locator('.nova-top-left > :is(button, a)').evaluateAll(els => new Set(els.map(el => Math.round(el.getBoundingClientRect().top))).size);
      expect(rows, 'the left controls share one row').toBe(1);
      const quick = page.getByRole('navigation', {name: 'Quick access'});
      await expect(quick.getByRole('button', {name: /Behind the intelligence/})).toBeVisible();
      // Customize is a tile of the grid; on a narrow centre the grid folds into the Quick access sheet.
      const centre = (await box(page, '.nova-centre')).width;
      if (centre > 800) await expect(quick.getByRole('button', {name: 'Customize the view'})).toBeVisible();
      else await expect(page.locator('.nova-top').getByRole('button', {name: 'Quick access'})).toBeVisible();
    }
  });

  test('ND-5, ND-21: one calm field (no inner box), at least 480 px wide with both panels open and a brain connected; Ctrl K off Apple devices', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await fresh(page, {...seen({panels: {left: 'open', right: 'open'}}), ...localBrain()});
    await openNova(page);
    await expect(page.getByRole('button', {name: /Model routing/})).toBeVisible();
    const input = page.getByRole('textbox', {name: 'Message NOVA'});
    expect((await input.boundingBox())!.width).toBeGreaterThanOrEqual(480);
    const look = await input.evaluate(el => { const s = getComputedStyle(el); return {bg: s.backgroundColor, border: s.borderTopWidth}; });
    expect(look).toEqual({bg: 'rgba(0, 0, 0, 0)', border: '0px'});
    const apple = await page.evaluate(() => /mac|iphone|ipad|ipod/i.test(navigator.platform));
    await expect(page.locator('.nova-command .nova-kbd')).toHaveText(apple ? '⌘K' : 'Ctrl K');
    await expect(input).toHaveAttribute('aria-keyshortcuts', apple ? 'Meta+K' : 'Control+K');
    await expect(page.locator('.nova-command small')).toHaveText('Enter to ask NOVA · nothing is sent before you press it.');
  });

  test('ND-6: once the right panel loaded the guide\'s sheet, View controls\' checkboxes still sit beside their names', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await fresh(page, seen({panels: {right: 'open'}}));
    await openNova(page);
    // Session AL (deliberate, sweep 2; LA-024 / N-LS-05): NOVA's side panels are named regions inside <main>, no longer complementary landmarks; same element, same name.
    const right = page.getByRole('region', {name: 'Behind the intelligence'});
    await right.getByText('Technical details: local servers, Hermes Agent, this device').click();
    await expect(right.locator('.nova-guide-card').first()).toBeVisible(); // the Hermes card: setup.css is loaded now
    await page.getByRole('button', {name: /View controls/}).click();
    const checks = await page.locator('.nova-widget-toggles .nova-check').evaluateAll(els => els.map(el => { const s = getComputedStyle(el); return `${s.display} ${s.borderTopWidth}`; }));
    expect(checks.length).toBeGreaterThan(3);
    for (const c of checks) expect(c).toBe('flex 0px');
    // ND-15: each widget's size is an S/M/L segment, in line with the others.
    const segments = await page.locator('.nova-widget-toggles .nova-sizes').evaluateAll(els => new Set(els.map(el => Math.round(el.getBoundingClientRect().right))).size);
    expect(segments).toBe(1);
  });

  test('ND-7: the open conversation is one panel — no widget behind it, one frame around the composer', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await fresh(page, seen());
    await openNova(page);
    await page.getByRole('textbox', {name: 'Message NOVA'}).fill('What is next today?');
    await page.getByRole('textbox', {name: 'Message NOVA'}).press('Enter');
    // Session AM (D7, deliberate): Enter in the dashboard field no longer always opens the conversation (words the stage
    // has a widget for are answered under the star); it is opened as a person would, from the answer's button when it did
    // not open by itself, and is then read exactly as before.
    await openNovaConversation(page);
    const talk = page.getByRole('region', {name: 'Conversation with NOVA'});
    await expect(talk.locator('section.nova-chat')).toBeVisible();
    expect(await page.locator('.nova-widget').evaluateAll(els => els.filter(el => el.checkVisibility({visibilityProperty: true})).length)).toBe(0);
    const framed = await talk.locator('.nova-composer').evaluate(el => [el, ...el.querySelectorAll('*')].filter(n => parseFloat(getComputedStyle(n).borderTopWidth) > 0 && getComputedStyle(n).borderTopStyle !== 'none' && n.getBoundingClientRect().width > 120).length);
    expect(framed).toBe(1);
    const actions = await talk.locator('.nova-composer-actions > button').evaluateAll(els => new Set(els.map(el => Math.round(el.getBoundingClientRect().top))).size);
    expect(actions, 'the microphone and Send in one row').toBe(1);
    await expect(talk.getByRole('button', {name: 'Save as Markdown'})).toBeHidden();
    await talk.getByRole('button', {name: 'More chat actions'}).click();
    await expect(talk.getByRole('button', {name: 'Save as Markdown'})).toBeVisible();
  });

  test('ND-9: Focus shows exactly its three widgets in the window; Minimal shows none', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    for (const [layout, count] of [['focus', 3], ['minimal', 0]] as const) {
      await fresh(page, seen({layout}));
      await openNova(page);
      const inside = await page.locator('.nova-widget').evaluateAll(els => els.filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; }).length);
      expect(inside, layout).toBe(count);
      inWindow(page, await box(page, '.nova-orb-button'), `${layout}: the orb`);
    }
  });

  test('ND-10: under Calm the side panels only fade (opacity), never slide', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page, {...seen({panels: {left: 'open', right: 'open'}}), 'zigoals:motion:v1': 'calm'});
    await page.goto('/app/nova');
    await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'calm');
    await expect(page.locator('aside.nova-left')).toBeVisible();
    const props = await page.evaluate(() => [...document.querySelectorAll('.nova-left, .nova-right')].flatMap(el => el.getAnimations().flatMap(a => (a.effect as KeyframeEffect).getKeyframes().flatMap(k => Object.keys(k).filter(p => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))))));
    for (const p of props) expect(p).toBe('opacity');
  });

  test('ND-12, ND-13: a local brain\'s chip dot is teal; the right panel shows this device\'s tiles and a disclosure that looks like one', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await page.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'deviceMemory', {get: () => undefined, configurable: true}); });
    await fresh(page, {...seen({panels: {right: 'open'}}), ...localBrain()});
    await openNova(page);
    const chip = page.locator('a.nova-chip[data-kind="local"]');
    await expect(chip).toContainText('Brain · Local');
    const [dot, teal] = await chip.evaluate(el => { const probe = document.createElement('span'); probe.style.background = 'var(--accent-teal, #86f0d6)'; el.append(probe); const t = getComputedStyle(probe).backgroundColor; probe.remove(); return [getComputedStyle(el.querySelector('.nova-chip-dot')!).backgroundColor, t]; });
    expect(dot).toBe(teal);
    const right = page.getByRole('region', {name: 'Behind the intelligence'});
    const tiles = right.locator('dl.nova-fact-tiles');
    await expect(tiles.locator('dt')).toHaveText(['Cores', 'Memory', 'Battery', 'Network']);
    await expect(tiles.locator('dt', {hasText: 'Memory'}).locator('xpath=following-sibling::dd')).toHaveText('unknown');
    const chevron = right.locator('.nova-tech > summary .nova-tech-chevron').first();
    await expect(chevron).toBeVisible();
    await expect(right.getByRole('button', {name: 'Talk to NOVA'})).not.toHaveClass(/nova-btn-primary/);
  });

  test('ND-14: the left panel\'s foot always shows at 900 px tall; zero counts are not shown', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await fresh(page, seen());
    await openNova(page);
    await atRest(page, '.nova-left-foot');
    inWindow(page, await box(page, '.nova-left-foot'), 'the left panel\'s foot');
    await expect(page.locator('.nova-left-count').filter({hasText: /^0$/})).toHaveCount(0);
    await expect(page.getByRole('link', {name: 'Goals, 0 active'})).toBeVisible(); // still in the row's name
    const brand = await box(page, '.nova-left-brand small');
    expect(brand.height).toBeLessThanOrEqual(22); // one line
  });

  test('ND-17: a low-end device still gets a sky: one still frame, never a running one', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await page.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {get: () => 4, configurable: true}); });
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page, seen());
    await openNova(page);
    await expect(page.locator('.nova-sky-canvas')).toHaveAttribute('data-sky', 'still');
  });

  test('ND-8, ND-19: a guide planet opens wide and its commands wrap; the guides wear NOVA\'s night band with Back to NOVA first', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    for (const theme of ['nebula', 'light'] as const) {
      await fresh(page, {}, theme);
      await page.goto('/app/nova/hermes');
      await expect(page.getByRole('heading', {name: 'Connect your Hermes Agent', level: 1})).toBeVisible();
      const band = page.getByRole('navigation', {name: 'NOVA'});
      const back = band.getByRole('link', {name: 'Back to NOVA'});
      await expect(back).toHaveAttribute('href', '/app/nova');
      const b = (await back.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
      const ink = await band.evaluate(el => getComputedStyle(el).color.match(/\d+/g)!.slice(0, 3).map(Number).reduce((a, c) => a + c, 0));
      expect(ink, `${theme}: light words on the night band`).toBeGreaterThan(600);
      await page.locator('main').focus().catch(() => undefined);
      const first = await page.evaluate(() => { const main = document.querySelector('main') ?? document.body; return main.querySelector<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')?.textContent?.trim(); });
      expect(first).toBe('Back to NOVA');
    }
    await page.getByRole('button', {name: /^Turn on its API server:/}).first().click();
    const api = page.locator('[data-hermes-panel="api"]');
    await expect(api).toBeVisible();
    expect((await api.boundingBox())!.width).toBeGreaterThan(600);
    const cut = await api.locator('pre').evaluateAll(els => els.filter(el => el.scrollWidth > el.clientWidth + 1).length);
    expect(cut).toBe(0);
    await expect(api.locator('[data-command]', {hasText: 'API_SERVER_ENABLED=true'}).locator('.nova-cmd-shell')).toHaveText('.env');
  });
});

/** The layout audit: every visible control of NOVA's first screen is inside the window and nothing sits on top of it. */
test.describe('NOVA layout audit by bounding box', () => {
  test.skip(({isMobile}) => isMobile, 'computer layouts');
  for (const theme of ['nebula', 'light', 'dark'] as const) for (const width of [1024, 1440, 1920]) {
    test(`${theme} at ${width} px`, async ({page}) => {
      await page.setViewportSize({width, height: width === 1920 ? 1080 : 900});
      await fresh(page, seen(), theme);
      await openNova(page);
      const problems = await page.evaluate(() => {
        const out: string[] = [];
        const controls = [...document.querySelectorAll<HTMLElement>('.nova-top :is(a, button), .nova-chips a, .nova-setup-banner :is(a, button), .nova-orb-button, .nova-foot :is(a, button, input), .nova-orbit-main .nova-widget-open')];
        for (const el of controls) {
          const r = el.getBoundingClientRect(), s = getComputedStyle(el);
          if (!r.width || !r.height || s.visibility === 'hidden') continue;
          const name = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40);
          if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) out.push(`outside the window: ${name}`);
          if (r.width < 44 - 0.5 || r.height < 44 - 0.5) out.push(`smaller than 44 px: ${name} ${Math.round(r.width)}×${Math.round(r.height)}`);
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!hit || !(el === hit || el.contains(hit))) out.push(`covered: ${name} by ${hit ? `${hit.tagName}.${String((hit as HTMLElement).className).split(' ')[0]}` : 'nothing'}`);
        }
        if (document.documentElement.scrollWidth > innerWidth) out.push('horizontal scroll');
        return out;
      });
      expect(problems).toEqual([]);
      // Theme parity: NOVA stays a night island (light words on the night) in every theme.
      const ink = await page.locator('.nova-greeting').evaluate(el => getComputedStyle(el.closest('.nova-root')!).color.match(/\d+/g)!.slice(0, 3).map(Number).reduce((a, c) => a + c, 0));
      expect(ink).toBeGreaterThan(600);
    });
  }
});
