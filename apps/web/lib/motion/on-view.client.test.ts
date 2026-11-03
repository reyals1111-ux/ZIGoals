// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {drawStroke} from '../../components/motion/on-view';

const SVG = 'http://www.w3.org/2000/svg';
/** A chart line that jsdom can measure and animate: animate() is recorded, getTotalLength() reports 300. */
function line(attributes: Record<string, string> = {}) {
  const svg = document.createElementNS(SVG, 'svg'), path = document.createElementNS(SVG, 'path');
  for (const [k, v] of Object.entries(attributes)) path.setAttribute(k, v);
  path.setAttribute('class', 'zgc-line'); path.setAttribute('d', 'M0 0L300 0');
  const animate = vi.fn();
  Object.assign(path, {animate, getAnimations: () => [], getTotalLength: () => 300});
  svg.appendChild(path); document.body.appendChild(svg);
  return {path, animate};
}
afterEach(() => { document.body.innerHTML = ''; });

describe('drawStroke (Session AK M1)', () => {
  it('draws a plain chart line on its measured length', () => {
    const {path, animate} = line();
    drawStroke(path);
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.calls[0]![0]).toEqual([{strokeDasharray: '300 300', strokeDashoffset: '300'}, {strokeDasharray: '300 300', strokeDashoffset: '0'}]);
  });
  it('leaves a line with its own pathLength to its chart (Wealth over time draws it on data-entrance=once)', () => {
    const {path, animate} = line({pathLength: '1'});
    drawStroke(path);
    expect(animate).not.toHaveBeenCalled();
  });
});
