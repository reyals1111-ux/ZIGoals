import {writeFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {platformSchema} from '../positions';
import {accountsSchema} from '../accounts/schema';
import {ACCOUNT, financeV4} from './format-fixtures';
import {emptyFinanceHomesMarker, reconcileFinanceHomes} from './finance-homes';
import {GOAL_EXTRAS_KEY, goalExtrasSchema} from '../goal-extras/store';
import {buildShowcase, showcaseChoices} from '../showcase-data';
import {EXTRAS_SECTIONS} from './extras-sections';
import {applySection, collectSection, mergeSection} from './extras-sync';

/**
 * Session AB-Cloud (ADR-023): the records this build writes, for the frozen-reader proof (scripts/frozen-readers.mjs
 * runs scripts/frozen-readers/reader.frozen.ts against them inside worktrees of #37, #38 and #39). With FROZEN_OUT set
 * the fixture is written there; without it this test only proves that this build reads its own fixture.
 * Each part of the session adds the records it changes, with the reader module and spec an older release would use.
 */
/** Where each release keeps the reader of an extras record (#37 has none of them; #38 AA-Cloud's; #39 all). */
const FROZEN_READERS: Record<string, {module: string; spec: string}> = {
  'zigoals:average-goals:v1': {module: './average-goals/store', spec: 'AVERAGE_GOALS'}, 'zigoals:calculator:v1': {module: './compound/store', spec: 'CALCULATOR'},
  'zigoals:life-review:v1': {module: './life-review/store', spec: 'LIFE_REVIEW'}, 'zigoals:today-cards:v1': {module: './today-cards/store', spec: 'TODAY_CARDS'},
  'zigoals:reminders-plan:v1': {module: './reminders-plan/schema', spec: 'REMINDERS_PLAN'}, 'zigoals:habit-extras:v1': {module: './habits-extras/schema', spec: 'HABIT_EXTRAS'},
  'zigoals:routine-run:v1': {module: './routines/run-schema', spec: 'ROUTINE_RUN'}, 'zigoals:game:v1': {module: './game/schema', spec: 'GAME'},
  'zigoals:health-coach:v1': {module: './health-aa/coach-schema', spec: 'HEALTH_COACH'}, 'zigoals:micro-targets:v1': {module: './health-aa/micro', spec: 'MICRO_TARGETS'},
  'zigoals:macro-mode:v1': {module: './health-aa/macro-mode', spec: 'MACRO_MODE'}, 'zigoals:aisles:v1': {module: './health-aa/aisles', spec: 'AISLES_RECORD'},
  'zigoals:measurements-custom:v1': {module: './health-aa/measurements-custom', spec: 'MEASUREMENTS_CUSTOM'},
};
export function frozenFixture() {
  const v4 = platformSchema.parse({...financeV4(), goals: financeV4().goals.map(g => ({...g, milestones: [{id: 'm1', title: 'Flights booked', done: false, target: '150000'}]}))});
  // Part 1: finance as the finance-homes switch writes it (v5, one account, one milestone date).
  const finance = reconcileFinanceHomes(v4, {accounts: accountsSchema.parse({version: 1, items: [ACCOUNT]}), dates: {version: 1, dates: {'1': {m1: '2026-12-01'}}}}, emptyFinanceHomesMarker()).platform;
  // Part 1: a goal-extras record with this session's `cardArt` (ADR-023 C7) beside AA-Cloud's fields.
  const extras = goalExtrasSchema.parse({version: 1, areas: [{id: 'custom-music', label: 'Music', color: '#aa66ff'}],
    goals: {'private:1': {area: 'fun', why: 'See the sea', cardArt: 'nebula-1', updatedAt: '2026-10-13T08:00:00.000Z'}}});
  const records: Record<string, string> = {'zigoals:platform:v1': JSON.stringify(finance), [GOAL_EXTRAS_KEY]: JSON.stringify(extras)};
  const checks: {key: string; module: string; spec: string; expect?: Record<string, unknown>}[] = [
    {key: GOAL_EXTRAS_KEY, module: './goal-extras/store', spec: 'GOAL_EXTRAS', expect: {'goals.private:1.why': 'See the sea', 'goals.private:1.cardArt': 'nebula-1', 'areas': extras.areas}},
  ];
  // Part 2: every record the extras sections carry, as an extras merge writes it into the device keys: the Showcase's
  // records on device A merged with device B's edits (a goal's card art, a calculator scenario's name, a coach answer).
  const showcase = buildShowcase('2026-10-13', 'UTC').records, a = new Map<string, string>(Object.entries({...showcase, ...showcaseChoices()}));
  const storageA = {getItem: (k: string) => a.get(k) ?? null, setItem: (k: string, v: string) => { a.set(k, v); }, removeItem: (k: string) => { a.delete(k); }};
  for (const section of EXTRAS_SECTIONS) {
    const local = collectSection(storageA, section), other = structuredClone(local.records) as Record<string, {goals: Record<string, Record<string, unknown>>; scenarios?: {name: string}[]; answers?: Record<string, unknown>}>;
    const goals = other[GOAL_EXTRAS_KEY], first = goals ? Object.keys(goals.goals)[0] : undefined;
    if (goals && first) goals.goals[first] = {...goals.goals[first], cardArt: 'aurora-2', updatedAt: '2026-10-13T12:00:00.000Z'};
    const scenario = other['zigoals:calculator:v1']?.scenarios?.[0]; if (scenario) scenario.name = 'Renamed on device B';
    const coach = other['zigoals:health-coach:v1']; if (coach) coach.answers = {...coach.answers, '2026-10-12': {answer: 'keep', at: '2026-10-13T12:00:00.000Z'}};
    applySection(storageA, section, local, mergeSection(section, local.records, local.records, other));
    for (const r of section.records) if (a.has(r.spec.key) && r.spec.key !== GOAL_EXTRAS_KEY) { records[r.spec.key] = a.get(r.spec.key)!; checks.push({key: r.spec.key, ...FROZEN_READERS[r.spec.key]!}); }
    if (section.name === 'goals') { records[GOAL_EXTRAS_KEY + '#merged'] = a.get(GOAL_EXTRAS_KEY)!; checks.push({key: GOAL_EXTRAS_KEY + '#merged', module: './goal-extras/store', spec: 'GOAL_EXTRAS', expect: {[`goals.${first}.cardArt`]: 'aurora-2'}}); }
  }
  return {records, checks, finance: {accounts: 1, dates: 1}};
}

test('the frozen-reader fixture is read by this build', () => {
  const fixture = frozenFixture();
  // Every extras record the sections carry is in the fixture with its older readers named.
  expect(fixture.checks.map(c => c.key.replace('#merged', '')).sort()).toEqual([...new Set(EXTRAS_SECTIONS.flatMap(x => x.records.map(r => r.spec.key)).filter(k => fixture.records[k] || k === GOAL_EXTRAS_KEY)), GOAL_EXTRAS_KEY].sort());
  expect(platformSchema.parse(JSON.parse(fixture.records['zigoals:platform:v1']!)).schemaVersion).toBe(5);
  expect(goalExtrasSchema.parse(JSON.parse(fixture.records[GOAL_EXTRAS_KEY]!)).goals['private:1']!.cardArt).toBe('nebula-1');
  if (process.env.FROZEN_OUT) writeFileSync(process.env.FROZEN_OUT, JSON.stringify(fixture));
});
