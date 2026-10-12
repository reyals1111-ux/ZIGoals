'use client';
import {useId} from 'react';
import type {AreaBalance} from '../../lib/life-balance';

/**
 * G2's balance wheel: one wedge per life area. The wedge's coloured depth is the area's progress this month (the
 * average share of its goals and habits with a known value); its faint track is the whole wedge; an area with nothing
 * known shows only the track and says "no data yet". The legend beside it carries every number in words, so the
 * picture is never the only place a value lives. Static (no motion).
 */
export function BalanceWheel({areas, size = 220}: {areas: readonly AreaBalance[]; size?: number}) {
  const id = useId(), c = size / 2, r0 = size * 0.17, r1 = size * 0.47, n = Math.max(1, areas.length), gap = 0.035;
  const point = (r: number, a: number) => [c + r * Math.sin(a), c - r * Math.cos(a)] as const;
  const wedge = (i: number, outer: number) => {
    const a0 = (i / n) * Math.PI * 2 + gap, a1 = ((i + 1) / n) * Math.PI * 2 - gap, large = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = point(r0, a0), [x1, y1] = point(outer, a0), [x2, y2] = point(outer, a1), [x3, y3] = point(r0, a1);
    return `M${x0.toFixed(2)},${y0.toFixed(2)} L${x1.toFixed(2)},${y1.toFixed(2)} A${outer},${outer} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${x3.toFixed(2)},${y3.toFixed(2)} A${r0},${r0} 0 ${large} 0 ${x0.toFixed(2)},${y0.toFixed(2)} Z`;
  };
  const known = areas.filter(a => a.progress !== null), average = known.length ? known.reduce((t, a) => t + a.progress!, 0) / known.length : null;
  return <svg className="balance-wheel" viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-labelledby={`${id}-desc`}>
    <desc id={`${id}-desc`}>{areas.map(a => `${a.label}: ${a.progress === null ? 'no data yet' : `${Math.round(a.progress * 100)}%`}`).join('; ')}</desc>
    <defs><radialGradient id={`${id}-core`}><stop offset="0" stopColor="#1d2a52" /><stop offset="1" stopColor="#0b1428" /></radialGradient></defs>
    {areas.map((a, i) => <g key={a.id}>
      <path d={wedge(i, r1)} className="balance-track" style={{fill: a.color}} />
      {a.progress !== null && a.progress > 0 && <path d={wedge(i, r0 + (r1 - r0) * Math.max(0.06, a.progress))} className="balance-fill" style={{fill: a.color}} />}
    </g>)}
    <circle cx={c} cy={c} r={r0 - 4} fill={`url(#${id}-core)`} className="balance-core" />
    <text x={c} y={c - size * 0.01} textAnchor="middle" className="balance-core-value" style={{fontSize: Math.min(26, Math.round(r0 * 0.62))}}>{average === null ? '—' : `${Math.round(average * 100)}%`}</text>
    <text x={c} y={c + Math.min(16, r0 * 0.42)} textAnchor="middle" className="balance-core-label" style={{fontSize: Math.min(14, Math.max(11, Math.round(r0 * 0.33)))}}>balance</text>
  </svg>;
}

/** The wheel with its legend: each area's progress, items and this month's activity, in words. */
export function BalanceLegend({areas}: {areas: readonly AreaBalance[]}) {
  return <ul className="balance-legend">{areas.map(a => <li key={a.id}>
    <span className="balance-dot" style={{background: a.color}} aria-hidden="true" />
    <span className="balance-name">{a.label}</span>
    <span className="balance-value">{a.progress === null ? (a.items ? 'No data yet' : 'Nothing here yet') : `${Math.round(a.progress * 100)}%`}</span>
    <span className="balance-activity">{a.activity ? `${a.activity} ${a.activity === 1 ? 'record' : 'records'} this month` : a.items ? `${a.items} ${a.items === 1 ? 'item' : 'items'}` : ''}</span>
  </li>)}</ul>;
}
