import {describe, expect, it} from 'vitest';
import {AVERAGE_NEW, clearHandedName, goalNameHint, handOffName, peekHandedName} from './name-hint';

// Session AU (ADR-044 F-6): the rehearsal's goal names.
describe('goalNameHint', () => {
  it('a daily number points to an average', () => {
    for (const n of ['Elke nacht 8 uur slapen', 'Sleep 8 hours', 'Drink more water', '10,000 steps a day', 'Less screen time']) expect(goalNameHint(n), n).toBe('average');
  });
  it('a count points to the count kind', () => {
    for (const n of ['Read 12 books this year', '12 boeken lezen', 'Run 100 km', 'Finish 20 lessons']) expect(goalNameHint(n), n).toBe('count');
  });
  it('money words and plain names suggest nothing', () => {
    for (const n of ['Emergency fund', 'Save €900 for a bike', 'First 0.01 BTC', 'Lisbon trip', '', 'Spaarpot voor water bills fund']) expect(goalNameHint(n), n).toBeNull();
  });
});

// FR-S-12: the name typed in the wizard goes along to Keep an average in memory, never in the address (CI run 2012's
// Alpha gate caught the first version, ?name=, sending a private goal name to the server).
describe('the average form\'s name hand-off', () => {
  it('never puts the name in the address', () => { expect(AVERAGE_NEW).toBe('/app/goals/average/new'); expect(AVERAGE_NEW).not.toMatch(/[?#]/); });
  it('hands the typed name over trimmed, until the form clears it; nothing when nothing is typed', () => {
    handOffName('  Sleep   8 h & more '); expect(peekHandedName()).toBe('Sleep 8 h & more'); expect(peekHandedName()).toBe('Sleep 8 h & more');
    clearHandedName(); expect(peekHandedName()).toBeUndefined();
    handOffName('Elke nacht 8 uur slapen'); handOffName('   '); expect(peekHandedName()).toBeUndefined();
  });
});
