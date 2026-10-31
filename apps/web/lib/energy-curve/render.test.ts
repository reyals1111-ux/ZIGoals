import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import EnergyCurve from '../../components/sleep/energy-curve';
import {emptySleep} from '../sleep/schema';
import {showcaseSleep} from '../sleep/showcase';
import {instantAt} from '../zone-time';

const TODAY = '2026-10-31';
describe('the energy curve card (Session AK lane S, item 9)', () => {
  test('an honest empty state without a night', () => {
    const html = renderToStaticMarkup(createElement(EnergyCurve, {sleep: emptySleep(), today: TODAY, now: Date.parse(`${TODAY}T10:00:00Z`), zone: 'UTC'}));
    expect(html).toContain('Log a night');
    expect(html).not.toContain('<svg');
  });
  test('the curve, its three windows in words, and "an estimate … not a measurement"', () => {
    const html = renderToStaticMarkup(createElement(EnergyCurve, {sleep: showcaseSleep(TODAY), today: TODAY, now: instantAt(TODAY, '10:00', 'Europe/Brussels'), zone: 'Europe/Brussels'}));
    expect(html).toContain('An estimate from your sleep times, not a measurement.');
    expect(html).toMatch(/role="img" aria-label="An estimate from your sleep times: a good focus window/);
    for (const words of ['Good focus window', 'Likely dip', 'Suggested bedtime', 'Why?']) expect(html).toContain(words);
    expect(html).toContain('energy-curve-now');
  });
});
