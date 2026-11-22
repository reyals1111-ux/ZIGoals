import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r6-notes; LEDGER #399, #402, #405, #407, #408; Capacities): notes that stay tidy — rename a tag in
 * every note (one Undo), a daily note read back and "Not read back yet", a property set on several notes from Select,
 * merge two notes (the merged one waits in Recently deleted; Undo puts both back), and the sums under the notes table.
 * Nebula, Light and Dark; keyboard; axe-clean; no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional Rome', body: 'Colosseum. #trip', props: [{k: 'Budget', t: 'number', v: 300}, {k: 'Booked', t: 'tick', v: true}], createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'n-b', kind: 'topic', title: 'Fictional Italy', body: 'The trip. See [[Fictional Rome]].', tags: ['trip'], props: [{k: 'Budget', t: 'number', v: 100}, {k: 'Booked', t: 'tick', v: false}], createdAt: '2026-11-02T09:00:00.000Z'},
  {id: 'n-c', kind: 'topic', title: 'Fictional packing', body: 'Socks.', createdAt: '2026-11-03T09:00:00.000Z'},
  {id: 'n-d', kind: 'daily', title: '2026-11-18', day: '2026-11-18', body: 'A fictional quiet day.', createdAt: '2026-11-18T09:00:00.000Z'}]};
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), NOTES_KEY);
async function open(page: Page, theme: (typeof THEMES)[number], isMobile: boolean, path: string) {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto(path); await hydrated(page);
}
const noSideways = async (page: Page) => { await page.setViewportSize({width: 320, height: 720}); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); };

for (const theme of THEMES) {
  test(`${theme}: rename a tag in every note, with one Undo; sums under the table`, async ({page, isMobile}) => {
    await open(page, theme, isMobile, '/app/notes?view=notes');
    const list = page.locator('section[aria-labelledby="note-list-title"]');
    await list.locator('.note-tags-fold > summary').click();
    await list.locator('.note-tag-rename-fold > summary').click();
    const panel = list.locator('.note-tag-rename');
    await expect(panel.getByLabel('Tag', {exact: true})).toHaveValue('trip');
    await panel.getByLabel('New name').fill('journeys');
    await expect(panel).toContainText('#trip becomes #journeys in 2 notes.');
    const findings = await axe(page, list.locator('.note-tags-fold'));
    expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
    await panel.getByLabel('New name').press('Enter');
    await expect(page.getByText('#trip is #journeys now, on 2 notes.').first()).toBeVisible();
    await expect.poll(async () => (await stored(page)).notes.map((n: {body: string; tags?: string[]}) => [n.body, n.tags ?? []])).toEqual([
      ['Colosseum. #journeys', []], ['The trip. See [[Fictional Rome]].', ['journeys']], ['Socks.', []], ['A fictional quiet day.', []]]);
    await expect.poll(async () => (await stored(page)).versions?.length).toBe(1);
    await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).first().click();
    await expect.poll(async () => (await stored(page)).notes[0].body).toBe('Colosseum. #trip');
    // #408: the table adds up its Number and Tick columns.
    await list.getByRole('group', {name: 'Show notes as'}).getByRole('button', {name: 'Table'}).click();
    const foot = list.locator('.notes-table tfoot');
    await expect(foot).toContainText('Sum 400');
    await expect(foot).toContainText('Average 200');
    await expect(foot).toContainText('1 of 3 ticked');
    await noSideways(page);
  });
  test(`${theme}: a property on several notes, then merge two notes and undo`, async ({page, isMobile}) => {
    await open(page, theme, isMobile, '/app/notes?view=notes');
    const list = page.locator('section[aria-labelledby="note-list-title"]');
    await list.getByRole('button', {name: 'Select', exact: true}).click();
    const pick = list.getByRole('list', {name: 'Notes to choose'}), bar = list.getByRole('group', {name: 'Act on the chosen notes'});
    await pick.getByRole('checkbox', {name: /Fictional packing/}).check();
    await pick.getByRole('checkbox', {name: /Fictional Italy/}).check();
    const prop = bar.getByRole('group', {name: /Set a property/});
    await prop.getByLabel('Property').fill('Status');
    await prop.getByLabel('Type').selectOption('choice');
    await prop.getByLabel('Value').fill('Planning');
    await prop.getByRole('button', {name: 'Set property'}).click();
    await expect(page.getByText('Status set on 2 notes.').first()).toBeVisible();
    await expect.poll(async () => (await stored(page)).notes.filter((n: {props?: {k: string}[]}) => n.props?.some(p => p.k === 'Status')).length).toBe(2);
    await page.keyboard.press('Escape');
    // #407: merge Rome into Italy.
    await page.goto('/app/notes?note=n-a'); await hydrated(page);
    const editor = page.getByRole('article', {name: 'Fictional Rome'});
    await editor.getByRole('button', {name: 'Merge into…'}).click();
    const merge = editor.getByRole('group', {name: /Merge “Fictional Rome” into another note/});
    await expect(merge.getByLabel('Merge into')).toBeFocused();
    await merge.getByLabel('Merge into').selectOption({label: 'Fictional Italy'});
    await expect(merge).toContainText('1 note links to it');
    const findings = await axe(page, merge);
    expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
    await merge.getByRole('button', {name: /Merge into “Fictional Italy”/}).click();
    await expect(page).toHaveURL(/note=n-b/);
    await expect.poll(async () => (await stored(page)).trash?.map((n: {id: string}) => n.id)).toEqual(['n-a']);
    await expect.poll(async () => (await stored(page)).notes.find((n: {id: string}) => n.id === 'n-b').body).toBe('The trip. See [[Fictional Italy#Fictional Rome]].\n\n## Fictional Rome\n\nColosseum. #trip');
    await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).first().click();
    await expect.poll(async () => (await stored(page)).notes.length).toBe(4);
    await expect.poll(async () => (await stored(page)).trash).toBeUndefined();
    await noSideways(page);
  });
  test(`${theme}: a daily note read back, and Not read back yet`, async ({page, isMobile}) => {
    await open(page, theme, isMobile, '/app/notes?view=days');
    const days = page.locator('section[aria-labelledby="note-days-title"]');
    await expect(days.locator('.note-read-back-fold > summary')).toContainText('1 daily note of the last 30 days');
    await days.locator('.note-read-back-fold > summary').click();
    await days.getByRole('button', {name: /Mark .* read back/}).click();
    await expect.poll(async () => (await stored(page)).notes[3].readBack).toBe('2026-11-22');
    await expect(days.locator('.note-read-back-mark')).toHaveCount(1);
    await page.goto('/app/notes?day=2026-11-18'); await hydrated(page);
    await expect(page.locator('.note-this-day-read')).toContainText('Read back on');
    const button = page.getByRole('button', {name: /^Read back/});
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await button.focus(); await page.keyboard.press('Enter');
    await expect.poll(async () => (await stored(page)).notes[3].readBack).toBeUndefined();
    await noSideways(page);
  });
}
