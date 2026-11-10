'use client';
import {NebulaFlow} from '../nebula-flow';
import {formatNumber} from '../../lib/visual-format';
import {useUniverse} from './use-universe';
import {LoadBoundary} from '../load-boundary';
import {ChunkFailed, chunk} from '../use-chunk';
// CI14: the stylesheet the moved body brought first stays here, in its place in the cascade.
import '../guided/guided-link.css';
import './universe.css';
import '../skeleton/zg-skeleton.css';

/**
 * My Universe, the full view (Session AF, L5b; P9.1, ADR-028 H77): on /app/journey above the game sections, with Gamify on
 * or off. The star system, a 44 px control on every planet that brings its facts forward, the facts of all four planets
 * (counts only), today's light per pillar, one cross-pillar discovery (lib/insights/cross-pillar.ts: what happened on the
 * same days, never a cause), a milestone celebrated once, and a share image drawn on this device with no price, rate or
 * return on it. Viewing writes nothing.
 */
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
// CI14 (weights): what shows once the records are read is its own chunk, asked for as this page loads (universe-body.tsx).
const useUniverseBody = chunk(() => import('./universe-body'));

export function UniverseSection() {
  const body = useUniverseBody(), state = useUniverse(), {universe, failed} = state, loaded = state.loaded && !!body.mod;
  const title = !universe ? 'My universe' : universe.empty ? 'Your universe is waiting for its first light.' : `${plural(universe.totals.rings, 'ring')}, ${plural(universe.totals.moons, 'moon')}`;
  return <section id="universe" className="panel universe-section" aria-labelledby="universe-title" data-universe={!loaded ? 'loading' : universe?.empty ? 'empty' : 'ready'}>
    <div className="universe-head">
      <p className="eyebrow">My universe</p>
      <h2 id="universe-title"><NebulaFlow identity="universe-title">{title}</NebulaFlow></h2>
      <p className="universe-lede">{universe?.empty ? 'Check in a habit, log a day or set a goal: each planet grows from what you already do.' : 'One planet for each of the four parts of ZIGoals: Goals, Habits, Health and Wealth (other pages, such as Chess, have none). Rings, moons and light grow from your own records, and nothing is ever taken away: a missed day leaves a faint ring.'}</p>
    </div>
    {body.failed ? <LoadBoundary label="Your universe"><ChunkFailed what="Your universe"/></LoadBoundary> : !loaded ? <div className="universe-skeleton aa-skeleton zg-skeleton" aria-hidden="true"><i /><i /></div> : failed ? <p role="status" className="universe-note">Some of your records could not be read on this device, so your universe waits until they can.</p> : universe && body.mod && <body.mod.UniverseBody state={state} universe={universe}/>}
  </section>;
}
export default UniverseSection;
