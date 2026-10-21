'use client';
import Link from 'next/link';
import {UNIVERSE_ROUTE} from '../../lib/af-extras-keys';
import {newestMilestone} from '../../lib/universe/model';
import {formatNumber} from '../../lib/visual-format';
import {UniverseRow} from './universe-scene';
import {planetLabel} from './planet-words';
import {useUniverse} from './use-universe';
import './universe.css';

/**
 * The compact Universe (Session AF, L5b): the four planets in a row with their names and today's light, one line — the
 * milestone waiting to be celebrated, else the newest one reached, else the first-light invitation — and the door to the
 * full view on Journey. Short on a phone; nothing written.
 */
export default function TodayUniverseBody() {
  const {loaded, failed, universe, pending} = useUniverse();
  const line = !universe ? '' : pending[0] ? `New: ${pending[0].title}.` : universe.empty ? 'Your universe is waiting for its first light.' : newestMilestone(universe)?.title ? `${newestMilestone(universe)!.title}.` : '';
  const lit = universe?.planets.filter(p => p.lit).length ?? 0;
  return <>
    <div className="today-universe-head">
      <p className="eyebrow" id="today-universe-title">My universe</p>
      {universe && !universe.empty && <span className="today-universe-lit">{formatNumber(lit)} of 4 lit today</span>}
    </div>
    {!loaded ? <div className="today-universe-skeleton" aria-hidden="true" /> : failed ? <p className="today-universe-line">Your universe waits until your records can be read.</p> : universe && <>
      <UniverseRow planets={universe.planets} />
      <ul className="today-universe-names" aria-label="Your four planets">{universe.planets.map(p => <li key={p.pillar} data-pillar={p.pillar} data-lit={p.lit || undefined} aria-label={planetLabel(p)}><span className="today-universe-name">{p.label}</span>{p.lit && <span className="today-universe-lit-mark" aria-hidden="true">Lit today</span>}</li>)}</ul>
      <p className="today-universe-line" data-new={pending.length > 0 || undefined}>{line}</p>
    </>}
    <Link className="today-universe-open text-link" href={UNIVERSE_ROUTE}>{pending.length ? 'Celebrate it in Journey →' : 'Open my universe →'}</Link>
  </>;
}
