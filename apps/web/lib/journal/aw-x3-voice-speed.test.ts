import {describe, expect, test} from 'vitest';
import {VOICE_SPEEDS, clock, skipTo, speedLabel, speedWords, timeLine, totalOf, voiceSpeedOf, withVoiceSpeed} from './voice-speed';
import {emptyJournalDisplay, journalDisplaySchema} from '../on-this-day/store';

/** Session AW (x3; LEDGER #442, Evernote's faster playback): the speed kept on the device, the skips and the time line. */
describe('the stored format (TIER 3, additive)', () => {
  test('an older display record plays at normal speed; a speed that does not read is dropped', () => {
    expect(voiceSpeedOf(journalDisplaySchema.parse({version: 1, onThisDay: false}))).toBe(1);
    expect(journalDisplaySchema.parse({version: 1, voiceSpeed: 3})).toEqual({version: 1});
    expect(journalDisplaySchema.parse({version: 1, voiceSpeed: 1.25, later: 'kept'})).toEqual({version: 1, voiceSpeed: 1.25, later: 'kept'});
  });
});
describe('the player', () => {
  test('1×, 1.25×, 1.5× and 2×, kept on the device (1 is no choice at all)', () => {
    expect(VOICE_SPEEDS).toEqual([1, 1.25, 1.5, 2]);
    const fast = withVoiceSpeed(emptyJournalDisplay(), 2);
    expect(voiceSpeedOf(fast)).toBe(2);
    expect(withVoiceSpeed(fast, 1)).toEqual({version: 1});
    expect(speedLabel(1.5)).toBe('1.5×'); expect(speedWords(1)).toBe('normal speed'); expect(speedWords(1.25)).toBe('1.25 times as fast');
  });
  test('15 seconds back or forward, never before the start or past the end', () => {
    expect(skipTo(10, -15, 40)).toBe(0); expect(skipTo(30, 15, 40)).toBe(40); expect(skipTo(5, 15, null)).toBe(20); expect(skipTo(Number.NaN, 15, 40)).toBe(15);
  });
  test('the whole length: the browser’s when known, else the entry’s seconds; the time in words', () => {
    expect(totalOf(Number.POSITIVE_INFINITY, 42)).toBe(42); expect(totalOf(12.5, 42)).toBe(12.5); expect(totalOf(Number.NaN, undefined)).toBeNull();
    expect(clock(59.9)).toBe('0:59'); expect(clock(75)).toBe('1:15'); expect(clock(-3)).toBe('0:00');
    expect(timeLine(12, 40)).toBe('0:12 of 0:40'); expect(timeLine(50, 40)).toBe('0:40 of 0:40'); expect(timeLine(3, null)).toBe('0:03 played');
  });
});
