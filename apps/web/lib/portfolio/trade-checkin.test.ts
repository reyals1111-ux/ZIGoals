import {describe, expect, test} from 'vitest';
import {checkinNote, NOTE_MAX} from './trade-checkin';

describe('the 30-second trade check-in (G12)', () => {
  test('nothing chosen keeps the note as typed', () => expect(checkinNote(' my note ', {})).toBe('my note'));
  test('the answers follow the note in plain words', () => expect(checkinNote('DCA', {reason: 'Long-term plan', sure: 4, exit: ' at  my goal '})).toBe('DCA · Check-in: why: long-term plan; sure 4/5; sell when: at my goal'));
  test('an empty note gets the check-in alone', () => expect(checkinNote('', {sure: 2})).toBe('Check-in: sure 2/5'));
  test('never longer than the note allows', () => expect(checkinNote('x'.repeat(490), {reason: 'Other', exit: 'y'.repeat(100)}).length).toBe(NOTE_MAX));
  test('a confidence outside 1–5 is left out', () => expect(checkinNote('', {sure: 9})).toBe(''));
});
