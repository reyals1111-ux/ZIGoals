import {createElement, Fragment} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, test} from 'vitest';
import {keepWords} from '../../components/today/keep-words';
import {gridPlanet, rowScale} from '../../components/universe/universe-scene';
import type {Planet} from '../universe/model';

/** Session AF Gate C design review: words that must not break at their hyphen, and planets that stay in their pictures. */
const html = (text: string, phrases?: string[]) => renderToStaticMarkup(createElement(Fragment, null, keepWords(text, phrases)));
const textOf = (markup: string) => markup.replace(/<[^>]+>/g, '');

describe('keepWords', () => {
  test('a hyphenated word is kept on one line; the text itself is unchanged', () => {
    const out = html('8 habits held a 7-day streak and 10 check-ins');
    expect(out).toBe('8 habits held a <span style="white-space:nowrap">7-day</span> streak and 10 <span style="white-space:nowrap">check-ins</span>');
    expect(textOf(out)).toBe('8 habits held a 7-day streak and 10 check-ins');
  });
  test('a given phrase is kept together; text with nothing to keep comes back as it was', () => {
    expect(html('MARKETS THAT MATTER TO YOU', ['TO YOU'])).toBe('MARKETS THAT MATTER <span style="white-space:nowrap">TO YOU</span>');
    expect(keepWords('Seven in a row')).toBe('Seven in a row');
  });
});

describe('planet sizes', () => {
  const planet = (over: Partial<Planet>): Planet => ({pillar: 'habits', label: 'Habits', rings: 2, faintRings: 0, moons: 1, lit: false, light: 0, staked: false, facts: [], lightLine: '', ...over}) as Planet;
  test("Today's row: many rings, faint ones too, shrink the planet so its outermost ring stays within 36 of the picture's 40", () => {
    expect(rowScale(planet({rings: 2}), 11)).toBe(1);
    const p = planet({rings: 5, faintRings: 2, moons: 8, lit: true}), r = Math.min(16, 9 + p.rings), outer = r + 7 + 6 * 4.2;
    expect(rowScale(p, r) * outer).toBeCloseTo(36, 5);
  });
  test("Journey's phone grid: half as large again, never past 62 of its cell's centre; its reach places the name below it", () => {
    const small = gridPlanet(planet({rings: 1, moons: 0}));
    expect(small.scale).toBe(1.5);
    const big = gridPlanet(planet({rings: 9, faintRings: 4, moons: 8, lit: true}));
    expect(big.scale).toBeLessThan(1.5);
    expect(big.reach).toBeGreaterThan(small.reach);
    expect(big.reach).toBeLessThanOrEqual(62);
  });
});
