import {describe, expect, test} from 'vitest';
import {createEmptyHealth} from '../health';
import {withHealthGroup} from '../vault/w-homes';
import {moodMarks} from './mood-source';
import {buildDayTimeline} from './build';
import {emptyHabitData} from '../habits';

/**
 * Session AV lane 2 (r5-body; LEDGER #370, Tiimo's moods on the day): the day's mood, energy and feeling words as small
 * marks at their times on the Day Timeline, in words as well as colour; a read only.
 */
const DAY = '2026-11-20';
const health = () => withHealthGroup(createEmptyHealth(), 'moods', {version: 1, days: {[DAY]: {mood: 4, at: `${DAY}T20:10:00.000Z`}, '2026-11-19': {mood: 2, at: `${DAY}T08:00:00.000Z`}}} as never, false);
const energy = {days: {[DAY]: {energy: 2, at: `${DAY}T07:45:00.000Z`}}, words: {[DAY]: {energy: 'low', pleasantness: 'pleasant', word: 'calm', strength: 'quite', at: `${DAY}T20:11:00.000Z`, more: [{energy: 'low', pleasantness: 'pleasant', word: 'grateful'}]}}};

describe('moods on the day', () => {
  test('each check-in at its time, in words and a colour; a mood answered on a later day has no time here', () => {
    expect(moodMarks(DAY, health(), energy, 'UTC')).toEqual([
      {id: `mood-${DAY}`, title: 'Mood: Good (4 of 5)', done: false, href: `/app/health?date=${DAY}`, pillar: 'health', label: 'Mood check-in', colour: 'var(--cyan)', mark: true, time: '20:10', band: 'anytime'},
      {id: `energy-${DAY}`, title: 'Energy: 2 of 5', done: false, href: `/app/health?date=${DAY}`, pillar: 'health', label: 'Energy check-in', colour: 'var(--pink)', mark: true, time: '07:45', band: 'anytime'},
      {id: `feeling-${DAY}`, title: 'Feeling: calm (quite), grateful', done: false, href: `/app/health?date=${DAY}`, pillar: 'health', label: 'A pleasant feeling word', colour: 'var(--cyan)', mark: true, time: '20:11', band: 'anytime'},
    ]);
    expect(moodMarks('2026-11-19', health(), null, 'UTC')).toEqual([expect.objectContaining({title: 'Mood: Low (2 of 5)', band: 'anytime'})]);
    expect(moodMarks('2026-11-19', health(), null, 'UTC')[0]!.time).toBeUndefined();
    expect(moodMarks(DAY, createEmptyHealth(), null, 'UTC')).toEqual([]);
    // Review B5H-7: a past day's mark opens that day, never today's mood question.
    expect(moodMarks('2026-11-19', health(), null, 'UTC')[0]!.href).toBe('/app/health?date=2026-11-19');
  });
  test('on the timeline: a mark at its time, never a block to do or move', () => {
    const day = buildDayTimeline({date: DAY, today: DAY, healthDay: DAY, now: new Date(`${DAY}T21:00:00.000Z`), zone: 'UTC', habits: emptyHabitData(), health: null, extra: moodMarks(DAY, health(), energy, 'UTC')});
    const marks = day.blocks.filter(b => b.kind === 'mark');
    expect(marks.map(b => [b.title, b.start, b.movable, b.done, b.note])).toEqual([
      ['Energy: 2 of 5', 7 * 60 + 45, false, false, 'Energy check-in'],
      ['Mood: Good (4 of 5)', 20 * 60 + 10, false, false, 'Mood check-in'],
      ['Feeling: calm (quite), grateful', 20 * 60 + 11, false, false, 'A pleasant feeling word'],
    ]);
    expect(day.leftovers.some(b => b.kind === 'mark')).toBe(false);
  });
});
