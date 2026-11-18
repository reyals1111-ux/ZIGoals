import {expect, test} from 'vitest';
import {unifiedGoalSummaries, type GoalSummary} from '../../../goal-summary';
import {platformSchema} from '../../../positions';
import {buildShowcase} from '../../../showcase-data';
import {goalArcs} from '../../holo/goals';
import {focusGoal} from '../goal-focus';
import {goalDates, goalGauge, goalOrbits, isValueGoal, savingsJars} from './goals-views';

/** Session AS (ADR-042 Part 2, Goals): the goal answer widgets read the summaries Today and Goals read (the Showcase on 17 November 2026). */
const DAY = '2026-11-17', platform = platformSchema.parse(JSON.parse(buildShowcase(DAY, 'UTC').records['zigoals:platform:v1']!));
const goals = unifiedGoalSummaries([], {}, platform, [], Date.parse(`${DAY}T19:00:00Z`)), hud = goalArcs(goals, 7);

test('orbits: each active goal a planet on its own ring, with its whole percent; seven at most', () => {
  const orbits = goalOrbits(hud.arcs, hud.active);
  expect(orbits.planets.map(p => [p.ring, p.name, p.text, p.pace])).toEqual([[0, 'Emergency fund', '45%', 'Ahead of plan'], [1, 'First home deposit', '65%', 'On track'], [2, 'Japan adventure', '42%', 'Behind plan'], [3, 'Launch my creative studio', '50%', 'No plan yet'], [4, 'Reward income reserve', '50%', 'Needs a look']]);
  expect(orbits).toMatchObject({more: 0, active: 5, lead: {name: 'First home deposit', pct: 65}});
  const many = Array.from({length: 9}, (_, i) => ({...hud.arcs[0]!, key: `k${i}`, pct: i === 3 ? null : i * 10, text: i === 3 ? 'Unavailable' : `${i * 10}%`}));
  const crowded = goalOrbits(many);
  expect(crowded.planets).toHaveLength(7); expect(crowded.more).toBe(2); expect(crowded.planets[3]).toMatchObject({pct: null, text: 'Unavailable'}); expect(crowded.lead).toMatchObject({key: 'k6'});
  expect(goalOrbits([])).toEqual({planets: [], more: 0, active: 0, lead: null});
});
test('target dates on a time axis from today: the person’s own dates, soonest first', () => {
  const dates = goalDates(goals, DAY);
  expect(dates).toMatchObject({dated: 4, undated: 1, more: 0, spanDays: 730, past: 0, next: {name: 'Japan adventure', dateWords: 'Apr 16, 2027', when: 'in 150 days'}});
  expect(dates.marks.map(m => [m.n, m.name, m.dateWords, m.days, m.text])).toEqual([[1, 'Japan adventure', 'Apr 16, 2027', 150, '42%'], [2, 'Reward income reserve', 'Nov 17, 2027', 365, '50%'], [3, 'First home deposit', 'Feb 10, 2028', 450, '65%'], [4, 'Emergency fund', 'Nov 16, 2028', 730, '45%']]);
  expect(dates.marks[1]!.at).toBe(0.5); expect(dates.marks.at(-1)!.at).toBe(1);
  // A date that has passed on a goal still active is said so, never dropped.
  const late = goalDates(goals, '2027-05-20');
  expect(late.marks[0]).toMatchObject({name: 'Japan adventure', past: true, when: '34 days past its date', at: 0}); expect(late).toMatchObject({past: 1, next: {name: 'Reward income reserve'}});
  expect(goalDates([], DAY)).toEqual({marks: [], more: 0, dated: 0, undated: 0, spanDays: 1, next: null, past: 0});
});
test('jars: the active value goals, each filled to its progress; an unknown value is never an empty jar', () => {
  const jars = savingsJars(goals);
  expect(jars.jars.map(j => [j.name, j.text, j.saved, j.level])).toEqual([['Emergency fund', '45%', '$9,000.00 of $20,000.00', 0.45], ['First home deposit', '65%', '$52,000.00 of $80,000.00', 0.65], ['Japan adventure', '42%', '$2,500.00 of $6,000.00', 0.41659999999999997]]);
  expect(jars).toMatchObject({count: 3, more: 0, lead: {name: 'First home deposit'}});
  expect(isValueGoal(goals.find(g => g.name === 'Launch my creative studio')!)).toBe(false);
  const unknown: GoalSummary = {...goals[0]!, key: 'private:x', progressBound: 'unavailable'};
  expect(savingsJars([unknown]).jars[0]).toMatchObject({level: null, text: 'Unavailable', saved: 'Value unavailable of $20,000.00'});
  expect(savingsJars(Array.from({length: 8}, (_, i) => ({...goals[0]!, key: `private:${i}`})))).toMatchObject({count: 8, more: 2});
  expect(savingsJars([])).toEqual({jars: [], more: 0, count: 0, lead: null});
});
test('one goal as a gauge: the goal the answer named, else the lead goal, in the goal page’s own words', () => {
  const japan = goalGauge(focusGoal(goals, hud.arcs, '9203', null)!, null);
  expect(japan).toMatchObject({name: 'Japan adventure', figure: '42%', atLeast: false, tone: 'attention', label: 'reached · Japan adventure', note: '$2,500.00 of $6,000.00 · Behind plan'});
  expect(japan.share).toBeCloseTo(0.4166);
  expect(japan.rows).toEqual([['Reached', '42%'], ['So far, of the target', '$2,500.00 of $6,000.00'], ['Plan', 'Behind plan'], ['Left to go', '$3,500.00'], ['Target date', 'Apr 16, 2027']]);
  const lead = goalGauge(focusGoal(goals, hud.arcs, undefined, null)!, {headline: 'On pace for Aug 2028', detail: 'From your last 90 days.', estimate: true});
  expect(lead).toMatchObject({name: 'Emergency fund', figure: '45%', share: 0.45, tone: 'good', note: '$9,000.00 of $20,000.00 · Ahead of plan'});
  expect(lead.rows.at(-1)).toEqual(['Pace', 'On pace for Aug 2028 (an estimate: a projection, not a promise). From your last 90 days.']);
  expect(focusGoal([], [], '9203', null)).toBeNull();
});
