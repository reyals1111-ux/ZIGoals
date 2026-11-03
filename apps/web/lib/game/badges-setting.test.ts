import {describe, expect, test} from 'vitest';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {createHabit, emptyHabitData, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth} from '../health';
import {pendingCelebrations} from './celebrate';
import {badges} from './badges';
import {XP_RULES, xpEvents, xpSummary} from './xp';
import {badgesShown, emptyGame, gameSchema, markLevelSeen, setBadgesShown, setGameEnabled, switchGameLayer} from './schema';
import type {ChecklistDays} from '../checklist/schema';

/** Session AK Part 8.6: game badges off by default from a first switch-on; and the pin that the Checklist awards no XP. */
const TODAY = '2026-10-07', AT = new Date('2026-06-01T06:00:00.000Z'), ID = '11111111-1111-4111-8111-111111111111';
const input: HabitInput = {title: 'Stretch', category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}};
function streak(days: number): HabitData { let d = createHabit(emptyHabitData(), input, AT, ID); for (let i = 0; i < days; i++) { const day = new Date(Date.parse(`${TODAY}T12:00:00Z`) - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10); d = logHabitValue(d, ID, day, 1, {mode: 'set'}, new Date(`${day}T07:00:00Z`)); } return d; }

describe('game badges: a setting in the game record, off by default from a first switch-on', () => {
  test('the empty record is off, so badges are off; the field is optional and loose', () => {
    expect(badgesShown(emptyGame())).toBe(false);
    expect(gameSchema.safeParse({version: 1, enabled: true, badges: true}).success).toBe(true);
    expect(gameSchema.safeParse({version: 1, enabled: true, badges: 'yes'}).success).toBe(false);
  });
  test('a first switch-on writes badges: false; a record from before AK (no field) keeps showing them; off hides them', () => {
    const fresh = switchGameLayer(emptyGame(), true);
    expect(fresh).toEqual({version: 1, enabled: true, badges: false});
    expect(badgesShown(fresh)).toBe(false);
    const older = markLevelSeen(setGameEnabled(emptyGame(), true), 2);
    expect(badgesShown(older)).toBe(true);
    // Switching off and on again never changes the person's badge choice.
    expect(switchGameLayer(switchGameLayer(older, false), true)).not.toHaveProperty('badges');
    expect(switchGameLayer(switchGameLayer(setBadgesShown(fresh, true, [], TODAY), false), true).badges).toBe(true);
    expect(badgesShown(switchGameLayer(older, false))).toBe(false);
  });
  test('turning badges on marks what is already earned as seen (no burst of celebrations); off stops badge celebrations', () => {
    const stores = {habits: streak(10), health: createEmptyHealth()};
    const on = markLevelSeen(switchGameLayer(emptyGame(), true), 1);
    expect(pendingCelebrations(stores, on, {}, TODAY).some(c => c.kind === 'badge')).toBe(false);
    const earned = badges(stores, TODAY).filter(b => b.earned).map(b => b.id);
    expect(earned).toEqual(expect.arrayContaining(['first-step', 'first-week', 'streak-7']));
    const shown = setBadgesShown(on, true, earned, TODAY);
    expect(shown.badges).toBe(true);
    expect(Object.keys(shown.badgesSeen ?? {})).toEqual(expect.arrayContaining(earned));
    expect(pendingCelebrations(stores, shown, {}, TODAY).some(c => c.kind === 'badge')).toBe(false);
    // A badge seen earlier keeps its first day.
    expect(setBadgesShown({...on, badgesSeen: {'first-step': '2026-01-01'}}, true, earned, TODAY).badgesSeen?.['first-step']).toBe('2026-01-01');
    expect(setBadgesShown(shown, false, earned, TODAY)).toMatchObject({badges: false, badgesSeen: shown.badgesSeen});
  });
});

describe('the Checklist awards no XP (Session AG rule, pinned again in AK Part 8.6)', () => {
  const full: ChecklistDays = {version: 1, days: Object.fromEntries(Array.from({length: 30}, (_, i) => [`2026-09-${String(i + 1).padStart(2, '0')}`, {total: 5, done: 5, perfect: true}]))};
  test('no rule, no event and no point for any Checklist day, full or Perfect', () => {
    expect(Object.keys(XP_RULES).filter(k => /checklist|orbit|path/i.test(k))).toEqual([]);
    const stores = {habits: emptyHabitData(), health: createEmptyHealth(), checklist: full, checklistToday: {date: TODAY, total: 4, done: 4, perfect: true}};
    expect(xpEvents(stores, TODAY).filter(e => e.kind === 'checklist')).toEqual([]);
    expect(xpSummary(stores, TODAY)).toMatchObject({total: 0, byKind: {checklist: 0}});
  });
  test('no Checklist source reads the XP rules or turns on a reward line', () => {
    const root = join(__dirname, '..', '..');
    const files = (dir: string): string[] => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []; });
    const sources = [...files(join(root, 'lib', 'checklist')), ...files(join(root, 'components', 'checklist'))].map(f => ({f, text: readFileSync(f, 'utf8')}));
    expect(sources.length).toBeGreaterThan(20);
    for (const {f, text} of sources) {
      expect(text, f).not.toMatch(/game\/xp|XP_RULES|xpEvents|xpSummary/);
      // checklistMilestones may only ever be called with the reward line off and no XP.
      for (const call of text.matchAll(/(function\s+)?checklistMilestones\(([^)]*)\)/g)) if (!call[1]) expect(call[2], f).toMatch(/on:\s*false,\s*dayXp:\s*0/);
    }
  });
});
