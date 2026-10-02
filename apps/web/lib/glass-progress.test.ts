// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {GlassBar, GlassRing, GlassSegments, glassShare, nebulaVector} from '../components/progress/glass-progress';
import {ProgressRing} from '../components/platform/financial-ui';
import {ASSET_COLORS} from './wealth';

// Session I, Part 3: the shared liquid-glass bar and ring.
const dom = (html: string) => { const host = document.createElement('div'); host.innerHTML = html; return host; };

describe('glassShare', () => {
  it('keeps a share inside 0–1 and draws anything unknown as empty', () => {
    expect([0.42, 1.5, -0.2, 1, 0].map(glassShare)).toEqual([0.42, 1, 0, 1, 0]);
    for (const value of [NaN, Infinity, -Infinity, null, undefined]) expect(glassShare(value)).toBe(0);
  });
});

describe('GlassBar', () => {
  it('carries the clamped value for the fill and the glow, and keeps the caller\'s role and ARIA', () => {
    const host = dom(renderToStaticMarkup(createElement(GlassBar, {identity: 'bar', value: 1.8, className: 'pace-track', fillClassName: 'pace-fill', role: 'progressbar', 'aria-valuenow': 9, 'aria-valuemax': 5})));
    const track = host.firstElementChild as HTMLElement;
    expect(track.className).toBe('glass-track pace-track');
    expect(track.style.getPropertyValue('--glass-value')).toBe('1');
    expect(track.getAttribute('role')).toBe('progressbar');expect(track.getAttribute('aria-valuenow')).toBe('9');
    expect(track.querySelector('.glass-fill-clip>.glass-fill.pace-fill')).not.toBeNull();
    expect(track.querySelector('.glass-fill-glow')?.getAttribute('aria-hidden')).toBe('true');
    expect(track.hasAttribute('data-empty')).toBe(false);
  });
  it('marks an empty bar, which hides its glow', () => {
    const track = dom(renderToStaticMarkup(createElement(GlassBar, {identity: 'bar', value: 0}))).firstElementChild!;
    expect(track.hasAttribute('data-empty')).toBe(true);
  });
  it('fills from the bottom when vertical', () => {
    expect(dom(renderToStaticMarkup(createElement(GlassBar, {identity: 'bar', value: .3, vertical: true}))).firstElementChild!.getAttribute('data-axis')).toBe('y');
  });
});

describe('GlassSegments', () => {
  it('places each segment after the one before, never past the end, with a divider at each inner boundary', () => {
    const host = dom(renderToStaticMarkup(createElement(GlassSegments, {identity: 'mix', segments: [{key: 'a', share: .25, className: 'nutrition-meal-0'}, {key: 'b', share: 0}, {key: 'c', share: .5, color: '#123456'}, {key: 'd', share: .5}]})));
    const segments = [...host.querySelectorAll<HTMLElement>('.glass-segment')].map(s => [s.style.getPropertyValue('--glass-start'), s.style.getPropertyValue('--glass-size')]);
    expect(segments).toEqual([['0', '0.25'], ['0.25', '0'], ['0.25', '0.5'], ['0.75', '0.25']]);
    expect(host.querySelector<HTMLElement>('.glass-segment:nth-child(3)')!.style.getPropertyValue('--glass-ink')).toBe('#123456');
    expect([...host.querySelectorAll<HTMLElement>('.glass-divider')].map(d => d.style.getPropertyValue('--glass-at'))).toEqual(['0.25', '0.75']);
  });
});

describe('GlassRing', () => {
  it('draws each arc from the top to its end by dashoffset, longest first so shorter arcs sit in front', () => {
    const host = dom(renderToStaticMarkup(createElement(GlassRing, {identity: 'ring', arcs: [{key: 'a', end: 20, color: '#00ff00'}, {key: 'b', end: 45, color: '#0000ff'}, {key: 'zero', end: 0}]})));
    const arcs = [...host.querySelectorAll<SVGElement>('.glass-ring-arc')];
    expect(arcs.map(a => [a.getAttribute('stroke'), a.style.strokeDashoffset, a.getAttribute('pathLength')])).toEqual([['#0000ff', '55', '100'], ['#00ff00', '80', '100']]);
    expect(host.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });
  it('fills a single arc with its own nebula gradient and marks a ring with nothing to draw', () => {
    const one = dom(renderToStaticMarkup(createElement(GlassRing, {identity: 'ring', arcs: [{key: 'p', end: 30}]})));
    const id = one.querySelector('linearGradient')!.id;
    expect(one.querySelector('.glass-ring-arc')!.getAttribute('stroke')).toBe(`url(#${id})`);
    expect(one.firstElementChild!.hasAttribute('data-empty')).toBe(false);
    expect(dom(renderToStaticMarkup(createElement(GlassRing, {identity: 'ring', arcs: []}))).firstElementChild!.hasAttribute('data-empty')).toBe(true);
  });
  it('runs the nebula from the arc start to its end up to half a ring, then across the ring', () => {
    expect(nebulaVector(25)).toEqual({x1: '100%', y1: '50%', x2: '50%', y2: '100%'});
    expect(nebulaVector(50)).toEqual({x1: '100%', y1: '50%', x2: '0%', y2: '50%'});
    expect(nebulaVector(90)).toEqual(nebulaVector(50));
  });
});

describe('ProgressRing on the glass ring', () => {
  it('keeps role, exact value and label, and draws one nebula arc to the value', () => {
    const ring = dom(renderToStaticMarkup(createElement(ProgressRing, {percent: '45.2', label: 'Home progress'}))).firstElementChild as HTMLElement;
    expect(ring.className).toBe('glass-ring flow-ring');
    expect([ring.getAttribute('role'), ring.getAttribute('aria-valuenow'), ring.getAttribute('aria-label')]).toEqual(['progressbar', '45.2', 'Home progress']);
    expect([...ring.querySelectorAll<SVGElement>('.glass-ring-arc')].map(a => a.style.strokeDashoffset)).toEqual(['54.8']);
    expect(ring.textContent).toBe('45%');
  });
  it('draws an asset mix as legend-coloured arcs that end together at the progress', () => {
    const ring = dom(renderToStaticMarkup(createElement(ProgressRing, {percent: '45', assetMix: [{assetClass: 'Stablecoins', value: '200', percent: 20, color: ASSET_COLORS.Stablecoins}, {assetClass: 'Cash', value: '250', percent: 25, color: ASSET_COLORS.Cash}]})));
    expect([...ring.querySelectorAll<SVGElement>('.glass-ring-arc')].map(a => [a.getAttribute('stroke'), a.style.strokeDashoffset])).toEqual([[ASSET_COLORS.Cash, '55'], [ASSET_COLORS.Stablecoins, '80']]);
  });
  it('shows an unknown value as unavailable with no arc, never as zero', () => {
    const ring = dom(renderToStaticMarkup(createElement(ProgressRing, {percent: null}))).firstElementChild!;
    expect(ring.getAttribute('role')).toBe('img');expect(ring.querySelectorAll('.glass-ring-arc')).toHaveLength(0);expect(ring.textContent).toBe('—');
  });
});
