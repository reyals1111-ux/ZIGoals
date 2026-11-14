import {expect, test, type Locator, type Page} from '@playwright/test';
import {appendFileSync} from 'node:fs';
import {openZigi, sendToZigi, zigiPanel} from '../../zigi-open';
import {buildShowcase} from '../../../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import {AI_OPTIONS_KEY} from '../../../lib/ai/store/keys';
import {HABITS_KEY} from '../../../lib/habits';
import {TASKS_KEY} from '../../../lib/tasks/schema';
import {PLATFORM_KEY} from '../../../lib/positions';
import {AVERAGE_GOALS_KEY} from '../../../lib/average-goals/store';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../../../lib/af-checklist-keys';
import {HID, denver, lisbon} from '../../../lib/ai/evals/l7-fourth-fixtures';
import {nova, sendInNova} from './helpers';
import {openSettings} from '../../settings-open';

/**
 * Session AL fifth pass (lane L7-5b): what a person sees for the answer rows GROK53_REPLAY_L7_2 (on 37d2370c) still found
 * open, typed as the bots typed them, in their conditions: no model, Wed 4 Nov 2026 02:30 in Brussels (08:30 for the
 * morning brief), Lisbon's path (L1/L2), Denver's goals, or the Showcase. Each bot's exact words are written to
 * L7_FIFTH_OUT when it is set (the lane's evidence). Expected to FAIL on 37d2370c and PASS on the branch.
 */
const NIGHT = '2026-11-04T01:30:00.000Z', BRIEF = '2026-11-04T07:30:00.000Z', DAY = '2026-11-04';
const offline = (page: Page) => page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
const zigiTurn = (page: Page) => zigiPanel(page).locator('.ai-turn-local').last();
const novaTurn = (page: Page) => nova(page).locator('.nova-turn-local').last();
const base = {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'})};
type Set = 'L1' | 'L2' | 'L2-floss' | 'DV' | 'DV-avg' | 'Sc' | 'fresh';
function records(set: Set): Record<string, string> {
  if (set === 'Sc') return {...buildShowcase(DAY).records, ...base};
  if (set === 'fresh') return {...base};
  const s = set.startsWith('DV') ? denver() : lisbon(set === 'L1' ? 'L1' : 'L2');
  const out: Record<string, string> = {...base, [HABITS_KEY]: JSON.stringify(s.habits), [PLATFORM_KEY]: JSON.stringify(s.platform), ...(s.nova?.tasks ? {[TASKS_KEY]: JSON.stringify(s.nova.tasks)} : {}),
    ...(s.checklist ? {[CHECKLIST_KEY]: JSON.stringify(s.checklist.record), [CHECKLIST_DAYS_KEY]: JSON.stringify(s.checklist.days)} : {})};
  if (set === 'L2-floss' && s.checklist) {
    const r = s.checklist.record, items = [...r.items.filter(i => i.ref?.habitId !== HID.inject), {id: 'ck_floss', kind: 'custom', label: 'Floss teeth', section: 'morning', addedAt: '2026-10-21T08:00:00.000Z'}];
    out[CHECKLIST_KEY] = JSON.stringify({...r, items, order: items.map(i => i.id)});
  }
  if (set === 'DV-avg') out[AVERAGE_GOALS_KEY] = JSON.stringify({version: 1, goals: [
    {id: 'dv-sleep-7', name: 'Sleep 7 hours a night', metric: 'sleep-hours', unit: 'h a night', target: 7, direction: 'at-least', windowDays: 14, status: 'active', createdAt: '2026-10-25T08:00:00.000Z', entries: []},
    {id: 'dv-sleep-avg', name: 'DV Sleep avg', metric: 'sleep-hours', unit: 'h a night', target: 7, direction: 'at-least', windowDays: 14, status: 'active', createdAt: '2026-10-25T08:00:00.000Z', entries: []}]});
  return out;
}
async function seed(page: Page, set: Set, time = NIGHT) {
  await offline(page);
  await page.clock.install({time});
  await openSettings(page);
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, records(set));
  await page.waitForLoadState('networkidle');
}
/** The words the person sees in a turn, kept as the lane's evidence. */
async function said(id: string, where: string, ask: string, turn: Locator): Promise<string> {
  const text = (await turn.innerText()).replace(/\s+\n/g, '\n').trim();
  if (process.env.L7_FIFTH_OUT) appendFileSync(process.env.L7_FIFTH_OUT, `### ${id} · ${where}\n> ${ask.length > 120 ? `${ask.slice(0, 117)}…` : ask}\n${text}\n\n`);
  return text;
}
async function askZigi(page: Page, id: string, path: string, ask: string) {
  await page.goto(path); await openZigi(page); await sendToZigi(page, ask);
  await expect(zigiTurn(page)).toBeVisible();
  return said(id, `ZIGi ${path}`, ask, zigiTurn(page));
}
async function askNova(page: Page, id: string, ask: string) {
  await page.goto('/app/nova'); await sendInNova(page, ask);
  await expect(novaTurn(page)).toBeVisible();
  return said(id, 'NOVA', ask, novaTurn(page));
}
const both = async (page: Page, id: string, path: string, ask: string, check: (text: string) => void) => {
  check(await askZigi(page, id, path, ask));
  check(await askNova(page, id, ask));
};

test.describe('desktop (1280, en-GB, Europe/Brussels)', () => {
  test.use({viewport: {width: 1280, height: 900}, timezoneId: 'Europe/Brussels', locale: 'en-GB'});

  test('ZIGi #19: "Add a habit called Evening walk" makes the habit "Evening walk"', async ({page}) => {
    await seed(page, 'fresh');
    await both(page, 'ZIGi #19', '/app/today', 'Add a habit called Evening walk', text => { expect(text).toContain('A new habit, Evening walk.'); expect(text).not.toContain('“walk”'); });
  });
  test('H7: "Exercise last week" answers last week, with no Save preview for today', async ({page}) => {
    await seed(page, 'Sc');
    await both(page, 'H7', '/app/habits', 'Exercise last week', text => { expect(text).toMatch(/You checked in Exercise \d+ times? last week/); expect(text).not.toMatch(/Will save/); });
    await page.goto('/app/journey'); await openZigi(page); await sendToZigi(page, 'Exercise last week');
    await expect(zigiTurn(page)).toContainText('last week');
    await expect(zigiPanel(page).getByText(/Will save/)).toHaveCount(0);
  });
  test('own-b: "I flossed my teeth" ticks the person\'s own item "Floss teeth"', async ({page}) => {
    await seed(page, 'L2-floss');
    await both(page, 'own-b', '/app/tasks', 'I flossed my teeth', text => { expect(text).toContain('Check off · Floss teeth · today.'); expect(text).toContain('Tick on your Checklist: Floss teeth'); });
    // (The card's button reads "Apply" here, other cards "Add": Lisbon N-LA-02, components lane.)
    await expect(novaTurn(page).getByRole('button', {name: /^(?:Add|Apply)\b/})).toBeVisible();
  });
  test('#337/338: a 300-character "add …" gets the too-long note', async ({page}) => {
    await seed(page, 'L2');
    await both(page, '#337/338', '/app/tasks', `add ${'x'.repeat(300)}`, text => expect(text).toContain('That is too long to add as one item (300 characters): a task title holds up to 140 characters'));
  });
  test('#216/LA-028: "show my checklist" ×40 answers as once', async ({page}) => {
    await seed(page, 'L2');
    await both(page, '#216 LA-028', '/app/tasks', Array(40).fill('show my checklist').join(' '), text => expect(text).toContain('Checklist today: 1 of 4 done.'));
  });
  test('LZ-019: a two-line message answers both lines', async ({page}) => {
    await seed(page, 'L1');
    const check = (text: string) => { expect(text).toContain('Opening Goals.'); expect(text).toContain('Habits still open: Drink water'); };
    check(await askZigi(page, 'LZ-019', '/app/tasks', 'open goals\nand tell me what is left today'));
    // NOVA's dashboard field is one line; the two lines are typed in the chat's own box, as a person does there.
    await askNova(page, 'LZ-019 (first turn)', 'What is due today?');
    await sendInNova(page, 'open goals\nand tell me what is left today');
    await expect(novaTurn(page)).toContainText('Opening Goals.');
    check(await said('LZ-019', 'NOVA', 'open goals\nand tell me what is left today', novaTurn(page)));
  });
  test('N-LA-01: an unmatched wording says what the device does before the examples', async ({page}) => {
    await seed(page, 'L1');
    await both(page, 'N-LA-01', '/app/tasks', 'Tell me a joke', text => expect(text).toContain('That isn’t something I can answer from your records here. Without a brain I answer about your habits, Checklist, tasks, goals'));
  });
  test('DVR:Z-052: two goals in one question get both goals', async ({page}) => {
    await seed(page, 'Sc');
    await both(page, 'DVR:Z-052', '/app/goals', 'How far am I on my Emergency fund goal and my First home deposit goal?', text => { expect(text).toMatch(/Emergency fund: \d+% of the target/); expect(text).toMatch(/First home deposit: \d+% of the target/); expect(text).not.toContain('Contributions this month'); });
  });
  test('Z-021/N-040: an average Sleep goal is a goal, not the Health gate', async ({page}) => {
    await seed(page, 'DV-avg');
    await both(page, 'Z-021', '/app/goals', 'Show my Sleep 7 hours a night goal', text => { expect(text).toContain('Sleep 7 hours a night (a goal that keeps an average): at least 7 h a night over the last 14 days.'); expect(text).toContain('its average is not read'); });
    await both(page, 'N-040', '/app/goals', 'How far am I on my DV Sleep avg goal?', text => expect(text).toContain('DV Sleep avg (a goal that keeps an average)'));
  });
  test('N16/N17, T6/T7: a routine asked for points to the person\'s own AI', async ({page}) => {
    await seed(page, 'L2');
    await both(page, 'N17', '/app/today', '10-minute morning routine', text => expect(text).toContain('Suggestions and routines written for you need your own AI'));
    await both(page, 'T7', '/app/today', 'give me a 10-minute routine for tonight', text => expect(text).toContain('Suggestions and routines written for you need your own AI'));
  });
  test('TK #10: the ZIG price says where it comes from', async ({page}) => {
    await seed(page, 'Sc');
    await both(page, 'TK #10', '/app/wealth', 'What is the price of ZIG?', text => expect(text).toMatch(/The Wealth figure is the value you entered yourself \(Manual value\), not a market price\.|Markets: [\d.]+ USD per ZIG/));
  });
  test('TK #14–16: "and in EUR?", "and BTC?", "and for ETH?" keep the previous question\'s subject', async ({page}) => {
    await seed(page, 'Sc');
    await page.goto('/app/markets'); await openZigi(page);
    for (const ask of ['What is the price of ETH?', 'and in EUR?', 'and BTC?', 'and for ETH?']) {
      await sendToZigi(page, ask); await expect(zigiTurn(page)).toBeVisible();
      const text = await said('TK #14–16', 'ZIGi /app/markets', ask, zigiTurn(page));
      expect(text, ask).not.toContain('Until you give me a brain');
    }
  });
  test('#352/353, LA-010, LZ-020, ZIGi-F8: German "Was steht auf meiner Checkliste?" gets the English-for-now note', async ({page}) => {
    await seed(page, 'L2');
    await both(page, '#352/353', '/app/tasks', 'Was steht auf meiner Checkliste?', text => { expect(text).toContain('Im Moment antworte ich auf Englisch (und Niederländisch).'); expect(text).toContain('Checklist today: 1 of 4 done.'); });
  });
  test('DVR:D-061: "what should I do with …" in EN and NL: a goal\'s figures under the no-advice line, a money thing the no-advice line', async ({page}) => {
    await seed(page, 'Sc');
    await both(page, 'DVR:D-061', '/app/goals', 'What should I do with my Emergency fund?', text => expect(text).toMatch(/^(?:NOVA\n)?What to do with it is your choice: I don’t advise on money\. The goal’s own figures: Emergency fund:/));
    await both(page, 'DVR:D-061', '/app/goals', 'Wat moet ik met mijn noodfonds doen?', text => expect(text).toContain('Ik kan geen advies geven over kopen, verkopen, staken of beleggen: die keuze is aan jou.'));
  });
  test('LA-034: "Did I drink water today?" says "1 time"', async ({page}) => {
    await seed(page, 'L2');
    await both(page, 'LA-034', '/app/tasks', 'Did I drink water today?', text => { expect(text).toContain('Drink water: 1 time today'); expect(text).not.toContain('1 times'); });
  });
  test('N-045/DV-077: the morning brief has a goal line (Showcase, 08:30)', async ({page}) => {
    await seed(page, 'Sc', BRIEF);
    await page.goto('/app/nova');
    await page.getByRole('button', {name: /Your day/}).first().click();
    const sheet = page.getByRole('dialog', {name: /Your day/});
    await expect(sheet).toBeVisible();
    await sheet.locator('summary', {hasText: 'Morning brief'}).first().click();
    const text = await said('N-045 DV-077', 'NOVA → Your day', '(sheet)', sheet);
    expect(text).toMatch(/Goal|Goals with a step this week/);
  });
});
