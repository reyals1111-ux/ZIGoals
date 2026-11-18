import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {TrendArea} from '../../../components/nova/cards/kit';

// Session AS follow-up (owner, ADR-042 carried 1–5, 8, 9): the honest drawings.
const here = (p: string) => readFileSync(join(process.cwd(), 'apps/web', p), 'utf8');
describe('a trend breaks where nothing was logged (carried 2)', () => {
  const values = [5, 6, null, null, 7, 8, 9, null, 4];
  it('with gaps: one line per run of logged days, a lone day as a dot, nothing joined across a gap', () => {
    const html = renderToStaticMarkup(createElement(TrendArea, {values, gaps: true}));
    const line = /class="nc-trend-line[^"]*"[^>]*d="([^"]+)"/.exec(html)?.[1] ?? '';
    expect(line.match(/M/g)?.length).toBe(2); // [5,6] and [7,8,9]; the lone last day is the lead marker
    expect(html).not.toContain('nc-trend-dot'); // the only lone day is the latest, which the marker shows
    const lone = renderToStaticMarkup(createElement(TrendArea, {values: [5, null, 6, 7, null, 8], gaps: true}));
    expect(lone.match(/class="nc-trend-dot"/g)?.length).toBe(1); // the first day stands alone
  });
  it('without gaps (the older widgets): one line through every logged day, as before', () => {
    const html = renderToStaticMarkup(createElement(TrendArea, {values}));
    expect((/class="nc-trend-line[^"]*"[^>]*d="([^"]+)"/.exec(html)?.[1] ?? '').match(/M/g)?.length).toBe(1);
  });
  it('the answer trends ask for gaps', () => {
    expect(here('components/nova/cards/ax/health-trend.tsx')).toMatch(/<TrendArea [^\n]*\bgaps\/>/);
  });
});
describe('scales said and drawn from zero (carried 4, 5, 9)', () => {
  it('the net worth river is measured from zero, and says so', () => {
    const src = here('components/nova/widgets/net-worth-river.tsx');
    expect(src).toContain('Math.max(0, d.value) / hi');
    expect(src).toContain('thickness from zero');
    expect(src).not.toMatch(/0\.3 \+ 0\.7/);
  });
  it('each life-radar spoke says what its end stands for; the focus gauge says its full arc', () => {
    expect(here('lib/nova/cards/ax/day-life.ts')).toMatch(/full: 'full: 100%'/);
    expect(here('components/nova/cards/ax/day-radar.tsx')).toContain('axd-radar-scale');
    expect(here('components/nova/widgets/focus-gauge.tsx')).toContain('Full arc: ');
  });
  it('a legend says "+N more" for the rows its height cap hides; the cap never hides that line (carried 1)', () => {
    const kit = here('components/nova/cards/ax/money-kit.tsx'), css = here('components/nova/cards/ax/money.css');
    expect(kit).toContain("getComputedStyle(r).display === 'none'");
    expect(css).not.toMatch(/\.axm-legend > li:nth-child/);
    expect(css).toMatch(/\.axm-legend > li\.axm-legend-row:nth-child\(n\+4\)/);
  });
});
