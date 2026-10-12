import {afterEach, describe, expect, it} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, emptyHabitData, habitDataSchema} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema} from '../health';
import {PLATFORM_KEY, emptyPlatform, platformSchema} from '../positions';
import {emptyGoalExtras} from '../goal-extras/store';
import {wealthOverview} from '../wealth';
import {setDisplayLocale} from '../visual-format';
import {lifeReview, reviewPeriod} from './engine';

const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; setDisplayLocale('en-US'); });

describe('Life review (Session AA-Cloud Part 5)', () => {
  it('a week is the seven days to today beside the seven before; a month so far beside as many days of the last one', () => {
    expect(reviewPeriod('week', '2026-10-12')).toEqual({period: 'week', start: '2026-10-06', end: '2026-10-12', prevStart: '2026-09-29', prevEnd: '2026-10-05', key: 'week:2026-10-06'});
    expect(reviewPeriod('month', '2026-10-12')).toMatchObject({start: '2026-10-01', prevStart: '2026-09-01', prevEnd: '2026-09-12', key: 'month:2026-10'});
    // A long month's 31st compares with the whole of a shorter one.
    expect(reviewPeriod('month', '2026-03-31')).toMatchObject({prevStart: '2026-02-01', prevEnd: '2026-02-28'});
  });
  it('a new device: nothing recorded reads as not recorded, never zero', () => {
    const r = lifeReview({window: reviewPeriod('week', '2026-10-12'), habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), goals: [], averages: [], extras: emptyGoalExtras(), history: [], today: '2026-10-12'});
    expect(r.highlights).toEqual([]);
    expect(r.health.every(t => t.now === null && t.before === null)).toBe(true);
    expect(r.money).toEqual([]);
    expect(r.counts).toEqual({habitCheckIns: 0, healthDays: 0, contributions: 0});
  });
  it('the Showcase: highlights, streaks, health trends and money per currency, never converted', () => {
    process.env.TZ = 'UTC';
    const day = '2026-10-12', {records} = buildShowcase(day);
    const habits = habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!)), platform = platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!));
    const history = wealthOverview(platform, Date.parse(`${day}T12:00:00Z`)).history;
    const goals = platform.goals.map(g => ({key: `private:${g.id}`, id: g.id, name: g.name, href: `/app/goals/tracked/${g.id}`, status: g.status}));
    const r = lifeReview({window: reviewPeriod('month', day), habits, health, platform, goals, averages: [], extras: emptyGoalExtras(), history, today: day});
    expect(r.highlights.length).toBeGreaterThan(0);
    expect(r.streaks.length).toBeGreaterThan(0);
    expect(r.health[0]!.now).toMatch(/h/);
    expect(new Set(r.money.map(m => m.currency)).size).toBe(r.money.length);
    for (const m of r.money) if (m.change !== null) expect(m.note).toBe('Recorded values, this currency only');
    // History stores cents; the review shows whole units (the Showcase's USD wealth is about half a million, not fifty).
    const usd = r.money.find(m => m.currency === 'USD')!;
    expect(Number(usd.end)).toBeGreaterThan(100_000);
    expect(Number(usd.end)).toBeLessThan(5_000_000);
  });
});
