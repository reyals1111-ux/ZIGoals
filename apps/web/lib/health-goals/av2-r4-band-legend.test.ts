import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ChartLegend} from '../../components/charts/chart-kit';
import {BAND_LEGEND} from '../../components/health/weight-trend';

/** Session AV lane 2 (health r4; review B4E-11): the weight band's legend key is its own shaded swatch, not a line. */
describe('the weight band in the trend’s legend', () => {
  test('a shaded swatch with the band’s fill, beside the line key of the trend', () => {
    const html = renderToStaticMarkup(createElement(ChartLegend, {items: [{label: 'Trend (smoothed)'}, BAND_LEGEND]}));
    expect(html.match(/chart-key-line/g)).toHaveLength(1);
    expect(html).toContain('r4-band-key');
    expect(html).toMatch(/<rect[^>]*opacity="0.12"/);
    expect(html).toContain('Your band');
  });
});
