import {describe, expect, it} from 'vitest';
import {whyChanged} from './why-changed';

describe('whyChanged (Session AH, CO6)', () => {
  it('names the classes that moved most, largest first', () => {
    const r = whyChanged({value: '100000', classes: {Crypto: '60000', Cash: '40000'}}, {value: '115000', classes: {Crypto: '80000', Cash: '35000'}});
    expect(r.total).toBe(15000n);
    expect(r.moves).toEqual([{name: 'Crypto', delta: 20000n}, {name: 'Cash', delta: -5000n}]);
    expect(r.others).toBe(0);
  });
  it('counts a class added or gone as moving from or to zero, and keeps the rest as a count', () => {
    const r = whyChanged({value: '300', classes: {A: '100', B: '100', C: '100'}}, {value: '450', classes: {A: '100', B: '50', D: '300'}}, 1);
    expect(r.moves).toEqual([{name: 'D', delta: 300n}]);
    expect(r.others).toBe(2);
  });
  it('says nothing moved when nothing did, and reads unreadable values as zero', () => {
    expect(whyChanged({value: '5', classes: {A: '5'}}, {value: '5', classes: {A: '5'}}).moves).toEqual([]);
    expect(whyChanged({value: 'x'}, {value: '7'}).total).toBe(7n);
  });
});
