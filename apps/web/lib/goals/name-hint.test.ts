import {describe, expect, it} from 'vitest';
import {averageHref, goalNameHint} from './name-hint';

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

// FR-S-12: the name typed in the wizard goes along to Keep an average.
describe('averageHref', () => {
  it('carries the typed name, and none when nothing is typed', () => {
    expect(averageHref('Elke nacht 8 uur slapen')).toBe('/app/goals/average/new?name=Elke%20nacht%208%20uur%20slapen');
    expect(averageHref('  Sleep   8 h & more ')).toBe('/app/goals/average/new?name=Sleep%208%20h%20%26%20more');
    expect(averageHref('   ')).toBe('/app/goals/average/new');
  });
});
