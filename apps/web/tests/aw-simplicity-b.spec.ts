import {expect, test, type Locator, type Page} from '@playwright/test';
import {go, noSideways, start} from './av2-polish-helpers';
import {moreViews} from './fr-layout-helpers';
import {axe, settle, type Theme} from './p6-helpers';

/**
 * Session AW Part 3 (simplicity b; owner amendment 8): the first screens of Tasks, Journal, Notes, the Agenda and NOVA's
 * entry, at 390 (the mobile project, 390 × 844) and 1440 (the desktop project, 1440 × 900), on an empty device and in the
 * Showcase. Each pillar's main action is whole on the first screen (on a phone, above the tab bar), with no scroll; each
 * tool that moved behind "More views", under the entry or under the agenda is still one tap away, and Help search and the
 * app's Search still find it. Every pillar is checked in two of Nebula, Light and Dark. Fictional data; every /api call
 * answers 503.
 *
 * Measured before (base 8fa8aa1d, the scratchpad's SIMPLICITY-before.md): Tasks' "New task" at y 949 in the Showcase on a
 * phone, under the tab bar; Journal's "Today's entry" at y 733 running under it; Notes' "New note" 1.05–1.17 screens
 * down after the Notes tab; the Agenda's week with no add control (the day view's at y 2,214), and on an empty device its
 * "Add a task" at y 953 leaving for Tasks; seven "Nothing planned." at 1440.
 *
 * The "where to find it" sentences checked in Help (More views, under Save entry, the Agenda's field) are the ones this
 * group handed back for the Help page, which only the integrator edits; until they are in, those lines fail.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
// Session AW (simplicity-b, fix after the integrated run): one fixed morning, the before walk's (Wed 25 Nov 2026 09:30
// in Amsterdam). The integrated run crossed midnight: the Showcase was built for one day while the Journal read the
// next, so today's energy (and its feeling-word line) was not there. The clock flows on from this time.
test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-25T09:30:00+01:00')}); });
const serious = (found: Awaited<ReturnType<typeof axe>>) => found.filter(v => v.impact === 'serious' || v.impact === 'critical');
const width = (isMobile: boolean) => isMobile ? 390 : 1440;
type Profile = {showcase: boolean; theme: Theme};
const PROFILES = (a: Theme, b: Theme): Profile[] => [{showcase: false, theme: a}, {showcase: true, theme: b}];
const said = (p: Profile) => `${p.showcase ? 'Showcase' : 'empty'}, ${p.theme}`;

/** The first screen's floor: the top of the phone's tab bar, or the window's bottom. */
async function floor(page: Page): Promise<number> {
  const bar = page.getByRole('navigation', {name: 'Main navigation'}).filter({visible: true});
  const height = page.viewportSize()!.height;
  if (!await bar.count()) return height;
  const box = (await bar.first().boundingBox())!;
  return box.y > height / 2 ? box.y : height;
}
/** The control is whole on the first screen: from the page's top, no scroll, its box above the floor. */
async function wholeOnFirstScreen(page: Page, control: Locator, what: string) {
  await expect(control, what).toBeVisible();
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await expect.poll(() => page.evaluate(() => window.scrollY), {message: what}).toBe(0);
  const box = (await control.boundingBox())!, bottom = await floor(page);
  expect(box.y, `${what}: top`).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, `${what}: whole above y ${bottom}`).toBeLessThanOrEqual(bottom);
}
const follows = (page: Page, first: string, second: string) => page.evaluate(([a, b]) => { const x = document.querySelector(a!), y = document.querySelector(b!); return !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING); }, [first, second]);
/** Help search finds the answer by the tool's own name, and the answer says where the tool is. */
async function inHelp(page: Page, words: string, id: string, where?: string | RegExp) {
  await go(page, '/app/help');
  await page.getByRole('searchbox', {name: 'Search Help'}).fill(words);
  const answer = page.locator(`#help-${id}`);
  await expect(answer, `Help search "${words}"`).toBeVisible();
  await expect(answer, `Help search "${words}"`).toHaveAttribute('open', '');
  if (where) await expect(answer, `where "${words}" is`).toContainText(where);
}
/** The app's Search (the "/" palette) finds the tool's Help answer by its name. */
async function inSearch(page: Page, words: string, question: string) {
  await go(page, '/app');
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  const palette = page.getByRole('dialog', {name: 'Search'});
  if (!await palette.isVisible()) await page.locator('body').press('/');
  await expect(palette).toBeVisible();
  await palette.getByRole('combobox').fill(words);
  await expect(palette.getByRole('option').filter({hasText: question}).first(), `Search "${words}"`).toBeVisible();
  await page.keyboard.press('Escape');
}

test('Tasks: "New task" opens the list, whole on the first screen; This evening, Someday, Priority matrix and Completed one tap behind More views on a phone', async ({page, isMobile}) => {
  test.setTimeout(120_000);
  for (const p of PROFILES('nebula', 'light')) {
    await start(page, {theme: p.theme, width: width(isMobile), showcase: p.showcase});
    await go(page, '/app/tasks');
    const add = page.locator('.tasks-main').getByLabel('New task', {exact: true});
    await wholeOnFirstScreen(page, add, `Tasks, ${said(p)}: New task`);
    // It opens the list card, ahead of the heading line (with X2's "of today's tasks done") and Select and Filter.
    expect(await follows(page, '.tasks-main .tasks-smart-add', '#tasks-view-title'), said(p)).toBe(true);
    // Session AW (integration, deliberate): X2's progress line sits under Today's list (a10-life A10-11); the same words.
    if (p.showcase) await expect(page.locator('.tasks-main .tasks-day-progress')).toContainText(/of today’s tasks done/);
    const nav = page.getByRole('navigation', {name: 'Task views'}), chip = nav.locator('.tasks-nav-more-toggle');
    const moved = [/^This evening/, /^Someday/, /^Priority matrix$/, /^Completed$/];
    for (const name of [/^Inbox/, /^Today/, /^Upcoming/, /^All open/]) await expect(nav.getByRole('button', {name}), said(p)).toBeVisible();
    if (isMobile) {
      await expect(chip).toHaveAttribute('aria-expanded', 'false');
      for (const name of moved) await expect(nav.getByRole('button', {name}), `${said(p)}: ${name} behind More views`).toBeHidden();
      await moreViews(page);
    } else await expect(chip).toBeHidden();
    // One tap (a phone) or none (a computer), each view is there and opens.
    for (const name of moved) await expect(nav.getByRole('button', {name}), `${said(p)}: ${name}`).toBeVisible();
    await nav.getByRole('button', {name: /^Completed$/}).click();
    await expect(page.locator('#tasks-view-title')).toContainText('Completed');
    expect(serious(await axe(page, page.locator('.tasks-layout'))), said(p)).toEqual([]);
  }
  // A view behind the fold opened from the address (Search, Review, a link) shows its own chip as the current one.
  await go(page, '/app/tasks?view=matrix');
  await expect(page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: 'Priority matrix', exact: true})).toHaveAttribute('aria-current', 'page');
  if (isMobile) await expect(page.locator('.tasks-nav-more-toggle')).toHaveAttribute('aria-expanded', 'true');
  await noSideways(page);
  // Findable without the menu: Help search by the views' own names, with where they are on a phone; and the app's Search.
  await inHelp(page, 'Someday', 'ap-evening-someday', 'More views');
  await inHelp(page, 'priority matrix', 'ap-matrix', 'More views');
  await inHelp(page, 'Completed', 'av-tasks-done', 'More views');
  await inSearch(page, 'someday', 'What are This evening and Someday in Tasks?');
  await inSearch(page, 'priority matrix', 'What is the Priority matrix?');
  await inSearch(page, 'completed tasks', 'Can I see how many tasks I finished?');
});

test('Journal: "Today’s entry" whole on the first screen; the feeling word and Three good things follow the entry, one tap each', async ({page, isMobile}) => {
  test.setTimeout(120_000);
  for (const p of PROFILES('light', 'dark')) {
    await start(page, {theme: p.theme, width: width(isMobile), showcase: p.showcase});
    await go(page, '/app/journal');
    const form = page.getByRole('form', {name: 'Write in your journal'}), entry = form.getByLabel('Today’s entry');
    await wholeOnFirstScreen(page, entry, `Journal, ${said(p)}: Today's entry`);
    // The energy scale stays above it, one row; Three good things (folded) and the feeling word come after the form.
    expect(await follows(page, 'fieldset.journal-energy', 'form[aria-label="Write in your journal"]'), said(p)).toBe(true);
    expect(await follows(page, 'form[aria-label="Write in your journal"]', 'details.good-things-fold'), said(p)).toBe(true);
    const write = page.getByRole('region', {name: 'Write'}), fold = write.locator('details.good-things-fold');
    await expect(fold).not.toHaveAttribute('open');
    await fold.locator('summary').click();
    await expect(write.getByRole('form', {name: 'Three good things'})).toBeVisible();
    await fold.locator('summary').click();
    if (p.showcase) {
      // The Showcase rated today's energy: the feeling word's line is under the entry, with Change (drawn first, then its
      // place read).
      await expect(write.locator('.mood-words-trigger').getByRole('button', {name: 'Change'})).toBeVisible();
      expect(await follows(page, 'form[aria-label="Write in your journal"]', '.journal-compose > .mood-words-fold'), said(p)).toBe(true);
    }
    expect(serious(await axe(page, write)), said(p)).toEqual([]);
  }
  await noSideways(page);
  await inHelp(page, 'three good things', 'av-good-things', 'under Save entry');
  await inHelp(page, 'feeling word', 'ak-days', 'under Save entry');
  await inSearch(page, 'three good things', 'What is “Three good things” in the Journal?');
  await inSearch(page, 'feeling words', 'What are feeling words, Compare, the energy curve, the year in pixels and the report for a visit?');
});

test('Notes: Capture on the first screen; in the Notes view "New note" first and whole on it; an empty day is one line', async ({page, isMobile}) => {
  test.setTimeout(120_000);
  for (const p of PROFILES('dark', 'nebula')) {
    await start(page, {theme: p.theme, width: width(isMobile), showcase: p.showcase});
    await go(page, '/app/notes');
    await wholeOnFirstScreen(page, page.getByLabel('Capture a note', {exact: true}), `Notes, ${said(p)}: Capture`);
    const day = page.getByRole('region', {name: 'This day'});
    await expect(day).toBeVisible();
    if (p.showcase) {
      // A day with records keeps its titled strip of links.
      await expect(day.getByRole('heading', {name: 'This day'})).toBeVisible();
      await expect(day.locator('.note-day-chip').first()).toBeVisible();
    } else {
      // Nothing logged: one teaching line, no title and no box saying "nothing".
      await expect(day.getByRole('heading')).toHaveCount(0);
      await expect(day).toContainText('show here as links once you log them');
      await expect(day.locator('p')).toHaveCount(1);
    }
    // One tap on the Notes tab: "New note" is the first thing under the views, whole on the first screen.
    await page.getByRole('navigation', {name: 'Notes views'}).getByRole('button', {name: 'Notes', exact: true}).click();
    const title = page.getByLabel('New note', {exact: true});
    await wholeOnFirstScreen(page, title, `Notes, ${said(p)}: New note`);
    // Capture is still on this view, after the notes.
    expect(await follows(page, 'form.note-new', 'section.note-capture-panel'), said(p)).toBe(true);
    await expect(page.getByLabel('Capture a note', {exact: true})).toBeAttached();
    await title.fill('Fictional trip ideas');
    await page.getByRole('button', {name: 'Make note'}).click();
    await expect(page.getByRole('heading', {name: 'Fictional trip ideas'})).toBeVisible();
    // Back on Today, Capture leads again (the workspace is its own chunk: both drawn first, then their order read).
    await go(page, '/app/notes');
    await expect(page.getByLabel('Capture a note', {exact: true})).toBeVisible();
    await expect(page.locator('section.note-day')).toBeVisible();
    expect(await follows(page, 'section.note-capture-panel', 'section.note-day'), said(p)).toBe(true);
    expect(serious(await axe(page, page.locator('.notes-workspace'))), said(p)).toEqual([]);
  }
  await noSideways(page);
  await inHelp(page, 'capture', 'notes-what');
  await inSearch(page, 'capture note', 'Capture a note');
});

test('Agenda: "Add a task for …" opens the agenda in every view, whole on the first screen; an empty week is one line', async ({page, isMobile}) => {
  test.setTimeout(120_000);
  for (const p of PROFILES('nebula', 'dark')) {
    await start(page, {theme: p.theme, width: width(isMobile), showcase: p.showcase});
    for (const view of ['week', 'day', 'month'] as const) {
      await go(page, `/app/agenda?view=${view}`);
      await expect(page.locator('.agenda-page[data-agenda="ready"]')).toBeVisible();
      await expect(page.getByRole('group', {name: 'View'}).getByRole('button', {name: view[0]!.toUpperCase() + view.slice(1)})).toHaveAttribute('aria-pressed', 'true');
      const form = page.getByRole('form', {name: /^Add a task for /});
      await expect(form).toHaveCount(1);
      await wholeOnFirstScreen(page, form.getByLabel('New task'), `Agenda ${view}, ${said(p)}: New task`);
      await expect(page.locator('.agenda-add-day')).toHaveText('A task for today');
      expect(await follows(page, '#agenda-add', '.agenda-toolbar'), `${view}, ${said(p)}`).toBe(true);
    }
    // Added from the week, it is today's.
    await go(page, '/app/agenda?view=week');
    const form = page.getByRole('form', {name: /^Add a task for /});
    await form.getByLabel('New task').fill(`Fictional seeds (${p.showcase ? 'Showcase' : 'empty'})`);
    await form.getByRole('button', {name: 'Add task'}).click();
    const row = page.locator('.agenda-task').filter({hasText: 'Fictional seeds'});
    await expect(row).toBeVisible();
    await expect(page.locator('.agenda-day[data-today]').locator('.agenda-task').filter({hasText: 'Fictional seeds'})).toBeVisible();
    expect(serious(await axe(page, page.locator('.agenda-panel'))), said(p)).toEqual([]);
  }
  // An empty device: no "Nothing planned." per day, one line instead; the teaching card under the agenda, its Add a task
  // going to the field above (it opened Tasks).
  await start(page, {theme: 'light', width: width(isMobile), showcase: false});
  await go(page, '/app/agenda');
  await expect(page.locator('.agenda-page[data-agenda="ready"]')).toBeVisible();
  await expect(page.locator('.agenda-quiet')).toHaveText(/^Nothing planned this week yet\. Add a task above/);
  await expect(page.locator('.agenda-nothing')).toHaveCount(0);
  await expect(page.locator('.agenda-day')).toHaveCount(0);
  expect(await follows(page, 'section.agenda-panel', '.empty-state')).toBe(true);
  await page.locator('.empty-state').getByRole('button', {name: 'Add a task'}).click();
  await expect(page.getByRole('form', {name: /^Add a task for /}).getByLabel('New task')).toBeFocused();
  await expect(page).toHaveURL(/\/app\/agenda/);
  for (const name of ['Add a habit', 'Plan a meal', 'Add a bill', 'Turn on the weekly review']) await expect(page.locator('.empty-state').getByRole('link', {name})).toBeVisible();
  expect(serious(await axe(page, page.locator('.agenda-page')))).toEqual([]);
  await noSideways(page);
  await inHelp(page, 'agenda', 'ak-agenda', 'at the top of the Agenda');
  await inSearch(page, 'everything coming up', 'Where can I see everything coming up, and can I put it in my own calendar?');
});

test('NOVA: the command field is whole on its first screen, empty and in the Showcase (AR\'s composition unchanged)', async ({page, isMobile}) => {
  test.setTimeout(90_000);
  for (const p of PROFILES('dark', 'light')) {
    await start(page, {theme: p.theme, width: width(isMobile), showcase: p.showcase});
    await go(page, '/app/nova');
    await settle(page);
    await wholeOnFirstScreen(page, page.getByRole('textbox', {name: 'Message NOVA'}).filter({visible: true}).first(), `NOVA, ${said(p)}: Message NOVA`);
  }
});
