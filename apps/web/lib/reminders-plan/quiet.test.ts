import {describe, expect, it} from 'vitest';
import {clockInQuiet, quietNote} from './quiet';

// Session AL (MO-038, P-MO-80): the hub says when a reminder's time sits inside the quiet hours (Sleep's 22:00 did).
describe('clockInQuiet', () => {
  const night = {from: '22:00', to: '08:00'};
  it('reads a window past midnight: from is inside, until is not', () => {
    expect(clockInQuiet('22:00', night)).toBe(true);
    expect(clockInQuiet('23:30', night)).toBe(true);
    expect(clockInQuiet('07:59', night)).toBe(true);
    expect(clockInQuiet('08:00', night)).toBe(false);
    expect(clockInQuiet('21:30', night)).toBe(false);
  });
  it('reads a window within one day, and an empty or odd one as never', () => {
    expect(clockInQuiet('13:00', {from: '12:00', to: '14:00'})).toBe(true);
    expect(clockInQuiet('14:00', {from: '12:00', to: '14:00'})).toBe(false);
    expect(clockInQuiet('10:00', {from: '10:00', to: '10:00'})).toBe(false);
    expect(clockInQuiet('x', night)).toBe(false);
  });
  it('words the note with the end of the quiet hours, and says nothing otherwise', () => {
    expect(quietNote('22:00', night)).toMatch(/^Inside your quiet hours: it waits until /);
    expect(quietNote('21:30', night)).toBeNull();
    expect(quietNote('', night)).toBeNull();
    expect(quietNote(null, night)).toBeNull();
  });
});
