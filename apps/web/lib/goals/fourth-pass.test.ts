import {expect, test} from 'vitest';
import {averageValueCheck, readAverageValue} from './average-limits';
import {sleepHoursWarning} from '../health-plausible';
import {showcaseGoalExtras} from '../goal-extras/showcase';
import {buildShowcase} from '../showcase-data';
import {showcaseSleep} from '../sleep/showcase';
import {templateById} from '../templates/goal-library';
import {isShowcaseRow, showcaseRowIds} from '../../components/activity-showcase';
import {isOwnCountSource} from './goal-units';
import {touchOnInput} from './wizard-guard';
import {fundingFact, goalEyebrow} from '../goal-summary';

// Session AL fourth pass (lane L4): unit checks for the fourth-pass fixes in Goals and Activity.

test('DV-012a/DV-052a/G-044: 20–24 h of sleep is asked once, in Health\'s own words; 7 h and other measures ask nothing', () => {
  const read = readAverageValue('sleep-hours', '22', true);
  expect(read.ok).toBe(true);
  expect(averageValueCheck('sleep-hours', 22)).toBe(sleepHoursWarning(22));
  expect(averageValueCheck('sleep-hours', 22)).toMatch(/most of the day/);
  expect(averageValueCheck('sleep-hours', 7)).toBeNull();
  expect(averageValueCheck('steps', 22)).toBeNull();
  // Over 24 h is still refused by the limits table (never asked, never kept).
  expect(readAverageValue('sleep-hours', '25', true).ok).toBe(false);
});

test('PR-022/N-PR-04: the Showcase sleep goal, its extras and Health\'s sleep goal state one target (8 h = 480 min)', () => {
  const {extras, averages} = showcaseGoalExtras('2026-11-05');
  const sleep = averages.goals.find(g => g.id === 'showcase-sleep')!;
  expect(sleep).toMatchObject({name: 'Sleep 8 hours a night', target: 8, unit: 'h a night'});
  const extra = extras.goals['average:showcase-sleep']!;
  // Any template the extras name must carry the same target as the goal; none is named now.
  const template = extra.template ? templateById(extra.template) : undefined;
  if (template?.average) expect(template.average.target).toBe(sleep.target);
  expect(extra.template).toBeUndefined();
  // Health's Showcase sleep goal (lib/sleep/showcase.ts) is 480 minutes.
  expect(showcaseSleep('2026-11-05').goal?.minutes).toBe(sleep.target * 60);
});

test('PR-066/PR-099/N-170/D-227: a Showcase row is named as one; a row the person adds is not', () => {
  const {records} = buildShowcase('2026-11-05', 'UTC');
  const ids = showcaseRowIds(records);
  expect(isShowcaseRow('created:9201', ids)).toBe(true);
  expect(isShowcaseRow('contribution:example-emergency-0', ids)).toBe(true);
  expect(isShowcaseRow('created:123456789', ids)).toBe(false);
  expect(isShowcaseRow('contribution:8f0c2d6e-0000-4000-8000-000000000001', ids)).toBe(false);
});

test('DV-147: a count goal\'s own tally is not a source for other goals', () => {
  const books = {type: 'QUANTITY' as const, asset: 'books', denom: 'manual:books'};
  expect(isOwnCountSource({sourceType: 'MANUAL', asset: 'books', denom: 'manual:books'}, [books])).toBe(true);
  expect(isOwnCountSource({sourceType: 'MANUAL', asset: 'USD', denom: 'USD'}, [books])).toBe(false);
  expect(isOwnCountSource({sourceType: 'MANUAL', asset: 'books', denom: 'manual:books'}, [])).toBe(false);
});

test('DV-034a/DV-104: a count goal is said in counts: no "Money you have", no "Saving plan"', () => {
  expect(goalEyebrow({type: 'QUANTITY'}, {type: 'Quantity Goal', source: 'Your own count'}, false)).toBe('Count goal · Your own count');
  expect(goalEyebrow({type: 'QUANTITY'}, {type: 'Quantity Goal', source: 'Existing wealth'}, false)).toBe('Count goal · What you hold');
  expect(fundingFact({requiresReview: false, status: 'active', fundingHealth: 'NO PLAN'}, false, 'QUANTITY')).toEqual({label: 'Plan', value: 'No plan yet'});
  // A savings goal keeps its words.
  expect(goalEyebrow({type: 'VALUE'}, {type: 'Value Goal', source: 'Existing wealth'}, false)).toBe('Savings goal · Money you have');
  expect(fundingFact({requiresReview: false, status: 'active', fundingHealth: 'NO PLAN'}, false, 'VALUE')).toEqual({label: 'Saving plan', value: 'No saving plan yet'});
});

test('BN-153: touchOnInput is a bubble-phase handler that marks touched only once', () => {
  const calls: boolean[] = [];
  const props = touchOnInput(false, v => calls.push(v));
  expect(Object.keys(props)).toEqual(['onInput']);
  props.onInput(); expect(calls).toEqual([true]);
  touchOnInput(true, v => calls.push(v)).onInput(); expect(calls).toEqual([true]);
});
