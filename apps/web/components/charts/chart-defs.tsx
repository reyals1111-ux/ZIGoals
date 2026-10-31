import {useId} from 'react';
import './chart-look.css';

/**
 * Session AK (F6): the upgraded chart language, opt-in for the new charts (the debt planner, measurement trends, the
 * financial freedom model). It builds on chart-kit (the same guides, axes, labels, legends and tables): each line gets a
 * gradient stroke and one soft glow, a band a soft vertical wash. Use: `const look = useChartLook()`, give the <svg> the
 * class `zg-chart` (and `data-pillar`), put `<ChartLookDefs id={look.id} width height/>` first inside it, then
 * `style={{stroke: look.stroke('a')}} filter={look.glow}` on a line. The colours are tokens in chart-look.css (by day
 * each takes its ink twin, so lines keep their contrast on white); series stay told apart by their dash patterns as well.
 * Gradients and the glow are in user space, so a flat line (a zero-height box) still draws.
 */
export type ChartSeries = 'a' | 'b' | 'band';
export function useChartLook() {
  const id = `zgc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return {id, stroke: (series: ChartSeries) => `url(#${id}-${series})`, glow: `url(#${id}-glow)`};
}
export function ChartLookDefs({id, width, height}: {id: string; width: number; height: number}) {
  return <defs>
    <linearGradient id={`${id}-a`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0"><stop offset="0" className="zgc-a0"/><stop offset=".55" className="zgc-a1"/><stop offset="1" className="zgc-a2"/></linearGradient>
    <linearGradient id={`${id}-b`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0"><stop offset="0" className="zgc-b0"/><stop offset="1" className="zgc-b1"/></linearGradient>
    <linearGradient id={`${id}-band`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={height}><stop offset="0" className="zgc-band0"/><stop offset="1" className="zgc-band1"/></linearGradient>
    <filter id={`${id}-glow`} filterUnits="userSpaceOnUse" x="0" y="0" width={width} height={height} colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .6 0" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>;
}
