'use client';
import {useId, useMemo, type CSSProperties} from 'react';
import {flowSegments, type FlowNode, type FlowSegment} from '../../lib/path/flow-geometry';
import './flow-line.css';

/**
 * Session AG (ADR-029; owner pointers 1–5, references 03–07): the orbit path's one continuous flowing neon line, drawn
 * over the measured nodes (lib/path/flow-geometry.ts gives the curves). Each stretch is three strokes — a soft wide glow,
 * a halo and a thin bright core — along a gradient from the colour of the node above to the colour of the node below.
 * Lit where its node is done: a stretch between two done nodes glows in full, a stretch with one done end is lit from that
 * end and fades toward the other, an unlit stretch is a faint, dim version. A lead-in flows into the first node from
 * above and a tail runs on past the last one, fading out. `travel`: stretches a tick has just lit — a light runs along
 * each once (CSS; never under reduced motion or Motion Off, where the lit state shows at once). Decorative.
 */
/** Session AG Polish 3 (ADR-032 L21; owner amendment 9): a phone passes `segments`, its river cut at each ring
 *  (lib/path/phone-wave.ts), and draws them with the computer's strokes, glow, gradients and light. */
export type FlowLineProps = {w: number; h: number; nodes: FlowNode[]; seed: string; swing: number; leadFrom?: number | null; tailTo?: number | null; travel?: ReadonlySet<string>; segments?: readonly FlowSegment[]};
/** How strongly an unlit end shows (the dim, switched-off version of its colour). */
const DIM = .26;
export function FlowLine({w, h, nodes, seed, swing, leadFrom = null, tailTo = null, travel, segments}: FlowLineProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const key = nodes.map(n => `${n.id}:${Math.round(n.x)}:${Math.round(n.y)}:${n.r}:${n.inSide}:${n.outSide}`).join('|');
  // (The curves follow the measured layout only: a tick changes the light, never the line.)
  const shapes = useMemo(() => segments ?? flowSegments(nodes.map(n => ({...n, done: false})), {w, seed, swing, leadFrom, tailTo}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, w, seed, swing, leadFrom, tailTo, segments]);
  const lit = new Map(nodes.map(n => [n.id, n.done])), colour = new Map(nodes.map(n => [n.id, n.colour]));
  const glow = `orbit-flow-glow-${uid}`;
  return <svg className="path-line orbit-flow" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
    <defs>
      <filter id={glow} x="-20%" y="-5%" width="140%" height="110%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="5"/></filter>
      {shapes.map((s, i) => {
        const from = s.from ? lit.get(s.from) ?? false : false, to = s.to ? lit.get(s.to) ?? false : false;
        // (A lead-in rises out of nothing; a tail fades into nothing.)
        const a0 = s.kind === 'lead' ? 0 : from ? 1 : DIM, a1 = s.kind === 'tail' ? 0 : to ? 1 : DIM;
        const c0 = (s.from && colour.get(s.from)) ?? s.fromColour, c1 = (s.to && colour.get(s.to)) ?? s.toColour;
        return <linearGradient key={s.id} id={`${uid}-g${i}`} gradientUnits="userSpaceOnUse" x1={s.x1} y1={s.y1} x2={s.x2} y2={Math.abs(s.y2 - s.y1) < 1 && Math.abs(s.x2 - s.x1) < 1 ? s.y1 + 1 : s.y2}>
          <stop offset="0" style={{stopColor: c0, stopOpacity: a0}}/>
          {/* (Half lit: the light from the done end fades out before the stretch's middle.) */}
          {from !== to && s.kind === 'step' && <stop offset=".55" style={{stopColor: from ? c0 : c1, stopOpacity: Math.max(a0, a1) * .35 + DIM * .4}}/>}
          <stop offset="1" style={{stopColor: c1, stopOpacity: a1}}/>
        </linearGradient>;
      })}
    </defs>
    <g className="orbit-flow-glow" filter={`url(#${glow})`}>{shapes.map((s, i) => <path key={s.id} d={s.d} fill="none" stroke={`url(#${uid}-g${i})`}/>)}</g>
    {shapes.map((s, i) => {
      const from = s.from ? lit.get(s.from) ?? false : false, to = s.to ? lit.get(s.to) ?? false : false, state = from && to ? 'both' : from ? 'from' : to ? 'to' : 'none';
      return <g key={s.id} className="path-segment orbit-flow-segment" data-segment={s.id} data-kind={s.kind} data-lit={state === 'both' || undefined} data-light={state} data-travel={travel?.has(s.id) || undefined} style={{'--seg': s.to ? colour.get(s.to) : s.fromColour} as CSSProperties}>
        <path className="orbit-flow-halo" d={s.d} fill="none" stroke={`url(#${uid}-g${i})`}/>
        <path className="orbit-flow-core" d={s.d} fill="none" stroke={`url(#${uid}-g${i})`}/>
        {travel?.has(s.id) && <path className="orbit-flow-travel" d={s.d} fill="none" pathLength={1}/>}
      </g>;
    })}
  </svg>;
}
