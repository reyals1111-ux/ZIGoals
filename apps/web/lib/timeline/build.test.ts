import {afterEach, describe, expect, it, vi} from 'vitest';
import {createHabit, emptyHabitData, HABITS_KEY, habitDataSchema, logHabitValue, setHabitEntryStatus, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth, newHealthId, type HealthData} from '../health';
import {addWater, dailyData} from '../health-daily';
import {emptyReminders} from '../reminders/schema';
import {emptyWReminders} from '../reminders/w-schema';
import {setPlanItem, emptyRemindersPlan} from '../reminders-plan/schema';
import {emptySleep} from '../sleep/schema';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {DAY_TIMELINE_KEY} from '../af-extras-keys';
import {CHECKLIST_KEY} from '../af-checklist-keys';
import {addCustom, addFavourite} from '../checklist/store';
import {emptyChecklist} from '../checklist/schema';
import {emptyPlatform} from '../positions';
import {BANDS, FAST_LOCK, TIMER_LOCK, bandOf, buildDayTimeline, nextBlocks, type TimelineInput} from './build';
import {DAY_TIMELINE, MAX_TIMES, TimelineMoveError, clearTime, clockMinutes, habitTimeKey, mealTimeKey, minutesClock, restoreTime, setTime, snapMinutes} from './store';
import {loadTimelineSources, registerTimelineSource, runTimelineSources, subscribeTimelineSources, timelineSourceIds, type TimelineSource} from './sources';
import {checklistTimelineSource} from './checklist-source';

afterEach(() => vi.unstubAllGlobals());
const DATE = '2026-10-19', ZONE = 'UTC';
const at = (clock: string, date = DATE) => new Date(`${date}T${clock}:00.000Z`);
const ID = {stretch: 'cccccccc-0000-4000-8000-0000000000c1', read: 'cccccccc-0000-4000-8000-0000000000c2', piano: 'cccccccc-0000-4000-8000-0000000000c3', walk: 'cccccccc-0000-4000-8000-0000000000c4'};
const habit = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
function habits(): HabitData {
  let d = emptyHabitData(); const made = at('06:00', '2026-10-01');
  d = createHabit(d, habit('Fictional stretch'), made, ID.stretch);
  d = createHabit(d, habit('Fictional read', {timeOfDay: 'evening'}), made, ID.read);
  d = createHabit(d, habit('Fictional piano', {measurement: {kind: 'duration', unit: 'minutes'}, target: 45, timeOfDay: 'afternoon'}), made, ID.piano);
  d = createHabit(d, habit('Fictional walk', {timeOfDay: 'anytime'}), made, ID.walk);
  return d;
}
const base = (over: Partial<TimelineInput> = {}): TimelineInput => ({date: DATE, now: at('10:30'), zone: ZONE, habits: habits(), health: createEmptyHealth(), reminders: emptyReminders(), wReminders: emptyWReminders(), plan: emptyRemindersPlan(), times: {}, fasting: null, meditationRun: null, sleep: emptySleep(), ...over});
const block = (day: ReturnType<typeof buildDayTimeline>, id: string) => [...day.blocks, ...day.anytime].find(b => b.id === id)!;

describe('the Day Timeline (Session AF, L5b; P9.2, ADR-028 D2 (a), H76)', () => {
  it('a habit sits at the time it was moved to, else its reminder, else its part of the day; anytime habits wait on the shelf', () => {
    let day = buildDayTimeline(base());
    expect(block(day, `habit:${ID.stretch}`)).toMatchObject({start: 480, minutes: 20, timeFrom: 'its part of the day', movable: true, timeKey: habitTimeKey(ID.stretch), action: 'habit-done'});
    expect(block(day, `habit:${ID.read}`).start).toBe(19 * 60);
    expect(block(day, `habit:${ID.piano}`)).toMatchObject({start: 14 * 60, minutes: 45});
    expect(day.anytime.map(b => b.id)).toEqual([`habit:${ID.walk}`]);
    expect(block(day, `habit:${ID.walk}`).timeFrom).toBe('no time yet');
    const reminders = {...emptyReminders(), habits: {[ID.stretch]: {time: '07:15'}, [ID.walk]: {time: '17:30'}}};
    day = buildDayTimeline(base({reminders}));
    expect(block(day, `habit:${ID.stretch}`)).toMatchObject({start: 435, timeFrom: 'its reminder', reminder: '07:15'});
    expect(block(day, `habit:${ID.walk}`).start).toBe(17 * 60 + 30);
    day = buildDayTimeline(base({reminders, times: {[habitTimeKey(ID.stretch)]: {time: '06:45', minutes: 30}}}));
    expect(block(day, `habit:${ID.stretch}`)).toMatchObject({start: 405, minutes: 30, timeFrom: 'moved here', reminder: '07:15'});
    expect(day.blocks.map(b => b.start)).toEqual([...day.blocks.map(b => b.start)].sort((a, b) => a! - b!));
  });

  it('done, skipped and part-done habits read from the habit’s own day', () => {
    let d = logHabitValue(habits(), ID.stretch, DATE, 1, {}, at('09:00'));
    d = setHabitEntryStatus(d, ID.read, DATE, 'skipped', '', at('09:00'));
    d = logHabitValue(d, ID.piano, DATE, 20, {}, at('09:00'));
    const day = buildDayTimeline(base({habits: d}));
    expect(block(day, `habit:${ID.stretch}`)).toMatchObject({done: true, action: 'open'});
    expect(block(day, `habit:${ID.read}`)).toMatchObject({done: false, skipped: true, action: 'open'});
    expect(block(day, `habit:${ID.piano}`)).toMatchObject({done: false, note: '20 of 45 so far', action: 'habit-done'});
  });

  it('meals sit at their slot (or the slot’s moved time); a slot without a plan shows what was logged', () => {
    // The builder only reads the plan's day, slot, name and logged mark (a fictional plan, outside the strict schema).
    const empty = createEmptyHealth(), daily = dailyData(empty);
    const health = {...empty, daily: {...daily, plans: [{id: 'health_plan-1', savedMealId: 'health_meal-1', date: DATE, meal: 'Lunch', name: 'Fictional soup', items: [], createdAt: at('07:00').toISOString()}]}} as unknown as HealthData;
    let day = buildDayTimeline(base({health}));
    expect(block(day, 'meal-plan:health_plan-1')).toMatchObject({start: 12 * 60 + 30, minutes: 30, slot: 'Lunch', action: 'meal-log', movable: true, timeKey: mealTimeKey('Lunch'), timeFrom: 'its meal slot'});
    day = buildDayTimeline(base({health, times: {[mealTimeKey('Lunch')]: {time: '13:15'}}}));
    expect(block(day, 'meal-plan:health_plan-1')).toMatchObject({start: 13 * 60 + 15, timeFrom: 'moved here'});
    expect(day.blocks.some(b => b.id.startsWith('meal:Breakfast'))).toBe(false);
  });

  it('last night across midnight, tonight’s bedtime, a running fast and running timers: shown on their own clocks and never movable', () => {
    const sleep = {version: 1 as const, nights: [{id: 'health_sleep-1', kind: 'night' as const, start: '2026-10-18T23:00:00.000Z', end: '2026-10-19T07:00:00.000Z', timeZone: ZONE, source: 'manual' as const, createdAt: '2026-10-19T07:00:00.000Z', updatedAt: '2026-10-19T07:00:00.000Z'}]};
    const plan = setPlanItem(emptyRemindersPlan(), 'bedtime', {on: true, time: '22:30'});
    const fasting = {version: 1 as const, sessions: [{id: 'fast-1', startedAt: '2026-10-18T20:00:00.000Z', endedAt: null, targetHours: 16, timeZone: ZONE}]};
    const meditationRun = {version: 1 as const, run: {startedAt: at('10:20').toISOString(), plannedSec: 600, pausedMs: 0, kind: 'timer' as const}};
    let d = habits(); d = habitDataSchema.parse({...d, habits: d.habits.map(h => h.id === ID.piano ? {...h, timer: {id: 'dddddddd-0000-4000-8000-0000000000d1', startedAt: at('10:00').toISOString(), date: DATE, timeZone: ZONE, ruleFingerprint: 'x', unit: 'minutes', state: 'running', segmentStartedAt: at('10:00').toISOString(), elapsedMs: 0}} : h)});
    const day = buildDayTimeline(base({sleep: sleep as never, plan, fasting, meditationRun, habits: d}));
    expect(block(day, 'sleep:health_sleep-1')).toMatchObject({start: 0, minutes: 420, movable: false, done: true});
    expect(block(day, 'sleep:health_sleep-1').note).toBe('In bed since last night, 23:00 · up 07:00');
    expect(block(day, 'sleep:tonight')).toMatchObject({start: 22 * 60 + 30, movable: false});
    expect(block(day, 'fast:fast-1')).toMatchObject({start: 0, minutes: 12 * 60, movable: false, lockedReason: FAST_LOCK});
    expect(block(day, `timer:${ID.piano}`)).toMatchObject({start: 600, minutes: 30, movable: false, lockedReason: TIMER_LOCK});
    expect(block(day, 'meditation:run')).toMatchObject({start: 620, minutes: 10, movable: false, lockedReason: TIMER_LOCK});
    for (const b of [...day.blocks]) { expect(b.start!).toBeGreaterThanOrEqual(0); expect(b.start!).toBeLessThan(1440); expect(b.start! + b.minutes).toBeLessThanOrEqual(1440); }
    for (const b of day.blocks.filter(x => x.kind !== 'habit' && x.kind !== 'meal')) expect(b.movable).toBe(false);
  });

  it('reminders at their clock times: water every day, the weekly review only on its weekday', () => {
    const reminders = {...emptyReminders(), water: {time: '11:00'}}, wReminders = {...emptyWReminders(), windDown: {time: '21:30'}};
    let health: HealthData = createEmptyHealth();
    health = addWater(health, {id: newHealthId(), date: DATE, amountMilli: 250_000, unit: 'ml'}, at('09:00').toISOString());
    const plan = setPlanItem(setPlanItem(emptyRemindersPlan(), 'review', {on: true, time: '18:00', weekday: 1}), 'goal-checkin', {on: true, time: '19:30', weekday: 3});
    const day = buildDayTimeline(base({reminders, wReminders, plan, health}));
    expect(block(day, 'reminder:water')).toMatchObject({start: 660, minutes: 0, done: true, movable: false});
    expect(block(day, 'reminder:wind-down').start).toBe(21 * 60 + 30);
    expect(block(day, 'reminder:review').start).toBe(18 * 60); // 19 October 2026 is a Monday
    expect(day.blocks.some(b => b.id === 'reminder:goal-checkin')).toBe(false);
    expect(day.replanFrom).toBe(21 * 60 + 30);
  });

  it('the now line and the next blocks; leftovers get a Replan only at the day’s end and nothing moves by itself', () => {
    let day = buildDayTimeline(base({now: at('10:30')}));
    expect(day.nowMinute).toBe(630);
    expect(nextBlocks(day).map(b => b.title)).toEqual(['Fictional piano', 'Fictional read']);
    expect(day.leftovers).toEqual([]);
    day = buildDayTimeline(base({now: at('20:15')}));
    expect(day.leftovers.map(b => b.id).sort()).toEqual([`habit:${ID.piano}`, `habit:${ID.read}`, `habit:${ID.stretch}`, `habit:${ID.walk}`].sort());
    expect(block(day, `habit:${ID.stretch}`).start).toBe(480); // still at its own time: a Replan never moves it
    expect(bandOf(480)).toBe('morning'); expect(bandOf(0)).toBe('night'); expect(bandOf(1439)).toBe('evening');
    expect(BANDS.map(b => b.to - b.from).reduce((a, b) => a + b, 0)).toBe(1440);
  });

  it('a quiet day says so', () => {
    expect(buildDayTimeline(base({habits: emptyHabitData()})).quiet).toBe(true);
  });
});

describe('registerTimelineSource: the seam other features use (the Checklist)', () => {
  it('a registered loader loads only when asked; items are placed by time, else band, else the shelf; a habit item marks the habit’s block', async () => {
    let loaded = 0, told = 0;
    const source: TimelineSource = () => [
      {id: 'a', title: 'Fictional dot at 9', done: false, href: '/app/checklist', time: '09:00'},
      {id: 'b', title: 'Fictional evening dot', done: true, href: '/app/checklist', band: 'evening'},
      {id: 'c', title: 'Fictional anytime dot', done: false, href: '/app/checklist'},
      {id: 'd', title: 'Fictional stretch', done: false, href: '/app/checklist', band: 'morning', habitId: ID.stretch},
    ];
    const stop = subscribeTimelineSources(() => { told++; });
    const remove = registerTimelineSource('fixture', async () => { loaded++; return source; });
    const broken = registerTimelineSource('broken', async () => () => { throw new Error('boom'); });
    expect(told).toBe(2); expect(loaded).toBe(0);
    expect(timelineSourceIds()).toEqual(expect.arrayContaining(['fixture', 'broken']));
    const sources = await loadTimelineSources();
    expect(loaded).toBe(1);
    const extra = runTimelineSources(sources, {date: DATE, now: at('10:30'), stores: {}});
    expect(extra.map(i => i.id)).toEqual(['fixture:a', 'fixture:b', 'fixture:c', 'fixture:d']);
    const day = buildDayTimeline(base({extra}));
    expect(block(day, 'fixture:a')).toMatchObject({kind: 'checklist', start: 540, movable: false});
    expect(block(day, 'fixture:b')).toMatchObject({start: 19 * 60, done: true});
    expect(day.anytime.some(b => b.id === 'fixture:c')).toBe(true);
    expect(day.blocks.some(b => b.id === 'fixture:d')).toBe(false);
    expect(block(day, `habit:${ID.stretch}`).onChecklist).toBe(true);
    remove(); broken(); stop();
    expect(timelineSourceIds()).not.toContain('fixture');
  });

  it('the Checklist’s source reads its two records and derives the dots; it never writes', () => {
    const m = new Map<string, string>(), writes: string[] = [];
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { writes.push(k); m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    vi.stubGlobal('window', {localStorage: storage, sessionStorage: storage});
    let r = emptyChecklist();
    r = addFavourite(r, {kind: 'habit', habitId: ID.stretch}, {id: 'ck_1', at: at('06:00', '2026-10-01'), section: 'morning'});
    r = addCustom(r, {label: 'Fictional sketch', section: 'evening'}, {id: 'ck_2', at: at('06:00', '2026-10-01')});
    m.set(CHECKLIST_KEY, JSON.stringify(r));
    const stores = {habits: habits(), habitsDay: DATE, health: createEmptyHealth(), healthDay: DATE, sleep: emptySleep(), meditation: {version: 1, sessions: []}, meditationRun: {version: 1, run: null}, fasting: {version: 1, sessions: []}, platform: emptyPlatform(), zone: ZONE};
    const items = checklistTimelineSource({date: DATE, now: at('10:30'), stores});
    expect(items).toEqual([
      {id: 'ck_1', title: 'Fictional stretch', done: false, href: '/app/checklist', band: 'morning', pillar: 'habits', label: 'Checklist', colour: 'var(--pillar-habits, #23eaff)', habitId: ID.stretch},
      {id: 'ck_2', title: 'Fictional sketch', done: false, href: '/app/checklist', band: 'evening', pillar: null, label: 'Checklist', colour: 'var(--pillar-wealth, #ffd27a)'},
      // (Session AG: each dot carries the colour it wears on the Checklist's path — its habit card's tone, or its own.)
    ]);
    expect(writes).toEqual([]);
  });
});

describe('zigoals:day-timeline:v1 (TIER 3 storage): device-only time overrides', () => {
  const memory = () => { const m = new Map<string, string>(); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}}; };
  it('clock helpers keep a move inside today on 15-minute steps', () => {
    expect(clockMinutes('07:45')).toBe(465); expect(minutesClock(465)).toBe('07:45'); expect(minutesClock(-30)).toBe('00:00'); expect(minutesClock(5000)).toBe('23:59');
    expect(snapMinutes(472)).toBe(465); expect(snapMinutes(-10)).toBe(0); expect(snapMinutes(1439)).toBe(1425);
    expect(() => clockMinutes('7:45')).toThrow();
  });
  it('only habits and meals move; a real clock time and a sane length; Undo puts the earlier time back', () => {
    let r = DAY_TIMELINE.empty();
    r = setTime(r, habitTimeKey(ID.stretch), '06:45', 30);
    r = setTime(r, habitTimeKey(ID.stretch), '07:00');
    expect(r.times[habitTimeKey(ID.stretch)]).toEqual({time: '07:00', minutes: 30});
    r = setTime(r, mealTimeKey('Dinner'), '18:15');
    expect(() => setTime(r, 'fast:1', '07:00')).toThrow(TimelineMoveError);
    expect(() => setTime(r, habitTimeKey(ID.read), '25:00')).toThrow(TimelineMoveError);
    expect(() => setTime(r, habitTimeKey(ID.read), '07:00', 2)).toThrow(TimelineMoveError);
    const before = r.times[habitTimeKey(ID.stretch)];
    const moved = setTime(r, habitTimeKey(ID.stretch), '09:30');
    expect(restoreTime(moved, habitTimeKey(ID.stretch), before).times[habitTimeKey(ID.stretch)]).toEqual({time: '07:00', minutes: 30});
    expect(restoreTime(moved, mealTimeKey('Lunch'), undefined).times[mealTimeKey('Lunch')]).toBeUndefined();
    expect(clearTime(moved, mealTimeKey('Dinner')).times[mealTimeKey('Dinner')]).toBeUndefined();
    let full = DAY_TIMELINE.empty();
    full = {...full, times: Object.fromEntries(Array.from({length: MAX_TIMES}, (_, i) => [`habit:${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`, {time: '08:00'}]))};
    expect(() => setTime(full, habitTimeKey(ID.read), '08:00')).toThrow(/up to 300/);
  });
  it('the record is loose and versioned; unreadable bytes are never rewritten; the synced habit record never gains a time', () => {
    const {m, storage} = memory();
    expect(DAY_TIMELINE.key).toBe(DAY_TIMELINE_KEY);
    m.set(DAY_TIMELINE_KEY, JSON.stringify({version: 1, times: {'habit:future': {time: '08:00', colour: 'x'}}, later: true}));
    updateDeviceRecord(storage, DAY_TIMELINE, r => setTime(r, mealTimeKey('Lunch'), '12:00'));
    const raw = JSON.parse(m.get(DAY_TIMELINE_KEY)!);
    expect(raw.later).toBe(true); expect(raw.times['habit:future']).toEqual({time: '08:00', colour: 'x'}); expect(raw.times['meal:Lunch']).toEqual({time: '12:00'});
    m.set(DAY_TIMELINE_KEY, 'not json');
    expect(readDeviceRecord(storage, DAY_TIMELINE)).toEqual({data: {version: 1, times: {}}, unreadable: true});
    expect(m.get(DAY_TIMELINE_KEY)).toBe('not json');
    // A move is a timeline record only: the habit's own record (synced, strict) is untouched by every move.
    const record = habits(), bytes = JSON.stringify(record);
    const day = buildDayTimeline(base({habits: record, times: setTime(DAY_TIMELINE.empty(), habitTimeKey(ID.stretch), '05:30').times}));
    expect(day.blocks[0]!.title).toBe('Fictional stretch');
    expect(JSON.stringify(record)).toBe(bytes);
    expect(JSON.stringify(habitDataSchema.parse(JSON.parse(bytes)))).not.toMatch(/"time"|05:30/);
    void HABITS_KEY;
  });
});
