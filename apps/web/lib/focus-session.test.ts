import {expect, test} from 'vitest';
import {focusNote, withFocusNote, MAX_NOTES_CHARS} from './focus-session';

test('Session AI (focus session): the note, appended; under a minute is not noted; the notes stay within their limit', () => {
  expect(focusNote(25, '2026-10-28')).toBe('Focus session: 25 min (2026-10-28)');
  expect(focusNote(0.5, '2026-10-28')).toBeNull();
  expect(withFocusNote(undefined, 'A')).toBe('A');
  expect(withFocusNote('Booked hotel', 'A')).toBe('Booked hotel\nA');
  const long = withFocusNote('x'.repeat(MAX_NOTES_CHARS), 'Focus session: 25 min (2026-10-28)');
  expect(long.length).toBe(MAX_NOTES_CHARS); expect(long.endsWith('Focus session: 25 min (2026-10-28)')).toBe(true);
});
