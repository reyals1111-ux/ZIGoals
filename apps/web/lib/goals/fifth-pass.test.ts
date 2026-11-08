import {expect, test} from 'vitest';
import {averageEnding, endAverageGoal} from './average-finish';
import {addAverageGoal, emptyAverageGoals, logAverageValue} from '../average-goals/store';
import {averageProgress} from '../average-goals/progress';
import {achievementsOf} from '../achievements';
import {emptyGoalExtras} from '../goal-extras/store';
import {buildShowcase} from '../showcase-data';
import {isShowcaseGoalCompletion, isShowcaseRow, showcaseRowIds} from '../../components/activity-showcase';
import {HEALTH_STORAGE_KEY, healthSchema} from '../health';
import {getCounterActivities} from '../health-counter-activities';
import {getSleepActivities} from '../health-sleep-activities';
import {TASKS_KEY, tasksSchema} from '../tasks/schema';
import {getTaskActivities} from '../tasks/activity';
import {HABITS_KEY} from '../habits';
import {habitLifecycleRows} from '../habit-lifecycle';
import {goalEyebrow} from '../goal-summary';
import {provenanceWords, sourceStateWords, timelineAmount} from './evidence-words';
import {paceForecast, paceFromForecast} from '../goal-forecast';
import {paceSentence} from './what-if';
import {fundingHealth} from '../goal-intelligence';
import {PLATFORM_KEY, platformSchema} from '../positions';
import {valueReason} from './value-reason';

// Session AL fifth pass (lane L4, replay GROK53_REPLAY_L4_2.md): unit checks for the fifth-pass fixes.

test('G-045: a missed average closes as not reached and never reaches the Hall; a met one finishes into it', () => {
  const at = '2026-11-04T02:30:00.000Z', day = '2026-11-04';
  let s = addAverageGoal(emptyAverageGoals(), {id: 'screen', name: 'Screen time', metric: 'custom', unit: 'h a day', target: 2, direction: 'at-most', windowDays: 7, createdAt: at});
  s = logAverageValue(s, 'screen', {day, value: 2.3});
  const missed = averageProgress(s.goals[0]!, undefined, day);
  expect(missed.met).toBe(false);
  expect(averageEnding(missed.met)).toMatchObject({status: 'closed', action: 'Close as not reached', celebrate: false});
  const closed = endAverageGoal(s, 'screen', missed.met, at);
  expect(closed.goals[0]!.status).toBe('closed');
  expect(closed.goals[0]!.completedAt).toBeUndefined();
  expect(achievementsOf([], closed.goals, emptyGoalExtras())).toEqual([]);
  // Nothing recorded yet: it can be closed, not finished.
  expect(averageEnding(null).status).toBe('closed');
  // On target: it finishes, and the Hall lists it.
  const met = logAverageValue(s, 'screen', {day, value: 1.5});
  const p = averageProgress(met.goals[0]!, undefined, day);
  expect(p.met).toBe(true);
  const finished = endAverageGoal(met, 'screen', p.met, at);
  expect(finished.goals[0]!.status).toBe('completed');
  expect(achievementsOf([], finished.goals, emptyGoalExtras()).map(a => a.name)).toEqual(['Screen time']);
});

test('B-092: the Showcase\'s milestone row names the milestone, never "Portfolio completed" for an active project', () => {
  const {records} = buildShowcase('2026-11-05', 'UTC');
  const platform = platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!));
  const studio = platform.goals.find(g => g.id === '9205')!;
  expect(studio.status).toBe('active');
  const rows = platform.goalHistory.flatMap(h => h.goalId === '9205' && h.kind !== 'valuation' ? [h] : []);
  expect(rows.map(h => h.label)).not.toContain('Portfolio completed · Showcase');
  expect(rows.find(h => h.id === 'example-milestone')!.label).toBe('Milestone ticked: “Create the portfolio” · Showcase');
  expect(rows.every(h => !/\bcompleted\b/i.test(h.label))).toBe(true);
});

test('D-227: seeded Health counters, nights and tasks are Showcase examples; a new one is the person\'s', () => {
  const {records} = buildShowcase('2026-11-05', 'UTC');
  const ids = showcaseRowIds(records);
  const health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!));
  const counters = getCounterActivities(health);
  expect(counters.length).toBeGreaterThan(0);
  expect(counters.every(r => isShowcaseRow(r.id, ids))).toBe(true);
  const nights = getSleepActivities(health);
  expect(nights.every(r => isShowcaseRow(r.id, ids))).toBe(true);
  if (records[TASKS_KEY]) {
    const tasks = getTaskActivities(tasksSchema.parse(JSON.parse(records[TASKS_KEY])), iso => iso.slice(0, 10));
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every(r => isShowcaseRow(r.id, ids))).toBe(true);
  }
  // A seeded habit's paused or archived row ("habit-state:<habit>:<from>") read "Private · this browser".
  const lifecycle = habitLifecycleRows(JSON.parse(records[HABITS_KEY]!).habits, []);
  expect(lifecycle.length).toBeGreaterThan(0);
  expect(lifecycle.every(r => isShowcaseRow(r.id, ids))).toBe(true);
  expect(isShowcaseRow('habit-state:9f6c1a7e-new:2026-11-05', ids)).toBe(false);
  expect(isShowcaseRow('counter:9f6c1a7e-new', ids)).toBe(false);
  expect(isShowcaseRow('task-done:9f6c1a7e-new:2026-11-05T10:00:00.000Z', ids)).toBe(false);
});

test('D-227: a seeded goal\'s completion row (written by the first valuation tick) is the example\'s, until the person changes the goal', () => {
  const {records} = buildShowcase('2026-11-05', 'UTC');
  const ids = showcaseRowIds(records);
  const platform = platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!));
  const tick = {id: 'lifecycle:9204:0f6c1a7e', kind: 'completed' as const};
  const s = {...platform, goals: platform.goals.map(g => g.id === '9204' ? {...g, lifecycle: [...(g.lifecycle ?? []), tick]} : g)};
  expect(isShowcaseGoalCompletion(tick.id, '9204', s, ids)).toBe(true);
  // The person adds a contribution of their own: the row is theirs from then on.
  const own = {...s, contributions: [...s.contributions, {id: 'mine-1', goalId: '9204', goalScope: 'private'}]};
  expect(isShowcaseGoalCompletion(tick.id, '9204', own as typeof s, ids)).toBe(false);
  // A goal the person made is never an example.
  expect(isShowcaseGoalCompletion(tick.id, 'not-seeded', s, ids)).toBe(false);
});

test('DV-018/DV-120: one kind name in both modes; a project is "Project", never "Project Goal · Project"', () => {
  expect(goalEyebrow({type: 'REWARD'}, {type: 'Reward Goal', source: 'Native rewards'}, true)).toBe('Rewards goal · Native rewards');
  expect(goalEyebrow({type: 'PROJECT'}, {type: 'Project Goal', source: 'Project'}, true)).toBe('Project');
  expect(goalEyebrow({type: 'QUANTITY'}, {type: 'Quantity Goal', source: 'Existing wealth'}, true)).toBe('Count goal · Existing wealth');
});

test('N-167/DV-041b/NB-098: a goal\'s records in plain words; a project row counts milestones, never "4 USD"', () => {
  expect(provenanceWords('LOCAL_EDIT')).toBe('Your change, on this device');
  expect(provenanceWords('RETAINED_MILESTONE')).toBe('Kept in the goal’s history');
  expect(provenanceWords('SOME_NEW_CODE')).toBe('Some new code');
  expect(sourceStateWords('UNKNOWN', 'MANUAL')).toBe('Liquidity not known · Entered by you');
  expect(timelineAmount({quantity: '4', asset: 'USD', decimals: 0}, {type: 'PROJECT', asset: 'USD', decimals: 0})).toBe('4 milestones');
  expect(timelineAmount({quantity: '1', asset: 'USD', decimals: 0}, {type: 'PROJECT', asset: 'USD', decimals: 0})).toBe('1 milestone');
  expect(timelineAmount({quantity: '3', asset: 'books', decimals: 0}, {type: 'QUANTITY', asset: 'books', decimals: 0})).toBe('3 books');
  for (const s of [provenanceWords('LOCAL_EDIT'), sourceStateWords('UNKNOWN', 'MANUAL')]) expect(s).not.toMatch(/[A-Z]{2,}_|UNKNOWN|MANUAL/);
});

test('PR-024: What if starts from the goal\'s one pace forecast (the pace card\'s figure and date)', () => {
  const today = '2026-11-04';
  const points = [{day: '2026-09-01', value: 0}, {day: '2026-10-01', value: 300}, {day: '2026-11-04', value: 640}];
  const f = paceForecast(points, 640, 2000, today);
  expect(f.state).toBe('estimate');
  const pace = paceFromForecast(f);
  expect(pace.perMonth).toBeCloseTo(f.perDay! * 30, 6);
  expect(pace.date).toBe(f.date);
  expect(paceSentence(pace, d => d)).toBe(`At your recorded pace (the pace forecast) you reach the target about ${f.date}.`);
  expect(paceSentence(pace, d => d)).not.toMatch(/last 30 days/);
});

test('DV-034a/DV-104/MO-120: a count of books never warns about the liquidity of allocated wealth', () => {
  const {records} = buildShowcase('2026-11-05', 'UTC');
  const base = platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!));
  const at = '2026-11-05T09:00:00.000Z';
  const s = platformSchema.parse({...base,
    goals: [...base.goals, {...base.goals.find(g => g.id === '9204')!, id: '7701', name: 'Read books', type: 'QUANTITY', asset: 'books', denom: 'manual:books', decimals: 0, target: '20', plan: undefined, lifecycle: [], planRevisions: [], milestones: [], createdAt: at}],
    positions: [...base.positions, {id: 'books-tally', providerId: 'Read books', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'books', denom: 'manual:books', quantity: '3', decimals: 0, assetClass: 'Custom', verification: 'MANUAL', sync: 'MANUAL', liquidity: 'UNKNOWN', observedAt: at, provenance: 'Your own count', notes: ''}],
    allocations: [...base.allocations, {goalId: '7701', positionId: 'books-tally', quantity: '3'}],
  });
  const h = fundingHealth(s, '7701', Date.parse(at), []);
  expect(h.warnings.join(' ')).not.toMatch(/liquidity/i);
});

test('X3-15: a USD asset allocated to a EUR goal is said, never converted', () => {
  const reason = valueReason({asset: 'USD', assetClass: 'Cash', valuation: undefined, marketRef: undefined}, 'EUR');
  expect(reason).toMatch(/^Valued in USD; this goal counts EUR\. ZIGoals never converts between currencies/);
  expect(valueReason({asset: 'EUR', assetClass: 'Cash', valuation: undefined, marketRef: undefined}, 'EUR')).toBeNull();
});
