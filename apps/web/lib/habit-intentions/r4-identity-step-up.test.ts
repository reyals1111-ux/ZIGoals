import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {addLocalDays} from '../local-date';
import {countLine, identitiesOf, identityCounts, pruneIdentityHabits, removeIdentity, restoreIdentity, saveIdentity} from './identity';
import {restUntil, restoreStepUpEntry, setStepUp, sizeWords, stepOffer, stepOffers, stepUpEntry, stepUpOf} from '../habits-v2/step-up';

/**
 * Session AV lane 2 (r4-mind; LEDGER #323, #327, Atoms): the person behind the habits — lines in their own words, each
 * joined to habits, with this week's and this month's ticks counted (never a score) — and start small, then step up: a
 * small version and a next step, and the quiet card that offers a change after four steady or two thin weeks, which only
 * the person makes.
 */
const input = (title: string): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}});
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const TODAY = '2026-11-22'; // a Sunday
const at = (d: string) => new Date(`${d}T10:00:00Z`);
function habits(start: string, doneA: (day: string, i: number) => boolean, doneB: (day: string, i: number) => boolean = () => false): HabitData {
  let d: HabitData = {...emptyHabitData(), timeZone: 'UTC'};
  d = createHabit(d, input('Read'), at(start), A);
  d = createHabit(d, input('Walk'), at(start), B);
  for (let day = start, i = 0; day <= TODAY; day = addLocalDays(day, 1), i++) {
    if (doneA(day, i)) d = logHabitValue(d, A, day, 1, {}, at(TODAY));
    if (doneB(day, i)) d = logHabitValue(d, B, day, 1, {}, at(TODAY));
  }
  return d;
}
let n = 0;
const ids = () => `id-test${String(++n).padStart(4, '0')}`;
describe('who you are becoming', () => {
  test('a line joined to habits counts their ticks this week (Monday on) and this month', () => {
    const d = habits('2026-11-01', () => true, day => day >= '2026-11-20');
    const extras = saveIdentity({version: 1}, {text: '  I am someone who   reads ', habits: [A, B, 'gone']}, new Set([A, B]), ids);
    expect(identitiesOf(extras)).toEqual([{id: 'id-test0001', text: 'I am someone who reads', habits: [A, B]}]);
    const [c] = identityCounts(identitiesOf(extras), d.habits, TODAY);
    expect([c!.month, c!.week]).toEqual([22 + 3, 7 + 3]);
    expect(countLine(c!)).toBe('25 times this month · 10 times this week');
    expect(countLine({week: 0, month: 0, habits: d.habits})).toBe('Nothing ticked this month yet; each tick counts toward it.');
    expect(countLine({week: 0, month: 0, habits: []})).toBe('No habit joined yet. Edit to choose the habits that serve it.');
  });
  test('change, remove with Undo in place, five at most, plain words required; a later build’s items kept', () => {
    let x: Record<string, unknown> = {version: 1, identities: [{id: 'future', kind: 'later'}]};
    for (const t of ['one', 'two', 'three']) x = saveIdentity(x, {text: t, habits: []}, null, ids);
    const [first, second] = identitiesOf(x);
    x = saveIdentity(x, {id: second!.id, text: 'two, changed', habits: [A]});
    expect(identitiesOf(x).map(i => i.text)).toEqual(['one', 'two, changed', 'three']);
    expect((x.identities as unknown[]).at(-1)).toEqual({id: 'future', kind: 'later'});
    const gone = removeIdentity(x, first!.id);
    expect(identitiesOf(gone).map(i => i.text)).toEqual(['two, changed', 'three']);
    expect(identitiesOf(restoreIdentity(gone, first!, 0)).map(i => i.text)).toEqual(['one', 'two, changed', 'three']);
    x = saveIdentity(saveIdentity(x, {text: 'four', habits: []}, null, ids), {text: 'five', habits: []}, null, ids);
    expect(() => saveIdentity(x, {text: 'six', habits: []}, null, ids)).toThrow('Up to 5 lines');
    expect(() => saveIdentity(x, {text: '   ', habits: []})).toThrow('Write the line in your own words');
    expect(identitiesOf(pruneIdentityHabits(x, new Set()))[1]!.habits).toEqual([]);
  });
});
describe('start small, then step up', () => {
  test('sizes in the person’s words; the habit itself when none; a size without its words reads as the habit', () => {
    let x = setStepUp({version: 1}, A, {small: 'One page', next: 'Two pages'});
    expect(stepUpOf(x, A)).toEqual({small: 'One page', next: 'Two pages', now: 'full', card: false});
    x = setStepUp(x, A, {now: 'small', since: '2026-10-01'});
    expect(sizeWords({title: 'Read'}, stepUpOf(x, A))).toBe('One page');
    expect(stepUpOf({stepUp: {[A]: {now: 'next'}}}, A).now).toBe('full');
    expect(() => setStepUp({version: 1}, A, {now: 'small'})).toThrow('Write the small version first');
    expect(setStepUp(setStepUp({version: 1}, A, {small: 'x'}), A, {small: null})).toEqual({version: 1});
  });
  test('the card offers nothing until switched on; after four steady weeks it offers the next size, then rests on Not now', () => {
    const d = habits('2026-10-20', (_day, i) => i % 7 !== 0), h = d.habits.find(x => x.id === A)!; // 6 of 7 days
    let x = setStepUp({version: 1}, A, {small: 'One page', next: 'Two pages', now: 'small', since: '2026-10-24'});
    expect(stepOffer(h, stepUpOf(x, A), TODAY)).toBeNull();
    x = setStepUp(x, A, {card: true});
    expect(stepOffer(h, stepUpOf(x, A), TODAY)).toMatchObject({kind: 'up', to: 'full', words: 'Read'});
    const full = setStepUp(x, A, {now: 'full', since: TODAY});
    expect(stepOffer(h, stepUpOf(full, A), TODAY)).toBeNull(); // four weeks at the new size first
    const rested = setStepUp(x, A, {later: restUntil(TODAY)});
    expect(stepOffer(h, stepUpOf(rested, A), TODAY)).toBeNull();
    expect(stepOffers(d.habits, x, TODAY).map(o => o.habit.id)).toEqual([A]);
  });
  test('after two thin weeks at a bigger size it offers the small version again; never without one written', () => {
    const d = habits('2026-10-20', (day, i) => day < '2026-11-08' || i % 4 === 0), h = d.habits.find(x => x.id === A)!;
    const x = setStepUp({version: 1}, A, {small: 'One page', next: 'Two pages', now: 'next', since: '2026-10-20', card: true});
    expect(stepOffer(h, stepUpOf(x, A), TODAY)).toMatchObject({kind: 'down', words: 'One page'});
    expect(stepOffer(h, stepUpOf(setStepUp(x, A, {small: null}), A), TODAY)).toBeNull();
  });
  test('Undo of Yes puts the entry back exactly: its size, the four-week clock and a resting card (review B4D-5)', () => {
    const start = {version: 1, stepUp: {[A]: {small: 'One page', next: 'Two pages', now: 'small', since: '2026-10-24', card: true, later: '2026-11-01', later2: 'a later build'}, [B]: {small: 'x'}}};
    const before = stepUpEntry(start, A);
    const yes = setStepUp(start, A, {now: 'full', since: TODAY, later: null});
    expect(stepUpOf(yes, A)).toMatchObject({now: 'full', since: TODAY});
    const back = restoreStepUpEntry({...yes, stepUp: {...(yes as {stepUp: Record<string, unknown>}).stepUp, [B]: {small: 'y'}}}, A, before);
    expect((back as {stepUp: Record<string, unknown>}).stepUp[A]).toEqual(start.stepUp[A]);
    expect((back as {stepUp: Record<string, unknown>}).stepUp[B]).toEqual({small: 'y'}); // other habits as they are now
    expect(restoreStepUpEntry(setStepUp({version: 1}, A, {small: 'x'}), A, stepUpEntry({version: 1}, A))).toEqual({version: 1});
  });
});
