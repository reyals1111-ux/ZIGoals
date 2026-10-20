import {describe, expect, it} from 'vitest';
import {fold, render} from './parity-report.mjs';
import {classify, compare, flips} from '../apps/web/tests/parity/classify.ts';

// Session AF (L5a, Part 10.13, ADR-028 H75): the parity classifier and its report.
const item = (props, over = {}) => ({path: '0.1', desc: 'div.card', text: false, clip: false, art: false, ground: false, bar: false, svgText: false, props, box: [0, 0, 100, 40], ...over});

describe('what may differ between themes', () => {
  it('a word’s colour; a neutral or night surface; never a coloured fill, glow or gradient stop', () => {
    expect(classify('color', item({color: 'rgb(240, 245, 255)'}), item({color: 'rgb(20, 24, 33)'}))).toBe('text');
    expect(classify('background-color', item({'background-color': 'rgb(13, 22, 41)'}), item({'background-color': 'rgb(240, 242, 246)'}))).toBe('neutral');
    expect(classify('background-color', item({'background-color': 'rgb(38, 32, 74)'}), item({'background-color': 'rgb(245, 244, 250)'}))).toBe('neutral'); // a night panel with a tint
    expect(classify('background-color', item({'background-color': 'rgb(35, 234, 255)'}), item({'background-color': 'rgb(0, 120, 140)'}))).toBe('DISALLOWED');
    expect(classify('background-image', item({'background-image': 'linear-gradient(rgb(35, 234, 255), rgb(146, 115, 255))'}), item({'background-image': 'linear-gradient(rgb(35, 234, 255), rgb(120, 100, 220))'}))).toBe('DISALLOWED');
    expect(classify('box-shadow', item({'box-shadow': 'rgba(0, 207, 255, 0.14) 0px 0px 15px 0px'}), item({'box-shadow': 'none'}))).toBe('DISALLOWED');
    // a neutral shade may be softened, added or left out
    expect(classify('box-shadow', item({'box-shadow': 'none'}), item({'box-shadow': 'rgba(29, 33, 74, 0.08) 0px 1px 2px 0px'}))).toBe('neutral');
  });
  it('a line or paint drawn in the element’s own word colour follows the word', () => {
    const n = item({color: 'rgb(35, 234, 255)', 'border-top-color': 'rgb(35, 234, 255)'}), l = item({color: 'rgb(16, 108, 118)', 'border-top-color': 'rgb(16, 108, 118)'});
    expect(classify('border-top-color', n, l)).toBe('text');
  });
  it('opacity and filter only on the named art layers; the page’s ground; the theme bar; generated ids are no difference', () => {
    expect(classify('opacity', item({opacity: '1'}, {art: true}), item({opacity: '0.08'}, {art: true}))).toBe('art-calm');
    expect(classify('opacity', item({opacity: '1'}), item({opacity: '0.5'}))).toBe('DISALLOWED');
    expect(classify('background-image', item({'background-image': 'none'}, {ground: true}), item({'background-image': 'linear-gradient(rgb(247, 247, 251), rgb(2, 9, 24))'}, {ground: true}))).toBe('neutral');
    expect(classify('background-color', item({'background-color': 'rgb(35, 234, 255)'}, {bar: true}), item({'background-color': 'rgb(1, 2, 3)'}, {bar: true}))).toBe('theme-bar');
    expect(compare([item({fill: 'url("#_r_1_-sky")'})], [item({fill: 'url("#_r_9_-sky")'})]).diffs).toEqual([]);
  });
  it('the sidebar sky: the dawn stars and a night veil are its calm; the stars’ place and size are not', () => {
    const night = 'url("/art/v24/sidebar-stars.svg"), linear-gradient(0deg, rgb(3, 10, 27) 0px, rgb(2, 9, 22) 930px), none';
    const dawn = 'url("/art/v24/sidebar-stars-dawn.svg"), linear-gradient(0deg, rgb(6, 10, 29) 0px, rgb(138, 118, 194) 398px, rgb(240, 235, 253) 930px), none';
    const veil = 'linear-gradient(rgba(5, 8, 21, 0.62), rgba(5, 8, 21, 0.62)), url("/art/v24/sidebar-stars.svg"), linear-gradient(0deg, rgb(3, 5, 14) 0px, rgb(8, 12, 34) 930px), none';
    expect(classify('background-image', item({'background-image': night}, {art: true}), item({'background-image': dawn}, {art: true}))).toBe('art-calm');
    expect(classify('background-image', item({'background-image': night}, {art: true}), item({'background-image': veil}, {art: true}))).toBe('art-calm');
    expect(classify('background-image', item({'background-image': night}, {art: true}), item({'background-image': night.replace('sidebar-stars.svg', 'other.svg')}, {art: true}))).toBe('DISALLOWED');
  });
  it('by day a gradient word’s coloured stops may take deeper shades of the same hues, at least 4.5:1 on white (H130)', () => {
    const word = (stops, over = {}) => item({'background-image': `linear-gradient(100deg, rgb(20, 24, 33) 42%, ${stops})`, color: 'rgb(20, 24, 33)'}, {clip: true, ...over});
    const nebula = word('rgb(111, 230, 246) 72%, rgb(143, 166, 255) 84%');
    expect(classify('background-image', nebula, word('rgb(20, 119, 130) 72%, rgb(84, 103, 186) 84%'))).toBe('gradient-word');
    // by day only (Gate C test audit): the same deeper stops in Dark are a difference Dark may not have
    expect(classify('background-image', nebula, word('rgb(20, 119, 130) 72%, rgb(84, 103, 186) 84%'), 'dark')).toBe('DISALLOWED');
    expect(classify('background-image', nebula, word('rgb(20, 119, 130) 72%, rgb(84, 103, 186) 84%'), 'light')).toBe('gradient-word');
    // another hue, a lighter shade, a shade still below 4.5:1, a fill that is not a word, a moved stop: all disallowed
    expect(classify('background-image', nebula, word('rgb(138, 84, 181) 72%, rgb(84, 103, 186) 84%'))).toBe('DISALLOWED');
    expect(classify('background-image', word('rgb(20, 119, 130) 72%, rgb(84, 103, 186) 84%'), nebula)).toBe('DISALLOWED');
    expect(classify('background-image', nebula, word('rgb(60, 170, 185) 72%, rgb(84, 103, 186) 84%'))).toBe('DISALLOWED');
    expect(classify('background-image', item({'background-image': 'linear-gradient(rgb(111, 230, 246), rgb(143, 166, 255))'}), item({'background-image': 'linear-gradient(rgb(20, 119, 130), rgb(84, 103, 186))'}))).toBe('DISALLOWED');
    expect(classify('background-image', nebula, word('rgb(20, 119, 130) 70%, rgb(84, 103, 186) 84%'))).toBe('DISALLOWED');
  });
  it('every box stays within half a pixel', () => {
    expect(compare([item({})], [item({}, {box: [0, 0.4, 100, 40]})]).diffs).toEqual([]);
    expect(compare([item({})], [item({}, {box: [0, 30, 100, 40]})]).diffs[0]).toMatchObject({prop: 'box', klass: 'DISALLOWED'});
    expect(compare([item({}), item({}, {path: '0.2'})], [item({})]).mismatch).toMatch(/1 unmatched/);
  });
  it('neutral is chroma below 0.07; night is lightness below 0.40 with chroma below 0.14; transparent is neutral', () => {
    expect(flips('rgb(13, 22, 41)')).toBe(true);
    expect(flips('rgba(0, 0, 0, 0)')).toBe(true);
    expect(flips('rgb(35, 234, 255)')).toBe(false);
    expect(flips('rgb(74, 31, 176)')).toBe(false); // deep and saturated: a colour
    expect(flips('oklch(0.3 0.1 280)')).toBe(true);
  });
});

describe('the parity report', () => {
  const files = [{route: '/app', state: 'showcase', project: 'desktop', elements: 900, results: [{theme: 'light', counts: {text: 10, neutral: 3}, mismatch: null, disallowed: []}, {theme: 'dark', counts: {neutral: 2, DISALLOWED: 1}, mismatch: null, disallowed: [{desc: 'a.chip', path: '0.4', prop: 'background-color', nebula: 'rgb(35, 234, 255)', other: 'rgb(0, 0, 0)'}]}]}];
  it('counts every class per row and lists every disallowed difference', () => {
    const folded = fold(files), md = render(folded, 'test');
    expect(folded.rows).toHaveLength(2);
    expect(folded.disallowed).toHaveLength(1);
    expect(md).toContain('| /app | showcase | desktop | dark | 900 | 0 | 2 | 0 | 0 | 0 | 1 |');
    expect(md).toContain('/app · showcase · desktop · `a.chip` [0.4] · background-color');
    expect(render(fold([{...files[0], results: [files[0].results[0]]}]))).toContain('## Disallowed differences\n\nNone.');
  });
});
