import {expect, test} from '@playwright/test';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../lib/af-checklist-keys';
import {createHabit, habitDataSchema, HABITS_KEY} from '../lib/habits';
import {LOCAL_LABEL} from '../lib/ai/local-answers/words';
import {buildShowcase} from '../lib/showcase-data';
import {checklistRecords, DAY, lastLocal, MORNING, openChat, panel, say, seed, server, showcaseHabits, speak, SEEN_VOICE, stored, voiceFakes} from './zigi-af';

/**
 * Session AF (L4, P8.6): the Checklist by voice and text through the real panel on a production build. A command is
 * decided on the device and becomes the usual card the person adds (never a write by itself), with no request to the
 * person's AI even while it is connected; the Checklist's records change only through the Checklist lane's entries
 * (its own item, its own day record), a habit dot only through the habit's own check-in with its Undo.
 */
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
const card = (page: import('@playwright/test').Page) => panel(page).locator('.ai-card').last();
/**
 * The Showcase's habits count or time (minutes, steps, glasses), so the test adds one fictional done-or-not habit,
 * "Stretch", with nothing recorded yet and not on the test's path.
 */
const STRETCH = {id: '92000000-0000-4000-8000-0000000000af', title: 'Stretch'};
function withStretch(): Record<string, string> {
  const data = habitDataSchema.parse(JSON.parse(buildShowcase(DAY).records[HABITS_KEY]!));
  const next = createHabit(data, {title: STRETCH.title, category: 'Wellbeing', description: 'TEST DATA · fictional', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'boolean'}}, new Date(`${DAY}T05:00:00.000Z`), STRETCH.id);
  return {[HABITS_KEY]: JSON.stringify(next)};
}

test('typed, English and Dutch: tick the person\'s own item, add one in their words, star a habit; the AI is never asked', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {extra: checklistRecords(), time: MORNING});
  await page.goto('/app');
  await openChat(page);
  await say(page, 'mark push-ups done');
  await expect(lastLocal(page)).toContainText('Check off · Push-ups · today.');
  await expect(lastLocal(page)).toContainText(LOCAL_LABEL);
  await expect(card(page).getByRole('heading', {name: 'Tick on your Checklist: Push-ups'})).toBeVisible();
  // Nothing ticked before the person adds it (the Checklist itself opens today's day record when Today shows it).
  const before = await stored(page, CHECKLIST_DAYS_KEY);
  expect({custom: before?.today?.custom ?? [], ticks: before?.today?.ticks ?? [], days: before?.days ?? {}}).toEqual({custom: [], ticks: [], days: {}});
  await card(page).getByRole('button', {name: 'Apply'}).click();
  await expect(card(page)).toContainText('Ticked on your Checklist: Push-ups');
  expect((await stored(page, CHECKLIST_DAYS_KEY))!.today).toMatchObject({date: DAY, custom: ['ck_push']});
  await say(page, 'zet 5 bladzijden lezen op mijn lijst');
  await expect(lastLocal(page)).toContainText('Op je Checklist zetten · 5 bladzijden lezen.');
  await card(page).getByRole('button', {name: 'Apply'}).click();
  await expect(card(page)).toContainText('On your Checklist: 5 bladzijden lezen');
  expect((await stored(page, CHECKLIST_KEY))!.items.filter((i: {kind: string}) => i.kind === 'custom').map((i: {label: string}) => i.label)).toEqual(['Push-ups', 'Buy running shoes', '5 bladzijden lezen']);
  await say(page, 'favourite walk');
  await card(page).getByRole('button', {name: 'Apply'}).click();
  await expect(card(page)).toContainText('On your Checklist: Walk');
  expect((await stored(page, CHECKLIST_KEY))!.items.some((i: {ref?: {habitId?: string}}) => i.ref?.habitId === showcaseHabits().Walk)).toBe(true);
  // A question, a second clause or an amount is not a command: it goes to the person's AI as before.
  // (A log may bring the app's own repair round, a second request: what counts is that the AI got these words.)
  await say(page, 'mark push-ups done and log a glass of water');
  await expect.poll(() => bodies.some(b => JSON.stringify(b.messages).includes('mark push-ups done and log a glass of water'))).toBe(true);
});

test('a habit dot is the habit\'s own check-in, with Undo; the sleep timer starts the night; an unknown item is left to the AI', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {extra: {...checklistRecords(), ...withStretch()}, time: MORNING});
  await page.goto('/app');
  await openChat(page);
  // A done-or-not habit with nothing recorded today, named by its title.
  const open = STRETCH;
  await say(page, `tick off ${open.title}`);
  await expect(card(page).getByRole('heading', {name: `Check in: ${open.title}`})).toBeVisible();
  await expect(card(page)).toContainText('Not on your Checklist: this checks in the habit itself');
  await card(page).getByRole('button', {name: 'Add'}).click();
  await expect(panel(page).getByRole('button', {name: /^Undo/})).toBeVisible();
  const entry = async () => ((await stored(page, HABITS_KEY))!.habits as {id: string; entries: {date: string}[]}[]).find(h => h.id === open.id)!.entries.find(e => e.date === DAY);
  await expect.poll(entry).toBeTruthy();
  await panel(page).getByRole('button', {name: /^Undo/}).click();
  await expect.poll(entry).toBeFalsy();
  await say(page, 'start my sleep timer');
  await expect(card(page)).toContainText(/night/i);
  expect(bodies).toEqual([]);
  await say(page, 'mark juggling done');
  await expect.poll(() => bodies.some(b => JSON.stringify(b.messages).includes('mark juggling done'))).toBe(true);
});

test('spoken in Dutch: "euh, vink push-ups af" becomes the same card, on the device', async ({page}) => {
  await voiceFakes(page);
  const bodies = await server(page);
  await seed(page, {extra: checklistRecords(), time: MORNING, voice: SEEN_VOICE});
  await page.goto('/app');
  await openChat(page);
  const mic = panel(page).getByRole('button', {name: /^(Talk to ZIGi|Stop listening)$/});
  await mic.evaluate(el => { for (const type of ['pointerdown', 'pointerup']) el.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, button: 0, pointerId: 7, pointerType: 'mouse', isPrimary: true})); });
  await expect(mic).toHaveAttribute('aria-pressed', 'true');
  await speak(page, 'euh, vink push-ups af');
  await expect(lastLocal(page)).toContainText('Afvinken · Push-ups · vandaag.');
  await expect(card(page).getByRole('heading', {name: 'Tick on your Checklist: Push-ups'})).toBeVisible();
  expect(bodies).toEqual([]);
});
