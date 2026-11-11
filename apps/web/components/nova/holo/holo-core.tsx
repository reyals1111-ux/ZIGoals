'use client';
import {useMemo} from 'react';
import {PillarMark} from '../../pillars';
import {coreRings, type CoreRing} from '../../../lib/nova/holo/core';
import {LensRing, RingStack} from './parts';
import {useGoalsHud, useHabitsHud, useHealthHud, usePillarShown, useWealthHud} from './use-hud-data';
import './holo-parts.css';

/**
 * Session AL Part 11 (lane L8): the core around the NOVA orb — four concentric pillar rings, outer to inner Health, Habits,
 * Goals and Wealth, each one figure of today (lib/nova/holo/core.ts), and the same four in words under the day line. A
 * pillar switched off under Your pages & buttons is left out of both. The rings are drawn around the orb (inside its
 * button, which still says only "Talk to NOVA"); the words are the readout, with the reason beside an unknown.
 * Second pass: a lens ring (cyan to magenta, an ornament) circles them; the readout is the reference's stacked neon bar
 * meters — one bar per pillar in its own neon (pink, cyan, violet, amber), each with its name and figure in words.
 */
export function useCore(): CoreRing[] {
  const health = useHealthHud(), habits = useHabitsHud(), goals = useGoalsHud(), wealth = useWealthHud();
  const shown = {health: usePillarShown('health'), habits: usePillarShown('habits'), goals: usePillarShown('goals'), wealth: usePillarShown('wealth')};
  return useMemo(() => {
    const w = health.hud?.water, lead = goals.arcs?.arcs[0];
    return coreRings({
      water: w ? {share: w.share, text: w.text, targetText: w.targetText, logged: w.value !== null} : null,
      habits: habits.hud ? {due: habits.hud.due, done: habits.hud.done} : null,
      goal: lead ? {name: lead.name, pct: lead.pct, text: lead.text} : null,
      wealth: wealth.hud?.purpose ? {allocated: wealth.hud.purpose.allocated, total: wealth.hud.purpose.total, shareText: wealth.hud.purpose.shareText} : null,
    }).filter(r => shown[r.pillar]);
  }, [health.hud, habits.hud, goals.arcs, wealth.hud, shown.health, shown.habits, shown.goals, shown.wealth]); // eslint-disable-line react-hooks/exhaustive-deps
}
/**
 * The rings, drawn around the orb (decoration: the readout says the same in words). Review M3, M4 (lane L8d): the rings
 * leave 40° open at the top, so NOVA's name never sits on an arc; a known ring's track is solid and dim, an unknown one a
 * single faint hairline with a short dash in that opening — four unknowns are a quiet ladder, never a rainbow of dashes.
 * Session AM-2: a precision bezel — each ring a thick gradient arc in its pillar's neon with a white core and a lit end,
 * on a dark groove that reads against the star, inside a tick scale (72 ticks, the twelfths longer) that turns slowly
 * (an ornament: holo-parts.css).
 */
export function CoreRings({rings}: {rings: CoreRing[]}) {
  return <span className="holo-core" aria-hidden="true"><LensRing className="holo-core-lens"/><RingStack rings={rings.map(r => ({key: r.pillar, share: r.share, pillar: r.pillar}))} size={120} gap={5.2} start={20} sweep={320}/></span>;
}
const SHORT: Partial<Record<CoreRing['pillar'], string>> = {health: 'Water', habits: 'Habits', wealth: 'Set aside'};
const SEGMENTS = 10;
/**
 * The readout: the reference's stacked neon bar meters, the rings' legend right under the orb. Review M4, p6 (lane L8d):
 * in the rings' own order (outer to inner, read row by row), each with its pillar's mark, its name, its figure and a 6 px
 * segmented bar in its neon; an unknown has no bar — a hairline and, in words, why.
 */
export function CoreReadout({rings}: {rings: CoreRing[]}) {
  if (!rings.length) return null;
  // Design review AM-D4: while every figure is unknown the four read-outs say nothing; the calm stage leaves them out
  // (holo-parts.css hides `[data-all-unknown]` there). One known figure brings all four back, the unknown ones with their reason.
  return <ul className="holo-core-readout" aria-label="Today’s core" data-all-unknown={rings.every(r => r.share === null) || undefined}>{rings.map((r, i) => {
    const lit = r.share === null ? 0 : Math.round(Math.max(0, Math.min(1, r.share)) * SEGMENTS);
    return <li key={r.pillar} data-pillar={r.pillar} data-unknown={r.share === null || undefined} title={r.reason ? `${r.measure}: ${r.reason}` : r.measure}>
      <PillarMark pillar={r.pillar} size={14}/><span className="holo-core-name">{SHORT[r.pillar] ?? r.measure}</span>
      <b className="holo-num">{r.text}</b>
      <span className="holo-core-bar" data-unknown={r.share === null || undefined} aria-hidden="true">{r.share === null ? null : Array.from({length: SEGMENTS}, (_, k) => <i key={k} data-lit={k < lit || undefined}/>)}</span>
      {r.reason && <small className="holo-core-why">{r.reason}</small>}
      <span className="sr-only">{` (${r.measure}; ring ${i + 1} of ${rings.length}, counted from the outside)`}</span>
    </li>;
  })}</ul>;
}
export default function HoloCore({part}: {part: 'rings' | 'readout'}) {
  const rings = useCore();
  return part === 'rings' ? <CoreRings rings={rings}/> : <CoreReadout rings={rings}/>;
}
