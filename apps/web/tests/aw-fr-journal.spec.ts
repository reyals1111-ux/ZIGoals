import {expect, test, type Page} from '@playwright/test';
import {go, noSideways, start} from './av2-polish-helpers';
import {hydrated} from './ah-helpers';
import {axe, type Theme} from './p6-helpers';

/**
 * Session AW (fr-journal, FR-AW-1, a Blocker from the friend-readiness walk): a typed journal page was lost without a word.
 * Save entry sat ~770 px below the box on a phone (y 1314 against the box's 544), under every optional extra, and a tap on
 * Today or a reload emptied the box with nothing stored. Now the box is kept as a draft on this device while it is typed
 * and comes back, with one line and "Discard draft", after an in-app round trip and after a reload; Save entry sits right
 * under the box (before the optional extras) and removes the draft. 390 (the mobile project) and 1440 (the desktop
 * project), in Nebula, Light (with the Showcase) and Dark; axe on Write each time. Fictional words; every /api call
 * answers 503, and the words are never sent: no request leaves with them.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-30T09:30:00+01:00')}); });
const WORDS = 'A fictional page: the market in the rain, and a long call with an old friend.';
const DRAFT_KEY = 'zigoals:journal-draft:v1';
const serious = (found: Awaited<ReturnType<typeof axe>>) => found.filter(v => v.impact === 'serious' || v.impact === 'critical');
/** Whether this device holds a draft (a key of its own, of an account, or of the Showcase tab), and its words. */
const storedDraft = (page: Page) => page.evaluate(key => {
  for (const store of [localStorage, sessionStorage]) for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && k.endsWith(key)) return (JSON.parse(store.getItem(k) ?? '{}') as {draft?: {text?: string} | null}).draft?.text ?? null; }
  return null;
}, DRAFT_KEY);
/** The first screen's floor: the top of the phone's tab bar, or the window's bottom. */
async function floor(page: Page): Promise<number> {
  const bar = page.getByRole('navigation', {name: 'Main navigation'}).filter({visible: true});
  const height = page.viewportSize()!.height;
  if (!await bar.count()) return height;
  const box = (await bar.first().boundingBox())!;
  return box.y > height / 2 ? box.y : height;
}

const PROFILES: {theme: Theme; showcase: boolean}[] = [{theme: 'nebula', showcase: false}, {theme: 'light', showcase: true}, {theme: 'dark', showcase: false}];
for (const p of PROFILES) test(`${p.theme}${p.showcase ? ' (Showcase)' : ''}: a typed page survives Today and a reload as a draft, Save entry is right under the box and removes it`, async ({page, isMobile}) => {
  test.setTimeout(120_000);
  const sent: string[] = [];
  page.on('request', r => { if ((r.postData() ?? '').includes('market in the rain') || r.url().includes('market%20in')) sent.push(r.url()); });
  await start(page, {theme: p.theme, width: isMobile ? 390 : 1440, showcase: p.showcase});
  await go(page, '/app/journal');
  const write = page.getByRole('region', {name: 'Write'}), form = page.getByRole('form', {name: 'Write in your journal'});
  const entry = form.getByLabel('Today’s entry'), save = form.getByRole('button', {name: 'Save entry', exact: true});
  await entry.fill(WORDS);

  // Save entry within one screen of the box (above the phone's tab bar), and before every optional extra.
  await entry.scrollIntoViewIfNeeded();
  const box = (await entry.boundingBox())!, button = (await save.boundingBox())!, bottom = await floor(page);
  expect(button.y + button.height - box.y, 'Save entry within one screen of the box').toBeLessThanOrEqual(bottom);
  expect(button.y, 'Save entry under the box').toBeGreaterThan(box.y + box.height);
  expect(button.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => { const s = [...document.querySelectorAll('form[aria-label="Write in your journal"] button[type=submit]')]; const extras = document.querySelector('.journal-compose-extras'); return s.length === 1 && !!extras && !!(s[0]!.compareDocumentPosition(extras) & Node.DOCUMENT_POSITION_FOLLOWING); }), 'one Save entry, before the extras').toBe(true);
  for (const name of [/^Link another day/, /^Start from a prompt/, /^Photos and a voice note/, /^Prompt packs/]) await expect(form.getByRole('group', {name: 'More for this entry (optional)'}).locator('summary').filter({hasText: name}), String(name)).toHaveCount(1);
  await expect(form.getByRole('group', {name: 'More for this entry (optional)'}).getByLabel('Tags — optional')).toBeVisible();

  // An in-app round trip: Today in the tab bar (the sidebar on a computer), then Back. The words come back, said once.
  await page.getByRole('navigation', {name: 'Main navigation'}).filter({visible: true}).first().getByRole('link', {name: 'Today', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect.poll(() => storedDraft(page), 'the draft is kept on this device').toBe(WORDS);
  await page.goBack(); await expect(page).toHaveURL(/\/app\/journal/);
  await expect(entry).toHaveValue(WORDS);
  const line = form.locator('.journal-draft-line');
  await expect(line).toHaveText(/^Your unsaved draft is back\.\s*Discard draft$/);
  await expect(line.getByRole('button', {name: 'Discard draft'})).toBeVisible();
  expect((await line.getByRole('button', {name: 'Discard draft'}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(serious(await axe(page, write)), `${p.theme}: Write with the draft back`).toEqual([]);

  // A reload: still there.
  await page.reload(); await hydrated(page);
  await expect(entry).toHaveValue(WORDS);
  await expect(form.locator('.journal-draft-line')).toContainText('Your unsaved draft is back.');

  // Discard draft empties the box and the device; Undo puts it back.
  await form.getByRole('button', {name: 'Discard draft'}).click();
  await expect(entry).toHaveValue('');
  await expect(form.locator('.journal-draft-line')).toHaveCount(0);
  await expect.poll(() => storedDraft(page)).toBeNull();
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo discarding the draft'}).click();
  await expect(entry).toHaveValue(WORDS);
  await expect.poll(() => storedDraft(page)).toBe(WORDS);

  // Save entry keeps the entry and removes the draft; a reload then shows an empty box and no line.
  await save.click();
  await expect(write.locator('.journal-status')).toHaveText('Saved in your journal, on this device.');
  await expect(entry).toHaveValue('');
  await expect.poll(() => storedDraft(page)).toBeNull();
  await page.reload(); await hydrated(page);
  await expect(entry).toHaveValue('');
  await expect(form.locator('.journal-draft-line')).toHaveCount(0);
  await expect(page.getByRole('region', {name: 'Entries'})).toContainText('market in the rain');
  expect(serious(await axe(page, write)), `${p.theme}: Write after Save`).toEqual([]);
  expect(sent, 'the words never leave the device').toEqual([]);
  await noSideways(page);
});

test('an empty box, a template\'s headings alone, or a cleared box keep no draft', async ({page, isMobile}) => {
  await start(page, {theme: 'nebula', width: isMobile ? 390 : 1440, showcase: false});
  await go(page, '/app/journal');
  const form = page.getByRole('form', {name: 'Write in your journal'}), entry = form.getByLabel('Today’s entry');
  await entry.fill('Fictional words, then gone.');
  await expect.poll(() => storedDraft(page)).toBe('Fictional words, then gone.');
  await entry.fill('');
  await expect.poll(() => storedDraft(page)).toBeNull();
  await page.reload(); await hydrated(page);
  await expect(entry).toHaveValue('');
  await expect(form.locator('.journal-draft-line')).toHaveCount(0);
  // Leaving within a moment of typing still keeps it (written as the page goes, not only after the pause).
  await entry.fill('Fictional words, left at once.');
  await page.reload(); await hydrated(page);
  await expect(entry).toHaveValue('Fictional words, left at once.');
});
