import {expect, test, type Locator, type Page} from '@playwright/test';
import {applyTheme, fence, loadShowcase, mockModel, note, offline, seedDevice, settle, THEMES, type Findings} from './p6-helpers';
import {afterGoto} from './settings-open';
// CI runs this sweep as its own suite of shards (ADR-036 C3); each test stands alone, so they may split across shards.
test.describe.configure({mode: 'parallel'});

/**
 * Session AK, owner follow-up 4 (P6): keyboard only, in Nebula, Light and Dark, desktop at 1440 px and phone at 390 px, in
 * the Showcase.
 * - Every route: the first Tab reaches "Skip to content" and Enter on it puts the next Tab inside the content (2.4.1);
 *   then Tab walks the page: each stop is on screen, shows a focus indicator (2.4.7), is not hidden behind the bars
 *   (2.4.11) and Tab moves on (2.1.2); Shift+Tab walks back over the same stops in reverse (2.4.3).
 * - Dialogs and sheets (Quick add, ZIGi, the Showcase chip, the phone's More, NOVA's command bar, Add asset, NOVA's Make it
 *   yours, panels and Quick access): opened from the keyboard, focus moves inside; Tab stays inside a modal one; Esc closes
 *   it and focus returns to what opened it (2.4.3).
 * - Tabs: the arrow keys move between the tabs of every tab list (the ARIA tabs pattern).
 * - Primary actions by keyboard alone: a task, a captured note, a guide's planet (Enter and Space), a body of the Notes
 *   graph, and a confirm card's Add and its Undo with focus kept in the cards.
 * The judgement calls follow tests/a11y-wcag-x.spec.ts: a date or time field takes one Tab per segment, and ZIGi's own
 * launcher is a stop like any other. A focus indicator may be the control's own, drawn on its ::before or ::after, or its
 * field's frame lighting up while focus is within.
 */
const ROUTES = [
  '/app', '/app/goals', '/app/goals/new', '/app/goals/templates', '/app/goals/average/new', '/app/habits', '/app/health', '/app/journal',
  '/app/journey', '/app/wealth', '/app/wealth/calculator', '/app/wealth/add-money', '/app/portfolio', '/app/markets', '/app/staking',
  '/app/earn', '/app/governance', '/app/ecosystem', '/app/activity', '/app/agenda', '/app/checklist', '/app/chess', '/app/guided',
  '/app/stories', '/app/timeline', '/app/review', '/app/notes', '/app/tasks', '/app/music', '/app/nova', '/app/nova/setup', '/app/nova/hermes',
  '/app/zigi', '/app/zigi/memory', '/app/settings', '/app/settings/data', '/app/settings/reminders', '/app/help',
];
const STOPS = 25;
/**
 * Session AL (BUG-049, deliberate): the goal creator opens with the focus already in Goal name, inside the content (a
 * keyboard user there no longer starts on the page body, 46 Tabs away). The page itself has bypassed the repeated blocks,
 * so its first Tab goes on in the form. The skip link is still checked as strictly as anywhere else: the page must have
 * put the focus in that field inside #main, Shift+Tab from it must come back to "Skip to content" (shown, with a focus
 * indicator) without leaving the page, and Enter on it must put the next Tab in the content. Every other route keeps the
 * first-Tab check.
 */
const FOCUS_ON_ARRIVAL: Readonly<Record<string, string>> = {'/app/goals/new': 'Goal name'};
/** Shift+Tab back from the arrival field to the skip link; the shell holds well under 80 stops before the content. */
const BACK_TO_SKIP = 80;
type Stop = {key: string; where: string; visible: boolean; ring: boolean; covered: boolean; segmented: boolean; start: boolean};
/** What has focus now, and how it shows. `key` identifies the element across steps (a mark on it, set once). */
const stop = (page: Page) => page.evaluate((): Stop | null => {
  const el = document.activeElement as HTMLElement | null;
  // Past the page's last control focus goes to the browser itself: the page no longer has focus, whatever activeElement says.
  // Session AK CI-4: headless Chrome hands it straight back to the page's first control (window blur, then focus about 5 ms
  // later, no script involved); on a slow runner this read came after that, and on NOVA, whose first control is not the
  // hidden skip link, it read as a cycle. The window's own blur (marked by `watchExit` below) is the page being left.
  if ((window as unknown as {p6Out?: boolean}).p6Out) return null;
  if (!el || el === document.body || el === document.documentElement || !document.hasFocus()) return null;
  const w = window as unknown as {p6n?: number};
  if (!el.dataset.p6) el.dataset.p6 = String((w.p6n = (w.p6n ?? 0) + 1));
  const s = getComputedStyle(el), r = el.getBoundingClientRect();
  const alpha = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return c === 'transparent' ? 0 : 1; const parts = m[1]!.split(/[ ,/]+/).filter(Boolean); return parts.length > 3 ? Number(parts[3]) : 1; };
  const drawn = (x: CSSStyleDeclaration) => (x.outlineStyle !== 'none' && parseFloat(x.outlineWidth) > 0 && alpha(x.outlineColor) > 0) || (x.boxShadow !== 'none' && x.boxShadow !== '');
  // The indicator may be the control's own outline or shadow, one drawn on its ::before or ::after (the phone's Checklist
  // pill), or its field's frame lighting up while focus is within (NOVA's command field, the chat composer): for that
  // last one, the frame is read with the control focused and again with it blurred, transitions held, and must differ.
  let ring = drawn(s) || drawn(getComputedStyle(el, '::before')) || drawn(getComputedStyle(el, '::after'));
  if (!ring) {
    const chain: HTMLElement[] = [];
    for (let p = el.parentElement, i = 0; p && i < 4; p = p.parentElement, i++) chain.push(p);
    const held = chain.map(p => p.style.getPropertyValue('transition'));
    chain.forEach(p => p.style.setProperty('transition', 'none'));
    const look = (p: HTMLElement) => { const x = getComputedStyle(p); return [x.outlineStyle, x.outlineWidth, x.outlineColor, x.boxShadow, x.borderTopColor, x.borderBottomColor].join('|'); };
    const on = chain.map(look);
    el.blur();
    const off = chain.map(look);
    el.focus({focusVisible: true} as FocusOptions);
    chain.forEach((p, i) => { if (held[i]) p.style.setProperty('transition', held[i]!); else p.style.removeProperty('transition'); });
    ring = on.some((v, i) => v !== off[i]);
  }
  const own = (hit: Element | null) => !!hit && (el.contains(hit) || hit.contains(el) || ([...((el as HTMLInputElement).labels ?? [])]).some(l => l.contains(hit)) || (!!el.parentElement && el.parentElement.contains(hit) && el.parentElement.matches('label, .switch, [class*="switch"], [class*="toggle"]')));
  const cx = (x: number) => Math.min(Math.max(x, 0), innerWidth - 1), cy = (y: number) => Math.min(Math.max(y, 0), innerHeight - 1);
  const points = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]] as const;
  const covered = points.every(([x, y]) => { const hit = document.elementFromPoint(cx(x), cy(y)); return !!hit && !own(hit); });
  const where = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/)[0]}` : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
  const segmented = el instanceof HTMLInputElement && /^(date|time|datetime-local|month|week)$/.test(el.type);
  return {key: el.dataset.p6, where, visible: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight, ring, covered, segmented, start: el.matches('a.skip')};
});
async function open(page: Page, path: string) { await page.goto(path); await afterGoto(page, path); await settle(page); }
/** Marks the page as left once its window loses focus to the browser (not to a frame inside it), before the walk begins. */
const watchExit = (page: Page) => page.evaluate(() => {
  const w = window as unknown as {p6Out?: boolean};
  w.p6Out = false;
  window.addEventListener('blur', event => { if (event.target === window) setTimeout(() => { if (!(document.activeElement instanceof HTMLIFrameElement)) w.p6Out = true; }, 0); });
});

const HALVES = [ROUTES.slice(0, Math.ceil(ROUTES.length / 2)), ROUTES.slice(Math.ceil(ROUTES.length / 2))] as const;
for (const theme of THEMES) for (const [half, routes] of HALVES.entries()) {
  test(`keyboard: skip link, a visible focus on every stop, no trap and Shift+Tab back, routes part ${half + 1}, ${theme}`, async ({page, isMobile}) => {
    test.setTimeout(600_000);
    if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
    await offline(page); await applyTheme(page, theme); await loadShowcase(page);
    const findings: Findings = {};
    for (const path of routes) {
      await open(page, path);
      const arrival = FOCUS_ON_ARRIVAL[path];
      const onSkip = () => page.evaluate(() => { const el = document.activeElement; return !!el && el.matches('a.skip') && el.textContent?.trim() === 'Skip to content'; });
      if (arrival) {
        // BUG-049: the page puts the focus in its first field inside the content (the wizard retries until the shell shows).
        const inField = () => page.evaluate(name => { const el = document.activeElement as HTMLInputElement | null; return !!el && !!document.getElementById('main')?.contains(el) && [...(el.labels ?? [])].some(l => l.textContent?.trim().startsWith(name)); }, arrival);
        await expect.poll(inField, {timeout: 6_000}).toBe(true).catch(() => note(findings, path, [`the page does not open with the focus in ${arrival}`]));
      } else await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await watchExit(page);
      // The two full-screen views, NOVA (components/nova/nova-chrome.css) and the Checklist's overlay (a modal dialog;
      // components/checklist/checklist.css), hide the sidebar and bars with the skip link: no repeated block, so no skip
      // link is needed there (2.4.1); their walk starts in the view itself. Anywhere else the skip link must be there.
      const bars = await page.evaluate(() => document.documentElement.dataset.novaView !== 'on' && !document.querySelector('.checklist-overlay[open]'));
      if (arrival) {
        // Shift+Tab walks back from the field, over the shell, to the skip link, which stays the first stop of the page.
        let reached = false;
        for (let i = 0; i < BACK_TO_SKIP && !reached; i++) {
          await page.keyboard.press('Shift+Tab');
          if (await page.evaluate(() => !!(window as unknown as {p6Out?: boolean}).p6Out)) break;
          reached = await onSkip();
        }
        if (!reached) { note(findings, path, [`Shift+Tab from ${arrival} does not come back to "Skip to content"`]); continue; }
      } else await page.keyboard.press('Tab');
      if (bars) {
        if (!await onSkip()) { note(findings, path, ['the first Tab does not reach "Skip to content"']); continue; }
        const skipRing = await stop(page);
        if (skipRing && !skipRing.ring) note(findings, path, ['"Skip to content" shows no focus indicator']);
        await page.keyboard.press('Enter');
        await page.keyboard.press('Tab');
        if (!await page.evaluate(() => !!document.getElementById('main')?.contains(document.activeElement))) note(findings, path, ['after the skip link, Tab does not land in the content']);
      }
      const walked: Stop[] = [];
      let same = 0, ended = false;
      for (let i = 0; i < STOPS; i++) {
        const now = await stop(page);
        // The walk ends where the page does: focus left the document (past its last control) or came round to the skip link.
        if (!now || (walked.length > 0 && now.start)) { ended = true; break; }
        // Focus that comes round to a stop it already passed is a cycle: right inside a modal dialog (the Checklist's
        // overlay), a trap anywhere else (2.1.2).
        if (walked.some(s => s.key === now.key) && walked.at(-1)?.key !== now.key) {
          if (!await page.evaluate(() => !!document.activeElement?.closest('dialog[open], [aria-modal="true"]'))) note(findings, path, [`focus cycles back to ${now.where} without leaving the page`]);
          ended = true; break;
        }
        const last = walked.at(-1);
        same = last?.key === now.key ? same + 1 : 0;
        if (same >= (now.segmented ? 5 : 2)) { note(findings, path, [`focus stuck on ${now.where}`]); break; }
        if (last?.key !== now.key) {
          if (!now.visible) note(findings, path, [`${now.where}: not on screen when focused`]);
          if (!now.ring) note(findings, path, [`${now.where}: no focus indicator`]);
          if (now.covered) note(findings, path, [`${now.where}: hidden behind something when focused (2.4.11)`]);
          walked.push(now);
        }
        await page.keyboard.press('Tab');
      }
      if (!walked.length) note(findings, path, ['Tab reached no control in the page']);
      // Shift+Tab walks back over the last stops in reverse (date fields excepted: they step back segment by segment); a
      // walk that ran past the end of the page has nothing inside the page to walk back from.
      const back = walked.filter(s => !s.segmented).slice(-4).reverse();
      const here = ended ? null : await stop(page);
      if (here && back.length > 1 && !walked.slice(-4).some(s => s.segmented)) {
        const expected = back[0]!.key === here.key ? back.slice(1) : back;
        for (const want of expected.slice(0, 3)) {
          await page.keyboard.press('Shift+Tab');
          const got = await stop(page);
          if (got?.key !== want.key) { note(findings, path, [`Shift+Tab went to ${got?.where ?? 'the page'}, not back to ${want.where}`]); break; }
        }
      }
    }
    expect(findings).toEqual({});
  });
}

/** Opens with the keyboard (focus, then Enter), checks focus is inside, Tab stays inside, Esc closes and focus returns. */
/** Session AL (O3): below 901 px, ZIGi from the keyboard: "Apps & extras" with Enter, then its ZIGi row with Enter. */
async function zigiByKeyboard(page: Page) {
  await page.getByTestId('apps-extras-button').focus(); await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', {name: 'Apps & extras'});
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', {name: /^ZIGi\b/}).focus(); await page.keyboard.press('Enter');
}
async function roundTrip(page: Page, findings: Findings, label: string, trigger: Locator, dialog: Locator, {modal = true, press}: {modal?: boolean; press?: () => Promise<void>} = {}) {
  await expect(trigger).toBeVisible();
  // Session AL (O3): a dialog reached in two steps (ZIGi through "Apps & extras" below 901 px) brings its own keyboard press.
  if (press) await press();
  else { await trigger.focus(); await page.keyboard.press('Enter'); }
  await expect(dialog).toBeVisible({timeout: 10_000});
  await dialog.evaluate(el => Promise.all(el.getAnimations({subtree: true}).filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))));
  await expect.poll(() => dialog.evaluate(el => el.contains(document.activeElement)), {timeout: 3_000}).toBe(true).catch(() => note(findings, label, ['focus did not move into it when it opened']));
  if (modal) for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    if (!await dialog.evaluate(el => el.contains(document.activeElement) || document.activeElement === document.body)) { note(findings, label, [`Tab left the open modal for ${await page.evaluate(() => (document.activeElement as HTMLElement | null)?.outerHTML.slice(0, 80))}`]); break; }
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden({timeout: 5_000}).catch(() => note(findings, label, ['Esc did not close it']));
  await expect.poll(() => trigger.evaluate(el => el === document.activeElement), {timeout: 3_000}).toBe(true).catch(async () => note(findings, label, [`focus did not return to its opener (it is on ${await page.evaluate(() => (document.activeElement as HTMLElement | null)?.outerHTML.slice(0, 80) ?? 'nothing')})`]));
}

for (const theme of THEMES) {
  test(`keyboard: dialogs and sheets keep focus inside, close on Esc and give focus back, ${theme}`, async ({page, isMobile}) => {
    test.setTimeout(240_000);
    if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
    await offline(page); await applyTheme(page, theme); await loadShowcase(page);
    const findings: Findings = {};
    await open(page, '/app');
    const quick = page.locator(isMobile ? '.phone-topbar .quick-add-trigger' : '.today-hero .quick-add-trigger').first();
    await roundTrip(page, findings, 'Quick add', quick, page.getByRole('dialog', {name: 'What would you like to add?'}));
    // Session AL (owner decision O3, deliberate): below 901 px ZIGi has no floating button; the keyboard opens "Apps & extras",
    // then its ZIGi row, and Esc gives the focus back to "Apps & extras". On a computer, as before.
    if (page.viewportSize()!.width < 901) await roundTrip(page, findings, 'ZIGi', page.getByTestId('apps-extras-button'), page.locator('dialog.ai-chat[open]'), {press: () => zigiByKeyboard(page)});
    else await roundTrip(page, findings, 'ZIGi', page.getByRole('button', {name: /^Open ZIGi/}).first(), page.locator('dialog.ai-chat[open]'));
    const chip = page.locator('.showcase-chip-button').first();
    if (await chip.isVisible()) await roundTrip(page, findings, 'The Showcase chip', chip, page.locator('.showcase-chip [role=dialog], .showcase-chip dialog, [role=dialog]').filter({hasText: /Showcase/}).first(), {modal: false});
    if (isMobile) await roundTrip(page, findings, 'More', page.getByRole('button', {name: 'More', exact: true}), page.getByRole('navigation', {name: 'Main navigation'}).getByRole('dialog', {name: 'More'}));
    else {
      // ⌘/Ctrl + J from a focused control: NOVA's command bar; Esc gives focus back to that control.
      const from = page.getByRole('link', {name: 'Skip to content', exact: true});
      await from.focus();
      await page.keyboard.press('Control+j');
      const bar = page.locator('dialog.nova-bar[open]');
      await expect(bar).toBeVisible();
      if (!await bar.evaluate(el => el.contains(document.activeElement))) note(findings, 'Command bar', ['focus did not move into it']);
      await page.keyboard.press('Escape');
      await expect(bar).toBeHidden();
      if (!await from.evaluate(el => el === document.activeElement)) note(findings, 'Command bar', ['focus did not return to where it was']);
    }
    await open(page, '/app/wealth');
    await roundTrip(page, findings, 'Add asset', page.getByRole('button', {name: '+ Add asset'}).first(), page.getByRole('dialog', {name: 'Add to your wealth'}));
    await open(page, '/app/nova');
    await expect(page.locator('.nova-frame[data-opening]')).not.toHaveAttribute('data-opening', /play|waiting/, {timeout: 15_000});
    if (isMobile) await roundTrip(page, findings, 'NOVA Quick access', page.getByRole('button', {name: 'Quick access'}), page.getByRole('dialog', {name: 'Quick access'}));
    else {
      await roundTrip(page, findings, 'NOVA Make it yours', page.getByRole('button', {name: /^Customize: make .* yours$/}).or(page.getByRole('button', {name: 'Customize the view', exact: true})).first(), page.getByRole('dialog', {name: /^Make .* yours$/}));
      await roundTrip(page, findings, 'NOVA panels', page.getByRole('button', {name: 'Workflows', exact: true}), page.getByRole('dialog').filter({hasText: 'Memory, permissions'}).first());
    }
    expect(findings).toEqual({});
  });
}

test('keyboard: the arrow keys move between the tabs of every tab list on every route', async ({page}) => {
  test.setTimeout(300_000);
  await page.setViewportSize({width: 1440, height: 900});
  await offline(page); await loadShowcase(page);
  const findings: Findings = {};
  for (const path of ROUTES) {
    await open(page, path);
    for (const list of await page.locator('main [role=tablist]').filter({visible: true}).all()) {
      const tabs = list.getByRole('tab');
      if (await tabs.count() < 2) continue;
      const name = await list.getAttribute('aria-label') ?? '';
      const selected = list.locator('[role=tab][aria-selected="true"]').first();
      const start = await selected.count() ? selected : tabs.first();
      await start.focus();
      const before = await page.evaluate(() => document.activeElement?.textContent ?? '');
      await page.keyboard.press('ArrowRight');
      const after = await page.evaluate(() => ({text: document.activeElement?.textContent ?? '', tab: document.activeElement?.getAttribute('role') === 'tab'}));
      if (!after.tab || after.text === before) note(findings, path, [`tab list "${name}": ArrowRight does not move to the next tab`]);
    }
  }
  expect(findings).toEqual({});
});

test('keyboard: the primary actions work with the keyboard alone', async ({page, isMobile}) => {
  test.setTimeout(240_000);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await offline(page); await loadShowcase(page);
  // Tasks: type a task and press Enter.
  await open(page, '/app/tasks');
  const form = page.getByRole('form', {name: 'Add a task'});
  await form.getByLabel('New task').focus();
  await page.keyboard.type('Fictional: water the plants');
  await page.keyboard.press('Enter');
  await expect(page.locator('main').getByText('Fictional: water the plants').first()).toBeVisible();
  // Notes: capture with the keyboard.
  await open(page, '/app/notes?capture=1');
  const box = page.getByLabel('Capture a note', {exact: true});
  await expect(box).toBeFocused();
  await page.keyboard.type('Fictional: a keyboard-only note');
  const save = page.getByRole('button', {name: 'Save to inbox'});
  for (let i = 0; i < 6 && !await save.evaluate(el => el === document.activeElement); i++) await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  await page.keyboard.press('Enter');
  await open(page, '/app/notes?view=inbox');
  await expect(page.locator('main').getByText('Fictional: a keyboard-only note').first()).toBeVisible();
  // The NOVA guide: Enter on a planet opens its guide; Enter again closes it.
  await open(page, '/app/nova/setup');
  const planet = page.locator('.nova-guide-path').getByRole('button', {name: /^Privacy mode:/}).first();
  await planet.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-setup-panel="privacy"]')).toBeVisible();
  await planet.focus(); await page.keyboard.press('Space');
  await expect(page.locator('[data-setup-panel="privacy"]')).toBeHidden();
  // Notes graph: a body is reached with Tab and opened with Enter.
  await open(page, '/app/notes?view=graph');
  const star = page.getByRole('link', {name: /^Note: /}).first();
  if (await star.count()) { await star.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/app\/notes\?note=/); }
});

test('keyboard: a confirm card is reached with Tab, added with Enter and undone with Enter; Esc closes ZIGi and focus returns', async ({page, isMobile}) => {
  test.setTimeout(120_000);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await mockModel(page, [`Two fictional cards.\n\n${fence([{kind: 'log-water', glasses: 2}, {kind: 'create-habit', title: 'Evening stretch', type: 'build', measurement: 'minutes', target: 10, schedule: 'daily', timeOfDay: 'evening'}])}`]);
  await seedDevice(page);
  await open(page, '/app/habits');
  // Session AL (owner decision O3, deliberate): below 901 px the keyboard opens ZIGi through "Apps & extras", and the focus
  // returns there; on a computer, the launcher as before.
  const compact = page.viewportSize()!.width < 901;
  const launcher = compact ? page.getByTestId('apps-extras-button') : page.getByRole('button', {name: /^Open ZIGi/}).first();
  if (compact) await zigiByKeyboard(page); else { await launcher.focus(); await page.keyboard.press('Enter'); }
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible();
  const box = panel.getByLabel('Message to your AI');
  await expect(box).toBeFocused();
  await page.keyboard.type('Fictional: water and a stretch');
  await page.keyboard.press('Enter');
  const water = panel.locator('.ai-card[data-kind="log-water"]');
  const add = water.getByRole('button', {name: 'Add', exact: true});
  await expect(add).toBeVisible({timeout: 20_000});
  // Reached by Shift+Tab from the message box (the cards sit above it), as a keyboard user would.
  for (let i = 0; i < 40 && !await add.evaluate(el => el === document.activeElement); i++) await page.keyboard.press('Shift+Tab');
  await expect(add).toBeFocused();
  await page.keyboard.press('Enter');
  const undo = panel.getByRole('button', {name: /^Undo/}).first();
  await expect(undo).toBeVisible();
  // Focus is not lost to the page when the card changes: it stays in the panel.
  expect(await panel.evaluate(el => el.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 40 && !await undo.evaluate(el => el === document.activeElement); i++) await page.keyboard.press('Tab');
  await expect(undo).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(water).toContainText('Undone');
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(launcher).toBeFocused();
});
