import {describe, expect, test} from 'vitest';
import {goalPeriod} from './goal-period-figures';
import {removeSleepTag, renameSleepTag, restoreSleepTags, tagCounts} from './tags';
import {sleepSchema, type Sleep, type SleepNight} from './schema';
import {showcaseSleep} from './showcase';
import {sleepGoalPeriodSchema} from './goal-period';
import {addDays, instantAt} from '../zone-time';

const ZONE = 'Europe/Amsterdam', AT = new Date('2026-11-25T09:00:00.000Z'), OLD = '2026-11-01T08:00:00.000Z';
const night = (wake: string, bed: string, up: string, tags?: string[], id = `health_sleep-test-${wake}`): SleepNight => {
  const bedDay = bed >= '12:00' ? addDays(wake, -1) : wake;
  return {id, kind: 'night', start: new Date(instantAt(bedDay, bed, ZONE)).toISOString(), end: new Date(instantAt(wake, up, ZONE)).toISOString(), timeZone: ZONE, ...(tags ? {tags} : {}), source: 'manual', createdAt: OLD, updatedAt: OLD};
};
const sleepOf = (nights: SleepNight[], goal?: Sleep['goal']): Sleep => sleepSchema.parse({version: 1, nights, ...(goal ? {goal} : {})});

describe('#459: rename or remove a sleep tag on every night, with one Undo', () => {
  const s = sleepOf([night('2026-11-20', '23:00', '07:00', ['caffeine', 'late meal']), night('2026-11-21', '23:00', '07:00', ['Caffeine', 'coffee']), night('2026-11-22', '23:00', '07:00', ['screens']), night('2026-11-23', '23:00', '07:00')]);
  test('the tags in use with their nights, most used first', () => {
    expect(tagCounts(s)).toEqual([{tag: 'caffeine', nights: 2}, {tag: 'coffee', nights: 1}, {tag: 'late meal', nights: 1}, {tag: 'screens', nights: 1}]);
  });
  test('a rename changes every night; onto a tag a night has keeps one; only changed nights are stamped', () => {
    const r = renameSleepTag(s, 'caffeine', 'coffee', AT);
    expect(r.nights).toBe(2);
    expect(r.next.nights.map(n => n.tags)).toEqual([['coffee', 'late meal'], ['coffee'], ['screens'], undefined]);
    expect(r.next.nights.map(n => n.updatedAt)).toEqual([AT.toISOString(), AT.toISOString(), OLD, OLD]);
    expect(() => renameSleepTag(s, 'coffee', '  ', AT)).toThrow('Give the tag a name');
    expect(() => renameSleepTag(s, 'coffee', 'x'.repeat(25), AT)).toThrow('24 characters');
    expect(renameSleepTag(s, 'nothing', 'else', AT)).toMatchObject({nights: 0, next: s});
  });
  test('a remove takes it off every night; a night left with none has no tags field; Undo puts each night back', () => {
    const r = removeSleepTag(s, 'screens', AT);
    expect(r.next.nights[2]).not.toHaveProperty('tags');
    const later = new Date('2026-11-25T09:05:00.000Z'), back = restoreSleepTags(r.next, r.before, later);
    expect(back.nights.map(n => n.tags)).toEqual(s.nights.map(n => n.tags));
    expect(back.nights[2]!.updatedAt).toBe(later.toISOString());
    // A night deleted before the Undo stays deleted.
    const without = sleepSchema.parse({...r.next, nights: r.next.nights.filter(n => n.id !== s.nights[2]!.id)});
    expect(restoreSleepTags(without, r.before, later).nights).toHaveLength(3);
    const renamed = renameSleepTag(s, 'caffeine', 'coffee', AT), undone = restoreSleepTags(renamed.next, renamed.before, later);
    expect(undone.nights.map(n => n.tags)).toEqual(s.nights.map(n => n.tags));
  });
});

describe('#460: the sleep goal over 14 or 30 days', () => {
  const goal = {minutes: 450, bedFrom: '22:30', bedTo: '23:30', updatedAt: OLD};
  const nights = [night('2026-11-25', '23:00', '07:00'), night('2026-11-24', '23:45', '06:45'), night('2026-11-22', '22:40', '06:40'), night('2026-11-05', '00:30', '07:00')];
  test('average asleep, nights at or above the goal, and the bedtime window, from the logged nights only', () => {
    const p = goalPeriod(sleepOf(nights, goal), '2026-11-25', 14)!;
    // Asleep is the time in bed here (nothing else logged), so an estimate: 480, 420 and 480 minutes.
    expect(p).toMatchObject({days: 14, goal: 450, nights: 3, atOrAbove: 2, asleep: 460, estimated: true});
    // Bedtimes 23:00, 23:45, 22:40: on average 23:08 (668 minutes after noon), 22 minutes before the window's end; 2 inside.
    expect(p.bedtime).toEqual({from: '22:30', to: '23:30', average: 668, fromEnd: -22, inside: 2, nights: 3});
  });
  test('30 days takes in the older night; no goal or no night: null', () => {
    expect(goalPeriod(sleepOf(nights, goal), '2026-11-25', 30)!.nights).toBe(4);
    expect(goalPeriod(sleepOf(nights), '2026-11-25', 14)).toBeNull();
    expect(goalPeriod(sleepOf([], goal), '2026-11-25', 14)).toBeNull();
    expect(goalPeriod(sleepOf(nights, {minutes: 450, updatedAt: OLD}), '2026-11-25', 14)!.bedtime).toBeNull();
  });
  test('the Showcase has a goal, a window and tags to work with', () => {
    const show = showcaseSleep('2026-11-17'), p = goalPeriod(show, '2026-11-17', 30)!;
    expect(p.nights).toBeGreaterThan(20); expect(p.bedtime).not.toBeNull();
    expect(tagCounts(show).map(t => t.tag).sort()).toEqual(['caffeine', 'screens']);
  });
  test('the period preference reads 14 unless 30 was chosen', () => {
    expect(sleepGoalPeriodSchema.parse({version: 1, days: 30}).days).toBe(30);
    expect(sleepGoalPeriodSchema.parse({version: 1, days: 7}).days).toBe(14);
  });
});
