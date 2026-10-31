import {describe, expect, it} from 'vitest';
import {movedMessage} from './moved';

// Session AK F0 (6.5): the cross-pillar progress line.
describe('movedMessage', () => {
  it('says the new whole percent when it went up', () => {
    expect(movedMessage('Japan trip', {progressPct: '41.20'}, {progressPct: '46.90'})).toBe('That moved Japan trip to 46%.');
    expect(movedMessage('Japan trip', {progressPct: '0.00'}, {progressPct: '3.00'})).toBe('That moved Japan trip to 3%.');
  });
  it('says nothing when the whole percent did not change or went down', () => {
    expect(movedMessage('Japan trip', {progressPct: '46.10'}, {progressPct: '46.90'})).toBeNull();
    expect(movedMessage('Japan trip', {progressPct: '50.00'}, {progressPct: '40.00'})).toBeNull();
  });
  it('unknown is not zero: nothing when the progress after is unknown; "at least" for a lower bound', () => {
    expect(movedMessage('Japan trip', {progressPct: '10.00'}, {progressPct: '0.00', bound: 'unavailable'})).toBeNull();
    expect(movedMessage('Japan trip', {progressPct: '0.00', bound: 'unavailable'}, {progressPct: '12.00', bound: 'at-least'})).toBe('That moved Japan trip to at least 12%.');
    expect(movedMessage('Japan trip', {progressPct: '0.00', bound: 'unavailable'}, {progressPct: '0.00'})).toBeNull();
  });
  it('reaching the target says so without a number over 100; the name is tidied and bounded', () => {
    expect(movedMessage('Japan trip', {progressPct: '98.00'}, {progressPct: '104.00'})).toBe('That moved Japan trip to its target.');
    expect(movedMessage('  Emergency\n fund ', {progressPct: '1.00'}, {progressPct: '2.00'})).toBe('That moved Emergency fund to 2%.');
    expect(movedMessage('x'.repeat(80), {progressPct: '1.00'}, {progressPct: '2.00'})).toBe(`That moved ${'x'.repeat(60)} to 2%.`);
    expect(movedMessage('   ', {progressPct: '1.00'}, {progressPct: '2.00'})).toBe('That moved your Goal to 2%.');
    expect(movedMessage('Japan trip', {progressPct: 'NaN'}, {progressPct: 'x'})).toBeNull();
  });
});
