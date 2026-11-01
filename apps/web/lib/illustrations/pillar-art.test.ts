import type {ComponentProps} from 'react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import PillarArt from '../../components/illustrations/pillar-art';
import {MOTIFS, type ArtPillar} from '../../components/illustrations/motifs';
import {ChartLookDefs} from '../../components/charts/chart-defs';
import {EmptyState} from '../../components/ui/empty-state';
import {Skeleton} from '../../components/ui/skeleton';
import {ArtNote} from '../../components/illustrations/art-note';

/**
 * Session AK (F6): the pillar illustrations are decoration (hidden from assistive technology, never focusable), carry no
 * colour of their own (every colour is a theme token in pillar-art.css, so Nebula, Light and Dark cannot break them),
 * keep their ids unique per instance, and stay small. The chart language's defs follow the same colour rule.
 */
const PILLARS = Object.keys(MOTIFS) as ArtPillar[];
const HEX = /#[0-9a-f]{3,8}\b/i, NAMED = /\b(?:fill|stroke|stop-color|flood-color)="(?!url\(|none)/;
const dir = join(__dirname, '..', '..', 'components', 'illustrations');

describe('pillar illustrations', () => {
  it('cover the four pillars and the cross-pillar orbit', () => {
    expect(PILLARS.sort()).toEqual(['goals', 'habits', 'health', 'orbit', 'wealth']);
  });
  it.each(PILLARS)('%s renders hidden from assistive technology, with no hard-coded colour', pillar => {
    const html = renderToStaticMarkup(createElement(PillarArt, {pillar, size: 96}));
    expect(html).toMatch(/^<svg class="pillar-art" data-pillar="[a-z]+" viewBox="0 0 120 96" width="96" height="77" aria-hidden="true" focusable="false">/);
    expect(html).toContain(`data-pillar="${pillar}"`);
    expect(html).not.toMatch(HEX);
    expect(html).not.toMatch(NAMED);
    expect(html).not.toMatch(/\b(?:rgb|hsl)a?\(/);
    expect(html).not.toMatch(/<(?:title|desc|text)\b|role=|tabindex/);
  });
  it('gives each instance its own gradient ids', () => {
    const html = renderToStaticMarkup(createElement('div', null, createElement(PillarArt, {pillar: 'goals'}), createElement(PillarArt, {pillar: 'goals'})));
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    expect(ids.length).toBe(6);
    expect(new Set(ids).size).toBe(6);
    for (const [, ref] of html.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref);
  });
  it('stays small: each source file is at most 3 KB, and its stylesheet names only tokens', () => {
    for (const file of ['pillar-art.tsx', 'motifs.tsx', 'lazy-pillar-art.tsx', 'pillar-art.css', 'placement.css', 'empty-art.tsx', 'art-note.tsx']) expect(readFileSync(join(dir, file)).byteLength, file).toBeLessThanOrEqual(3072);
    const css = readFileSync(join(dir, 'pillar-art.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(HEX);
    expect(css).not.toMatch(/\b(?:white|black)\b|\b(?:rgb|hsl)a?\(/);
  });
  it('loads lazily wherever it is used', () => {
    expect(readFileSync(join(dir, 'lazy-pillar-art.tsx'), 'utf8')).toContain("lazy(() => import('./pillar-art'))");
  });
});

describe('chart look', () => {
  it('draws its gradients and glow in user space with no hard-coded colour', () => {
    const html = renderToStaticMarkup(createElement('svg', null, createElement(ChartLookDefs, {id: 'c', width: 300, height: 150})));
    expect(html).toContain('id="c-a" gradientUnits="userSpaceOnUse"');
    expect(html).toContain('id="c-glow" filterUnits="userSpaceOnUse" x="0" y="0" width="300" height="150"');
    expect(html).not.toMatch(HEX);
    const css = readFileSync(join(__dirname, '..', '..', 'components', 'charts', 'chart-look.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toMatch(HEX);
  });
});

/**
 * Session AK (G3): the visual system across the app. Every EmptyState carries its pillar illustration unless it opts out;
 * one-line empty states mount it through ArtNote; every placeholder wears the sheen; the charts brought into the one chart
 * look draw their main line from its tokens (no hand-typed stop colours); and the CSS that G3 added names theme tokens only.
 */
const web = join(__dirname, '..', '..');
const read = (file: string) => readFileSync(join(web, file), 'utf8');
describe('G3 visual system', () => {
  it('gives every EmptyState its art (marked data-art) unless it says art={false}', () => {
    const on = renderToStaticMarkup(createElement(EmptyState, {title: 'Nothing yet'}));
    expect(on).toContain('<div class="aa-empty empty-state" data-art="">');
    const off = renderToStaticMarkup(createElement(EmptyState, {title: 'Nothing yet', art: false}));
    expect(off).not.toContain('data-art');
  });
  it('wraps a one-line empty state with the art beside it', () => {
    const html = renderToStaticMarkup(createElement(ArtNote, {pillar: 'health'} as ComponentProps<typeof ArtNote>, createElement('p', null, 'No readings yet.')));
    expect(html).toMatch(/^<div class="pillar-art-inline pillar-art-note"><p>No readings yet\.<\/p>(?:<svg class="pillar-art" data-pillar="health" viewBox="0 0 120 96" width="64" [^]*<\/svg>)?<\/div>$/);
  });
  it('puts the sheen on every placeholder, the page one included', () => {
    expect(renderToStaticMarkup(createElement(Skeleton, {label: 'Opening…'}))).toMatch(/^<div class="aa-skeleton zg-skeleton" role="status"/);
    const page = renderToStaticMarkup(createElement(Skeleton, {label: 'Opening…', page: true}));
    expect(page.match(/class="aa-skeleton(?!-page)[^"]*"/g)!.every(c => c.includes('zg-skeleton'))).toBe(true);
  });
  const CHARTS = ['components/wealth/wealth-history-chart.tsx', 'components/wealth/money-tools/fee-drag-panel.tsx', 'components/platform/price-chart.tsx', 'components/platform/evidence-chart.tsx', 'components/portfolio/value-chart.tsx', 'components/goals/goal-forecast.tsx', 'components/health/weight-trend.tsx', 'components/health/measurements-aa.tsx', 'components/health/health-highlights.tsx', 'components/health/sleep/sleep-charts.tsx', 'components/sleep/energy-curve.tsx', 'components/chess/rating-chart.tsx', 'components/calculator/calculator-chart.tsx', 'components/ai/data-viz.tsx'];
  it.each(CHARTS)('%s uses the one chart look', file => {
    const src = read(file);
    expect(src).toContain('useChartLook()');
    expect(src).toContain('<ChartLookDefs');
    expect(src).not.toMatch(/<ChartDefs\b/);
  });
  it.each(CHARTS.filter(f => !f.includes('calculator')))('%s draws its main line without hand-typed stop colours', file => {
    expect(read(file)).not.toMatch(/stopColor="#(?:23eaff|45d8ef|9273ff)"/i);
  });
  it('draws the purpose flow at its measured width, so its labels are a true 14 px (R30)', () => {
    const src = read('components/wealth/allocation/purpose-flow.tsx');
    expect(src).toContain('useChartWidth(');
    expect(src).toMatch(/width=\{width\} height=\{height\}/);
    expect(read('components/wealth/allocation/allocation.css')).toMatch(/svg\.zg-chart \.purpose-value\{[^}]*font-size:14px/);
  });
  const G3_CSS = ['app/app/goals/collection.css', 'components/habits/habits-aa.css', 'components/health/health-aa.css', 'components/platform/wealth-product.css', 'components/life-review/life-review.css', 'components/earn/earn.css', 'components/journal/journal.css', 'components/chess/chess.css', 'components/music/music-mix.css', 'components/help/help.css', 'components/life-pages.css', 'components/dashboard/dashboard.css', 'components/ai/chat-polish.css'];
  it.each(G3_CSS)('%s: the richer cards name theme tokens only', file => {
    const css = read(file), at = css.lastIndexOf('Session AK (G3)');
    expect(at, 'G3 block present').toBeGreaterThanOrEqual(0);
    const block = css.slice(at).replace(/\/\*[\s\S]*?\*\//g, '');
    expect(block).not.toMatch(HEX);
    expect(block).not.toMatch(/\b(?:white|black)\b|\b(?:rgb|hsl)a?\(/);
    expect(block).toMatch(/@media \(hover: ?hover\) and \(pointer: ?fine\)|forced-colors/);
  });
  it('placement.css names no colour at all', () => {
    expect(read('components/illustrations/placement.css').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(|\b(?:white|black)\b/i);
  });
});
