'use client';
import {useMemo, useState, type CSSProperties} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {showToast} from '../ui/undo-toast';
import {drawShareCard, shareOrSave} from '../../lib/share-image';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {crossPillarInsights, CROSS_MIN_PER_SIDE} from '../../lib/insights/cross-pillar';
import {PILLAR_HEX, universeShareCard, type UniversePillar} from '../../lib/universe/model';
import {UniverseScene, gridPlanet, sceneOf, scenePosition, type SceneLayout} from './universe-scene';
import {usePhoneActive} from '../phone/use-phone-layout';
import {keepWords} from '../today/keep-words';
import {UniverseCelebration} from './universe-celebration';
import {planetLabel, planetSummary} from './planet-words';
import {useUniverse} from './use-universe';
import './universe.css';

/**
 * My Universe, the full view (Session AF, L5b; P9.1, ADR-028 H77): on /app/journey above the game sections, with Gamify on
 * or off. The star system, a 44 px control on every planet that brings its facts forward, the facts of all four planets
 * (counts only), today's light per pillar, one cross-pillar discovery (lib/insights/cross-pillar.ts: what happened on the
 * same days, never a cause), a milestone celebrated once, and a share image drawn on this device with no price, rate or
 * return on it. Viewing writes nothing.
 */
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

export function UniverseSection() {
  const state = useUniverse(), {universe, loaded, failed} = state;
  const [selected, setSelected] = useState<UniversePillar | null>(null), [busy, setBusy] = useState(false);
  const layout: SceneLayout = usePhoneActive() ? 'grid' : 'orbit', scene = sceneOf(layout);
  const discovery = useMemo(() => loaded && !failed ? crossPillarInsights({habits: state.habits, health: state.health, today: state.today, max: 1}) : null, [loaded, failed, state.habits, state.health, state.today]);
  const share = async () => {
    if (!universe) return;
    setBusy(true);
    try {
      const card = universeShareCard(universe, formatDate(state.today));
      const blob = await drawShareCard({...card, footer: 'Made on this device with ZIGoals', accent: [PILLAR_HEX.habits, PILLAR_HEX.goals, PILLAR_HEX.health]});
      const how = await shareOrSave(blob, `my-universe-${state.today}.png`, 'My universe');
      showToast({message: how === 'shared' ? 'Shared.' : 'Image saved.'});
    } catch { showToast({message: 'The image could not be made on this device.'}); } finally { setBusy(false); }
  };
  const title = !universe ? 'My universe' : universe.empty ? 'Your universe is waiting for its first light.' : `${plural(universe.totals.rings, 'ring')}, ${plural(universe.totals.moons, 'moon')}`;
  return <section id="universe" className="panel universe-section" aria-labelledby="universe-title" data-universe={!loaded ? 'loading' : universe?.empty ? 'empty' : 'ready'}>
    <div className="universe-head">
      <p className="eyebrow">My universe</p>
      <h2 id="universe-title"><NebulaFlow identity="universe-title">{title}</NebulaFlow></h2>
      <p className="universe-lede">{universe?.empty ? 'Check in a habit, log a day or set a goal: each planet grows from what you already do.' : 'One planet for each part of your life. Rings, moons and light grow from your own records, and nothing is ever taken away: a missed day leaves a faint ring.'}</p>
    </div>
    {!loaded ? <div className="universe-skeleton aa-skeleton" aria-hidden="true"><i /><i /></div> : failed ? <p role="status" className="universe-note">Some of your records could not be read on this device, so your universe waits until they can.</p> : universe && <>
      <UniverseCelebration milestones={state.pending} onCelebrate={state.celebrate} />
      <div className="universe-stage" data-layout={layout} style={{aspectRatio: `${scene.width} / ${scene.height}`}}>
        <UniverseScene planets={universe.planets} layout={layout} />
        {universe.planets.map(p => { const {x, y} = scenePosition(p.pillar, layout); return <button key={p.pillar} type="button" className="universe-planet-button" data-pillar={p.pillar} aria-pressed={selected === p.pillar} aria-controls={`universe-planet-${p.pillar}`} aria-label={planetLabel(p)} onClick={() => setSelected(s => s === p.pillar ? null : p.pillar)} style={{left: `${x / scene.width * 100}%`, top: `${y / scene.height * 100}%`, ...(layout === 'grid' ? {'--reach': gridPlanet(p).reach.toFixed(1)} : {})} as CSSProperties}><span className="universe-planet-name">{p.label}</span></button>; })}
      </div>
      <ul className="universe-planets" aria-label="Your four planets">{universe.planets.map(p => <li key={p.pillar} id={`universe-planet-${p.pillar}`} data-pillar={p.pillar} data-selected={selected === p.pillar || undefined}>
        <p className="universe-planet-title"><strong>{p.label}</strong>{p.lit && <span className="universe-lit">Lit today</span>}</p>
        <p className="universe-planet-counts">{planetSummary(p)}</p>
        <p className="universe-planet-light">{p.lightLine}</p>
        <ul className="universe-facts">{p.facts.map(f => <li key={f}>{keepWords(f)}</li>)}</ul>
      </li>)}</ul>
      {discovery && (discovery.ready[0] ? <div className="universe-discovery" role="note" aria-label="Discovery"><p className="eyebrow">Discovery · {discovery.ready[0].title}</p><p>{discovery.ready[0].sentence}</p><p className="fine">Seen together in your own records over the last 90 days, never a cause.</p></div>
        : discovery.pending[0] && <div className="universe-discovery is-pending" role="note" aria-label="Discovery"><p className="eyebrow">A discovery is forming</p><p>{discovery.pending[0].title}: {Math.min(discovery.pending[0].withA, CROSS_MIN_PER_SIDE)} and {Math.min(discovery.pending[0].withoutA, CROSS_MIN_PER_SIDE)} of the {CROSS_MIN_PER_SIDE} days on each side it needs.</p></div>)}
      <div className="universe-actions">
        <button type="button" className="secondary" disabled={busy || universe.empty} onClick={() => void share()}>Share my universe</button>
        <p className="fine">The image is drawn on this device and shows counts only: no amount, price or return. Light fills each day: all habits due, three kinds of Health log, a goal moved, money moved or checked.</p>
      </div>
    </>}
  </section>;
}
export default UniverseSection;
