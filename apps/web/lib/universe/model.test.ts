import {afterEach, describe, expect, it} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, createHabit, emptyHabitData, habitDataSchema, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, newHealthId, saveActivity, saveWeight, type HealthData} from '../health';
import {addWater} from '../health-daily';
import {PLATFORM_KEY, emptyPlatform, platformSchema} from '../positions';
import {FASTING_KEY, fastingSchema} from '../fasting/schema';
import {AVERAGE_GOALS_KEY, averageGoalsSchema} from '../average-goals/store';
import {addLocalDays} from '../local-date';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {UNIVERSE_KEY} from '../af-extras-keys';
import {MILESTONE_ID, RING_STEPS, UNIVERSE_PILLARS, newestMilestone, pendingCelebrations, universeOf, universeShareCard, withFloor, type UniverseInput} from './model';
import {MAX_CELEBRATED, UNIVERSE, celebratedIds, markCelebrated} from './store';

const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });

const TODAY = '2026-10-19';
const at = (day: string, clock = '09:00') => new Date(`${day}T${clock}:00.000Z`);
const habit = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
const ID = 'aaaaaaaa-0000-4000-8000-0000000000a1';
/** A daily habit started `since` days ago, done on the given days back from today (0 = today). */
function habitsDone(since: number, doneDaysBack: number[]): HabitData {
  let d = createHabit(emptyHabitData(), habit('Fictional stretch'), at(addLocalDays(TODAY, -since)), ID);
  for (const back of doneDaysBack) d = logHabitValue(d, ID, addLocalDays(TODAY, -back), 1, {}, at(TODAY, '20:00'));
  return d;
}
const input = (over: Partial<UniverseInput> = {}): UniverseInput => ({habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), fasting: null, averages: [], today: TODAY, ...over});
const planet = (u: ReturnType<typeof universeOf>, pillar: string) => u.planets.find(p => p.pillar === pillar)!;
function showcase(day = TODAY): UniverseInput {
  const {records} = buildShowcase(day);
  return {
    habits: habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health: healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!)),
    platform: platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!)), fasting: records[FASTING_KEY] ? fastingSchema.parse(JSON.parse(records[FASTING_KEY])) : null,
    averages: records[AVERAGE_GOALS_KEY] ? averageGoalsSchema.parse(JSON.parse(records[AVERAGE_GOALS_KEY])).goals : [], today: day,
  };
}

describe('My Universe (Session AF, L5b; P9.1, ADR-028 H77)', () => {
  it('a new device: four planets, no rings, no moons, no light to fill, and an empty universe', () => {
    const u = universeOf(input());
    expect(u.planets.map(p => p.pillar)).toEqual([...UNIVERSE_PILLARS]);
    expect(u.empty).toBe(true);
    expect(u.milestones).toEqual([]);
    for (const p of u.planets) { expect(p.rings).toBe(0); expect(p.moons).toBe(0); expect(p.faintRings).toBe(0); expect(p.light).toBeNull(); expect(p.lit).toBe(false); }
  });

  it('Habits: rings from check-ins, a moon for a 7-day streak, today’s light from the habits due today, misses as faint rings', () => {
    // Started 20 days ago; done the last 12 days (today included): 12 check-ins, a 12-day streak, 8 missed days.
    const u = universeOf(input({habits: habitsDone(20, Array.from({length: 12}, (_, i) => i))}));
    const p = planet(u, 'habits');
    expect(p.rings).toBe(2); // 1 and 10 check-ins
    expect(p.moons).toBe(1);
    expect(p.faintRings).toBe(2); // 8 misses: 1 and 7
    expect(p.light).toBe(1); expect(p.lit).toBe(true);
    expect(p.facts[0]).toBe('12 check-ins');
    expect(u.milestones.map(m => m.id)).toEqual(['universe:habits:ring:1', 'universe:habits:ring:2', 'universe:habits:moon:1']);
    // Not yet done today: the light is empty, nothing else moves.
    const later = planet(universeOf(input({habits: habitsDone(20, Array.from({length: 11}, (_, i) => i + 1))})), 'habits');
    expect(later.light).toBe(0); expect(later.lit).toBe(false); expect(later.rings).toBe(2);
  });

  it('a missed day never takes anything away: rings and moons only grow from one day to the next (the Showcase, 60 days)', () => {
    process.env.TZ = 'UTC';
    const data = showcase();
    let previous = universeOf(data, addLocalDays(TODAY, -60));
    for (let back = 59; back >= 0; back--) {
      const u = universeOf(data, addLocalDays(TODAY, -back));
      for (const p of u.planets) {
        const before = previous.planets.find(q => q.pillar === p.pillar)!;
        expect(p.rings, `${p.pillar} rings on ${u.asOf}`).toBeGreaterThanOrEqual(before.rings);
        expect(p.moons, `${p.pillar} moons on ${u.asOf}`).toBeGreaterThanOrEqual(before.moons);
        expect(p.faintRings, `${p.pillar} faint rings on ${u.asOf}`).toBeGreaterThanOrEqual(before.faintRings);
      }
      for (const m of previous.milestones) expect(u.milestones.map(x => x.id)).toContain(m.id);
      previous = u;
    }
    expect(previous.totals.rings).toBeGreaterThan(4);
  });

  it('Health: days logged make rings, kinds kept make moons, three kinds today fill the light', () => {
    let health: HealthData = createEmptyHealth();
    for (let back = 0; back < 8; back++) health = addWater(health, {id: newHealthId(), date: addLocalDays(TODAY, -back), amountMilli: 250_000, unit: 'ml'}, at(TODAY).toISOString());
    let u = planet(universeOf(input({health})), 'health');
    expect(u.rings).toBe(2); // 1 and 7 days
    expect(u.moons).toBe(1);
    expect(u.light).toBeCloseTo(1 / 3);
    health = saveWeight(health, {id: newHealthId(), date: TODAY, grams: 70_000}, at(TODAY).toISOString());
    health = saveActivity(health, {id: newHealthId(), date: TODAY, name: 'Fictional walk', steps: 4000, minutes: 40}, at(TODAY).toISOString());
    u = planet(universeOf(input({health})), 'health');
    expect(u.moons).toBe(3); expect(u.light).toBe(1); expect(u.lit).toBe(true);
    // A quiet stretch of 21 days between logs (three whole quiet weeks) leaves a faint ring and keeps the rings.
    let gap: HealthData = createEmptyHealth();
    for (const back of [30, 29, 7]) gap = addWater(gap, {id: newHealthId(), date: addLocalDays(TODAY, -back), amountMilli: 250_000, unit: 'ml'}, at(TODAY).toISOString());
    const quiet = planet(universeOf(input({health: gap})), 'health');
    expect(quiet.faintRings).toBe(1); expect(quiet.rings).toBe(1);
    expect(quiet.facts).toContain('3 quiet weeks kept as faint rings');
  });

  it('Goals and Wealth count goals reached, contributions and accounts tracked — never an amount, a price or a return', () => {
    process.env.TZ = 'UTC';
    const data = showcase(), u = universeOf(data);
    const goals = planet(u, 'goals'), wealth = planet(u, 'wealth');
    expect(goals.facts.join(' ')).toMatch(/goals? reached/);
    expect(wealth.facts[0]).toMatch(/^\d+ contributions? to your goals$/);
    expect(wealth.moons).toBeGreaterThan(0);
    for (const p of u.planets) for (const fact of [...p.facts, p.lightLine]) expect(fact).not.toMatch(/[$€£¥%]|\b(price|rate|return|apr|apy|yield|balance|worth)\b/i);
    const card = universeShareCard(u, 'Oct 19, 2026');
    expect(card.lines).toHaveLength(4);
    for (const line of [card.eyebrow, card.title, ...card.lines]) expect(line).not.toMatch(/[$€£¥%]|\b(price|rate|return|apr|apy|yield|balance|worth)\b/i);
    expect(card.title).toMatch(/^\d+ rings?, \d+ moons?$/);
  });

  it('milestone ids are stable and say what the planet reached; the floor keeps a celebrated ring after a record is corrected', () => {
    const u = universeOf(input({habits: habitsDone(20, Array.from({length: 12}, (_, i) => i))}));
    for (const m of u.milestones) expect(MILESTONE_ID.test(m.id) || m.id === 'universe:all-four' || m.id === 'universe:wealth:staked').toBe(true);
    expect(u.milestones.find(m => m.id === 'universe:habits:ring:2')!.line).toBe(`${RING_STEPS.habits[1]} habit check-ins in all.`);
    expect(newestMilestone(u)!.id).toBe('universe:habits:ring:2');
    // The person removed check-ins: the derived count drops, the celebrated ring stays.
    const fewer = universeOf(input({habits: habitsDone(20, [0, 1])}), TODAY, ['universe:habits:ring:2', 'universe:habits:moon:1', 'not-a-milestone']);
    expect(planet(fewer, 'habits').rings).toBe(2);
    expect(planet(fewer, 'habits').moons).toBe(1);
    expect(withFloor(fewer.planets, ['universe:health:ring:9']).find(p => p.pillar === 'health')!.rings).toBe(6);
  });

  it('celebrates only what was reached in the last week and not yet celebrated here, each id once', () => {
    // Reached ring 2 today (the tenth check-in), ring 1 and the moon more than a week ago.
    const recent = input({habits: habitsDone(30, [...Array.from({length: 9}, (_, i) => i + 12), 0])});
    expect(pendingCelebrations(recent, []).map(m => m.id)).toEqual(['universe:habits:ring:2']);
    expect(pendingCelebrations(recent, ['universe:habits:ring:2'])).toEqual([]);
    // Everything reached long ago: nothing celebrates on first sight.
    const old = input({habits: habitsDone(60, Array.from({length: 20}, (_, i) => i + 30))});
    expect(universeOf(old).milestones.length).toBeGreaterThan(0);
    expect(pendingCelebrations(old, [])).toEqual([]);
  });

  it('works with the game layer off: nothing here reads the game record or XP', async () => {
    const source = (await import('node:fs')).readFileSync(new URL('./model.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/from '\.\.\/game\//);
    expect(source).not.toMatch(/celebrations'|GAME_KEY|xpSummary/);
  });
});

describe('zigoals:universe:v1 (TIER 3 storage): versioned, loose, only the milestones celebrated', () => {
  const memory = () => { const m = new Map<string, string>(); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}}; };
  it('reads empty, keeps a newer build’s fields on a write, never rewrites unreadable bytes', () => {
    const {m, storage} = memory();
    expect(UNIVERSE.key).toBe(UNIVERSE_KEY);
    expect(readDeviceRecord(storage, UNIVERSE)).toEqual({data: {version: 1, celebrated: {}}, unreadable: false});
    m.set(UNIVERSE_KEY, JSON.stringify({version: 1, celebrated: {'universe:habits:ring:1': '2026-10-01'}, later: {x: 1}}));
    updateDeviceRecord(storage, UNIVERSE, r => markCelebrated(r, 'universe:habits:ring:2', TODAY));
    const raw = JSON.parse(m.get(UNIVERSE_KEY)!);
    expect(raw.later).toEqual({x: 1});
    expect(raw.celebrated).toEqual({'universe:habits:ring:1': '2026-10-01', 'universe:habits:ring:2': TODAY});
    m.set(UNIVERSE_KEY, '{"version":2}');
    expect(readDeviceRecord(storage, UNIVERSE).unreadable).toBe(true);
    expect(m.get(UNIVERSE_KEY)).toBe('{"version":2}');
  });
  it('a milestone is remembered once; past the cap the oldest go first', () => {
    let r = UNIVERSE.empty();
    r = markCelebrated(r, 'a', '2026-01-01');
    expect(markCelebrated(r, 'a', TODAY)).toBe(r);
    for (let i = 0; i < MAX_CELEBRATED; i++) r = markCelebrated(r, `m${i}`, '2026-05-01');
    expect(celebratedIds(r)).toHaveLength(MAX_CELEBRATED);
    expect(r.celebrated.a).toBeUndefined();
  });
});
