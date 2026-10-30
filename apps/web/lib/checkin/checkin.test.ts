import {expect, test} from 'vitest';
import {checkinMoment, FORBIDDEN, followUpLine, NOTE_SAVED} from './checkin';

// Session AJ (item 10; COMPANIONS.md P1, P4).
test('the follow-up line per band, mixed days and personality, in English and Dutch', () => {
  expect(followUpLine({energy: 5})).toEqual({line: 'Noted. A good amount of energy today.', low: false});
  expect(followUpLine({energy: 3, personality: 'cheerful'})?.line).toBe('Okay is a fine place to start from.');
  expect(followUpLine({energy: 2, personality: 'direct'})).toEqual({line: 'Noted: a low day. Nothing else needed from you here.', low: true});
  expect(followUpLine({energy: 4, mood: 2})?.line).toBe('Energy enough, a heavier mood. Both noted.');
  expect(followUpLine({energy: 1, mood: 5, personality: 'cheerful'})?.line).toBe('Low battery, bright mood. Noted.');
  expect(followUpLine({energy: 2, mood: 4, personality: 'direct'})?.line).toBe('Energy 2, mood 4. Noted.');
  expect(followUpLine({energy: 4, personality: 'direct', lang: 'nl'})?.line).toBe('Energie 4 van 5. Genoteerd.');
  expect(followUpLine({mood: 4, personality: 'direct'})?.line).toBe('Mood 4 of 5. Noted.');
  expect(followUpLine({mood: 1, lang: 'nl'})).toEqual({line: 'Dank je dat je het zegt. Sommige dagen zijn zo.', low: true});
  expect(followUpLine({})).toBeNull();
});
test('no line uses a forbidden word, quotes a note or has more than one "!"', () => {
  const lines: string[] = [NOTE_SAVED.en, NOTE_SAVED.nl];
  for (const personality of ['calm', 'cheerful', 'direct'] as const) for (const lang of ['en', 'nl'] as const) for (const energy of [null, 1, 2, 3, 4, 5]) for (const mood of [null, 1, 2, 3, 4, 5]) {
    const f = followUpLine({energy, mood, personality, lang}); if (f) lines.push(f.line);
  }
  for (const line of lines) {
    for (const word of [...FORBIDDEN.en, ...FORBIDDEN.nl]) expect(line.toLowerCase().includes(word), `${line} / ${word}`).toBe(false);
    expect((line.match(/!/g) ?? []).length).toBeLessThanOrEqual(1);
  }
});
test('the mascot moment: empathetic on a low day; the first ever and the totals celebrate once; a day\'s first save is noted', () => {
  expect(checkinMoment({days: 1, seen: {}, firstSaveToday: true, low: true})).toEqual({signal: 'hint_empathetic', validated: false});
  expect(checkinMoment({days: 1, seen: {}, firstSaveToday: true, low: false})).toEqual({signal: 'achievement_unlocked', ledgerId: 'checkin:first', validated: true});
  expect(checkinMoment({days: 7, seen: {'checkin:first': '2026-10-01'}, firstSaveToday: true, low: false})).toEqual({signal: 'achievement_unlocked', ledgerId: 'checkin-total:7', validated: true});
  expect(checkinMoment({days: 7, seen: {'checkin:first': '2026-10-01', 'checkin-total:7': '2026-10-07'}, firstSaveToday: false, low: false})).toBeNull();
  expect(checkinMoment({days: 8, seen: {'checkin:first': '2026-10-01'}, firstSaveToday: true, low: false})).toEqual({signal: 'health_log_recorded', validated: true});
});
