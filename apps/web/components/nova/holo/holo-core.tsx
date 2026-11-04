'use client';
import {useMemo, type CSSProperties} from 'react';
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
 * Second pass: the rings' tracks are segmented like orbits and a lens ring (cyan to magenta, an ornament) circles them; the
 * readout is the reference's stacked neon bar meters — one bar per pillar in its own neon (pink, cyan, violet, amber), each
 * with its name and figure in words (an unknown: a dashed empty bar, "—" and why).
 */
export function useCore(): CoreRing[] {
  const health = useHealthHud(), habits = useHabitsHud(), goals = useGoalsHud(), wealth = useWealthHud();
  const shown = {health: usePillarShown('health'), habits: usePillarShown('habits'), goals: usePillarShown('goals'), wealth: usePillarShown('wealth')};
  return useMemo(() => {
    const w = health.hud?.water, lead = goals.arcs?.arcs[0];
    return coreRings({
      water: w ? {share: w.share, text: w.text, targetText: w.targetText} : null,
      habits: habits.hud ? {due: habits.hud.due, done: habits.hud.done} : null,
      goal: lead ? {name: lead.name, pct: lead.pct, text: lead.text} : null,
      wealth: wealth.hud?.purpose ? {allocated: wealth.hud.purpose.allocated, total: wealth.hud.purpose.total, shareText: wealth.hud.purpose.shareText} : null,
    }).filter(r => shown[r.pillar]);
  }, [health.hud, habits.hud, goals.arcs, wealth.hud, shown.health, shown.habits, shown.goals, shown.wealth]); // eslint-disable-line react-hooks/exhaustive-deps
}
/** The rings, drawn around the orb (decoration: the readout says the same in words). */
export function CoreRings({rings}: {rings: CoreRing[]}) {
  return <span className="holo-core" aria-hidden="true"><LensRing className="holo-core-lens"/><RingStack rings={rings.map(r => ({key: r.pillar, share: r.share, pillar: r.pillar}))} size={120} gap={4.4} segments={48}/></span>;
}
const SHORT: Partial<Record<CoreRing['pillar'], string>> = {health: 'Water', habits: 'Habits', wealth: 'Set aside'};
export function CoreReadout({rings}: {rings: CoreRing[]}) {
  if (!rings.length) return null;
  return <ul className="holo-core-readout" aria-label="Today’s core">{rings.map(r => <li key={r.pillar} data-pillar={r.pillar} title={r.reason ? `${r.measure}: ${r.reason}` : r.measure}>
    <PillarMark pillar={r.pillar} size={12}/><span className="holo-core-name">{SHORT[r.pillar] ?? r.measure}</span>
    <b className="holo-num">{r.text}</b>{r.reason && <small>{r.reason}</small>}
    <span className="holo-core-bar" data-unknown={r.share === null || undefined} style={r.share === null ? undefined : {'--share': Math.max(0, Math.min(1, r.share))} as CSSProperties} aria-hidden="true"/>
    <span className="sr-only">{` (${r.measure})`}</span>
  </li>)}</ul>;
}
export default function HoloCore({part}: {part: 'rings' | 'readout'}) {
  const rings = useCore();
  return part === 'rings' ? <CoreRings rings={rings}/> : <CoreReadout rings={rings}/>;
}
