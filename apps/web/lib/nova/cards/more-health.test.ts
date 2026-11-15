import {describe, expect, it} from 'vitest';
import {CYCLE_LINE, cycleDay, nextPeriodEstimate} from '../../cycle/engine';
import {showcaseCycle} from '../../cycle/showcase';
import {cycleSchema, emptyCycle} from '../../cycle/store';
import {fastingHistory} from '../../fasting/engine';
import {emptyFasting, fastingSchema} from '../../fasting/schema';
import {foodLoggingMonth} from '../../food-log/consistency';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY} from '../../health';
import {healthTrends} from '../../health-trends/trends';
import {addLocalDays} from '../../local-date';
import {showcaseMeditation} from '../../meditation/showcase';
import {meditationSummary, weeklyBars} from '../../meditation/stats';
import {buildShowcase} from '../../showcase-data';
import {dayDoses, supplementSummary} from '../../supplements/log';
import {emptySupplements} from '../../supplements/schema';
import {showcaseSupplements} from '../../supplements/showcase';
import {cycleCard, cycleRows, fastingCard, fastingRows, foodDaysCard, foodDaysRows, healthTrendsCard, healthTrendsRows, meditationCard, meditationRows, supplementsCard, supplementsRows} from './health-more';

/**
 * Session AM-2 (step 3, round 2): the six later Health widgets. Their records are health-type: the widgets exist only
 * under the Health gate (lib/nova/stage/am-security.test.ts and lib/nova/summon/more.test.ts pin that); here the figures
 * are checked against the Health page's own engines. Unknown is never zero, a direction is a word, an estimate a range.
 */
const DAY = '2026-11-11';
const SHOWCASE = healthSchema.parse(JSON.parse(buildShowcase(DAY, 'UTC').records[HEALTH_STORAGE_KEY]!));

describe('health trends: the last 90 days beside the last 365', () => {
  it('the Showcase’s fictional records: every trend the Health page shows, with the same direction, and the days it rests on', () => {
    const c = healthTrendsCard(SHOWCASE, DAY), page = healthTrends(SHOWCASE, DAY);
    expect(c.rows.map(r => [r.id, r.direction, r.recentDays, r.yearDays])).toEqual(page.ready.map(r => [r.id, r.direction, r.recent.days, r.year.days]));
    expect(c.waiting.map(w => w.id)).toEqual(page.pending.map(p => p.id));
    expect(c.state).toBe(page.ready.length ? 'live' : page.pending.length ? 'waiting' : 'empty');
    for (const r of c.rows) { expect(['Up', 'Down', 'About the same']).toContain(r.words); expect(Math.max(r.share, r.yearShare)).toBe(1); expect(r.recent).toMatch(/\d/); }
    expect(JSON.stringify(c)).not.toMatch(/better|worse|good|bad/i);
  });
  it('too few days waits and says how many; nothing recorded teaches', () => {
    const few = {...createEmptyHealth(), weights: [{id: 'w1', date: DAY, grams: 80000}, {id: 'w2', date: addLocalDays(DAY, -1), grams: 80500}]} as typeof SHOWCASE;
    const c = healthTrendsCard(few, DAY);
    expect([c.state, c.rows, c.waiting]).toEqual(['waiting', [], [{id: 'weight', label: 'Weight', words: '2 of 8 recent days, 2 of 20 this year'}]]);
    expect(healthTrendsRows(c)).toEqual([['Weight', 'Not enough days yet: 2 of 8 recent days, 2 of 20 this year']]);
    expect(healthTrendsCard(createEmptyHealth(), DAY)).toMatchObject({state: 'empty', rows: [], waiting: []});
  });
});

describe('food-logging days: a month of days', () => {
  it('the count is the Health page’s own; a logged day is lit, a day without a log is plain, and the run ends today or yesterday', () => {
    const c = foodDaysCard(SHOWCASE, DAY), page = foodLoggingMonth(SHOWCASE, DAY);
    expect([c.month, c.logged, c.daysSoFar, c.daysInMonth]).toEqual([page.month, page.logged, page.daysSoFar, page.daysInMonth]);
    expect(c.weeks.flatMap(w => w.cells).filter(x => x === 'done')).toHaveLength(page.logged);
    expect(c.words).toBe(`${page.logged} of 11 days so far this month`);
    expect(foodDaysRows(c)[0]).toEqual(['Days with food logged', c.words]);
  });
  it('an empty diary teaches, and nothing is judged', () => {
    const c = foodDaysCard(createEmptyHealth(), DAY);
    expect([c.state, c.logged, c.run, c.lastDay]).toEqual(['empty', 0, 0, null]);
    expect(foodDaysRows(c)).toEqual([['Days with food logged', 'Nothing logged yet'], ['Days in a row', 'No run going']]);
  });
});

describe('fasting: hours and a target only', () => {
  const session = (id: string, start: string, end: string | null, targetHours = 16) => ({id, startedAt: start, endedAt: end, targetHours, timeZone: 'UTC'});
  const fasting = fastingSchema.parse({version: 1, sessions: [session('f1', '2026-11-08T20:00:00.000Z', '2026-11-09T12:30:00.000Z'), session('f2', '2026-11-09T20:00:00.000Z', '2026-11-10T08:00:00.000Z'), session('f3', '2026-11-10T20:00:00.000Z', null, 14)]});
  it('a running fast against its target, and the ended ones newest first as the Health page lists them', () => {
    const c = fastingCard(fasting, new Date('2026-11-11T03:00:00.000Z'), DAY);
    expect(c.running).toMatchObject({elapsed: '7 h 00 min', targetHours: 14, share: 0.5, reached: false});
    expect(c.history.map(h => [h.id, h.hours, h.reached])).toEqual(fastingHistory(fasting, 5).map(h => [h.session.id, h.hours, h.hours >= h.session.targetHours]));
    expect(c.history.map(h => [h.id, h.hoursText, h.reached])).toEqual([['f2', '12 h', false], ['f1', '16.5 h', true]]);
    expect([c.state, c.count]).toEqual(['live', 2]);
    expect(fastingRows(c)[0]).toEqual(['Now', 'A fast is running: 7 h 00 min of 14 h']);
    // Past its target the ring is full and says so; the hours go on (the 24 h limit is the timer's own).
    expect(fastingCard(fasting, new Date('2026-11-11T12:00:00.000Z'), DAY).running).toMatchObject({share: 1, reached: true, elapsed: '16 h 00 min'});
    expect(JSON.stringify(c)).not.toMatch(/longest|streak|total/i);
  });
  it('no fast running says so; none logged teaches', () => {
    const ended = fastingSchema.parse({version: 1, sessions: fasting.sessions.slice(0, 2)});
    expect(fastingCard(ended, new Date('2026-11-11T03:00:00.000Z'), DAY).running).toBeNull();
    expect(fastingRows(fastingCard(ended, new Date('2026-11-11T03:00:00.000Z'), DAY))[0]).toEqual(['Now', 'No fast is running']);
    expect(fastingCard(emptyFasting(), new Date(), DAY)).toEqual({state: 'empty', running: null, history: [], count: 0});
  });
});

describe('meditation: minutes this week and week by week', () => {
  it('the Showcase’s fictional sessions: the summary and the weeks are Health’s own; a week without a session is a gap', () => {
    const m = showcaseMeditation(DAY), c = meditationCard(m, DAY), s = meditationSummary(m, DAY), bars = weeklyBars(m, DAY, 8);
    expect([c.state, c.thisWeek, c.goal, c.daysInARow, c.sessions]).toEqual(['live', s.thisWeek, s.goal, s.daysInARow, s.sessions]);
    expect(c.weeks.map(w => w.minutes)).toEqual(bars.map(b => b.sessions ? b.minutes : null));
    expect(c.weeks.some(w => w.minutes === null)).toBe(true); // the Showcase's sessions cover 30 days of the eight weeks
    expect(c.share).toBe(s.goal ? Math.min(1, s.thisWeek / s.goal) : null);
    expect(meditationRows(c, DAY).filter(r => r[1] === 'No session').length).toBeGreaterThan(0);
  });
  it('no session, or no meditation group at all, teaches', () => {
    for (const none of [null, undefined, {version: 1 as const, sessions: []}]) expect(meditationCard(none, DAY)).toMatchObject({state: 'empty', thisWeek: 0, share: null, sessions: 0});
    expect(meditationRows(meditationCard(null, DAY), DAY)).toEqual([['Meditation', 'No session logged yet']]);
  });
});

describe('supplements: today’s doses and the last 14 days', () => {
  it('the Showcase’s fictional log: taken, skipped and not logged are Health’s own counts; as needed is never "planned"', () => {
    const r = showcaseSupplements(DAY), c = supplementsCard(r, DAY), doses = dayDoses(r, DAY);
    expect([c.state, c.items, c.planned, c.taken, c.skipped, c.notLogged]).toEqual(['live', 3, 2, 1, 0, 1]);
    expect(c.today.map(d => [d.name, d.slot, d.statusWords])).toEqual([['Vitamin D (Showcase)', '08:00', 'Taken'], ['Magnesium (Showcase)', '21:30', 'Not logged yet'], ['Eye drops (Showcase)', 'as needed', 'Not logged today']]);
    expect(c.today).toHaveLength(doses.length);
    const page = supplementSummary(r, DAY, 14);
    expect(c.summary.map(s => [s.id, s.planned, s.taken])).toEqual(page.map(s => [s.itemId, s.planned, s.taken]));
    expect(c.summary[2]).toMatchObject({share: null, words: '2 taken, as needed'});
    expect(c.summary[1]!.words).toMatch(/^\d+ of \d+ taken, 1 skipped, \d+ not logged$/);
    expect(supplementsRows(c).at(-1)![1]).toMatch(/^Not logged is unknown, never missed\./);
  });
  it('nothing kept track of teaches', () => {
    expect(supplementsCard(emptySupplements(), DAY)).toMatchObject({state: 'empty', items: 0, planned: 0, today: [], summary: []});
  });
});

describe('cycle: on the screen only, behind its own switch too', () => {
  it('the Showcase’s fictional log: the day of the cycle and the estimate are the cycle log’s own; an estimate is a range, with its rule', () => {
    const r = showcaseCycle(DAY), c = cycleCard(r, DAY), e = nextPeriodEstimate(r, DAY);
    expect([c.state, c.day, c.rule]).toEqual(['live', cycleDay(r, DAY), CYCLE_LINE]);
    expect(c.day).toBe(10);
    expect(e.kind).toBe('range');
    expect(c.estimate).toMatchObject(e.kind === 'range' ? {from: e.from, to: e.to, shortest: e.shortest, longest: e.longest} : {});
    expect(c.estimate!.from < c.estimate!.to).toBe(true);
    expect(cycleRows(c, d => d)[2]![1]).toMatch(/^between \d{4}-\d{2}-\d{2} and \d{4}-\d{2}-\d{2}, from cycles of \d+ to \d+ days$/);
    // No symptom and no note of the log is ever in the widget's figures.
    expect(JSON.stringify(c)).not.toMatch(/cramps|tired|bloating|headache|Showcase example/);
  });
  it('its own switch off: nothing of the log is read out, whatever it holds', () => {
    const off = cycleSchema.parse({...showcaseCycle(DAY), on: false}), c = cycleCard(off, DAY);
    expect(c).toEqual({state: 'off', day: null, lastStart: null, cycles: 0, estimate: null, need: null, rule: CYCLE_LINE});
    expect(cycleRows(c, d => d)).toEqual([['Cycle', 'The cycle log is off on Health']]);
    expect(cycleCard(emptyCycle(), DAY).state).toBe('off'); // the default is off
  });
  it('on with nothing logged teaches; fewer than three complete cycles gives no estimate and says how many are needed', () => {
    expect(cycleCard(cycleSchema.parse({version: 1, on: true, days: {}}), DAY)).toMatchObject({state: 'empty', day: null, estimate: null});
    const one = cycleSchema.parse({version: 1, on: true, days: {[addLocalDays(DAY, -3)]: {flow: 'medium'}}}), c = cycleCard(one, DAY);
    expect([c.state, c.day, c.estimate, c.need]).toEqual(['live', 4, null, 3]);
    expect(cycleRows(c, d => d)[2]![1]).toBe('Not yet: 3 more complete cycles needed');
  });
});
