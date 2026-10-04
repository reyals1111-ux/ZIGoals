import {afterEach, describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, createHabit, emptyHabitData, habitDataSchema, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, type HealthData} from '../health';
import {PLATFORM_KEY, platformSchema} from '../positions';
import {WEEKLY_REVIEW_KEY, weeklyReviewSchema} from '../weekly-review/schema';
import {reviewState, reviewWindow} from '../weekly-review/engine';
import {insightCards} from '../insights/engine';
import {unifiedGoalSummaries, type GoalSummary} from '../goal-summary';
import {emptyReminders, type Reminders} from '../reminders/schema';
import {addLocalDays, localWeekday} from '../local-date';
import {planDay} from '../plan-revisions';
import {guideCandidates, guideNudge, type GuideContext} from './guide';
import {GUIDE_LABEL} from './copy';
import type {Guide} from './schema';

// ADR-011 "Engine": each condition true and false, the priority order, one nudge a day, "Not today", zones, Showcase.
const TODAY = '2026-10-05'; // a Monday
const evening = () => new Date(2026, 9, 5, 19, 0), morning = () => new Date(2026, 9, 5, 9, 0);
const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });
const on = (patch: Partial<Guide> = {}): Guide => ({version: 1, enabled: true, enabledOn: '2026-09-01', dismissed: {}, ...patch});
const input = (title: string, schedule: HabitInput['schedule'] = {kind: 'daily'}): HabitInput => ({title, category: 'Health', description: '', notes: '', schedule, target: 1});
const AT = `${TODAY}T07:00:00.000Z`, ids = ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'];
function habits(...specs: [string, HabitInput][]): HabitData { let data = emptyHabitData(); for (const [id, spec] of specs) data = createHabit(data, spec, new Date('2026-09-01T07:00:00.000Z'), id); return data; }
const goal = (patch: Partial<GoalSummary>): GoalSummary => ({key: 'private:g1', id: 'g1', href: '/app/goals/tracked/g1', name: 'Trip', type: 'Value Goal', source: 'Future contributions', status: 'active', scene: 'horizon', current: '0', currency: 'ZIG', progressPct: '0', fundingHealth: 'on track', requiresReview: false, metadata: [], ...patch} as GoalSummary);
const base = (patch: Partial<GuideContext> = {}): GuideContext => ({guide: on(), habits: habits([ids[0]!, input('Walk')]), health: createEmptyHealth(), reminders: emptyReminders(), goals: [], insights: [], review: {isReviewDay: false, state: 'done'}, now: morning(), today: TODAY, ...patch});

describe('each condition, true and false', () => {
  test('review-ready: the chosen weekday with an open review; not when done, skipped or on another day', () => {
    expect(guideNudge(base({review: {isReviewDay: true, state: 'due'}}))).toMatchObject({id: 'review-ready', heading: 'Your weekly review is ready when you are.', body: 'It takes about five minutes.', action: {label: 'Open the review', href: '/app#weekly-review'}});
    expect(guideNudge(base({review: {isReviewDay: true, state: 'draft'}}))?.id).toBe('review-ready');
    expect(guideNudge(base({review: {isReviewDay: true, state: 'done'}}))).toBeNull();
    expect(guideNudge(base({review: {isReviewDay: false, state: 'due'}}))).toBeNull();
  });
  test('habits-open: from 18:00, open habits without a reminder card showing; the titles are the person\'s own, at most two', () => {
    const three = habits([ids[0]!, input('Walk')], [ids[1]!, input('Read')], ['10000000-0000-4000-8000-000000000003', input('Stretch')]);
    expect(guideNudge(base({habits: three, now: evening()}))).toMatchObject({id: 'habits-open', heading: '3 of your habits are still open today: Walk, Read.', body: 'A small step counts.', action: {label: 'Open habits', href: '/app/habits'}});
    expect(guideNudge(base({now: evening()}))?.heading).toBe('1 of your habits is still open today: Walk.');
    expect(guideNudge(base({now: morning()}))).toBeNull();
    const done = logHabitValue(base().habits, ids[0]!, TODAY, 1, {}, new Date(AT));
    expect(guideNudge(base({habits: done, now: evening()}))).toBeNull();
    // A reminder card already shows for Walk (its time has passed): the Guide says nothing about it.
    const reminders: Reminders = {...emptyReminders(), habits: {[ids[0]!]: {time: '08:00'}}};
    expect(guideNudge(base({reminders, now: evening()}))).toBeNull();
    const weekend = habits([ids[0]!, input('Gym', {kind: 'weekdays', days: [6]})]);
    expect(guideNudge(base({habits: weekend, now: evening()}))?.id).toBe('quiet-day');
  });
  test('streak-notice: a daily habit at 7 days in a row today; 6 or 8 say nothing; the id names the habit and the milestone', () => {
    const streak = (days: number) => { let data = habits([ids[0]!, input('Walk')]); for (let n = days; n >= 1; n--) data = logHabitValue(data, ids[0]!, addLocalDays(TODAY, -n), 1, {}, new Date(AT)); return data; };
    expect(guideNudge(base({habits: streak(7)}))).toMatchObject({id: `streak-notice:${ids[0]}:7`, heading: 'Walk: 7 days in a row today.', body: 'Worth noticing.', action: {label: 'Open habit', href: `/app/habits#habit-${ids[0]}`}});
    expect(guideNudge(base({habits: streak(6)}))).toBeNull();
    expect(guideNudge(base({habits: streak(8)}))).toBeNull();
    expect(guideNudge(base({habits: streak(14)}))?.id).toBe(`streak-notice:${ids[0]}:14`);
  });
  test('goal-next-date: an active goal whose plan is due today or tomorrow (the plan day is UTC); not later, not closed', () => {
    const today = planDay(morning().getTime()), tomorrow = addLocalDays(today, 1), later = addLocalDays(today, 2);
    expect(guideNudge(base({goals: [goal({nextContributionDate: today})]}))).toMatchObject({id: 'goal-next-date:private:g1', heading: 'Trip: your plan’s next date is today.', body: 'Nothing moves by itself; this is just the date you chose.', action: {label: 'Open goal', href: '/app/goals/tracked/g1'}});
    expect(guideNudge(base({goals: [goal({nextContributionDate: tomorrow})]}))?.heading).toBe('Trip: your plan’s next date is tomorrow.');
    expect(guideNudge(base({goals: [goal({nextContributionDate: later})]}))).toBeNull();
    expect(guideNudge(base({goals: [goal({nextContributionDate: today, status: 'closed'})]}))).toBeNull();
    expect(guideNudge(base({goals: [goal({nextContributionDate: null})]}))).toBeNull();
  });
  test('insight-ready points at a card; quiet-day needs a habit that is not scheduled today; first-time needs an empty account on the day the Guide was turned on', () => {
    expect(guideNudge(base({insights: [{id: 'steps-water'}]}))).toMatchObject({id: 'insight-ready:steps-water', action: null});
    const weekend = habits([ids[0]!, input('Gym', {kind: 'weekdays', days: [6]})]);
    expect(guideNudge(base({habits: weekend}))).toMatchObject({id: 'quiet-day', heading: 'Nothing is due today.', body: 'Rest is part of the plan.', action: null});
    expect(guideNudge(base({habits: weekend, review: {isReviewDay: true, state: 'done'}}))?.id).toBe('quiet-day');
    const empty = base({habits: emptyHabitData(), guide: on({enabledOn: TODAY})});
    expect(guideNudge(empty)).toMatchObject({id: 'first-time', heading: 'I read nothing but what you record here, on this device.', action: {label: 'Open habits', href: '/app/habits'}});
    expect(guideNudge(base({habits: emptyHabitData(), guide: on({enabledOn: '2026-10-04'})}))).toBeNull();
    const health: HealthData = {...createEmptyHealth(), activity: [{id: 'health_activity-001', date: TODAY, name: 'Walk', steps: 100, minutes: 5, createdAt: AT, updatedAt: AT}]};
    expect(guideNudge(base({habits: emptyHabitData(), health, guide: on({enabledOn: TODAY})}))).toBeNull();
  });
});
describe('one nudge a day, in priority order; "Not today" hides exactly that one; off says nothing', () => {
  const busy = () => base({review: {isReviewDay: true, state: 'due'}, now: evening(), insights: [{id: 'steps-water'}], goals: [goal({nextContributionDate: planDay(evening().getTime())})]});
  test('the first match wins and the rest wait; a hidden nudge gives way to the next', () => {
    expect(guideCandidates(busy()).map(n => n.id)).toEqual(['review-ready', 'habits-open', 'goal-next-date:private:g1', 'insight-ready:steps-water']);
    expect(guideNudge(busy())?.id).toBe('review-ready');
    expect(guideNudge({...busy(), guide: on({dismissed: {'review-ready': TODAY}})})?.id).toBe('habits-open');
    expect(guideNudge({...busy(), guide: on({dismissed: {'review-ready': TODAY, 'habits-open': TODAY}})})?.id).toBe('goal-next-date:private:g1');
    expect(guideNudge({...busy(), guide: on({dismissed: {'review-ready': '2026-10-04'}})})?.id).toBe('review-ready');
    expect(guideNudge({...busy(), guide: {...on(), enabled: false}})).toBeNull();
    expect(guideCandidates({...busy(), guide: {...on(), enabled: false}}).length).toBe(4);
  });
  test('every nudge is text and a link; nothing else comes out', () => {
    for (const nudge of guideCandidates(busy())) { expect(Object.keys(nudge).sort()).toEqual(['action', 'body', 'heading', 'id', 'kind']); expect(nudge.heading).not.toMatch(/\{\w+\}/); expect(nudge.body).not.toMatch(/\{\w+\}/); if (nudge.action) expect(nudge.action.href).toMatch(/^\/app/); }
    expect(GUIDE_LABEL).toContain('no AI service');
  });
});
test('the journal\'s day comes from its zone: at 23:30 in Brussels the 11 zones of the habit tests agree with habitCalendarDay', () => {
  const zones = ['UTC', 'Europe/Brussels', 'America/Los_Angeles', 'America/New_York', 'Asia/Kolkata', 'Asia/Kathmandu', 'Australia/Lord_Howe', 'Pacific/Chatham', 'Pacific/Kiritimati', 'Pacific/Niue', 'Pacific/Apia'];
  for (const zone of zones) {
    process.env.TZ = 'Europe/Brussels';
    const now = new Date('2026-10-05T21:30:00.000Z'); // 23:30 in Brussels
    const data: HabitData = {...habits([ids[0]!, input('Walk')]), timeZone: zone};
    const expectedDay = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(now);
    const nudge = guideNudge({...base({habits: data, now}), today: undefined});
    // Open in the journal's day (every day is scheduled): the evening rule follows the device clock (23:30), the day the zone.
    expect(nudge?.id, zone).toBe('habits-open');
    let streak = data; for (let n = 7; n >= 1; n--) streak = logHabitValue(streak, ids[0]!, addLocalDays(expectedDay, -n), 1, {}, now);
    expect(guideNudge({...base({habits: streak, now, reminders: {...emptyReminders(), habits: {[ids[0]!]: {time: '00:00'}}}}), today: undefined})?.id, zone).toBe(`streak-notice:${ids[0]}:7`);
  }
});
test('the Showcase data (buildShowcase) gives a fixed, deterministic nudge sequence over 14 days', () => {
  const sequence: string[] = [];
  for (let n = 0; n < 14; n++) {
    const day = addLocalDays('2026-09-20', n), {records} = buildShowcase(day), [y, m, d] = day.split('-').map(Number);
    const habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!)), platform = platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!)), review = weeklyReviewSchema.parse(JSON.parse(records[WEEKLY_REVIEW_KEY]!));
    const now = new Date(y!, m! - 1, d!, 19, 0), window = reviewWindow(review.weekday, day);
    const nudge = guideNudge({guide: on({enabledOn: '2026-09-20'}), habits, health, reminders: emptyReminders(), goals: unifiedGoalSummaries([], {}, platform, [], now.getTime()), insights: insightCards({habits, health, today: day}), review: {isReviewDay: localWeekday(day) === review.weekday, state: reviewState(review, window.weekStart)}, now, today: day});
    sequence.push(nudge ? nudge.id.replace(/:[0-9a-f-]{36}:/, ':<habit>:') : 'none');
  }
  expect(sequence).toEqual(['review-ready', 'habits-open', 'habits-open', 'habits-open', 'habits-open', 'habits-open', 'habits-open', 'review-ready', 'habits-open', 'habits-open', 'habits-open', 'habits-open', 'habits-open', 'habits-open']);
});
