import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #273, Obsidian's Canvas): Notes → Canvas makes a board; a note card and a text card
 * are added; the focused card moves with the arrow keys; two cards are joined by a labelled line (listed under "Lines on
 * this board"); a group is added; Remove has Undo; Export .canvas saves a JSON Canvas file. At 390 and 1440, Nebula,
 * Light and Dark, axe-clean, no sideways page scroll at 320 (the board scrolls in its own region). Fictional data.
 */
test.use({timezoneId: 'UTC', acceptDownloads: true});
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional trip', body: 'Kyoto in spring.', createdAt: '2026-11-01T09:00:00.000Z'}]};
type Stored = {canvases?: {name: string; nodes: {id: string; type: string; x: number; y: number}[]; edges: {label?: string}[]}[]};
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}') as Stored, NOTES_KEY);
for (const theme of THEMES) test(`${theme}: a canvas of cards, lines and a group`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?view=canvas'); await hydrated(page);
  const panel = page.getByRole('region', {name: 'Canvas'});
  await panel.getByLabel('A name for your first board').fill('Fictional plan');
  await panel.getByRole('button', {name: 'Make a board'}).click();
  await expect.poll(async () => (await stored(page)).canvases?.map(c => c.name)).toEqual(['Fictional plan']);
  const tools = panel.getByRole('group', {name: 'Add to the board'});
  await tools.getByLabel('Note card').selectOption('n-a');
  await tools.getByRole('button', {name: 'Add the note'}).click();
  const noteCard = panel.getByRole('group', {name: /^Note “Fictional trip”/});
  await expect(noteCard).toBeFocused();
  await tools.getByLabel('Text card').fill('Book the fictional train');
  await tools.getByRole('button', {name: 'Add the text'}).click();
  const textCard = panel.getByRole('group', {name: /^Text “Book the fictional train”/});
  await expect(textCard).toBeFocused();
  // The arrow keys move the focused card, on the 10-point grid.
  const before = (await stored(page)).canvases![0]!.nodes.find(n => n.type === 'text')!;
  await textCard.press('ArrowDown'); await textCard.press('Shift+ArrowRight');
  await expect.poll(async () => (await stored(page)).canvases![0]!.nodes.find(n => n.type === 'text')).toMatchObject({x: before.x + 50, y: before.y + 10});
  await expect(textCard).toBeFocused();
  // Join it to the note card with a labelled line.
  const sel = panel.getByRole('region', {name: 'Text “Book the fictional train”'});
  // Session AV lane 2 (fixb3: "Join to" also matched the form "Join to another card", deliberate): the list named exactly Join to.
  await sel.getByRole('combobox', {name: 'Join to', exact: true}).selectOption({label: 'Note “Fictional trip”'});
  await sel.getByLabel('Line label — optional').fill('then');
  await sel.getByRole('button', {name: 'Join'}).click();
  const lines = panel.getByRole('region', {name: /^Lines on this board/});
  await expect(lines.getByRole('listitem')).toHaveText([/Text “Book the fictional train” → Note “Fictional trip”: then/]);
  await expect(textCard).toHaveAccessibleName(/1 line/);
  // A group.
  await tools.getByLabel('Group').fill('Fictional spring');
  await tools.getByRole('button', {name: 'Add a group'}).click();
  await expect.poll(async () => (await stored(page)).canvases![0]!.nodes.map(n => n.type)).toEqual(['group', 'note', 'text']);
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Remove a card with Delete, then Undo.
  await textCard.focus(); await textCard.press('Delete');
  await expect(textCard).toHaveCount(0);
  await expect(lines.getByRole('listitem')).toHaveCount(0);
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(panel.getByRole('group', {name: /^Text “Book the fictional train”/})).toBeVisible();
  await expect(lines.getByRole('listitem')).toHaveCount(1);
  // Export a .canvas file.
  const [download] = await Promise.all([page.waitForEvent('download'), panel.getByRole('button', {name: 'Export .canvas'}).click()]);
  expect(download.suggestedFilename()).toBe('Fictional plan.canvas');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
