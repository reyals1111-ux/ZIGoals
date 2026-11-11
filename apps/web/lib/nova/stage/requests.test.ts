import {describe, expect, it} from 'vitest';
import {emptyStage, forgetAsk, forgetAsks, MAX_ASKS, recordAsk, showcaseStage, asksOf, type NovaStage} from './record';
import {asksNewestFirst, groupAsks, restoreAsks} from './requests';

/** Session AM: the right bar's Requests — Today and Earlier, and Undo for a forgotten request. */
const ask = (r: NovaStage, id: string, at: string, text = `Ask ${id}`, device: 'computer' | 'phone' = 'computer') => recordAsk(r, {id, at: new Date(at), text, device, by: 'device'});

describe('NOVA requests: Today and Earlier', () => {
  it('splits by the calendar day in the zone, newest first in each', () => {
    let r = emptyStage();
    r = ask(r, 'a1', '2026-11-10T22:30:00.000Z');
    r = ask(r, 'a2', '2026-11-11T07:00:00.000Z');
    r = ask(r, 'a3', '2026-11-11T09:15:00.000Z', 'From the phone', 'phone');
    r = ask(r, 'a4', '2026-11-08T12:00:00.000Z');
    const g = groupAsks(r, new Date('2026-11-11T12:00:00.000Z'), 'UTC');
    expect(g.today.map(a => a.id)).toEqual(['a3', 'a2']);
    expect(g.earlier.map(a => a.id)).toEqual(['a1', 'a4']);
    expect(g.today[0]!.device).toBe('phone');
    // The same evening is "today" for a person in Amsterdam (23:30 there), not for one in UTC.
    expect(groupAsks(r, new Date('2026-11-10T23:00:00.000Z'), 'Europe/Amsterdam').today.map(a => a.id)).toEqual(['a3', 'a2']);
    expect(groupAsks(emptyStage(), new Date(), 'UTC')).toEqual({today: [], earlier: []});
  });
  // Session AM (design review AM-D25, deliberate): the examples were stamped 08:02–08:12 on the Showcase's day, in the
  // future for anyone looking before then. They are now stamped back from the moment of loading, newest first.
  it('reads the Showcase’s four example requests: never in the future, newest first, two today and two earlier', () => {
    const now = Date.parse('2026-11-11T06:02:00.000Z'), stage = showcaseStage('2026-11-11', now), g = groupAsks(stage, new Date(now), 'UTC');
    expect([...g.today, ...g.earlier]).toHaveLength(4);
    expect(g.today.map(a => a.id)).toEqual(['showcase-4', 'showcase-3']);
    expect(g.earlier.map(a => a.id)).toEqual(['showcase-2', 'showcase-1']);
    expect([...g.today, ...g.earlier].filter(a => a.device === 'phone')).toHaveLength(1);
    expect(asksOf(stage).map(a => now - Date.parse(a.at))).toEqual([2 * 3_600_000, 3 * 3_600_000, 24 * 3_600_000, 48 * 3_600_000]);
    // A request made now lands on top, never under an example.
    const after = recordAsk(stage, {id: 'mine', at: new Date(now), text: 'Show my habits this week', widgets: [{id: 'habit-week'}], device: 'computer', by: 'device'});
    expect(asksNewestFirst(after)[0]!.id).toBe('mine');
    expect(groupAsks(after, new Date(now), 'UTC').today.map(a => a.id)).toEqual(['mine', 'showcase-4', 'showcase-3']);
  });
  it('the Showcase built for a day alone is in the past wherever that day has begun', () => {
    for (const day of ['2026-11-11', '2026-03-01', '2027-01-01']) {
      const earliest = Date.parse(`${day}T00:00:00.000Z`) - 14 * 3_600_000; // midnight of `day` at UTC+14
      const times = asksOf(showcaseStage(day)).map(a => Date.parse(a.at));
      for (const t of times) expect(t).toBeLessThan(earliest);
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    }
  });
  it('one order everywhere: by time, newest first, whatever order the record holds', () => {
    const r: NovaStage = {version: 1, asks: [{id: 'old', at: '2026-11-10T08:00:00.000Z', text: 'a'}, {id: 'new', at: '2026-11-11T09:00:00.000Z', text: 'b'}, {id: 'mid', at: '2026-11-11T07:00:00.000Z', text: 'c'}]} as NovaStage;
    expect(asksNewestFirst(r).map(a => a.id)).toEqual(['new', 'mid', 'old']);
  });
});

describe('NOVA requests: Undo puts a forgotten request back', () => {
  it('one request returns to its place by time; forgetting all returns all', () => {
    let r = emptyStage();
    for (const [id, at] of [['a1', '2026-11-11T07:00:00.000Z'], ['a2', '2026-11-11T08:00:00.000Z'], ['a3', '2026-11-11T09:00:00.000Z']] as const) r = ask(r, id, at);
    const before = [...asksOf(r)], gone = forgetAsk(r, 'a2');
    expect(asksOf(gone).map(a => a.id)).toEqual(['a3', 'a1']);
    expect(asksOf(restoreAsks(gone, before.filter(a => a.id === 'a2'))).map(a => a.id)).toEqual(['a3', 'a2', 'a1']);
    const none = forgetAsks(r);
    expect(asksOf(none)).toEqual([]);
    expect(asksOf(restoreAsks(none, before)).map(a => a.id)).toEqual(['a3', 'a2', 'a1']);
  });
  it('keeps what was asked since, never doubles a request, and stays within the record’s bound', () => {
    let r = ask(emptyStage(), 'a1', '2026-11-11T07:00:00.000Z');
    const before = [...asksOf(r)];
    r = ask(forgetAsks(r), 'a9', '2026-11-11T10:00:00.000Z');
    const back = restoreAsks(r, before);
    expect(asksOf(back).map(a => a.id)).toEqual(['a9', 'a1']);
    expect(restoreAsks(back, before)).toBe(back);
    expect(restoreAsks(back, [])).toBe(back);
    let full = emptyStage();
    // The record is full of newer requests: the list keeps its bound and its newest; the oldest (the restored one) gives way.
    for (let i = 0; i < MAX_ASKS; i++) full = ask(full, `b${i}`, new Date(Date.UTC(2026, 10, 11, 8, i)).toISOString());
    const restored = restoreAsks(full, before);
    expect(asksOf(restored)).toHaveLength(MAX_ASKS);
    expect(asksOf(restored)[0]!.id).toBe(`b${MAX_ASKS - 1}`);
    expect(asksOf(restored).some(a => a.id === 'a1')).toBe(false);
  });
});
