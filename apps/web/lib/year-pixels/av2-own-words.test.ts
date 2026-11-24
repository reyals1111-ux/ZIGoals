import {describe, expect, test, vi} from 'vitest';
import {levelWord, pixelLabel, pixelYear} from './grid';
import {drawPixels} from '../../components/journal/year-pixels-export';
import {readMoodLook} from '../daylio/rule';

/** Session AV lane 2 (rest, LEDGER #178; Daylio's custom moods): the Year in pixels speaks in the person's own mood words. */
const OWN = ['Wrecked', 'Meh', 'Fine', 'Bright', 'Glowing'];
const src = {moods: {'2026-03-03': {mood: 4}, '2026-03-04': {mood: 1}}};

describe('the Year in pixels in your own mood words', () => {
  test('the year sentence and each square’s title; energy keeps its own words; a blank word falls back to the app’s', () => {
    const grid = pixelYear(2026, '2026-11-22', 'mood', src, OWN);
    expect(grid.summary).toBe('2026: 2 days with a mood rating. Wrecked 1, Meh 0, Fine 0, Bright 1, Glowing 0.');
    const day = grid.weeks.flat().find(p => p.date === '2026-03-03')!;
    expect(pixelLabel(day, 'mood', OWN)).toBe('Tue, Mar 3, 2026: mood Bright, 4 of 5');
    expect(pixelYear(2026, '2026-11-22', 'mood', src).summary).toBe('2026: 2 days with a mood rating. Hard 1, Low 0, Okay 0, Good 1, Great 0.');
    expect(pixelLabel(day, 'mood')).toBe('Tue, Mar 3, 2026: mood Good, 4 of 5');
    expect([levelWord('energy', 4, OWN), levelWord('mood', 2, ['A', ' ', 'C']), levelWord('mood', 5, OWN)]).toEqual([levelWord('energy', 4), 'Low', 'Glowing']);
    // The device's look gives the app's words when none are set, so the default reads as before.
    expect(pixelYear(2026, '2026-11-22', 'mood', src, readMoodLook(null).words).summary).toBe(pixelYear(2026, '2026-11-22', 'mood', src).summary);
  });
  test('the saved image’s key uses them too', () => {
    const texts: string[] = [];
    const ctx = new Proxy({}, {get: (_t, k) => k === 'fillText' ? (text: string) => { texts.push(text); } : k === 'measureText' ? () => ({width: 10}) : () => undefined, set: () => true});
    const canvas = {width: 0, height: 0, getContext: vi.fn(() => ctx)} as unknown as HTMLCanvasElement;
    drawPixels(canvas, pixelYear(2026, '2026-11-22', 'mood', src, OWN), 'mood', 2026, OWN);
    expect(texts).toEqual(expect.arrayContaining(['Wrecked 1', 'Bright 1', 'Glowing 0']));
    expect(texts.join(' ')).not.toMatch(/\bGood\b|\bHard\b/);
  });
});
