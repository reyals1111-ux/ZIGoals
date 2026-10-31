import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import PillarArt from '../../components/illustrations/pillar-art';
import {MOTIFS, type ArtPillar} from '../../components/illustrations/motifs';
import {ChartLookDefs} from '../../components/charts/chart-defs';

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
    for (const file of ['pillar-art.tsx', 'motifs.tsx', 'lazy-pillar-art.tsx', 'pillar-art.css', 'placement.css']) expect(readFileSync(join(dir, file)).byteLength, file).toBeLessThanOrEqual(3072);
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
