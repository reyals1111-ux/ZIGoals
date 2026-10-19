import live from '../../earn/fixtures/live-2026-10-19.json';
import validators from '../../earn/fixtures/validators-2026-10-19.json';
import {earnSnapshot, recordEarnSnapshot, resetEarnSnapshot, type EarnSnapshot} from '../../earn/snapshot';
import type {EarnFamily, LiveState} from '../../earn/client';
import {emptyChecklist, emptyChecklistDays, type Checklist} from '../../checklist/schema';
import {addCustom, addFavourite} from '../../checklist/store';
import {setCustomDone} from '../../checklist/day';
import type {ToolSources} from '../tools/env';
import type {PageView} from '../context/page-view';
import {pageViewOf} from '../context/page-view';

/**
 * Session AF (L4): the fixtures the golden sets, the unit tests and the real-model round share. The Earn snapshot is made
 * by the snapshot's own builder from the recorded read of every Earn upstream (lib/earn/fixtures/live-2026-10-19.json,
 * lane L1's one real read; validators-2026-10-19.json, lane L2a's wire shape), so the figures ZIGi quotes in a test are
 * the ones the Earn page would state. The Checklist is a small fictional path on the Showcase's habits; the page view is
 * Today's built-in cards. No network, no storage, no model.
 */
type Recorded = {source: {name: string; origin?: string}; height?: string; observedAt?: string; fetchedAt: string; stale: boolean; data: unknown};
const answers = (live as unknown as {answers: Record<string, Recorded>}).answers;
const FAMILY_KEYS: [EarnFamily, string][] = [['chain', 'chainMainnet'], ['valdora', 'valdora'], ['oroswap', 'oroswap'], ['defillama', 'defillama'], ['vaults', 'vaults'], ['measured', 'measured']];
/** The snapshot as the Earn page leaves it after one visit with every family read (the recorded answers). */
export function recordedSnapshot(options: {unavailable?: readonly EarnFamily[]} = {}): EarnSnapshot {
  resetEarnSnapshot();
  for (const [family, key] of FAMILY_KEYS) {
    const a = answers[key]!;
    const state: LiveState<unknown> = options.unavailable?.includes(family) ? {phase: 'unavailable', reason: 'UPSTREAM_DOWN', source: a.source} : {phase: 'ok', answer: {source: a.source, ...(a.height ? {height: a.height} : {}), ...(a.observedAt ? {observedAt: a.observedAt} : {}), fetchedAt: a.fetchedAt, stale: false, data: a.data}};
    recordEarnSnapshot(family, state);
  }
  const v = (validators as unknown as {answer: Record<string, unknown> & {validators: unknown[]}}).answer;
  recordEarnSnapshot('validators', {phase: 'ok', answer: {source: {name: 'ZIGChain mainnet LCD (official)'}, fetchedAt: v.observedAt as string, stale: false, data: {...v, fetchedAt: v.observedAt}}} as LiveState<unknown>);
  const snapshot = earnSnapshot();
  resetEarnSnapshot();
  return snapshot;
}
/** A fictional path: the Showcase's "Read" habit starred, two items of the person's own, one of them ticked today, and water. */
export function checklistPath(sources: ToolSources): Checklist {
  const read = sources.habits.habits.find(h => h.title === 'Read'), at = new Date(`${sources.habitDay}T06:00:00Z`);
  let r = emptyChecklist();
  if (read) r = addFavourite(r, {kind: 'habit', habitId: read.id}, {id: 'ck_read', at});
  r = addCustom(r, {label: 'Buy running shoes'}, {id: 'ck_shoes', at});
  r = addCustom(r, {label: 'Push-ups'}, {id: 'ck_push', at});
  r = addFavourite(r, {kind: 'health', input: 'water'}, {id: 'ck_water', at, label: 'Water'});
  return r;
}
export function withChecklist(sources: ToolSources): ToolSources {
  const days = setCustomDone(emptyChecklistDays(), sources.habitDay, 'ck_shoes', true);
  return {...sources, checklist: {record: checklistPath(sources), days, date: sources.habitDay, unreadable: false}};
}
export const withEarn = (sources: ToolSources, snapshot: EarnSnapshot = recordedSnapshot()): ToolSources => ({...sources, earn: snapshot});
/** Today's page as the person sees it: the whole-life overview and Daily Habits in view, Funding rhythm and Daily Health below. */
export function todayView(healthOpen = true): PageView {
  return pageViewOf('/app', [{id: 'today:whole-life', text: 'Whole-life overview', inView: true}, {id: 'today:habits', text: 'Daily Habits 3 of 5', inView: true}, {id: 'today:funding', text: 'Funding rhythm · 4 weeks', inView: false}, {id: 'today:health', text: 'Daily Health 1.2 L', inView: false}, {id: 'card:zigi-brief', text: '', inView: false}], {healthOpen, sensitive: false, focused: 'today:funding'})!;
}
export const withPage = (sources: ToolSources, view: PageView | null = todayView()): ToolSources => ({...sources, pageView: view});
