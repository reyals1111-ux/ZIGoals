import {describe, expect, test} from 'vitest';
import {addLift, liftsOf, MAX_LIFTS, moveLift, removeLift, restoreLift} from './lifts';
import {emptyEnergy, energySchema} from '../energy/schema';

/** Session AV lane 2, round 6 (r6-body; LEDGER #412): "What lifts me", the person's own lines, kept in the energy record. */
describe('what lifts me', () => {
  test('add, move, remove and put back, in the person’s order; the record keeps its other parts', () => {
    let r = energySchema.parse({...emptyEnergy(), days: {'2026-11-22': {energy: 2, at: '2026-11-22T20:00:00.000Z'}}});
    r = addLift(addLift(addLift(r, '  A walk   round the block '), 'Call my sister'), 'That one song');
    expect(liftsOf(r)).toEqual(['A walk round the block', 'Call my sister', 'That one song']);
    expect(liftsOf(moveLift(r, 'That one song', -1))).toEqual(['A walk round the block', 'That one song', 'Call my sister']);
    expect(moveLift(r, 'A walk round the block', -1)).toBe(r);
    const gone = removeLift(r, 'Call my sister');
    expect(liftsOf(gone)).toEqual(['A walk round the block', 'That one song']);
    expect(liftsOf(restoreLift(gone, 'Call my sister', 1))).toEqual(liftsOf(r));
    expect(gone.days).toEqual(r.days);
    expect('lifts' in removeLift(removeLift(gone, 'A walk round the block'), 'That one song')).toBe(false);
    expect(energySchema.parse(r)).toEqual(r);
  });
  test('says a sentence for an empty line, a repeat, a long line and a full list', () => {
    const r = addLift(emptyEnergy(), 'Tea');
    expect(() => addLift(r, '  ')).toThrow('Type something that lifts you first.');
    expect(() => addLift(r, 'tea')).toThrow('“tea” is in your list already.');
    expect(() => addLift(r, 'x'.repeat(81))).toThrow('Keep it to 80 characters.');
    let full = emptyEnergy();
    for (let i = 0; i < MAX_LIFTS; i++) full = addLift(full, `Line ${i}`);
    expect(() => addLift(full, 'One more')).toThrow(`Up to ${MAX_LIFTS} fit. Remove one first.`);
  });
});
