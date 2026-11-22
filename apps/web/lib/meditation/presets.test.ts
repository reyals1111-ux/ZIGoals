import {describe, expect, test} from 'vitest';
import {MAX_PRESETS, planBellTimes, planFromBells, planSummary, presetIssue, readPlan, readPresets, readRunPlan, settlingMs, signedElapsedMs, startPlannedRun, storedPreset, withPreset, withPresetBack, withoutPreset, withRunPlan, intervalText, type TimerPlan} from './presets';
import {bellTimes, elapsedMs, endedSession, isOpenEnded, OPEN_ENDED_SEC, pauseRun, remainingMs, resumeRun, startRun} from './timer';
import {meditationRunSchema} from './schema';
import {habitExtrasSchema} from '../habits-extras/schema';
import {healthExtrasSchema, HEALTH_EXTRAS_KEY} from '../health-extras';
import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {forgetAaDeviceRecords} from '../aa-device-forget';
import {DEVICE_PARTS} from '../restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from '../vault/backup-records';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2HabitsAnswer} from '../ai/local-answers/av2-habits';
import type {ToolSources} from '../ai/tools/env';

/** Session AV lane 2 (habits pillar; LEDGER #184): Insight Timer's presets, settling in, bells along the way, no set length. */
const T0 = new Date('2026-11-22T07:00:00.000Z');
const MORNING: TimerPlan = {minutes: 20, warmup: 30, start: 'bowl', end: 'chime', volume: 70, intervals: [{sound: 'soft', every: 300, times: null, from: 'start'}, {sound: 'chime', every: 60, times: 2, from: 'end'}]};
let n = 0;
const ids = () => `tp-test-${String(++n).padStart(4, '0')}`;
const storageOf = () => {
  const m = new Map<string, string>();
  return {m, storage: {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage};
};

describe('presets: saved, read safely, edited, deleted with Undo', () => {
  test('add and read back; the habit extras schema keeps them; other fields kept', () => {
    const x = withPreset({version: 1, calm: {visual: 'sea'}}, {name: '  Morning sit ', plan: MORNING}, undefined, ids);
    expect(habitExtrasSchema.parse(x)).toEqual(x);
    expect(x.calm).toEqual({visual: 'sea'});
    expect(readPresets(x)).toEqual([{id: 'tp-test-0001', name: 'Morning sit', ...MORNING}]);
    expect((x as unknown as {meditationTimer: {presets: unknown[]}}).meditationTimer.presets[0]).toEqual({id: 'tp-test-0001', name: 'Morning sit', minutes: 20, warmup: 30, start: 'bowl', end: 'chime', volume: 70, intervals: [{sound: 'soft', every: 300}, {sound: 'chime', every: 60, times: 2, from: 'end'}]});
  });
  test('an edit keeps a later build’s field of the preset; a removed setting goes', () => {
    const x = {version: 1, meditationTimer: {later: true, presets: [{id: 'tp-keep-0001', name: 'Old', minutes: 10, warmup: 15, start: 'bowl', end: 'bowl', volume: 50, intervals: [{sound: 'soft', every: 60}], future: 'x'}]}};
    const y = withPreset(x, {name: 'Evening', plan: {minutes: null, warmup: 0, start: 'soft', end: 'silent', volume: 40, intervals: []}}, 'tp-keep-0001');
    expect(y.meditationTimer).toEqual({later: true, presets: [{id: 'tp-keep-0001', future: 'x', name: 'Evening', open: true, start: 'soft', end: 'silent', volume: 40}]});
    expect(readPresets(y)[0]).toMatchObject({name: 'Evening', minutes: null, warmup: 0, intervals: []});
  });
  test('odd entries are left out of the reading, never the whole list', () => {
    expect(readPresets({meditationTimer: {presets: ['odd', {id: 'bad id', name: 'x', minutes: 5, start: 'bowl', end: 'bowl', volume: 5}, {id: 'tp-good-0001', name: 'Good', minutes: 5, start: 'bowl', end: 'gong', volume: 5},
      {id: 'tp-good-0002', name: 'Fine', minutes: 5, warmup: 9999, start: 'bowl', end: 'chime', volume: 5, intervals: [{sound: 'silent', every: 60}, {sound: 'soft', every: 2}, {sound: 'soft', every: 90, times: 0, from: 'sideways'}]}, {id: 'tp-good-0002', name: 'Twin', minutes: 5, start: 'bowl', end: 'bowl', volume: 5}]}}))
      .toEqual([{id: 'tp-good-0002', name: 'Fine', minutes: 5, warmup: 0, start: 'bowl', end: 'chime', volume: 5, intervals: [{sound: 'soft', every: 90, times: null, from: 'start'}]}]);
    expect(readPresets(null)).toEqual([]);
    expect(readPresets({meditationTimer: 'x'})).toEqual([]);
    expect(readPlan({open: true, start: 'bowl', end: 'bowl', volume: 101})).toBeNull();
  });
  test('the reasons said at the field', () => {
    const one = readPresets(withPreset({version: 1}, {name: 'Morning', plan: MORNING}, undefined, ids));
    expect(presetIssue({name: '  ', plan: MORNING}, [])?.field).toBe('name');
    expect(presetIssue({name: '…', plan: MORNING}, [])?.field).toBe('name');
    expect(presetIssue({name: 'morning', plan: MORNING}, one)).toEqual({field: 'name', message: 'Another preset has this name. Choose a different one.'});
    expect(presetIssue({name: 'morning', plan: MORNING}, one, one[0]!.id)).toBeNull();
    expect(presetIssue({name: 'X', plan: {...MORNING, minutes: 241}}, [])?.field).toBe('minutes');
    expect(presetIssue({name: 'X', plan: {...MORNING, minutes: 5, intervals: [{sound: 'soft', every: 300, times: null, from: 'start'}]}}, [])).toEqual({field: 'interval', message: 'A bell along the way comes more often than the session lasts: choose under 5 minutes, or a longer session.'});
    expect(presetIssue({name: 'X', plan: {...MORNING, intervals: Array.from({length: 6}, () => MORNING.intervals[0]!)}}, [])?.field).toBe('interval');
    expect(() => withPreset({version: 1}, {name: '', plan: MORNING})).toThrow('Give the preset a name');
  });
  test('at most twenty; a delete and its Undo put it back where it was', () => {
    let x: object = {version: 1};
    for (let i = 0; i < MAX_PRESETS; i++) x = withPreset(x, {name: `Sit ${i}`, plan: MORNING}, undefined, ids);
    expect(() => withPreset(x, {name: 'One more', plan: MORNING}, undefined, ids)).toThrow('You can keep up to 20 presets.');
    const second = readPresets(x)[1]!, held = storedPreset(x, second.id)!;
    const gone = withoutPreset(x, second.id);
    expect(readPresets(gone).map(p => p.name)).not.toContain('Sit 1');
    expect(() => withoutPreset(gone, second.id)).toThrow('no longer here');
    const back = withPresetBack(gone, held.raw, held.index);
    expect(readPresets(back).map(p => p.name).slice(0, 3)).toEqual(['Sit 0', 'Sit 1', 'Sit 2']);
    expect(withPresetBack(back, held.raw, held.index)).toBe(back);
    const none = readPresets(x).reduce<object>((r, p) => withoutPreset(r, p.id), x);
    expect(none).toEqual({version: 1});
  });
  test('words, English and Dutch', () => {
    expect(planSummary(MORNING)).toBe('20 min · settle 30 s · Singing bowl to begin, Chime to end · 2 bells along the way');
    expect(planSummary({...MORNING, minutes: null, warmup: 0, intervals: []}, 'nl')).toBe('geen vaste lengte · Klankschaal bij het begin, Klokje aan het einde');
    expect(intervalText(MORNING.intervals[0]!)).toBe('Soft tone every 5 min, until the end');
    expect(intervalText(MORNING.intervals[1]!)).toBe('Chime every 1 min, 2 times, counted back from the end');
    expect(intervalText({sound: 'bowl', every: 90, times: 1, from: 'start'}, 'nl')).toBe('Klankschaal elke 1 min 30 s, 1 keer');
  });
});

describe('the run: settling in, bells along the way, no set length', () => {
  test('a preset without its own bells rings exactly what “Your bell” always rang', () => {
    const plan = planFromBells({sound: 'bowl', volume: 60, intervalMin: 5}, 20), legacy = bellTimes({plannedSec: 1200}, 0, 5);
    expect(planBellTimes(plan, 1200, 0).map(b => b.at)).toEqual([...legacy.interval, legacy.end]);
    expect(planBellTimes(plan, 1200, 420_000).map(b => b.at)).toEqual([600_000, 900_000, 1_200_000]);
    expect(planBellTimes(planFromBells({sound: 'silent', volume: 60, intervalMin: 5}, 20), 1200, 0)).toEqual([]);
  });
  test('a settling-in time puts the start ahead; the start bell rings when it ends; a pause there lengthens it', () => {
    const state = startPlannedRun({now: T0, plan: MORNING, moodBefore: 3}), run = state.run!;
    expect(meditationRunSchema.parse(state)).toEqual(state);
    expect(run).toEqual({startedAt: '2026-11-22T07:00:30.000Z', plannedSec: 1200, pausedMs: 0, kind: 'timer', moodBefore: 3});
    const at = (ms: number) => T0.getTime() + ms;
    expect(settlingMs(run, at(10_000))).toBe(20_000);
    expect(elapsedMs(run, at(10_000))).toBe(0);
    expect(remainingMs(run, at(10_000))).toBe(1_200_000);
    expect(endedSession(run, at(10_000))).toBeNull();
    const paused = pauseRun(state, new Date(at(10_000))), resumed = resumeRun(paused, new Date(at(40_000))).run!;
    expect(settlingMs(resumed, at(40_000))).toBe(20_000);
    expect(signedElapsedMs(resumed, at(70_000))).toBe(10_000);
    const bells = planBellTimes(MORNING, 1200, -20_000);
    expect(bells.map(b => [b.at / 1000, b.sound, b.kind])).toEqual([[0, 'bowl', 'start'], [300, 'soft', 'interval'], [600, 'soft', 'interval'], [900, 'soft', 'interval'], [1080, 'chime', 'interval'], [1140, 'chime', 'interval'], [1200, 'chime', 'end']]);
    expect(planBellTimes(MORNING, 1200, 5_000)[0]!.at).toBe(300_000);
  });
  test('a bell counted from the start stops after its times; from the end it needs an end; one moment rings once', () => {
    const plan: TimerPlan = {minutes: 10, warmup: 0, start: 'bowl', end: 'bowl', volume: 50, intervals: [{sound: 'soft', every: 120, times: 2, from: 'start'}, {sound: 'chime', every: 120, times: null, from: 'end'}]};
    expect(planBellTimes(plan, 600, 0).map(b => [b.at / 1000, b.sound])).toEqual([[120, 'soft'], [240, 'soft'], [360, 'chime'], [480, 'chime'], [600, 'bowl']]);
    expect(planBellTimes(plan, 600, 0, 250_000).map(b => b.at / 1000)).toEqual([120, 240]);
  });
  test('no set length: planned at four hours less a second, counts up, no end bell, ends by itself at most there', () => {
    const plan: TimerPlan = {minutes: null, warmup: 0, start: 'bowl', end: 'chime', volume: 50, intervals: [{sound: 'soft', every: 600, times: null, from: 'start'}, {sound: 'chime', every: 60, times: null, from: 'end'}]};
    const run = startPlannedRun({now: T0, plan}).run!;
    expect(run.plannedSec).toBe(OPEN_ENDED_SEC);
    expect(isOpenEnded(run)).toBe(true);
    expect(isOpenEnded(startRun({now: T0, minutes: 240}).run!)).toBe(false);
    const bells = planBellTimes(plan, OPEN_ENDED_SEC, 0);
    expect(bells.every(b => b.kind === 'interval' && b.sound === 'soft')).toBe(true);
    expect(bells).toHaveLength(23);
    expect(endedSession(run, T0.getTime() + 25 * 60_000)!.seconds).toBe(1500);
  });
  test('the run’s bells are kept beside it under its start, in the loose Health extras', () => {
    const x = withRunPlan({version: 1, meals: {Lunch: {time: '12:30'}}}, '2026-11-22T07:00:30.000Z', MORNING);
    expect(healthExtrasSchema.parse(x)).toEqual(x);
    expect(readRunPlan(x, '2026-11-22T07:00:30.000Z')).toEqual(MORNING);
    expect(readRunPlan(x, '2026-11-22T08:00:00.000Z')).toBeNull();
    expect(withRunPlan(x, null, null)).toEqual({version: 1, meals: {Lunch: {time: '12:30'}}});
    expect(healthExtrasSchema.parse({version: 1, meditationRun: 'odd'})).toEqual({version: 1});
  });
});

describe('export → erase → restore', () => {
  test('keeps the presets (habit extras) and the running bells (Health extras)', () => {
    const {m, storage} = storageOf();
    const hx = withPreset({version: 1}, {name: 'Morning', plan: MORNING}, undefined, ids), he = withRunPlan({version: 1}, '2026-11-22T07:00:30.000Z', MORNING);
    storage.setItem(HABIT_EXTRAS_KEY, JSON.stringify(hx)); storage.setItem(HEALTH_EXTRAS_KEY, JSON.stringify(he));
    const {sections} = exportRecordSections(storage, {health: true});
    forgetAaDeviceRecords(storage);
    expect(m.has(HABIT_EXTRAS_KEY) || m.has(HEALTH_EXTRAS_KEY)).toBe(false);
    for (const key of [HABIT_EXTRAS_KEY, HEALTH_EXTRAS_KEY]) { const section = sectionOf(DEVICE_PARTS.find(p => p.key === key)!)!; restoreRecordSection(storage, section, sections[section]!); }
    expect(readPresets(JSON.parse(m.get(HABIT_EXTRAS_KEY)!))).toEqual(readPresets(hx));
    expect(readRunPlan(JSON.parse(m.get(HEALTH_EXTRAS_KEY)!), '2026-11-22T07:00:30.000Z')).toEqual(MORNING);
  });
});

describe('NOVA and ZIGi say the presets', () => {
  test('none, then each with its bells, in English and Dutch; closed with Health', () => {
    const s = showcaseAll();
    const src = (x: unknown): ToolSources => ({...s, ak: {...s.ak, habitExtras: x}});
    const text = (q: string, x: unknown, health = true) => { const r = av2HabitsAnswer(q, zigiEnv(src(x), health)); return r && 'text' in r ? r.text : ''; };
    expect(text('which meditation timer presets do i have', {version: 1})).toMatch(/^No timer presets yet\./);
    const x = withPreset({version: 1}, {name: 'Morning', plan: MORNING}, undefined, ids);
    expect(text('which meditation timer presets do i have', x)).toBe('1 timer preset: Morning (20 min · settle 30 s · Singing bowl to begin, Chime to end · 2 bells along the way: Soft tone every 5 min, until the end; Chime every 1 min, 2 times, counted back from the end). Choose one under Begin on Health → Meditation.');
    expect(text('welke timerpresets heb ik voor meditatie', x)).toMatch(/^1 timerpreset: Morning \(20 min · 30 s om te landen · Klankschaal bij het begin, Klokje aan het einde/);
    expect(text('which meditation timer presets do i have', x, false)).not.toContain('Morning');
  });
});
