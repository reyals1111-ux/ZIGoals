// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {useAutoRules} from '../../components/habits/auto-rules-runner';
import {createHabit, emptyHabitData, type HabitData} from '../habits';
import {AUTO_RULES_KEY, emptyAutoRules} from './schema';
import {newAutoRule, setAutoRule, type DaySources} from './engine';

// Session AK (5.6): the runner hook ticks a habit once through the store, records the marker, and Undo puts it back.
const WALK = '11111111-1111-4111-8111-111111111111';
let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); localStorage.clear(); });

test('ticks once, writes the marker, never twice; Undo restores the day and marks it', async () => {
  const today = new Date().toISOString().slice(0, 10);
  let data: HabitData = createHabit({...emptyHabitData(), timeZone: 'UTC'}, {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(`${today}T00:00:00.000Z`), WALK);
  localStorage.setItem(AUTO_RULES_KEY, JSON.stringify(setAutoRule(emptyAutoRules(), newAutoRule({source: 'steps', comparator: 'at-least', threshold: 8000, habitId: WALK}, new Date(), 'r1'))));
  const update = vi.fn(async (change: (d: HabitData) => HabitData) => { data = change(data); return data; });
  const sources = (): DaySources => ({steps: 9000});
  const probe: {api?: ReturnType<typeof useAutoRules>} = {};
  const healthApplied: never[] = [];
  function Probe({store}: {store: HabitData}) { probe.api = useAutoRules({habits: {data: store, loaded: true, error: null, update} as never, sources, healthApplied, ready: true}); return null; }
  await act(async () => root.render(createElement(Probe, {store: data})));
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  await act(async () => root.render(createElement(Probe, {store: data})));
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  expect(data.habits[0]!.entries.find(e => e.date === today)?.count).toBe(1);
  const stored = JSON.parse(localStorage.getItem(AUTO_RULES_KEY)!);
  expect(stored.applied).toEqual([expect.objectContaining({habitId: WALK, date: today, before: 0, wrote: 1, source: 'steps', value: 9000})]);
  await act(async () => root.render(createElement(Probe, {store: data})));
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  expect(JSON.parse(localStorage.getItem(AUTO_RULES_KEY)!).applied).toHaveLength(1);
  await act(async () => { await probe.api!.undo(WALK, today); });
  expect(data.habits[0]!.entries.find(e => e.date === today)?.count).toBe(0);
  expect(JSON.parse(localStorage.getItem(AUTO_RULES_KEY)!).applied[0].undone).toBe(true);
});
