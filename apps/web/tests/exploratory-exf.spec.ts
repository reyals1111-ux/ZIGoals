import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';

/**
 * Session AK lane EXF: the exploratory bugs of docs/review/session-ak/EXPLORATORY_BUGS.md (EX-2 … EX-19; EX-1 is in
 * tests/nova-dashboard.spec.ts, EX-9 in tests/g1b-amount-calculator.spec.ts, EX-11 and EX-13 in tests/nova-setup.spec.ts),
 * each checked the way the tester found it. A fresh device, every `/api/**` answered 503, fictional words only.
 */
const NOVA_KEY = 'zigoals:nova:v1';
async function fresh(page: Page, extra: Record<string, string> = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/manifest.webmanifest');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), ...extra});
}
const seen = (more: Record<string, unknown> = {}) => ({[NOVA_KEY]: JSON.stringify({version: 1, openingSeen: true, ...more})});
const frame = (page: Page) => page.locator('.nova-frame');
const composer = (page: Page) => page.locator('section.nova-chat').getByRole('textbox', {name: 'Message NOVA'});
async function openNova(page: Page) {
  await page.goto('/app/nova');
  await expect(page.getByRole('button', {name: /^Exit NOVA/})).toBeVisible();
}

test.describe('NOVA on a computer', () => {
  test.skip(({isMobile}) => isMobile, 'computer layout');
  test.use({viewport: {width: 1440, height: 900}});

  test('EX-2: after the first message the composer has the focus; letters are words there, never shortcuts', async ({page}) => {
    await fresh(page, seen());
    await openNova(page);
    const field = page.locator('.nova-command').getByRole('textbox', {name: 'Message NOVA'});
    await field.fill('hello');
    await field.press('Enter');
    await expect(composer(page)).toBeFocused();
    // "t" is Tasks' single-key shortcut: typed now it is a word in the composer, and NOVA stays.
    await page.keyboard.type('tasks');
    await expect(composer(page)).toHaveValue('tasks');
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/app\/nova$/);
    // With the conversation open, a letter that reaches the page is not a shortcut either.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('c');
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/app\/nova$/);
    // Esc closes the chat and the command field takes the focus back; then the shortcuts are back too.
    await page.keyboard.press('Escape');
    await expect(page.locator('section.nova-chat')).toHaveCount(0);
    await expect(field).toBeFocused();
  });

  test('EX-3: arriving through ⌘/Ctrl + J, Esc closes the chat, then leaves NOVA', async ({page}) => {
    await fresh(page, seen());
    await page.goto('/app/goals');
    await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+j' : 'Control+j');
    const bar = page.locator('dialog.nova-bar[open]');
    await expect(bar).toBeVisible();
    await bar.getByRole('textbox').fill('How many habits do I have?');
    await bar.getByRole('textbox').press('Enter');
    await expect(page).toHaveURL(/\/app\/nova(\?|$)/);
    await expect(page.locator('section.nova-chat')).toBeVisible();
    await expect(composer(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('section.nova-chat')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/app\/goals$/);
  });

  test('EX-6: a letter pressed the moment the opening starts only skips it', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    // The key arrives as `data-opening="play"` lands, before any later effect could listen: the tester's 2-in-3 race,
    // made certain. "t" is Tasks' single-key shortcut.
    await page.addInitScript(() => {
      const watch = new MutationObserver(() => {
        if (document.querySelector('.nova-frame[data-opening="play"]')) { watch.disconnect(); document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 't', code: 'KeyT', bubbles: true, cancelable: true})); }
      });
      document.addEventListener('DOMContentLoaded', () => watch.observe(document.body, {subtree: true, attributes: true, childList: true, attributeFilter: ['data-opening']}));
    });
    await fresh(page);
    await page.goto('/app/nova');
    await expect(frame(page)).toHaveAttribute('data-opening', 'done');
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/\/app\/nova$/);
  });

  test('EX-4: the right panel asks about on-device speech recognition only when the person asks', async ({page}) => {
    await page.addInitScript(() => {
      class FakeRecognition { static available() { (window as unknown as {__asked: number}).__asked = ((window as unknown as {__asked?: number}).__asked ?? 0) + 1; return Promise.resolve('available'); } }
      Object.defineProperty(window, 'SpeechRecognition', {value: FakeRecognition, configurable: true, writable: true});
    });
    await fresh(page, seen({panels: {right: 'open'}}));
    await openNova(page);
    const right = page.getByRole('complementary', {name: 'Behind the intelligence'});
    await expect(right.getByRole('button', {name: 'Talk to NOVA'})).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => (window as unknown as {__asked?: number}).__asked ?? 0)).toBe(0);
    await right.getByRole('button', {name: 'Check “Hey NOVA” on this device'}).click();
    await expect(right.getByRole('switch', {name: 'Listen for “Hey NOVA”'})).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as {__asked?: number}).__asked ?? 0)).toBe(1);
  });

  test('EX-10: each quick-access toggle names its entry', async ({page}) => {
    await fresh(page, seen());
    await openNova(page);
    await page.getByRole('button', {name: 'Customize the view'}).click();
    const sheet = page.getByRole('dialog', {name: 'Make NOVA yours'});
    await expect(sheet.getByRole('button', {name: 'Shown in quick access: Checklist'})).toHaveAttribute('aria-pressed', 'true');
    await expect(sheet.getByRole('button', {name: 'Shown', exact: true})).toHaveCount(0);
  });

  test('EX-14: on a fresh start no widget offers the same link twice', async ({page}) => {
    await fresh(page, seen());
    await openNova(page);
    await expect(page.getByRole('article', {name: 'Today’s orbit'})).toContainText('Open the Checklist');
    const repeats = await page.locator('article.nova-widget').evaluateAll(cards => cards.flatMap(card => {
      const names = [...card.querySelectorAll('a, button')].map(el => `${el.getAttribute('href') ?? ''} ${(el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/→/g, '').trim()}`);
      return names.filter((n, i) => names.indexOf(n) !== i).map(n => `${card.getAttribute('data-widget')}: ${n}`);
    }));
    expect(repeats).toEqual([]);
  });

  test('EX-18: after a reload the empty chat offers the last conversation', async ({page}) => {
    await fresh(page, seen());
    await openNova(page);
    const field = page.locator('.nova-command').getByRole('textbox', {name: 'Message NOVA'});
    await field.fill('How many habits do I have?');
    await field.press('Enter');
    await expect(page.locator('section.nova-chat .nova-turn-assistant').first()).toBeVisible({timeout: 20_000});
    await page.reload();
    await page.getByRole('button', {name: 'Open the conversation with NOVA'}).click();
    const chat = page.locator('section.nova-chat');
    await expect(chat.locator('.nova-turn-user')).toHaveCount(0);
    await chat.getByRole('button', {name: 'Continue your last conversation'}).click();
    await expect(chat.locator('.nova-turn-user')).toContainText('How many habits do I have?');
  });
});

test.describe('NOVA on a phone', () => {
  test.skip(({isMobile}) => isMobile, 'a set phone width in the desktop project');
  test.use({viewport: {width: 390, height: 844}});

  test('EX-5: the logo intro never sits on top of Exit NOVA', async ({page}) => {
    await fresh(page, seen());
    await openNova(page);
    // The protected intro's own clip, as it is placed over the top bar's Z (components/logo-intro.tsx). Local Chromium
    // cannot play the real clip, so its element stands in: NOVA keeps it out of sight while it has the window.
    await page.evaluate(() => {
      const video = document.createElement('video');
      video.className = 'logo-intro logo-intro-phone'; video.dataset.state = 'playing';
      Object.assign(video.style, {left: '4px', top: '7px', width: '53px', height: '53px'});
      document.body.append(video);
    });
    // Every clip, the stand-in and the real one if it started (it did on the tester's build, and on this suite's server).
    await expect(page.locator('video.logo-intro-phone')).not.toHaveCount(0);
    await expect.poll(() => page.locator(':is(.logo-intro, .logo-intro-frame):visible').count()).toBe(0);
    await expect(page.getByRole('button', {name: /^Exit NOVA/})).toBeVisible();
  });

  test('EX-2 and EX-19: the phone chat takes the focus, and its buttons and chips are 44 px', async ({page}) => {
    await fresh(page, seen());
    await openNova(page);
    const chat = page.locator('section.nova-chat');
    const small = () => chat.locator(':is(.ai-reply-icon, .ai-chip):visible').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return {name: el.getAttribute('aria-label') ?? el.textContent ?? '', w: Math.round(r.width), h: Math.round(r.height)}; }).filter(b => b.w < 44 || b.h < 44));
    // The empty chat: the composer, not the sheet's Close, has the focus; the questions to start with are 44 px.
    await page.getByRole('button', {name: 'Open the conversation with NOVA'}).click();
    await expect(composer(page)).toBeFocused();
    expect(await small()).toEqual([]);
    await page.keyboard.type('How many habits do I have?');
    await page.keyboard.press('Enter');
    await expect(chat.locator('.nova-turn-assistant').first()).toBeVisible({timeout: 20_000});
    await expect(chat.locator('.ai-reply-icon').first()).toBeVisible();
    expect(await small()).toEqual([]);
  });
});

test.describe('Tasks, Notes and Health', () => {
  test.skip(({isMobile}) => isMobile, 'set widths in the desktop project');

  for (const [width, title] of [[390, 'https://docs.example.org/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdefghij/edit'], [320, 'Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz']] as const) test(`EX-7 and EX-8 at ${width} px: a long word wraps, and the title field keeps the focus after Add task`, async ({page}) => {
    await page.setViewportSize({width, height: 800});
    await fresh(page);
    await page.goto('/app/tasks');
    const titleField = page.getByRole('textbox', {name: 'New task'});
    await titleField.fill(title);
    await page.getByRole('button', {name: 'Add task'}).click();
    await expect(page.getByRole('status').filter({hasText: 'Added'})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await expect(titleField).toBeFocused();
    // By keyboard too: Tab to Add task, Enter.
    await titleField.fill('Water the plants');
    await titleField.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({hasText: 'Water the plants'})).toBeVisible();
    await expect(titleField).toBeFocused();
  });

  test('EX-15: the hidden [[ list draws nothing, and a [[ that finds nothing says so', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await fresh(page);
    await page.goto('/app/notes?view=notes');
    await page.getByLabel('New note').fill('Calm mornings');
    await page.getByRole('button', {name: 'Make note'}).click();
    const body = page.getByLabel('Note', {exact: true});
    await expect(body).toBeVisible();
    const drawn = () => page.locator('ul.note-suggest:visible').count();
    expect(await drawn()).toBe(0);
    await body.click();
    await body.pressSequentially('See [[Zebra');
    await expect(page.locator('.note-suggest-none')).toHaveText('Nothing to link matches “Zebra”.');
    expect(await drawn()).toBe(0);
  });

  test('EX-12: the backup link in Health\'s note is underlined', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await fresh(page);
    await page.goto('/app/health');
    const link = page.locator('.health-private-note').getByRole('link', {name: 'Settings → Backup & restore'});
    await expect(link).toBeVisible();
    expect(await link.evaluate(el => getComputedStyle(el).textDecorationLine)).toContain('underline');
  });
});
