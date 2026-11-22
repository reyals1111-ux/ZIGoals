import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, logHabitValue, HABITS_KEY} from '../lib/habits';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-WEEK-GRID; Habitify's week view): Habits → "This week, Monday to Sunday": every habit
 * by day; Tuesday's missed walk ticked late with Undo, later days not tappable, the week before one tap away — at 390
 * and 1440, in Nebula, Light and Dark, axe-clean, no sideways page scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-01T08:00:00+01:00'), NOW = new Date('2026-11-25T08:00:00+01:00'), ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const tuesday = (page: Page) => page.evaluate(([k, id]) => (JSON.parse(localStorage.getItem(k) ?? '{"habits":[]}').habits as {id: string; entries: {date: string; count: number}[]}[]).find(h => h.id === id)?.entries.find(e => e.date === '2026-11-24')?.count ?? 0, [HABITS_KEY, ID] as const);
for (const theme of THEMES) test(`${theme}: Tuesday ticked late in the week grid, with Undo`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let d = createHabit(emptyHabitData(), {title: 'Fictional walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, ID);
  d = logHabitValue(d, ID, '2026-11-23', 1, {}, NOW);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-25'); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);
  await page.locator('summary', {hasText: 'This week, Monday to Sunday'}).click();
  const grid = page.getByRole('region', {name: 'Habits this week, by day'});
  await expect(grid.getByRole('columnheader')).toHaveCount(8);
  await expect(grid.getByRole('button', {name: /^Fictional walk, Mon, Nov 23: done$/})).toHaveAttribute('aria-pressed', 'true');
  await expect(grid.getByRole('img', {name: /^Fictional walk, Thu, Nov 26: ahead$/})).toBeVisible();
  const findings = await axe(page, page.locator('.habit-week'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await grid.getByRole('button', {name: /^Fictional walk, Tue, Nov 24: missed$/}).click();
  await expect.poll(() => tuesday(page)).toBe(1);
  await expect(grid.getByRole('button', {name: /^Fictional walk, Tue, Nov 24: done$/})).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(() => tuesday(page)).toBe(0);
  await page.getByRole('group', {name: 'Which week'}).getByRole('button', {name: '← Week before'}).click();
  await expect(grid.getByRole('columnheader').nth(1)).toContainText('16');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

/**
 * q4 #30, #26, #32 (Major): at 390 and 320 the habit's name stays in view while the days scroll and never breaks inside
 * a word; a quit habit's slip draws a ×, not the blank of a day ahead; each name has its symbol; and a missed day of the
 * week offers "What got in the way?" (nothing chosen; Escape gives the focus back), kept as that day's note.
 */
test('the week grid on a phone: a sticky name, a slip marked ×, the symbol, and what got in the way', async ({page}) => {
  await offline(page);
  await page.setViewportSize({width: 390, height: 844});
  await page.clock.install({time: NOW});
  const SNACKS = 'aaaaaaaa-0000-4000-8000-000000000002';
  let d = createHabit(emptyHabitData(), {title: 'Fictional exercise routine', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, ID);
  d = createHabit(d, {title: 'Fictional late snacks', category: 'Health', description: '', notes: '', type: 'quit', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'times'}, target: 0}, START, SNACKS);
  d = logHabitValue(d, ID, '2026-11-23', 1, {}, NOW);
  d = logHabitValue(d, SNACKS, '2026-11-24', 1, {}, NOW);
  const extras = {version: 1, looks: {[ID]: {glyph: '▲', colour: 'teal'}}};
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v, x]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:habit-extras:v1', x); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-25'); }, [HABITS_KEY, JSON.stringify(d), JSON.stringify(extras)] as const);
  await page.goto('/app/habits'); await hydrated(page);
  await page.locator('summary', {hasText: 'This week, Monday to Sunday'}).click();
  const grid = page.getByRole('region', {name: 'Habits this week, by day'});
  await expect(grid.getByRole('img', {name: /^Fictional late snacks, Tue, Nov 24: missed$/})).toHaveText('×');
  await expect(grid.getByRole('rowheader', {name: 'Fictional exercise routine'}).locator('.habit-look')).toHaveText(/▲/);
  for (const width of [390, 320]) {
    await page.setViewportSize({width, height: 720});
    const name = grid.getByRole('rowheader', {name: 'Fictional exercise routine'});
    // Never broken inside a word: each line of the name ends at a word.
    expect(await name.evaluate(el => {
      const r = document.createRange(), lines = new Map<number, string>(), words = new Set('Fictional exercise routine'.split(' '));
      for (const node of [...el.childNodes].filter(n => n.nodeType === 3)) { const t = node.textContent ?? ''; for (let i = 0; i < t.length; i++) { r.setStart(node, i); r.setEnd(node, i + 1); const top = Math.round(r.getBoundingClientRect().top); lines.set(top, (lines.get(top) ?? '') + t[i]); } }
      return [...lines.values()].every(l => !l.trim() || l.trim().split(/\s+/).every(w => words.has(w)));
    })).toBe(true);
    await grid.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    const box = await name.boundingBox(), area = await grid.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(area!.x - 1); // still in view after the days scroll
    await expect(page.locator('.habit-week-cue')).toBeVisible();
  }
  const findings = await axe(page, page.locator('.habit-week'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.locator('.habit-week-why summary').click();
  const ask = page.getByRole('button', {name: 'Fictional exercise routine, Tue, Nov 24: what got in the way?'});
  await ask.click();
  const form = page.getByRole('form', {name: 'What got in the way of Fictional exercise routine on Tue, Nov 24'});
  await expect(form.getByRole('radio', {checked: true})).toHaveCount(0);
  await form.getByLabel('Too busy').focus(); await page.keyboard.press('Escape');
  await expect(ask).toBeFocused();
  await ask.click();
  await form.getByLabel('Too busy').check();
  await form.getByRole('button', {name: 'Save as not done'}).click();
  await expect(page.locator('.habit-week-why')).toContainText('“Too busy”');
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
  const note = await page.evaluate(([k, id]) => (JSON.parse(localStorage.getItem(k)!).habits as {id: string; entries: {date: string; disposition: string; note: string}[]}[]).find(h => h.id === id)?.entries.find(e => e.date === '2026-11-24'), [HABITS_KEY, ID] as const);
  expect(note).toMatchObject({disposition: 'failed', note: 'Too busy'});
});
