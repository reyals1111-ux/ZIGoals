import {describe, expect, it} from 'vitest';
import {emptyStage, forgetAsk, forgetAsks, MAX_ASKS, recordAsk, showcaseStage, asksOf, type NovaStage} from './record';
import {groupAsks, restoreAsks} from './requests';

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
  it('reads the Showcase’s four example requests', () => {
    const g = groupAsks(showcaseStage('2026-11-11'), new Date('2026-11-11T10:00:00.000Z'), 'UTC');
    expect(g.today).toHaveLength(4);
    expect(g.today.filter(a => a.device === 'phone')).toHaveLength(1);
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
