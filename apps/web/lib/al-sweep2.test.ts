import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test} from 'vitest';
import {buildShowcase} from './showcase-data';
import {HABITS_KEY, habitDataSchema} from './habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema} from './health';
import {PLATFORM_KEY, platformSchema} from './positions';
import {dailyData, saveHealthPreferences} from './health-daily';
import {NO_WATER_TODAY} from './health-units';
import {healthHud} from './nova/holo/health';
import {reviewWindow, weekSummary} from './weekly-review/engine';
import {emptyWeeklyReview} from './weekly-review/schema';
import {showcaseChess} from './skills/chess/showcase';
import {showcaseGoalExtras} from './goal-extras/showcase';
import {showcaseSleep} from './sleep/showcase';
import {wealthHistory} from './wealth';
import {Wordmark} from '../components/brand-mark';

/** Session AL sweep 2: small cross-lane leftovers (shell, L7, INT, NOVA review M5 and p4). Fictional records only. */
const DAY = '2026-10-01';
const showcase = () => {
  const {records} = buildShowcase(DAY, 'UTC');
  return {records, habits: habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health: healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!)), platform: platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!))};
};

describe('shell: the sidebar wordmark beside a named logo link', () => {
  test('decorative hides the word from assistive technology; alone it stays readable', () => {
    expect(renderToStaticMarkup(Wordmark({decorative: true}))).toBe('<span class="brand-wordmark" aria-hidden="true">ZI<span>Goals</span></span>');
    expect(renderToStaticMarkup(Wordmark())).toBe('<span class="brand-wordmark">ZI<span>Goals</span></span>');
  });
});

describe('weekly review: weight in the person\'s chosen unit (L7 third pass)', () => {
  const line = (unit: 'kg' | 'lb') => {
    const s = showcase(), health = saveHealthPreferences(s.health, {...dailyData(s.health).preferences, weightUnit: unit});
    const summary = weekSummary({...reviewWindow(4, DAY), habits: s.habits, health, platform: s.platform, now: Date.parse(`${DAY}T12:00:00Z`), financial: false, review: emptyWeeklyReview()});
    return summary.health.find(l => l.startsWith('latest weight'));
  };
  test('pounds when the person chose pounds, kilograms otherwise, one decimal either way', () => {
    expect(line('lb')).toMatch(/^latest weight \d{2,3}(\.\d)? lb on /);
    expect(line('kg')).toMatch(/^latest weight \d{2,3}(\.\d)? kg on /);
    expect(line('lb')).not.toContain('kg');
  });
});

describe('water with nothing logged today: one phrase on every surface (NOVA review M5)', () => {
  test('Today and Health use NOVA\'s own words', () => {
    expect(healthHud(createEmptyHealth(), DAY).water.note).toBe(NO_WATER_TODAY);
  });
});

describe('Showcase owner items (INT third pass)', () => {
  test('P-PR-25: the sleep average goal is 8 hours, as the Sleep page\'s goal (480 min)', () => {
    const {averages} = showcaseGoalExtras(DAY), sleep = averages.goals.find(g => g.id === 'showcase-sleep')!;
    expect(sleep).toMatchObject({name: 'Sleep 8 hours a night', target: 8});
    expect(showcaseSleep(DAY).goal!.minutes).toBe(sleep.target * 60);
  });
  test('P-PR-09: chess times on the open day are never later than now; other days keep their hours', () => {
    const now = Date.parse(`${DAY}T05:00:00.000Z`), early = showcaseChess(DAY, now), late = showcaseChess(DAY, Number.POSITIVE_INFINITY);
    const times = (c: typeof early) => [...c.cache.snapshots.map(s => s.at), ...c.cache.games.map(g => g.endedAt), ...Object.values(c.cache.fetchedAt)].filter((t): t is string => typeof t === 'string');
    expect(times(early).every(t => Date.parse(t) <= now)).toBe(true);
    expect(times(late).some(t => Date.parse(t) > now)).toBe(true);
    // Earlier days are the same sample; built for a day not begun anywhere yet, nothing is clamped.
    expect(early.cache.snapshots.filter(s => !s.at.startsWith(DAY))).toEqual(late.cache.snapshots.filter(s => !s.at.startsWith(DAY)));
    expect(showcaseChess(DAY, Date.parse('2026-09-01T00:00:00Z'))).toEqual(late);
  });
  test('P-PR-38: the ZIG reward reserve is dated by the open day, as its manual value, and stays the stale example', () => {
    const zig = showcase().platform.positions.find(p => p.id === 'showcase-zig')!;
    expect(zig.observedAt).toBe(zig.valuation!.observedAt);
    expect(zig.sync).toBe('STALE');
  });
});

describe('p4: the Showcase\'s recorded valuations flow (Showcase example data)', () => {
  test('the USD history rises overall but not in a straight line, ends unchanged', () => {
    const {platform} = showcase(), usd = wealthHistory(platform).find(h => h.currency === 'USD')!;
    const values = usd.points.map(p => Number(p.value));
    expect(values.length).toBeGreaterThanOrEqual(15);
    expect(values.at(-1)!).toBeGreaterThan(values[0]!);
    expect(values.some((v, i) => i > 0 && v < values[i - 1]!)).toBe(true); // at least one step down
    // Each holding's first and last recorded steps keep the old 84 % and 99.4 % of its value.
    for (const p of platform.positions.filter(p => p.valuation)) {
      const own = platform.valuationSnapshots.filter(s => s.positionId === p.id);
      expect(own[0]!.value).toBe((BigInt(p.valuation!.value) * 840n / 1000n).toString());
      expect(own.at(-1)!.value).toBe((BigInt(p.valuation!.value) * 994n / 1000n).toString());
      expect(own.every(s => s.id.startsWith('example-value-'))).toBe(true);
    }
  });
});
