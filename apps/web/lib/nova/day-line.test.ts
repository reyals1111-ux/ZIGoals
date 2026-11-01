import {describe, expect, it} from 'vitest';
import {DAY_DONE, DAY_LINE_MAX, OPEN_DAY, dayFacts, dayLine, type DayFacts} from './day-line';

/** Session AK P3 (NOVA_DESIGN_REVIEW.md ND-3): the line under NOVA's greeting, built from the person's own day. */
const base: DayFacts = {next: null, planned: null, habitsLeft: null, waterToGoMl: null, waterUnit: 'ml', bill: null, today: '2026-11-01'};
const day = (over: Partial<DayFacts>) => ({...base, ...over});

describe('the day line', () => {
  it('says the facts in order: next, habits left, water to go, a bill due within three days; three at most', () => {
    const full = day({next: 'Meditate', planned: 6, habitsLeft: 3, waterToGoMl: 800, bill: {title: 'Rent', due: '2026-11-02'}});
    expect(dayFacts(full)).toEqual(['Meditate next', '3 habits left', '800 mL of water to go']);
    expect(dayFacts(full)).toHaveLength(DAY_LINE_MAX);
    expect(dayLine(full)).toBe('Meditate next · 3 habits left · 800 mL of water to go');
    expect(dayLine(day({habitsLeft: 1, waterToGoMl: 1200, bill: {title: 'Rent', due: '2026-11-01'}}))).toBe('1 habit left · 1.2 L of water to go · Rent due today');
    expect(dayLine(day({bill: {title: 'Energy', due: '2026-11-04'}}))).toBe('Energy due in 3 days');
    expect(dayLine(day({waterToGoMl: 500, waterUnit: 'fl-oz-us'}))).toBe('16.9 fl oz of water to go');
  });
  it('unknown is not zero: a value that could not be read is left out, and nothing is guessed', () => {
    expect(dayLine(base)).toBeNull();
    expect(dayLine(day({next: '', planned: 0}))).toBeNull(); // habits unread: no "open day" either
    expect(dayLine(day({habitsLeft: 0}))).toBeNull(); // the orbit unread
    expect(dayFacts(day({habitsLeft: 0, waterToGoMl: 0}))).toEqual([]); // done is not said as "0 left"
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -2]) expect(dayFacts(day({habitsLeft: bad, waterToGoMl: bad}))).toEqual([]);
  });
  it('a bill is said only when it is due within three days, and never from a malformed date', () => {
    expect(dayFacts(day({bill: {title: 'Rent', due: '2026-11-05'}}))).toEqual([]);
    expect(dayFacts(day({bill: {title: 'Rent', due: '2026-10-31'}}))).toEqual([]);
    expect(dayFacts(day({bill: {title: 'Rent', due: 'soon'}}))).toEqual([]);
    expect(dayFacts(day({bill: {title: 'Rent', due: '2026-11-02'}, today: 'today'}))).toEqual([]);
  });
  it('with the day read and nothing left: the open-day sentence, or "everything planned is done"', () => {
    expect(dayLine(day({next: '', planned: 0, habitsLeft: 0}))).toBe(OPEN_DAY);
    expect(dayLine(day({next: '', planned: 4, habitsLeft: 0}))).toBe(DAY_DONE);
    expect(dayLine(day({next: '', planned: 4, habitsLeft: 0, waterToGoMl: 300}))).toBe('300 mL of water to go');
  });
  it('long names are shortened, so the line stays one calm line', () => {
    const [next] = dayFacts(day({next: 'A contribution to the very long named emergency fund for the new roof and windows'}));
    expect(next!.length).toBeLessThanOrEqual(48 + ' next'.length);
    expect(next).toMatch(/… next$/);
    expect(dayLine(day({next: 'Meditate'}))).not.toContain('!');
  });
});
