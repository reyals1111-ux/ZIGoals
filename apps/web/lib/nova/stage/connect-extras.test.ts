import {beforeEach, describe, expect, it, vi} from 'vitest';
import {DAY_GOAL_KEY} from '../../checklist/day-goal';
import {COUNTDOWNS_KEY} from '../../countdowns/schema';
import {DAY_ENDS_KEY} from '../../day-boundary';
import {MONEY_TAGS_KEY} from '../../money-tags/schema';
import {MOOD_TAGS_KEY} from '../../mood-tags/schema';
import {NETWORTH_HISTORY_KEY} from '../../networth-history';
import {SYMPTOMS_KEY} from '../../symptoms/schema';
import {TASK_WHEN_KEY} from '../../tasks/when';
import {WORKOUT_SPLITS_KEY} from '../../workouts/splits-schema';
import {TEMPLATE_COUNTS} from '../cards/life-insights';
import {widgetSpec} from '../widgets/catalog';
import {connectExtras} from './connect-extras';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-037 Q14, Q16; ADR-040 owner addition 1): the records NOVA reads for the
 * newer widgets' lines. The rule: a record is read only for a widget that is being made, and only while that widget's
 * switch is open. So mood tags, symptoms and run splits are never read for NOVA's words while the Health gate is closed.
 */
const stored: Record<string, string> = {};
const read = vi.fn((key: string) => stored[key] ?? null);
vi.mock('../../showcase-storage', () => ({getAppStorage: () => ({getItem: (key: string) => read(key)}), isShowcase: () => false}));
const HEALTH_KEYS = [MOOD_TAGS_KEY, SYMPTOMS_KEY, WORKOUT_SPLITS_KEY];
const ALL = ['net-worth-history', 'money-tags', 'tasks-later', 'countdowns', 'day-rules', 'run-splits', 'mood-tags', 'symptoms', 'templates', 'weight', 'spending'].map(id => ({id}));
const keysRead = () => read.mock.calls.map(c => c[0]);
const healthOff = (id: string) => widgetSpec(id)?.gate !== 'health';

beforeEach(() => {
  read.mockClear();
  for (const key of Object.keys(stored)) delete stored[key];
  stored[MOOD_TAGS_KEY] = JSON.stringify({version: 1, entries: {'2026-11-11': ['walk']}});
  stored[SYMPTOMS_KEY] = JSON.stringify({version: 1, items: [{id: 'headache', name: 'Headache', kind: 'symptom', createdAt: '2026-11-01T08:00:00.000Z'}], days: {'2026-11-11': {headache: 2}}});
  stored[COUNTDOWNS_KEY] = JSON.stringify({version: 1, items: [{id: 'c1', title: 'Trip', date: '2026-12-01', createdAt: '2026-11-01T08:00:00.000Z'}]});
});

describe('connectExtras: only what the request asks for, only behind its switch', () => {
  it('nothing is asked: nothing is read', () => {
    expect(connectExtras([], () => true)).toEqual({});
    expect(connectExtras([{id: 'weight'}, {id: 'spending'}], () => true)).toEqual({});
    expect(keysRead()).toEqual([]);
  });
  it('each widget reads its own record and no other', () => {
    expect(Object.keys(connectExtras([{id: 'countdowns'}], () => true))).toEqual(['countdowns']);
    expect(keysRead()).toEqual([COUNTDOWNS_KEY]);
    read.mockClear();
    expect(Object.keys(connectExtras([{id: 'day-rules'}], () => true)).sort()).toEqual(['dayEnds', 'dayGoal']);
    expect(keysRead().sort()).toEqual([DAY_ENDS_KEY, DAY_GOAL_KEY].sort());
    read.mockClear();
    connectExtras([{id: 'net-worth-history'}, {id: 'money-tags'}, {id: 'tasks-later'}], () => true);
    expect(keysRead().sort()).toEqual([MONEY_TAGS_KEY, NETWORTH_HISTORY_KEY, TASK_WHEN_KEY].sort());
  });
  it('Health closed: mood tags, symptoms and run splits are never read, whatever is asked for; the rest still is', () => {
    const got = connectExtras(ALL, healthOff);
    for (const key of HEALTH_KEYS) expect(keysRead(), key).not.toContain(key);
    expect(got).not.toHaveProperty('moodTags'); expect(got).not.toHaveProperty('symptoms'); expect(got).not.toHaveProperty('splits');
    expect(JSON.stringify(got)).not.toMatch(/walk|Headache/);
    expect(got.countdowns?.items.map(i => i.title)).toEqual(['Trip']);
  });
  it('every switch closed, or the gates not read yet: only the library’s size (it reads nothing of the person’s)', () => {
    expect(connectExtras(ALL, () => false)).toEqual({templates: TEMPLATE_COUNTS});
    expect(keysRead()).toEqual([]);
  });
  it('Health open: the three records are read, as stored', () => {
    const got = connectExtras([{id: 'mood-tags'}, {id: 'symptoms'}, {id: 'run-splits'}], () => true);
    expect(keysRead().sort()).toEqual([...HEALTH_KEYS].sort());
    expect(got.moodTags?.entries['2026-11-11']).toEqual(['walk']);
    expect(got.symptoms?.items[0]?.name).toBe('Headache');
    expect(got.splits).toEqual({version: 1, workouts: {}}); // nothing stored: the empty record, which the line teaches from
  });
  it('a record that does not read is null (no line, never a zero); a storage that throws is the same', () => {
    stored[COUNTDOWNS_KEY] = '{"version":9}';
    expect(connectExtras([{id: 'countdowns'}], () => true)).toEqual({countdowns: null});
    read.mockImplementationOnce(() => { throw Error('storage is closed'); });
    expect(connectExtras([{id: 'money-tags'}], () => true)).toEqual({moneyTags: null});
  });
});
