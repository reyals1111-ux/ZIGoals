import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {logHabitValue, planSkip} from '../habits';
import {logHealthItem, saveWeight} from '../health';
import {addWater} from '../health-daily';
import {startNight, endNight} from '../sleep/engine';
import {saveManual} from '../meditation/engine';
import {startFast} from '../fasting/engine';
import {checklistMilestones, checklistPath, deriveDots, mealAt, summarise, unitFor} from './derive';
import {emptyChecklist, type ChecklistToday} from './schema';
import {FOOD, ID, NOW, TODAY, VITAMIN, fullPath, platform, sources} from './test-fixtures';
import {addFavourite, removeItem} from './store';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });
const fresh = (): ChecklistToday => ({date: TODAY, ticks: [], custom: [], nudged: []});
const byLabel = (dots: ReturnType<typeof deriveDots>) => Object.fromEntries(dots.map(d => [d.label, d]));

describe('every dot is derived from its own page’s record', () => {
  test('a fresh day: everything waits; rest days and other days are shown but not counted', () => {
    const dots = byLabel(deriveDots(fullPath(), fresh(), TODAY, sources()));
    expect(Object.keys(dots)).toEqual(['Morning walk', 'Water', 'Push-ups', 'Vitamin D', 'Weigh in', 'Open the account', 'Monday plan', 'No sugar', 'Meditate', 'Sleep', 'Fast', 'Play piano 15 minutes']);
    expect(Object.values(dots).every(d => d.state === 'undone')).toBe(true);
    expect(dots['Monday plan']).toMatchObject({counted: false, note: 'Not today', intent: 'open'});
    expect(dots['Morning walk']).toMatchObject({counted: true, intent: 'tick', colour: 'cyan', section: 'morning'});
    expect(dots['Push-ups']).toMatchObject({intent: 'value', value: {unit: 'times', suggested: 100, min: 1, step: 1}});
    expect(dots.Water).toMatchObject({colour: 'blue', glyph: 'drop', intent: 'value', value: {current: null, suggested: 500, unit: 'ml'}});
    expect(dots['Vitamin D']).toMatchObject({glyph: 'pill', intent: 'tick', colour: 'pink'});
    expect(dots['Open the account']).toMatchObject({colour: 'purple', note: 'Fictional reserve', href: '/app/goals/tracked/7'});
    expect(dots['Play piano 15 minutes']).toMatchObject({kind: 'custom', colour: 'gold'});
    expect(summarise(Object.values(dots), fresh())).toMatchObject({total: 11, done: 0, perfect: false});
  });
  test('done on its own page lights the dot, with no receipt (order unknown, never a penalty)', () => {
    let h = logHabitValue(sources().habits!, ID.walk, TODAY, 1, {}, NOW);
    h = logHabitValue(h, ID.push, TODAY, 40, {}, NOW);
    let health = addWater(sources().health!, {id: 'health_water-0001', date: TODAY, amountMilli: 300000, unit: 'ml'}, NOW.toISOString());
    health = logHealthItem(health, {id: 'health_diary-0001', sourceId: VITAMIN, sourceKind: 'food', date: TODAY, meal: 'Breakfast', quantityMilli: 1000}, NOW.toISOString());
    health = saveWeight(health, {id: 'health_weight-0001', date: TODAY, grams: 72400}, NOW.toISOString());
    const dots = byLabel(deriveDots(fullPath(), fresh(), TODAY, sources({habits: h, health})));
    expect(dots['Morning walk']?.state).toBe('done');
    expect(dots['Push-ups']).toMatchObject({state: 'undone', partial: 0.4, note: '40 of 100 times'});
    expect(dots.Water).toMatchObject({state: 'done', note: '300 ml today'});
    expect(dots['Vitamin D']).toMatchObject({state: 'done', note: 'Logged · Breakfast'});
    expect(dots['Weigh in']).toMatchObject({state: 'done', note: '72.4 kg', value: {current: 72.4, unit: 'kg'}});
    const s = summarise(Object.values(dots), fresh());
    expect(s).toMatchObject({done: 4, total: 11, orderKnown: false, perfect: false});
  });
  test('an entry removed on its page puts the dot out again (truth wins over receipts)', () => {
    const today: ChecklistToday = {...fresh(), ticks: [{id: 'ck_2', at: NOW.toISOString(), record: {kind: 'water', id: 'health_water-0001'}}]};
    expect(byLabel(deriveDots(fullPath(), today, TODAY, sources())).Water?.state).toBe('undone');
  });
  test('rest states: paused, skipped and planned rest days leave the count with their reason', () => {
    const h = planSkip(sources().habits!, ID.walk, '2026-10-19', 'Trip');
    const skipped = logHabitValue(h, ID.push, TODAY, 0, {}, NOW);
    expect(byLabel(deriveDots(fullPath(), fresh(), '2026-10-19', sources({habits: h, habitsDay: '2026-10-19'})))['Morning walk']).toMatchObject({counted: false, note: 'Rest day · Trip'});
    expect(byLabel(deriveDots(fullPath(), fresh(), TODAY, sources({habits: skipped})))['Push-ups']?.counted).toBe(true);
  });
  test('sleep, meditation and fasting: running is shown as running; done once ended (or sat) today', () => {
    const night = startNight({version: 1, nights: []}, new Date('2026-10-17T22:10:00.000Z'), 'UTC', 'health_sleep-00000001');
    let dots = byLabel(deriveDots(fullPath(), fresh(), TODAY, sources({sleep: night, meditationRun: {version: 1, run: {startedAt: NOW.toISOString(), plannedSec: 600, pausedMs: 0, kind: 'timer'}}, fasting: startFast({version: 1, sessions: []}, {id: 'fast_1', now: new Date('2026-10-18T08:00:00.000Z'), targetHours: 16, timeZone: 'UTC'})})));
    expect(dots.Sleep).toMatchObject({state: 'running', note: 'In bed since 22:10 · tap when you wake'});
    expect(dots.Meditate?.state).toBe('running');
    expect(dots.Fast).toMatchObject({state: 'running', note: 'Fasting since 08:00 · target 16 h'});
    const ended = endNight(night, 'health_sleep-00000001', new Date('2026-10-18T06:40:00.000Z'));
    const sat = saveManual({version: 1, sessions: []}, {date: TODAY, time: '07:00', minutes: 12, timeZone: 'UTC'}, NOW);
    dots = byLabel(deriveDots(fullPath(), fresh(), TODAY, sources({sleep: ended, meditation: sat})));
    expect(dots.Sleep).toMatchObject({state: 'done', note: 'Woke at 06:40'});
    expect(dots.Meditate).toMatchObject({state: 'done', note: '12 min today'});
  });
  test('a goal step done before today stays lit out of today’s count; done here today it counts', () => {
    const done = platform(true);
    expect(byLabel(deriveDots(fullPath(), fresh(), TODAY, sources({platform: done})))['Open the account']).toMatchObject({state: 'done', counted: false, note: 'Fictional reserve · done earlier'});
    const ticked: ChecklistToday = {...fresh(), ticks: [{id: 'ck_6', at: NOW.toISOString()}]};
    expect(byLabel(deriveDots(fullPath(), ticked, TODAY, sources({platform: done})))['Open the account']).toMatchObject({state: 'done', counted: true});
  });
  test('a Goal on the path is its next open step; the step ticked here today stays lit; no open step is not counted', () => {
    const r = addFavourite(emptyChecklist(), {kind: 'goal', goalId: '7'}, {id: 'g', at: NOW});
    expect(deriveDots(r, fresh(), TODAY, sources())[0]).toMatchObject({kind: 'goal', label: 'Open the account', note: 'Fictional reserve · next step', milestoneId: 'm1', counted: true, state: 'undone'});
    const done = platform(true), ticked: ChecklistToday = {...fresh(), ticks: [{id: 'g', at: NOW.toISOString(), record: {kind: 'goal-step', id: '7:m1'}}]};
    expect(deriveDots(r, ticked, TODAY, sources({platform: done}))[0]).toMatchObject({label: 'Open the account', state: 'done', counted: true});
    expect(deriveDots(r, fresh(), TODAY, sources({platform: done}))[0]).toMatchObject({label: 'First deposit', milestoneId: 'm2', state: 'undone'});
    const finished = {...done, goals: done.goals.map(g => ({...g, milestones: g.milestones.map(m => ({...m, done: true}))}))};
    expect(deriveDots(r, fresh(), TODAY, sources({platform: finished}))[0]).toMatchObject({label: 'Fictional reserve', counted: false, note: 'Every step is done', intent: 'open'});
  });
  test('a record gone from its page shows as missing (to take off the path), never counted', () => {
    const r = addFavourite(emptyChecklist(), {kind: 'habit', habitId: '99999999-9999-4999-8999-999999999999'}, {id: 'gone', at: NOW, label: 'Old habit'});
    const [dot] = deriveDots(addFavourite(r, {kind: 'health', input: 'diary', sourceKind: 'food', sourceId: 'health_gone-0000001'}, {id: 'food-gone', at: NOW}), fresh(), TODAY, sources());
    expect(dot).toMatchObject({label: 'Old habit', missing: true, counted: false, note: 'No longer on Habits'});
    expect(deriveDots(removeItem(fullPath(), 'ck_1'), fresh(), TODAY, sources()).some(d => d.id === 'ck_1')).toBe(false);
  });
  test('a module writing to another day says so on the dot', () => {
    const [walk] = deriveDots(fullPath(), fresh(), TODAY, sources({habitsDay: '2026-10-17'}));
    expect(walk?.writesFor).toBe('2026-10-17');
    const model = checklistPath(fullPath(), [walk!], []);
    expect(model.sections[0]?.steps[0]?.note).toBe('for 2026-10-17');
  });
});

describe('Perfect orbit and the path model', () => {
  test('perfect: every counted dot done, each ticked here, in path order', () => {
    const r = addFavourite(addFavourite(emptyChecklist(), {kind: 'habit', habitId: ID.walk}, {id: 'a', at: NOW}), {kind: 'health', input: 'diary', sourceKind: 'food', sourceId: FOOD}, {id: 'b', at: new Date(NOW.getTime() + 1)});
    const h = logHabitValue(sources().habits!, ID.walk, TODAY, 1, {}, NOW);
    const health = logHealthItem(sources().health!, {id: 'health_diary-0002', sourceId: FOOD, sourceKind: 'food', date: TODAY, meal: 'Breakfast', quantityMilli: 1000}, NOW.toISOString());
    const dots = deriveDots(r, fresh(), TODAY, sources({habits: h, health}));
    const inOrder = {...fresh(), ticks: [{id: 'a', at: '2026-10-18T07:00:00.000Z'}, {id: 'b', at: '2026-10-18T08:00:00.000Z'}]};
    const outOfOrder = {...fresh(), ticks: [{id: 'a', at: '2026-10-18T09:00:00.000Z'}, {id: 'b', at: '2026-10-18T08:00:00.000Z'}]};
    expect(summarise(dots, inOrder)).toMatchObject({total: 2, done: 2, perfect: true, orderKnown: true, next: null});
    expect(summarise(dots, outOfOrder)).toMatchObject({done: 2, perfect: false, orderKnown: true});
    expect(summarise(dots, {...fresh(), ticks: [{id: 'b', at: '2026-10-18T08:00:00.000Z'}]})).toMatchObject({perfect: false, orderKnown: false});
  });
  test('the model: orbits in order, empty ones left out, chests with rewards only with the game layer on', () => {
    const dots = deriveDots(fullPath(), fresh(), TODAY, sources());
    const model = checklistPath(fullPath(), dots, checklistMilestones({on: true, dayXp: 15, badge: 'First orbit'}));
    expect(model.sections.map(s => [s.id, s.steps.length])).toEqual([['morning', 5], ['afternoon', 2], ['evening', 4], ['anytime', 1]]);
    expect(model.sections[1]?.steps[1]).toMatchObject({label: 'Monday plan', counted: false, href: '/app/habits', intent: 'open'});
    expect(model.milestones.map(m => m.reward ?? null)).toEqual([null, {xp: 15, badge: 'First orbit'}]);
    expect(checklistMilestones({on: false, dayXp: 15}).every(m => !m.reward)).toBe(true);
  });
  test('one is singular: 1 time, 1 glass, 1 minute; anything else as written', () => {
    expect([unitFor(1, 'times'), unitFor(1, 'glasses'), unitFor(1, 'minutes'), unitFor(2, 'times'), unitFor(1, 'ml'), unitFor(1, 'grass')]).toEqual(['time', 'glass', 'minute', 'times', 'ml', 'grass']);
  });
  test('a one-tap diary favourite logs to the meal of the hour where it is lived', () => {
    expect(['06:00', '12:30', '16:00', '19:00', '23:30'].map(t => mealAt(new Date(`${TODAY}T${t}:00.000Z`), 'UTC'))).toEqual(['Breakfast', 'Lunch', 'Snacks', 'Dinner', 'Snacks']);
  });
});
