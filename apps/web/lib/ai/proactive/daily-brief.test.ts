import {expect, test} from 'vitest';
import {habitDay, latestHabitRule} from '../../habits';
import {startHabitTimer} from '../../habit-timer-actions';
import {toolEnv, type ToolSources} from '../tools/env';
import {gatesFor, sentinelsIn, showcaseSources, withHandHealth, withSentinels} from '../tools/fixtures';
import {recordedSnapshot, withChecklist, withEarn} from '../evals/fixtures-af';
import {briefChatText, briefForAi, briefLines, eveningRecap, morningBrief, NOTHING_RECORDED, recapDue} from './brief';
import {asOfText, checklistToday, earningSummary} from './brief-sources';
import {listNames, toneProblem} from './calm';

// Session AF (L4, P8.2): Daily Briefing v2 and the Evening Recap, made on this device from the fictional Showcase records.
const env = (sources: ToolSources = showcaseSources(), health = true, purpose: 'provider' | 'local' = 'local') => toolEnv(sources, gatesFor(health), purpose);
const notes = [{text: 'I train in the morning', category: 'schedule'}, {text: 'Prefers short answers', category: 'preferences'}];

test('without extras the brief is exactly the three lines it always was; with them, the v2 sections in their order', () => {
  const e = env(), v1 = morningBrief(e)!, v2 = morningBrief(e, {snapshot: null})!;
  expect(v1.sections).toBeUndefined();
  expect(v2.lines).toEqual(v1.lines); expect(v2.due).toBe(v1.due);
  const order = ['checklist', 'meals', 'timers', 'goals', 'earning', 'note'];
  const ids = v2.sections!.map(s => s.id);
  expect(ids).toEqual([...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
  for (const line of briefLines(v2)) expect(toneProblem(line), line).toBeNull();
  expect(briefForAi(v2).split('\n').slice(1)).toEqual(briefLines(v2).map(l => `- ${l}`));
});
test('the Checklist dots, a running timer, a note the person keeps, and the earning line with both APR figures, each with its source and "as of"', () => {
  let sources = withEarn(withChecklist({...showcaseSources(), notes}));
  const read = sources.habits.habits.find(h => latestHabitRule(h).measurement.kind === 'duration' && !h.timer);
  if (read) sources = {...sources, habits: startHabitTimer(sources.habits, read.id, '00000000-0000-4000-8000-0000000000aa', new Date(`${sources.habitDay}T07:40:00Z`), 'UTC')};
  const brief = morningBrief(env(sources), {snapshot: sources.earn})!, by = Object.fromEntries(brief.sections!.map(s => [s.id, s.text]));
  const list = checklistToday(env(sources))!;
  expect(by.checklist).toBe(`${list.done} of ${list.total} dots done${list.open.length ? `; next: ${listNames(list.open.slice(0, 3))}` : ''}.`);
  expect(list.total).toBe(4); expect(list.done).toBeGreaterThanOrEqual(1);
  expect(by.checklist).not.toMatch(/Buy running shoes/); // ticked today: not "next"
  if (read) expect(by.timers).toMatch(new RegExp(`${read.title.slice(0, 10)}.* timer since 07:40`));
  expect(by.note).toBe('You said: I train in the morning.');
  // The earning line: the person's tracked staking (practice labelled) and the Earn page's two figures side by side (H97).
  expect(by.earning).toMatch(/your tracked records, as of /);
  expect(by.earning).toMatch(/Native staking APR: issuance figure \d+\.\d\d\s% and measured figure \d+\.\d\d\s% at the same commission \(ZIGChain mainnet LCD \(official\), as of 2026-10-18 \d\d:\d\d UTC; measured: ZIGChain mainnet LCD \(official\), as of 2026-10-18 \d\d:\d\d UTC\)\./);
  // Every percentage in the brief is one of the snapshot's own values (ZIGi wrote none of its own).
  const quoted = new Set(sources.earn!.figures.map(f => f.value));
  for (const pct of briefLines(brief).join(' ').match(/\d+(?:\.\d+)?\s%/g) ?? []) expect(quoted.has(pct), pct).toBe(true);
});
test('no snapshot read in this visit: the earning line says where the figure is, and states none', () => {
  const e = env(withChecklist(showcaseSources()));
  const s = earningSummary(e, null);
  if (s) { expect(s.lines.at(-1)).toBe('Native staking APR: not read yet in this visit; it is on the Earn page with its source.'); expect(s.lines.join(' ')).not.toMatch(/%/); }
  // Nothing tracked at all: no earning section.
  expect(earningSummary(env({...showcaseSources(), platform: {...showcaseSources().platform, positions: []}}), recordedSnapshot())).toBeNull();
  // The earning line can be turned off.
  expect(morningBrief(e, {snapshot: recordedSnapshot(), earning: false})!.sections!.some(s => s.id === 'earning')).toBe(false);
  expect(asOfText('2026-10-19T07:58:12.000Z')).toBe('2026-10-19 07:58 UTC');
});
test('Health only through its gate: meals, nights, fasts and Health dots never show with the gate closed, and nothing private leaks', () => {
  const sources = withChecklist(withSentinels(withHandHealth(showcaseSources())));
  for (const purpose of ['provider', 'local'] as const) {
    const shut = env(sources, false, purpose), brief = morningBrief(shut, {snapshot: null}), recap = eveningRecap(shut, {});
    const text = JSON.stringify([brief, recap]);
    expect(sentinelsIn(text), purpose).toEqual([]);
    expect(brief?.sections?.some(s => s.id === 'meals')).not.toBe(true);
    expect(recap?.sections?.some(s => s.id === 'health')).not.toBe(true);
    expect(brief?.sections?.find(s => s.id === 'checklist')?.text ?? '').toMatch(/Health dots are not shared with ZIGi\.|^$/);
  }
  // The control: with the gate open the recap carries Health's counts.
  expect(eveningRecap(env(sources, true), {})!.sections!.some(s => s.id === 'health')).toBe(true);
});
test('the evening recap: done and open today, streaks kept, the Checklist, one for tomorrow; calm; empty means none; the time rule', () => {
  const sources = withChecklist(showcaseSources()), e = env(sources), recap = eveningRecap(e, {})!;
  const active = e.habits.habits.filter(h => latestHabitRule(h).state === 'active');
  const done = active.filter(h => habitDay(h, e.habitDay, e.habitDay).status === 'complete');
  expect(recap.sections!.find(s => s.id === 'done')!.text).toMatch(new RegExp(`^${done.length} habits? done`));
  expect(recap.sections!.map(s => s.id)).toContain('tomorrow');
  for (const line of briefLines(recap)) expect(toneProblem(line), line).toBeNull();
  const empty = showcaseSources(undefined, {habits: {...sources.habits, habits: []}, platform: {...sources.platform, goals: [], positions: []}, localGoals: []});
  expect(eveningRecap(env(empty, false), {})).toBeNull();
  expect(briefChatText(env(empty, false), 'evening')).toBe(NOTHING_RECORDED);
  expect(briefChatText(e, 'morning')).toMatch(/^Your morning brief:\n• /);
  expect(recapDue('18:00', '18:00')).toBe(true); expect(recapDue('17:59', '18:00')).toBe(false); expect(recapDue('21:30', '21:00')).toBe(true);
});
