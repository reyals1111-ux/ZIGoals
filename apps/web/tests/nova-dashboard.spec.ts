import {expect, test, type Page} from '@playwright/test';
import {openNovaConversation, withEarlierWidgets} from './nova-am';
import {readFile} from 'node:fs/promises';
import {audit} from './a11y-audit';
import {defaultAiSettings} from '../lib/ai/settings';

/**
 * Session AK (owner follow-up 2 N2, follow-up 3 N12; lane NA): NOVA's page. The one-time opening and its skip, reduced
 * motion and Motion Off, the full-window takeover and the app's chrome coming back, Fullscreen and the Esc order, the
 * side panels (hide, fold, show, remembered), the phone's minimal view, the layouts at 390, 768, 1024, 1440 and 1920 px
 * with no horizontal scroll, widgets added, moved, resized and removed with the keyboard (and Undo), the quick-access
 * shortcuts (and turning them off), "Share my NOVA setup" (no personal data) and "Import a setup" (preview, Undo), and the
 * right panel's honest values against a mocked local Ollama (online, offline, unknown). Fictional data only.
 */
const NOVA_KEY = 'zigoals:nova:v1';
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), NOVA_KEY);
async function fresh(page: Page, extra: Record<string, string> = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), ...extra});
}
// Session AM (D2, deliberate): a record without a widget list used to read as AK's eight "Everyday" widgets; the stage now
// starts empty, so the record these tests start from arranges that same list first (tests/nova-am.ts), and each assertion stays.
const seen = (more: Record<string, unknown> = {}) => ({[NOVA_KEY]: JSON.stringify(withEarlierWidgets({version: 1, openingSeen: true, ...more}))});
const frame = (page: Page) => page.locator('.nova-frame');
async function noSideScroll(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0); }

test.describe('NOVA on a computer', () => {
  test.skip(({isMobile}) => isMobile, 'computer layouts');
  test.use({viewport: {width: 1440, height: 900}});

  test('the opening plays once, any key skips it, and it never plays again', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page);
    await page.goto('/app/nova');
    await expect(frame(page)).toHaveAttribute('data-opening', 'play');
    await page.keyboard.press('Shift');
    await expect(frame(page)).toHaveAttribute('data-opening', 'done');
    expect((await stored(page)).openingSeen).toBe(true);
    await page.reload();
    await expect(frame(page)).toHaveAttribute('data-opening', 'done');
    await expect(page.getByText(/NOVA is here for simple questions\./).first()).toBeAttached(); // no brain yet: never "online" (Session AK P4, FR-12)
  });

  test('reduced motion and Motion Off show the finished dashboard at once', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    // Session AM (D2, deliberate): a brand-new NOVA was given the Command arrangement once its opening was seen; the stage
    // now starts empty, so the finished dashboard this test reads is arranged first (the Command list, from the app's own
    // code: tests/nova-am.ts). The opening is still unseen, so reduced motion and Motion Off are what finish it.
    const arranged = {[NOVA_KEY]: JSON.stringify(withEarlierWidgets({version: 1}))};
    await fresh(page, arranged);
    await page.goto('/app/nova');
    await expect(frame(page)).toHaveAttribute('data-opening', 'done');
    await expect(page.locator('.nova-widget').first()).toBeVisible();
    await expect(page.locator('.nova-sky-canvas')).not.toHaveAttribute('data-sky', 'running');
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page, {'zigoals:motion:v1': 'off', ...arranged});
    await page.goto('/app/nova');
    await expect(frame(page)).toHaveAttribute('data-opening', 'done');
  });

  test('NOVA takes the whole window; Exit NOVA and Esc bring the app back', async ({page}) => {
    await fresh(page, seen());
    await page.goto('/app/nova');
    await expect(page).toHaveTitle(/^NOVA/);
    await expect(page.locator('html')).toHaveAttribute('data-nova-view', 'on');
    await expect(page.locator('.app-sidebar')).toBeHidden();
    await expect(page.locator('.site-footer')).toBeHidden();
    await page.getByRole('button', {name: /^Exit NOVA/}).click();
    await expect(page).toHaveURL(/\/app\/today$/);
    await expect(page.locator('html')).not.toHaveAttribute('data-nova-view', 'on');
    await expect(page.locator('.app-sidebar')).toBeVisible();
    await page.goto('/app/nova');
    await expect(frame(page)).toBeVisible();
    // The dashboard itself, not only a frame: "NOVA is starting…" wears .nova-frame too, before Esc is listened for (lane NV).
    await expect(page.getByRole('button', {name: /^Exit NOVA/})).toBeVisible();
    await page.locator('body').press('Escape');
    await expect(page).toHaveURL(/\/app\/today$/);
  });

  test('Fullscreen first, then NOVA: Esc leaves fullscreen before it leaves NOVA', async ({page}) => {
    await fresh(page, seen());
    await page.goto('/app/nova');
    const button = page.getByRole('button', {name: 'Fullscreen'});
    await button.click();
    const entered = await page.waitForFunction(() => !!document.fullscreenElement, null, {timeout: 3000}).then(() => true, () => false);
    test.skip(!entered, 'this browser run does not grant fullscreen');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
    await expect(page).toHaveURL(/\/app\/nova/);
    await page.waitForTimeout(700);
    await page.locator('body').press('Escape');
    await expect(page).toHaveURL(/\/app\/today$/);
  });

  test('the side panels hide, fold and come back, and stay as chosen on this device', async ({page}) => {
    await fresh(page, seen());
    await page.goto('/app/nova');
    // Session AL (deliberate, sweep 2; LA-024 / N-LS-05): NOVA's side panels are named regions inside <main>, no longer complementary landmarks; same element, same name.
    const left = page.locator('aside.nova-left'), right = page.getByRole('region', {name: 'Behind the intelligence'});
    await expect(left).toHaveAttribute('data-state', 'open');
    // Release review 2 (R2-3), a deliberate change: "Behind the intelligence" starts hidden until the person opens it;
    // from then on it hides, folds and is remembered exactly as before.
    await expect(right).toHaveCount(0);
    await page.getByRole('button', {name: 'Show Behind the intelligence'}).click();
    await expect(right).toBeVisible();
    await right.getByRole('button', {name: 'Hide the right panel'}).click();
    await expect(right).toHaveCount(0);
    await left.getByRole('button', {name: 'Fold the left panel to icons'}).click();
    await expect(left).toHaveAttribute('data-state', 'rail');
    await page.reload();
    await expect(page.locator('aside.nova-left')).toHaveAttribute('data-state', 'rail');
    await expect(page.getByRole('region', {name: 'Behind the intelligence'})).toHaveCount(0);
    expect((await stored(page)).panels).toMatchObject({left: 'rail', right: 'hidden'});
    await page.locator('aside.nova-left').getByRole('button', {name: 'Hide the left panel'}).click();
    await expect(page.locator('aside.nova-left')).toHaveCount(0);
    await page.getByRole('button', {name: 'Show the left panel'}).click();
    await expect(page.locator('aside.nova-left')).toHaveAttribute('data-state', 'open');
    await page.locator('body').press(']');
    await expect(page.getByRole('region', {name: 'Behind the intelligence'})).toBeVisible();
    // Each numbered section folds on its own, by keyboard too.
    const voice = page.getByRole('region', {name: 'Behind the intelligence'}).getByRole('button', {name: 'Voice', exact: true});
    await voice.focus(); await page.keyboard.press('Enter');
    await expect(voice).toHaveAttribute('aria-expanded', 'false');
  });

  test('widgets: add, move, resize and remove with the keyboard; Undo puts one back', async ({page}) => {
    await fresh(page, seen());
    await page.goto('/app/nova');
    await page.getByRole('button', {name: /View controls/}).click();
    await page.getByRole('checkbox', {name: 'Focus'}).check();
    await expect(page.getByRole('article', {name: 'Focus'})).toBeVisible();
    await page.getByRole('button', {name: 'Arrange on the orbits'}).click();
    const order = async () => ((await stored(page)).widgets as {id: string}[]).map(w => w.id);
    const before = await order();
    await page.getByRole('button', {name: /^Move Water: drag/}).focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(order).not.toEqual(before);
    expect((await order()).indexOf('water')).toBe(before.indexOf('water') + 1);
    const water = page.getByRole('article', {name: 'Water'});
    await water.getByRole('group', {name: 'Size of Water'}).getByRole('button', {name: 'Large'}).click();
    await expect(water).toHaveAttribute('data-size', 'L');
    await water.getByRole('button', {name: 'Remove Water from NOVA'}).click();
    await expect(page.getByRole('article', {name: 'Water'})).toHaveCount(0);
    await page.getByRole('button', {name: 'Undo'}).click();
    await expect(page.getByRole('article', {name: 'Water'})).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(frame(page)).not.toHaveAttribute('data-editing', '');
    await expect(page).toHaveURL(/\/app\/nova/);
  });

  test('quick access: a letter opens its entry; single-key shortcuts can be turned off', async ({page}) => {
    await fresh(page, seen());
    await page.goto('/app/nova');
    const quick = page.getByRole('navigation', {name: 'Quick access'});
    await expect(quick.getByRole('link', {name: /^Agenda/})).toHaveAttribute('href', '/app/agenda');
    await expect(quick.getByRole('link', {name: /^Checklist, key C/})).toBeVisible();
    await page.locator('body').press('c');
    await expect(page).toHaveURL(/\/app\/checklist/);
    await page.goto('/app/nova');
    await page.getByRole('button', {name: 'Customize the view'}).click();
    await page.getByRole('switch', {name: 'Single-key shortcuts'}).click();
    await page.getByRole('button', {name: 'Close Make NOVA yours'}).click();
    await page.locator('body').press('c');
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/app\/nova/);
  });

  test('Share my NOVA setup carries no personal data; Import a setup previews, applies and undoes', async ({page}) => {
    await fresh(page, seen({customInstructions: 'Fictional Rey lives at 12 Example Street.', yourName: 'Fictional Rey', persona: {name: 'Vega'}}));
    await page.goto('/app/nova');
    await page.getByRole('button', {name: 'Customize the view'}).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', {name: 'Save the setup file'}).click();
    const text = await readFile(await (await download).path(), 'utf8');
    const json = JSON.parse(text);
    expect(json.kind).toBe('zigoals-nova-setup');
    expect(json.persona.name).toBe('Vega');
    for (const leak of ['Rey', 'Example Street', 'customInstructions', 'yourName', 'openingSeen']) expect(text).not.toContain(leak);
    const imported = JSON.stringify({...json, layout: 'focus', persona: {name: 'Atlas', avatar: 'orb'}});
    await page.getByLabel(/A NOVA setup file/).setInputFiles({name: 'setup.json', mimeType: 'application/json', buffer: Buffer.from(imported)});
    await expect(page.getByRole('region', {name: 'Setup preview'})).toContainText('Atlas · Focus layout');
    await page.getByRole('button', {name: 'Apply this setup'}).click();
    await expect(frame(page)).toHaveAttribute('data-layout', 'focus');
    expect((await stored(page)).customInstructions).toBe('Fictional Rey lives at 12 Example Street.');
    await page.getByRole('button', {name: 'Undo'}).click();
    await expect(frame(page)).toHaveAttribute('data-layout', 'orbit');
  });

  test('Behind the intelligence: a mocked local Ollama online, then offline; unknown device facts say unknown', async ({page}) => {
    await page.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'deviceMemory', {get: () => undefined, configurable: true}); });
    const settings = {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'llama3.2:3b', localServer: 'ollama', baseUrl: 'http://127.0.0.1:11434'};
    await fresh(page, {...seen({panels: {right: 'open'}}), 'zigoals:ai:v1': JSON.stringify(settings)});
    let up = true;
    await page.route('http://127.0.0.1:11434/**', route => {
      if (!up) return route.abort('connectionrefused');
      const url = route.request().url();
      if (url.endsWith('/api/ps')) return route.fulfill({json: {models: [{name: 'llama3.2:3b', size: 3_400_000_000, size_vram: 3_400_000_000}]}, headers: {'access-control-allow-origin': '*'}});
      return route.fulfill({json: {models: [{name: 'llama3.2:3b', model: 'llama3.2:3b', details: {family: 'llama'}}]}, headers: {'access-control-allow-origin': '*'}});
    });
    await page.goto('/app/nova');
    const right = page.getByRole('region', {name: 'Behind the intelligence'});
    await expect(right.getByText('Online').first()).toBeVisible();
    await expect(right).toContainText('llama3.2:3b: 3.4 GB in memory, 100 % on the GPU');
    await expect(right).toContainText('Memory');
    // Release review 2 (R2-3), a deliberate change: the device facts wait behind the Brains section's technical disclosure.
    await expect(right.getByText('Unknown in this browser').first()).toBeHidden();
    await right.getByText('Technical details: local servers, Hermes Agent, this device').click();
    await expect(right.getByText('Unknown in this browser').first()).toBeVisible();
    up = false;
    await right.getByRole('button', {name: 'Refresh'}).click();
    await expect(right.getByText('Offline').first()).toBeVisible();
    await expect(right).not.toContainText('0 models');
  });

  test('every control is named and reachable; theme parity keeps NOVA a night sky', async ({page}) => {
    await fresh(page, seen());
    await page.goto('/app/nova');
    await expect(page.locator('.nova-widget').first()).toBeVisible();
    expect(await audit(page.locator('.nova-root'))).toEqual([]);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: t})), theme);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const ink = await page.locator('.nova-command input').evaluate(el => getComputedStyle(el).color);
      const [r, g, b] = ink.match(/\d+/g)!.map(Number);
      expect(r! + g! + b!).toBeGreaterThan(600); // light text on the night sky
    }
  });

  for (const width of [1024, 1440, 1920]) test(`the dashboard fits ${width} px without horizontal scroll`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    await fresh(page, seen());
    await page.goto('/app/nova');
    await expect(page.locator('.nova-orb-button')).toBeVisible();
    await expect(page.getByRole('textbox', {name: 'Message NOVA'})).toBeVisible();
    await noSideScroll(page);
    // Session AK CI fix (run 41336014813, 1920 px): the 44 px targets are measured once the dashboard has arrived, its
    // finite entrances (the cards' arrival, the panels' slide) finished; endless ambient motion (the orb) is not waited for.
    await page.locator('.nova-frame[data-opening]').evaluate(el => Promise.all(el.getAnimations({subtree: true}).filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))));
    const tiles = await page.locator('.nova-frame :is(button, a):visible').evaluateAll(els => els.filter(el => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(el => el.outerHTML.slice(0, 120)));
    expect(tiles).toEqual([]);
    // Release review 2 (R2-3): the first screen leads with the person's day, above the fold; the console waits.
    await expect(page.getByRole('button', {name: 'Your day'})).toBeVisible();
    for (const name of ['Today’s orbit', 'Next three']) {
      const box = await page.getByRole('article', {name}).boundingBox();
      expect(box, name).not.toBeNull(); expect(box!.y, name).toBeLessThan(900 - 80);
    }
    await expect(page.getByRole('region', {name: 'Behind the intelligence'})).toHaveCount(0);
    for (const word of ['Look for local servers', 'Processor', 'localhost', 'Cost meter', 'Automatic · best fit', 'Test my setup']) await expect(page.getByText(word).first(), word).toBeHidden();
    // Every icon-only control has a name, and a tooltip on hover (and on keyboard focus, the same rule).
    const unnamed = await page.locator('.nova-frame :is(button.nova-icon-btn, button.nova-tile, a.nova-tile):visible').evaluateAll(els => els.filter(el => !(el.getAttribute('aria-label') || el.textContent?.trim()) ).length);
    expect(unnamed).toBe(0);
    const search = page.getByRole('button', {name: 'Search ZIGoals'});
    await search.hover();
    if (width < 1800) expect(await search.evaluate(el => getComputedStyle(el, '::after').content)).toBe('"Search"');
    else await expect(search).toContainText('Search');
  });
});

test.describe('Release review 2 on NOVA (R2-4, R2-5, R2-22)', () => {
  test.skip(({isMobile}) => isMobile, 'computer layout first');
  test('the greeting is in the page once; the first-run card says what NOVA and ZIGi are in one line', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await fresh(page, seen());
    await page.goto('/app/nova');
    const greeting = page.locator('.nova-greeting');
    // Session AK P4 (FR-12): no brain is connected here, so the greeting says what NOVA does now, never "online".
    await expect(greeting).toContainText('NOVA is here for simple questions.');
    expect(((await greeting.textContent()) ?? '').match(/NOVA is here for simple questions\./g)).toHaveLength(1);
    expect(await page.locator('.nova-stage').evaluate(el => (el.textContent ?? '').split('NOVA is here for simple questions.').length - 1)).toBe(1);
    await expect(page.locator('.nova-stage')).not.toContainText('is online.');
    // Session AK P3 (NOVA_DESIGN_REVIEW.md ND-23), a deliberate move: the stage's card became a one-line banner, and the line
    // that tells NOVA and ZIGi apart is said on the guide's first planet, "Meet NOVA" (tests/p3-nova-polish.spec.ts checks it
    // there), and in the conversation's welcome.
    await expect(page.getByRole('region', {name: 'Give NOVA a brain of its own'})).toContainText('It already answers simple questions on this device.');
  });
  test('in Light, the phone\'s bottom bar wears NOVA\'s night while NOVA is open, and turns light again after', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await fresh(page, {...seen(), 'zigoals:ui-prefs:v1': JSON.stringify({version: 1, theme: 'light'})});
    await page.goto('/app/nova');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const bar = page.locator('.phone-tabbar');
    const shade = () => bar.evaluate(el => getComputedStyle(el).backgroundImage);
    await expect.poll(shade).toContain('rgba(1, 3, 15');
    await page.getByRole('button', {name: /^Exit NOVA/}).click();
    await expect(page).toHaveURL(/\/app\/today$/);
    await expect.poll(shade).not.toContain('rgba(1, 3, 15');
  });
});

test.describe('NOVA on a phone and a tablet', () => {
  test('the phone gets the minimal NOVA: the orb, the command field and the chat; quick access in a sheet', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await fresh(page, seen());
    await page.goto('/app/nova');
    await expect(page.locator('aside.nova-left')).toHaveCount(0);
    await expect(page.getByRole('region', {name: 'Behind the intelligence'})).toHaveCount(0);
    await expect(page.locator('.nova-orb-button')).toBeVisible();
    await noSideScroll(page);
    await page.getByRole('button', {name: 'Quick access'}).click();
    const sheet = page.getByRole('dialog', {name: 'Quick access'});
    await expect(sheet.getByRole('link', {name: 'Checklist'})).toBeVisible();
    await sheet.getByRole('button', {name: 'Close Quick access'}).click();
    await page.getByRole('textbox', {name: 'Message NOVA'}).fill('What is next today?');
    await page.getByRole('button', {name: 'Send to NOVA'}).click();
    await expect(page.getByRole('dialog', {name: 'NOVA'})).toBeVisible();
    await page.setViewportSize({width: 320, height: 640});
    await noSideScroll(page);
  });
  test('a tablet gets the desktop layout with the panels hidden', async ({page}) => {
    await page.setViewportSize({width: 768, height: 1024});
    await fresh(page, seen());
    await page.goto('/app/nova');
    await expect(page.locator('aside.nova-left')).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Show the left panel'})).toBeVisible();
    await expect(page.getByRole('button', {name: /View controls/})).toBeVisible();
    await noSideScroll(page);
  });
});

/**
 * Session AK lane EXF (docs/review/session-ak/EXPLORATORY_BUGS.md EX-1, Blocker): on computers and tablets the command field
 * and the open conversation sat below the window (`.nova-frame` clips, the page does not scroll), and `toBeVisible()` still
 * passed. The boxes are measured against the window instead, fresh (no chips beyond two) and with the right panel open.
 */
test.describe('EX-1: the command field and the open chat are inside the window', () => {
  test.skip(({isMobile}) => isMobile, 'computer and tablet sizes');
  const inside = async (page: Page, what: string, box: {y: number; height: number} | null) => {
    const height = page.viewportSize()!.height;
    expect(box, what).not.toBeNull();
    expect(box!.y, what).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height, what).toBeLessThanOrEqual(height);
  };
  for (const [width, height] of [[768, 1024], [1024, 768], [1440, 900], [1920, 1080]] as const) test(`${width} × ${height}`, async ({page}) => {
    await page.setViewportSize({width, height});
    await fresh(page, seen());
    await page.goto('/app/nova');
    const field = page.locator('.nova-command');
    await expect(field).toBeVisible();
    await inside(page, 'the command field', await field.boundingBox());
    await field.getByRole('textbox', {name: 'Message NOVA'}).fill('What is next today?');
    await field.getByRole('textbox', {name: 'Message NOVA'}).press('Enter');
    // Session AM (D7, deliberate): Enter in the dashboard field no longer always opens the conversation (words the stage
    // has a widget for are answered under the star); it is opened as a person would, from the answer's button when it did
    // not open by itself, and is then read exactly as before.
    await openNovaConversation(page);
    const talk = page.getByRole('region', {name: 'Conversation with NOVA'});
    await expect(talk.locator('section.nova-chat')).toBeVisible();
    await inside(page, 'the conversation panel', await talk.boundingBox());
    await inside(page, 'the composer', await talk.getByRole('textbox', {name: 'Message NOVA'}).boundingBox());
    await inside(page, 'the close button', await talk.getByRole('button', {name: 'Close NOVA’s chat'}).boundingBox());
  });
});
