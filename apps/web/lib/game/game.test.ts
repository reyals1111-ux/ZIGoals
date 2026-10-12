import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, setHabitEntryStatus, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth, healthSchema, type HealthData} from '../health';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY} from '../habits';
import {HEALTH_STORAGE_KEY} from '../health';
import {PLATFORM_KEY, platformSchema} from '../positions';
import {levelFloor, levelName, levelOf, levelProgress} from './levels';
import {XP_RULES, xpEvents, xpSummary, weekStart} from './xp';
import {dailyQuests, dayHash, QUESTS} from './quests';
import {weeklyChallenges} from './challenges';
import {BADGES, badges, journeyPath} from './badges';
import {applyFreeze, freezesAvailable, freezesEarned, freezesUsed, repairableDays} from './freeze';
import {GAME, emptyGame, gameSchema, markBadgeSeen, markLevelSeen, setGameEnabled} from './schema';
import {readDeviceRecord} from '../device-record';

const AT = new Date('2026-09-01T06:00:00.000Z'), TODAY = '2026-10-07';
const ID = {a: '11111111-1111-4111-8111-111111111111', b: '22222222-2222-4222-8222-222222222222'};
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
function habits(): HabitData {
  let d = emptyHabitData();
  d = createHabit(d, input('Stretch'), AT, ID.a);
  d = createHabit(d, input('Read', {measurement: {kind: 'duration', unit: 'minutes'}, target: 20, timeOfDay: 'evening'}), AT, ID.b);
  for (let i = 0; i < 10; i++) { const day = `2026-09-${String(20 + i).padStart(2, '0')}`; d = logHabitValue(d, ID.a, day, 1, {mode: 'set'}, new Date(`${day}T07:00:00Z`)); }
  d = logHabitValue(d, ID.b, TODAY, 10, {mode: 'set'}, new Date(`${TODAY}T20:00:00Z`)); // partial: today, under its 20 minutes
  return d;
}
const health = (): HealthData => { const h = createEmptyHealth(); h.diary.push({id: 'health_diary-0001', sourceId: 'health_food-0001', sourceKind: 'food', snapshot: {name: 'Oats', servingGrams: 100, nutrients: {kcal: 380, proteinMg: 13000, carbsMg: 67000, fatMg: 7000}}, date: TODAY, meal: 'Breakfast', quantityMilli: 1000, createdAt: `${TODAY}T08:00:00.000Z`, updatedAt: `${TODAY}T08:00:00.000Z`}); h.weights.push({id: 'health_weight-001', date: TODAY, grams: 72000, createdAt: `${TODAY}T07:00:00.000Z`, updatedAt: `${TODAY}T07:00:00.000Z`}); return healthSchema.parse(h); };

describe('levels', () => {
  test('level n begins at 50·n²; names follow the nebula', () => {
    expect(levelFloor(1)).toBe(0); expect(levelFloor(2)).toBe(200); expect(levelFloor(7)).toBe(2450);
    expect(levelOf(0)).toBe(1); expect(levelOf(199)).toBe(1); expect(levelOf(200)).toBe(2); expect(levelOf(2450)).toBe(7);
    expect(levelName(1)).toBe('Spark'); expect(levelName(7)).toBe('Nova'); expect(levelName(13)).toBe('Cosmos 2');
    expect(levelProgress(250)).toMatchObject({level: 2, into: 50, span: 250, share: 0.2});
  });
});
describe('XP is derived from the records', () => {
  test('check-ins, partials, logs and the per-day caps; Undo removes the XP because the record is gone', () => {
    const s = {habits: habits(), health: health()};
    const events = xpEvents(s, TODAY);
    expect(events.filter(e => e.kind === 'habit' && e.xp === XP_RULES.habitComplete)).toHaveLength(10);
    expect(events.find(e => e.id === `habit:${ID.b}:${TODAY}`)?.xp).toBe(XP_RULES.habitPartial);
    expect(events.find(e => e.id === 'diary:health_diary-0001')?.xp).toBe(5); expect(events.find(e => e.id === 'weight:health_weight-001')?.xp).toBe(5);
    const sum = xpSummary(s, TODAY);
    expect(sum.total).toBe(100 + 3 + 5 + 5); expect(sum.today).toBe(13); expect(sum.level.level).toBe(1);
    // Undo: the diary entry removed → its XP gone, nothing else moves.
    const undone = {...s, health: healthSchema.parse({...s.health, diary: []})};
    expect(xpSummary(undone, TODAY).total).toBe(sum.total - 5);
    // The cap: five diary entries on one day count at most 20.
    const busy = healthSchema.parse({...s.health, diary: Array.from({length: 6}, (_, i) => ({...s.health.diary[0]!, id: `health_diary-000${i}`}))});
    expect(xpEvents({...s, health: busy}, TODAY).filter(e => e.kind === 'health' && e.id.startsWith('diary')).reduce((n, e) => n + e.xp, 0)).toBe(XP_RULES.diaryCapPerDay);
    expect(weekStart('2026-10-07')).toBe('2026-10-05'); expect(weekStart('2026-10-05')).toBe('2026-10-05');
  });
  test('the Showcase reaches level 7 (Nova) with no stored XP', () => {
    const fixture = buildShowcase(TODAY, 'UTC');
    const s = {habits: JSON.parse(fixture.records[HABITS_KEY]!) as HabitData, health: healthSchema.parse(JSON.parse(fixture.records[HEALTH_STORAGE_KEY]!)), platform: platformSchema.parse(JSON.parse(fixture.records[PLATFORM_KEY]!))};
    const sum = xpSummary(s, TODAY);
    expect(sum.total).toBeGreaterThan(0);
    expect(sum.level.level).toBeGreaterThanOrEqual(5);
  });
});
describe('quests, challenges, badges, freezes', () => {
  test('three quests a day from the pages shown, provable from the records, the same on every device', () => {
    const s = {habits: habits(), health: health()};
    const q = dailyQuests(s, TODAY);
    expect(q).toHaveLength(3); expect(new Set(q.map(x => x.id)).size).toBe(3);
    expect(dailyQuests(s, TODAY).map(x => x.id)).toEqual(q.map(x => x.id));
    expect(dailyQuests(s, '2026-10-08').map(x => x.id)).not.toEqual(q.map(x => x.id));
    expect(dailyQuests(s, TODAY, ['health']).every(x => x.page === 'health')).toBe(true);
    const meal = dailyQuests(s, TODAY, ['health']).find(x => x.id === 'meal-log') ?? QUESTS.find(x => x.id === 'meal-log')!;
    expect(meal.progress(s, TODAY)).toBe(1);
    expect(dayHash('2026-10-07')).toBe(dayHash('2026-10-07')); expect(dayHash('2026-10-07')).not.toBe(dayHash('2026-10-08'));
    expect(dailyQuests({habits: emptyHabitData(), health: createEmptyHealth()}, TODAY, ['habits'])).toHaveLength(0);
  });
  test('challenges compare this week with last week, against yourself only', () => {
    const c = weeklyChallenges({habits: habits(), health: health()}, TODAY);
    expect(c.find(x => x.id === 'checkins')).toMatchObject({thisWeek: 0, lastWeek: 2, target: 3}); // 28 and 29 September fall in last week
    expect(c.find(x => x.id === 'meal-days')).toMatchObject({thisWeek: 1, lastWeek: 0, target: 1});
    expect(c.every(x => !/rank|beat them|other/i.test(x.title))).toBe(true);
  });
  test('badges derive from the records; the path lists levels with their badges', () => {
    const s = {habits: habits(), health: health()};
    const b = badges(s, TODAY);
    expect(b.find(x => x.id === 'first-step')?.earned).toBe(true); expect(b.find(x => x.id === 'first-week')?.earned).toBe(true); expect(b.find(x => x.id === 'streak-7')?.earned).toBe(true);
    expect(b.find(x => x.id === 'streak-30')?.earned).toBe(false); expect(b.find(x => x.id === 'first-goal')?.earned).toBe(false);
    expect(BADGES.every(x => !/fail|lost|lazy|should|guilt|punish/i.test(`${x.title} ${x.blurb}`))).toBe(true);
    const path = journeyPath(s, TODAY, 1, 113);
    expect(path[0]).toMatchObject({level: 1, reached: true, current: true}); expect(path.find(p => p.level === 5)?.badges.map(x => x.id)).toEqual(['level-5']);
  });
  test('a seven-day streak earns a freeze; a freeze repairs one missed day of the last week through the journal', () => {
    let d = habits();
    expect(freezesEarned(d, TODAY)).toBe(1); expect(freezesUsed(d)).toBe(0); expect(freezesAvailable(d, TODAY)).toBe(1);
    const missed = repairableDays(d, TODAY);
    expect(missed.some(m => m.habitId === ID.a && m.date === '2026-10-06')).toBe(true);
    d = applyFreeze(d, ID.a, '2026-10-06', TODAY, new Date(`${TODAY}T09:00:00Z`));
    expect(d.habits.find(h => h.id === ID.a)!.entries.find(e => e.date === '2026-10-06')).toMatchObject({disposition: 'skipped', note: 'Streak freeze'});
    expect(freezesAvailable(d, TODAY)).toBe(0);
    expect(() => applyFreeze(d, ID.a, '2026-10-05', TODAY)).toThrow(/No freeze/);
    expect(() => applyFreeze(habits(), ID.a, '2026-09-01', TODAY)).toThrow(/last week/);
    d = setHabitEntryStatus(habits(), ID.a, '2026-10-06', 'skipped', 'Streak freeze'); expect(freezesUsed(d)).toBe(1);
  });
  test('the device record: off by default, loose, unreadable reads as off', () => {
    let g = emptyGame(); expect(g.enabled).toBe(false);
    g = setGameEnabled(g, true); g = markBadgeSeen(g, 'first-step', TODAY); g = markLevelSeen(g, 3);
    expect(g).toMatchObject({enabled: true, badgesSeen: {'first-step': TODAY}, levelSeen: 3});
    expect(gameSchema.safeParse({version: 1, enabled: true, later: 1}).success).toBe(true);
    const m = new Map<string, string>(); const st = {getItem: (k: string) => m.get(k) ?? null};
    m.set(GAME.key, 'nope'); expect(readDeviceRecord(st, GAME)).toEqual({data: emptyGame(), unreadable: true});
  });
});
