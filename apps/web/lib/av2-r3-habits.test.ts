import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, saveHabitTimezone, type HabitData} from './habits';
import {addLocalDays} from './local-date';
import {habitTrend30, habitTrendList, trendSentence} from './habits-v2/trend';
import {readReminderMore, reminderMoreOf, reminderWordsIn, withReminderMore} from './habit-reminder-words';
import {habitExtrasSchema} from './habits-extras/schema';
import {collectEverything} from './export/everything';
import {nextValue, planParts} from './restore/plan';
import {HABIT_EXTRAS_KEY} from './aa-device-keys';
import {buildPlan, type PlanInput} from './notify/plan';
import {emptyNotifyPrefs} from './notify/prefs';
import {zonedInstant} from './notify/zone';

/**
 * Session AV lane 2 (health r3; LEDGER #275, #276, Way of Life): a habit reminder in the person's own words with up to two
 * more times a day (TIER 3 (stored format) on the loose habit extras; TIER 3 (PWA) in the plan), and each habit's last
 * 30 days beside the 30 before, in plain words.
 */
const AT = '2026-11-22T08:00:00.000Z', TODAY = '2026-11-20', NOW = Date.UTC(2026, 10, 20, 6, 0);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: 'UTC', prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '06:30'}, labels: false, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string}}}).self.zigoalsCompose;
};

describe('a habit reminder in your own words, and more times (LEDGER #275)', () => {
  test('reads only what it can: words up to 80 characters, at most two valid times', () => {
    const extras = {version: 1, reminderMore: {h1: {words: ' Shoes by the door? ', times: ['18:00', '07:30', 'later', '07:30', '21:00']}, h2: {words: 'x'.repeat(81)}, h3: 'loud'}};
    expect(reminderMoreOf(extras, 'h1')).toEqual({words: 'Shoes by the door?', times: ['07:30', '18:00']});
    expect(reminderMoreOf(extras, 'h2')).toEqual({times: []});
    expect(reminderMoreOf(extras, 'h3')).toEqual({times: []});
    expect(reminderMoreOf(extras, '__proto__')).toEqual({times: []});
    expect(reminderWordsIn(JSON.stringify(extras), 'h1')).toBe('Shoes by the door?');
    expect(reminderWordsIn('{not json', 'h1')).toBeNull();
  });
  test('the editor says what to fix, drops the base time and repeats', () => {
    expect(readReminderMore('Shoes by the door?', ['18:00', '18:00'], '07:00')).toEqual({ok: true, value: {words: 'Shoes by the door?', times: ['18:00']}});
    expect(readReminderMore('', ['07:00', ''], '07:00')).toEqual({ok: true, value: {times: []}});
    expect(readReminderMore('x'.repeat(81), [], '07:00')).toMatchObject({ok: false, issue: {field: 'words'}});
    expect(readReminderMore('   ', ['25:00'], '07:00')).toMatchObject({ok: false, issue: {field: 'times'}});
  });
  test('saved on its own, the other habits and fields kept; an old record reads as before; an odd one is dropped', () => {
    const old = habitExtrasSchema.parse({version: 1, times: {h1: '07:00'}});
    expect(old.reminderMore).toBeUndefined();
    let x = withReminderMore(old, 'h1', {words: 'Shoes by the door?', times: ['18:00']});
    x = withReminderMore(x, 'h2', {times: ['12:00']});
    expect(habitExtrasSchema.parse(x).reminderMore).toEqual({h1: {words: 'Shoes by the door?', times: ['18:00']}, h2: {times: ['12:00']}});
    expect(withReminderMore(x, 'h1', {times: []}).reminderMore).toEqual({h2: {times: ['12:00']}});
    expect('reminderMore' in withReminderMore(withReminderMore(x, 'h1', null), 'h2', null)).toBe(false);
    expect(habitExtrasSchema.parse({version: 1, times: {h1: '07:00'}, reminderMore: 'odd'})).toEqual({version: 1, times: {h1: '07:00'}});
  });
  test('Export everything → erase → Restore keeps them', () => {
    const value = {version: 1, reminderMore: {h1: {words: 'Shoes by the door?', times: ['18:00']}}};
    const collected = collectEverything({[HABIT_EXTRAS_KEY]: JSON.stringify(value)}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === HABIT_EXTRAS_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back ? back.value : undefined).toEqual(value);
  });
  test('each extra time is its own wake with the same Done; the words show only where names are allowed', () => {
    const habit = {id: 'h1', title: 'Run', words: 'Shoes by the door?', more: ['12:00', '18:00'], time: '07:00', weekdays: 127, doneToday: false};
    const plan = buildPlan(base({habits: [habit]}));
    const today = plan.snapshot.items.filter(i => i.kind === 'habit' && i.at < zonedInstant('2026-11-21', '00:00', 'UTC'));
    expect(today.map(i => [i.id, i.at])).toEqual([['h1', zonedInstant(TODAY, '07:00', 'UTC')], ['h1', zonedInstant(TODAY, '12:00', 'UTC')], ['h1', zonedInstant(TODAY, '18:00', 'UTC')]]);
    expect(today.every(i => i.actionable && i.label === undefined)).toBe(true);
    const named = buildPlan(base({habits: [habit], labels: true}));
    expect(named.snapshot.items.find(i => i.kind === 'habit')?.label).toBe('Shoes by the door?');
    expect(composer()(named.snapshot, zonedInstant(TODAY, '12:00', 'UTC')).body).toContain('Shoes by the door?');
    expect(composer()(plan.snapshot, zonedInstant(TODAY, '12:00', 'UTC')).body).not.toContain('Shoes');
    // Done today: every time is quiet today.
    const done = buildPlan(base({habits: [{...habit, doneToday: true}]}));
    expect(done.snapshot.items.filter(i => i.kind === 'habit' && i.at < zonedInstant('2026-11-21', '00:00', 'UTC'))).toEqual([]);
  });
});

const id = '55555555-5555-4555-8555-555555555555';
const at = (day: string) => new Date(`${day}T08:00:00.000Z`);
const start = (day: string, title = 'Walk'): HabitData => createHabit(saveHabitTimezone(emptyHabitData(), 'UTC'), {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'boolean'}} as never, at(day), id);
const log = (data: HabitData, day: string) => logHabitValue(data, id, day, 1, {mode: 'set'}, at(day));
function history(first: string, doneIf: (i: number) => boolean, days: number): HabitData {
  let data = start(first);
  for (let i = 0; i < days; i++) if (doneIf(i)) data = log(data, addLocalDays(first, i));
  return data;
}

describe('a trend per habit: the last 30 days beside the 30 before (LEDGER #276)', () => {
  const first = addLocalDays(TODAY, -59);
  test('more often: half before, every day now', () => {
    const t = habitTrend30(history(first, i => i >= 30 || i % 2 === 0, 60).habits[0]!, TODAY);
    expect(t.before).toEqual({done: 15, days: 30, share: 50});
    expect(t.recent).toEqual({done: 30, days: 30, share: 100});
    expect(t.word).toBe('more');
    expect(trendSentence(t)).toBe('100% (30 of 30 days) in the last 30 days, 50% (15 of 30 days) the 30 before: more often.');
  });
  test('about the same within 10 points; less often past it', () => {
    expect(habitTrend30(history(first, i => i % 2 === 0, 60).habits[0]!, TODAY).word).toBe('same');
    expect(habitTrend30(history(first, i => i < 30 || i % 3 === 0, 60).habits[0]!, TODAY).word).toBe('less');
  });
  test('not enough days yet: no word, and the sentence says why', () => {
    const t = habitTrend30(history(addLocalDays(TODAY, -9), () => true, 10).habits[0]!, TODAY);
    expect(t.word).toBeNull();
    expect(trendSentence(t)).toContain('Not enough days yet');
    expect(trendSentence(t)).not.toMatch(/attention|warning|falling|bad/i);
  });
  test('the list: more often first, then about the same, less often, then not enough days', () => {
    const more = history(first, i => i >= 30 || i % 2 === 0, 60).habits[0]!, less = {...history(first, i => i < 30 || i % 3 === 0, 60).habits[0]!, id: 'b', title: 'Read'}, none = {...history(addLocalDays(TODAY, -3), () => true, 4).habits[0]!, id: 'c', title: 'Stretch'};
    expect(habitTrendList([none, less, more], TODAY).map(t => [t.title, t.word])).toEqual([['Walk', 'more'], ['Read', 'less'], ['Stretch', null]]);
  });
});
