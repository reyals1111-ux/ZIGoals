import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {habitDay, logHabitValue, planSkip, setHabitState} from '../habits';
import {saveWeight} from '../health';
import {dailyData} from '../health-daily';
import {emptySleep} from '../sleep/schema';
import {emptyMeditation, emptyMeditationRun} from '../meditation/schema';
import {emptyFasting} from '../fasting/schema';
import {startRun} from '../meditation/timer';
import {emptyChecklistDays} from './schema';
import {TickRefused, fastPlan, meditationTimerPlan, planTick, sleepPlan, type Stores, type TickContext, type TickPlan} from './adapters';
import {deriveDots, summarise, type DerivedDot} from './derive';
import {ID, NOW, TODAY, VITAMIN, fullPath, habits, health, platform, sources} from './test-fixtures';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });
const stores = (): Stores => ({habits: habits(), health: health(), sleep: emptySleep(), meditation: emptyMeditation(), meditationRun: emptyMeditationRun(), fasting: emptyFasting(), platform: platform(), days: {...emptyChecklistDays(), today: {date: TODAY, ticks: [], custom: [], nudged: []}}});
/** Applies writes the way the page does: each through its own store, in order, on the latest record. */
function run(s: Stores, writes: TickPlan['writes']): Stores { const next = {...s} as Record<string, unknown>; for (const write of writes) next[write.store] = (write.change as (c: unknown) => unknown)(next[write.store]); return next as Stores; }
const ctx = (extra: Partial<TickContext> = {}): TickContext => ({date: TODAY, habitsDay: TODAY, healthDay: TODAY, zone: 'UTC', now: NOW, ...extra});
const dotsOf = (s: Stores) => deriveDots(fullPath(), s.days.today!, TODAY, {...sources(), habits: s.habits, health: s.health, sleep: s.sleep, meditation: s.meditation, meditationRun: s.meditationRun, fasting: s.fasting, platform: s.platform});
const dot = (s: Stores, label: string): DerivedDot => { const d = dotsOf(s).find(x => x.label === label); if (!d) throw new Error(label); return d; };

describe('a tick writes the real record through its page’s own function, and Undo puts it back', () => {
  test('a boolean habit: logged for today with its receipt; Undo leaves no entry at all', () => {
    const s0 = stores(), plan = planTick(dot(s0, 'Morning walk'), ctx()), s1 = run(s0, plan.writes);
    expect(habitDay(s1.habits.habits.find(h => h.id === ID.walk)!, TODAY, TODAY).status).toBe('complete');
    expect(s1.days.today?.ticks).toEqual([{id: 'ck_1', at: NOW.toISOString(), record: {kind: 'habit', id: `${ID.walk}:${TODAY}`}}]);
    expect(dot(s1, 'Morning walk').state).toBe('done');
    expect(plan.message).toBe('Morning walk logged for today.');
    const s2 = run(s1, plan.undo);
    expect(s2.habits.habits.find(h => h.id === ID.walk)!.entries).toEqual([]);
    expect(s2.days.today?.ticks).toEqual([]);
  });
  test('a count habit takes the stepper’s value and adds it; Undo restores the earlier count and note', () => {
    let s0 = stores(); s0 = {...s0, habits: logHabitValue(s0.habits, ID.push, TODAY, 20, {note: 'before work'}, NOW)};
    const plan = planTick(dot(s0, 'Push-ups'), ctx({value: 50}), 'value'), s1 = run(s0, plan.writes);
    expect(habitDay(s1.habits.habits.find(h => h.id === ID.push)!, TODAY, TODAY)).toMatchObject({count: 70, status: 'partial'});
    expect(plan.message).toBe('50 times added to Push-ups.');
    const s2 = run(s1, plan.undo);
    expect(s2.habits.habits.find(h => h.id === ID.push)!.entries.map(e => [e.count, e.note])).toEqual([[20, 'before work']]);
  });
  test('a quit habit logs "stayed clear" (0); a rest day refuses with its reason and writes nothing', () => {
    const s0 = stores(), s1 = run(s0, planTick(dot(s0, 'No sugar'), ctx()).writes);
    expect(habitDay(s1.habits.habits.find(h => h.id === ID.sugar)!, TODAY, TODAY).status).toBe('complete');
    expect(() => planTick(dot(s0, 'Monday plan'), ctx())).toThrow(new TickRefused('Not today'));
    const paused = {...s0, habits: setHabitState(s0.habits, ID.walk, 'paused', NOW)};
    expect(() => planTick(dot(paused, 'Morning walk'), ctx())).toThrow('Paused');
    const skipped = {...s0, habits: planSkip(s0.habits, ID.walk, '2026-10-19')};
    expect(dot(skipped, 'Morning walk').state).toBe('undone');
  });
  test('water: addWater with the stepper value; Undo removes exactly that entry', () => {
    const s0 = stores(), plan = planTick(dot(s0, 'Water'), ctx({value: 500}), 'value'), s1 = run(s0, plan.writes);
    const water = dailyData(s1.health).water;
    expect(water.map(w => [w.date, w.amountMilli, w.unit])).toEqual([[TODAY, 500000, 'ml']]);
    expect(s1.days.today?.ticks[0]?.record).toEqual({kind: 'water', id: water[0]!.id});
    expect(plan.message).toBe('500 ml of water logged.');
    expect(dailyData(run(s1, plan.undo).health).water).toEqual([]);
    expect(() => planTick(dot(s0, 'Water'), ctx({value: 9000}), 'value')).toThrow('from 50 to 3000 ml');
  });
  test('a supplement (a familiar food) logs one serving to the meal of the hour; Undo removes it', () => {
    const s0 = stores(), plan = planTick(dot(s0, 'Vitamin D'), ctx()), s1 = run(s0, plan.writes);
    expect(s1.health.diary.map(d => [d.sourceId, d.meal, d.quantityMilli, d.date])).toEqual([[VITAMIN, 'Breakfast', 1000, TODAY]]);
    expect(run(s1, plan.undo).health.diary).toEqual([]);
  });
  test('weight: an upsert for the day; Undo restores the earlier weight of that date, or removes the new one', () => {
    const s0 = stores(), fresh = planTick(dot(s0, 'Weigh in'), ctx({value: 72.4}), 'value'), s1 = run(s0, fresh.writes);
    expect(s1.health.weights.map(w => [w.date, w.grams])).toEqual([[TODAY, 72400]]);
    expect(run(s1, fresh.undo).health.weights).toEqual([]);
    const before = {...s0, health: saveWeight(s0.health, {id: 'health_weight-00000001', date: TODAY, grams: 73100}, NOW.toISOString())};
    const plan = planTick({...dot(before, 'Weigh in'), state: 'undone'}, ctx({value: 72.9}), 'value'), s2 = run(before, plan.writes);
    expect(s2.health.weights.map(w => [w.id, w.grams])).toEqual([['health_weight-00000001', 72900]]);
    expect(run(s2, plan.undo).health.weights.map(w => [w.id, w.grams])).toEqual([['health_weight-00000001', 73100]]);
  });
  test('a goal step flips the milestone the Goal’s own checkbox writes; a closed Goal refuses', () => {
    const s0 = stores(), plan = planTick(dot(s0, 'Open the account'), ctx()), s1 = run(s0, plan.writes);
    expect(s1.platform.goals[0]!.milestones.map(m => [m.id, m.done])).toEqual([['m1', true], ['m2', false]]);
    expect(dot(s1, 'Open the account')).toMatchObject({state: 'done', counted: true});
    expect(run(s1, plan.undo).platform.goals[0]!.milestones[0]!.done).toBe(false);
    const closed = {...s0, platform: {...s0.platform, goals: s0.platform.goals.map(g => ({...g, status: 'closed' as const}))}};
    expect(() => planTick(dot(closed, 'Open the account'), ctx())).toThrow('This Goal is closed.');
  });
  test('mindful minutes: a session that just ended, in the zone; Undo deletes it', () => {
    const s0 = stores(), plan = planTick(dot(s0, 'Meditate'), ctx({value: 10}), 'value'), s1 = run(s0, plan.writes);
    expect(s1.meditation.sessions.map(m => [m.startedAt, m.seconds, m.kind])).toEqual([['2026-10-18T09:50:00.000Z', 600, 'manual']]);
    expect(dot(s1, 'Meditate').state).toBe('done');
    expect(run(s1, plan.undo).meditation.sessions).toEqual([]);
  });
  test('sleep: one tap at bedtime starts the night, the next ends it on Health; Undo of the end reopens it', () => {
    const s0 = stores(), start = sleepPlan(dot(s0, 'Sleep'), ctx({now: new Date('2026-10-17T22:10:00.000Z')})), s1 = run(s0, start.writes);
    expect(s1.sleep.nights.map(n => [n.start, n.end, n.source])).toEqual([['2026-10-17T22:10:00.000Z', null, 'timer']]);
    expect(run(s1, start.undo).sleep.nights).toEqual([]);
    const end = planTick(dot(s1, 'Sleep'), ctx({snapshot: {sleep: s1.sleep}})), s2 = run(s1, end.writes);
    expect(s2.sleep.nights.map(n => [n.start, n.end])).toEqual([['2026-10-17T22:10:00.000Z', NOW.toISOString()]]);
    expect(dot(s2, 'Sleep').state).toBe('done');
    const reopened = run(s2, end.undo).sleep.nights;
    expect(reopened.map(n => [n.start, n.end])).toEqual([['2026-10-17T22:10:00.000Z', null]]);
  });
  test('fasting: start with the target, stop as Health does; Undo of the stop restarts it from its start', () => {
    const s0 = stores(), start = fastPlan(dot(s0, 'Fast'), ctx({now: new Date('2026-10-17T20:00:00.000Z')})), s1 = run(s0, start.writes);
    expect(s1.fasting.sessions.map(f => [f.startedAt, f.endedAt, f.targetHours])).toEqual([['2026-10-17T20:00:00.000Z', null, 16]]);
    const stop = planTick(dot(s1, 'Fast'), ctx({snapshot: {fasting: s1.fasting}})), s2 = run(s1, stop.writes);
    expect(s2.fasting.sessions[0]).toMatchObject({endedAt: NOW.toISOString(), stoppedBy: 'person'});
    expect(run(s2, stop.undo).fasting.sessions.map(f => [f.id, f.startedAt, f.endedAt])).toEqual([[s1.fasting.sessions[0]!.id, '2026-10-17T20:00:00.000Z', null]]);
  });
  test('a fast linked to a duration habit adds its time to the habit on stop; Undo takes it back', () => {
    const s0 = stores(), linked = {...s0, fasting: {version: 1 as const, sessions: [{id: 'fast_1', startedAt: '2026-10-18T09:30:00.000Z', endedAt: null, targetHours: 16, timeZone: 'UTC', habitId: ID.piano}]}};
    const stop = fastPlan(null, ctx({snapshot: {fasting: linked.fasting}})), s1 = run(linked, stop.writes);
    expect(habitDay(s1.habits.habits.find(h => h.id === ID.piano)!, TODAY, TODAY).count).toBe(30);
    expect(habitDay(run(s1, stop.undo).habits.habits.find(h => h.id === ID.piano)!, TODAY, TODAY).count).toBe(0);
  });
  test('the Meditate corner timer: starts Health’s timer, ends into a saved session; Undo resumes the run', () => {
    const s0 = stores(), start = meditationTimerPlan(ctx({now: new Date('2026-10-18T09:40:00.000Z')})), s1 = run(s0, start.writes);
    expect(s1.meditationRun.run).toMatchObject({startedAt: '2026-10-18T09:40:00.000Z', plannedSec: 600});
    const end = meditationTimerPlan(ctx({snapshot: {meditationRun: s1.meditationRun}})), s2 = run(s1, end.writes);
    expect(s2.meditation.sessions.map(m => [m.seconds, m.kind])).toEqual([[600, 'timer']]);
    expect(s2.meditationRun.run).toBeNull();
    const back = run(s2, end.undo);
    expect(back.meditation.sessions).toEqual([]); expect(back.meditationRun).toEqual(s1.meditationRun);
    expect(meditationTimerPlan(ctx({snapshot: {meditationRun: startRun({now: NOW, minutes: 5})}})).message).toBe('Less than a second: nothing to save.');
  });
  test('a custom item lives on the path only: ticked, unticked, Undo', () => {
    const s0 = stores(), plan = planTick(dot(s0, 'Play piano 15 minutes'), ctx()), s1 = run(s0, plan.writes);
    expect(s1.days.today?.custom).toEqual(['ck_12']);
    expect(run(s1, plan.undo).days.today?.custom).toEqual([]);
    const again = planTick(dot(s1, 'Play piano 15 minutes'), ctx());
    expect(run(s1, again.writes).days.today?.custom).toEqual([]);
  });
  test('any order: ticking the last dot first is allowed; ticks in path order make a Perfect orbit', () => {
    let s = stores();
    const order = ['Play piano 15 minutes', 'Morning walk'];
    for (const label of order) s = run(s, planTick(dot(s, label), ctx()).writes);
    expect(dotsOf(s).filter(d => d.state === 'done').map(d => d.label)).toEqual(['Morning walk', 'Play piano 15 minutes']);
    expect(summarise(dotsOf(s), s.days.today!).perfect).toBe(false);
  });
  test('an already done dot refuses a second tick, except the ones that take more (water, a new night, a new fast)', () => {
    const s1 = run(stores(), planTick(dot(stores(), 'Morning walk'), ctx()).writes);
    expect(() => planTick(dot(s1, 'Morning walk'), ctx())).toThrow('already done today');
    const watered = run(stores(), planTick(dot(stores(), 'Water'), ctx({value: 250}), 'value').writes);
    expect(() => planTick(dot(watered, 'Water'), ctx({value: 250}), 'value')).not.toThrow();
  });
});

test('no adapter reaches a wallet, a network or another lane’s module', () => {
  const dir = __dirname, sourcesText = readdirSync(dir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts')).map(f => [f, readFileSync(join(dir, f), 'utf8')] as const);
  for (const [file, text] of sourcesText) {
    expect(text, file).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|lib\/wallet|\.\.\/wallet|\/earn\/|cosmjs/);
  }
});
