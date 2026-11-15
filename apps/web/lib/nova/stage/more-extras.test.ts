import {beforeEach, describe, expect, it, vi} from 'vitest';
import {CYCLE_KEY} from '../../cycle/store';
import {showcaseCycle} from '../../cycle/showcase';
import {DEBT_PLANNER_KEY} from '../../debt-planner/store';
import {PRICE_ALERTS_KEY} from '../../price-alerts/schema';
import {SAVINGS_CHALLENGES_KEY} from '../../savings-challenges/challenges';
import {buildShowcase} from '../../showcase-data';
import {SUPPLEMENTS_KEY, emptySupplements} from '../../supplements/schema';
import {WIDGETS, widgetSpec} from '../widgets/catalog';
import {moreExtras} from './more-extras';

/**
 * Session AM-2 (step 3, round 2; ADR-037 Q14, Q16): the records NOVA reads for the round-2 widgets' lines. The rule is
 * connect-extras': a record is read only for a widget that is being made, and only while that widget's switch is open.
 * So the supplements log is never read for NOVA's words while the Health gate is closed, and the cycle log is never
 * read for them at all: its line carries no figure.
 */
const SHOWCASE = buildShowcase('2026-11-11', 'UTC').records;
const stored: Record<string, string> = {};
const read = vi.fn((key: string) => stored[key] ?? null);
vi.mock('../../showcase-storage', () => ({getAppStorage: () => ({getItem: (key: string) => read(key)}), isShowcase: () => false}));
const OURS = [DEBT_PLANNER_KEY, SAVINGS_CHALLENGES_KEY, PRICE_ALERTS_KEY, SUPPLEMENTS_KEY];
const EVERY = WIDGETS.map(w => ({id: w.id}));
const keysRead = () => read.mock.calls.map(c => c[0]);
const healthOff = (id: string) => widgetSpec(id)?.gate !== 'health';

beforeEach(() => {
  read.mockClear();
  for (const key of Object.keys(stored)) delete stored[key];
  for (const key of OURS) stored[key] = SHOWCASE[key]!;
  stored[CYCLE_KEY] = JSON.stringify(showcaseCycle('2026-11-11'));
});

describe('moreExtras: only what the request asks for, only behind its switch', () => {
  it('nothing of ours is asked: nothing is read', () => {
    expect(moreExtras([], () => true)).toEqual({});
    expect(moreExtras([{id: 'accounts'}, {id: 'fasting'}, {id: 'reviews'}, {id: 'weight'}], () => true)).toEqual({}); // their records are the chat engine's own
    expect(keysRead()).toEqual([]);
  });
  it('each widget reads its own record and no other', () => {
    const pairs: [string, string, string][] = [['debt-plan', 'debtPlanner', DEBT_PLANNER_KEY], ['savings-challenges', 'savingsChallenges', SAVINGS_CHALLENGES_KEY], ['price-alerts', 'priceAlerts', PRICE_ALERTS_KEY], ['supplements', 'supplements', SUPPLEMENTS_KEY]];
    for (const [id, field, key] of pairs) {
      read.mockClear();
      const got = moreExtras([{id}], () => true);
      expect(Object.keys(got), id).toEqual([field]);
      expect(got[field as keyof typeof got], id).not.toBeNull();
      expect(keysRead(), id).toEqual([key]);
    }
  });
  it('Health closed: the supplements log is never read, whatever is asked for; the money records still are', () => {
    const got = moreExtras(EVERY, healthOff);
    expect(keysRead()).not.toContain(SUPPLEMENTS_KEY);
    expect(got).not.toHaveProperty('supplements');
    expect(JSON.stringify(got)).not.toMatch(/Vitamin|Magnesium/);
    expect(keysRead().sort()).toEqual([DEBT_PLANNER_KEY, PRICE_ALERTS_KEY, SAVINGS_CHALLENGES_KEY].sort());
  });
  it('every switch closed, or the gates not read yet: nothing at all', () => {
    expect(moreExtras(EVERY, () => false)).toEqual({});
    expect(keysRead()).toEqual([]);
  });
  it('the cycle log is never read for NOVA’s words: not when it is asked for, not with every switch open', () => {
    const got = moreExtras([{id: 'cycle'}], () => true);
    expect(got).toEqual({});
    moreExtras(EVERY, () => true);
    expect(keysRead()).not.toContain(CYCLE_KEY);
    expect(keysRead().sort()).toEqual([...OURS].sort());
    expect(JSON.stringify(moreExtras(EVERY, () => true))).not.toMatch(/cramps|flow|"days"/);
  });
  it('a record that does not read is null (no line, never a zero); a storage that throws is the same; nothing stored is the empty record', () => {
    stored[PRICE_ALERTS_KEY] = '{"version":9}';
    expect(moreExtras([{id: 'price-alerts'}], () => true)).toEqual({priceAlerts: null});
    read.mockImplementationOnce(() => { throw Error('storage is closed'); });
    expect(moreExtras([{id: 'debt-plan'}], () => true)).toEqual({debtPlanner: null});
    delete stored[SUPPLEMENTS_KEY];
    expect(moreExtras([{id: 'supplements'}], () => true).supplements).toEqual(emptySupplements());
  });
});
