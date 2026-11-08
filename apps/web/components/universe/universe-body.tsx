'use client';
import {useMemo, useState, type CSSProperties} from 'react';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';
import {showStatus} from '../ui/undo-toast';
import {drawShareCard, shareOrSave} from '../../lib/share-image';
import {formatDate} from '../../lib/visual-format';
import {crossPillarInsights, CROSS_MIN_PER_SIDE} from '../../lib/insights/cross-pillar';
import {PILLAR_HEX, universeShareCard, type UniversePillar} from '../../lib/universe/model';
import {UniverseScene, gridPlanet, sceneOf, scenePosition, type SceneLayout} from './universe-scene';
import {usePhoneActive} from '../phone/use-phone-layout';
import {keepWords} from '../today/keep-words';
import {UniverseCelebration} from './universe-celebration';
import {planetLabel, planetSummary} from './planet-words';
import type {useUniverse} from './use-universe';
import {LifeScorePanel} from './life-score';
import {GuidedJourneysLink} from '../guided/guided-link';

/**
 * CI14 (page weights; budgets are never raised): My universe once its records are read — the star system, the planets'
 * facts, the discovery, the Life Score and the share — moved here from universe-section.tsx unchanged. It shows only after
 * the records are read (after mount), so it is a chunk of its own, asked for as the page loads (components/use-chunk.ts);
 * until it is here the section keeps its loading skeleton and data-universe="loading", exactly as while it reads.
 */
type UniverseState = ReturnType<typeof useUniverse>;
export function UniverseBody({state, universe}: {state: UniverseState; universe: NonNullable<UniverseState['universe']>}) {
  const [selected, setSelected] = useState<UniversePillar | null>(null), [busy, setBusy] = useState(false);
  const layout: SceneLayout = usePhoneActive() ? 'grid' : 'orbit', scene = sceneOf(layout);
  // Session AL (NB-052, P-NB-06): a pillar whose page the person took off their pages keeps its planet (the four planets are
  // the four parts of ZIGoals, ADR-028 H77), and says so, so a dim planet is not mistaken for a missed day.
  const pages = usePagesView(), offPages = (pillar: UniversePillar) => !isShown(pages, pillar);
  const discovery = useMemo(() => crossPillarInsights({habits: state.habits, health: state.health, today: state.today, max: 1}), [state.habits, state.health, state.today]); // shown only once read, without a failure
  const share = async () => {
    setBusy(true);
    try {
      const card = universeShareCard(universe, formatDate(state.today));
      const blob = await drawShareCard({...card, footer: 'Made on this device with ZIGoals', accent: [PILLAR_HEX.habits, PILLAR_HEX.goals, PILLAR_HEX.health]});
      const how = await shareOrSave(blob, `my-universe-${state.today}.png`, 'My universe');
      showStatus(how === 'shared' ? 'Shared.' : 'Image saved.');
    } catch { showStatus('The image could not be made on this device.', {tone: 'error'}); } finally { setBusy(false); }
  };
  return <>
      <UniverseCelebration milestones={state.pending} onCelebrate={state.celebrate} />
      <div className="universe-stage" data-layout={layout} style={{aspectRatio: `${scene.width} / ${scene.height}`}}>
        <UniverseScene planets={universe.planets} layout={layout} />
        {universe.planets.map(p => { const {x, y} = scenePosition(p.pillar, layout); return <button key={p.pillar} type="button" className="universe-planet-button" data-pillar={p.pillar} aria-pressed={selected === p.pillar} aria-controls={`universe-planet-${p.pillar}`} aria-label={planetLabel(p)} onClick={() => setSelected(s => s === p.pillar ? null : p.pillar)} style={{left: `${x / scene.width * 100}%`, top: `${y / scene.height * 100}%`, ...(layout === 'grid' ? {'--reach': gridPlanet(p).reach.toFixed(1)} : {})} as CSSProperties}><span className="universe-planet-name">{p.label}</span></button>; })}
      </div>
      <ul className="universe-planets" aria-label="Your four planets">{universe.planets.map(p => <li key={p.pillar} id={`universe-planet-${p.pillar}`} data-pillar={p.pillar} data-selected={selected === p.pillar || undefined}>
        <p className="universe-planet-title"><strong>{p.label}</strong>{p.lit && <span className="universe-lit">Lit today</span>}</p>
        <p className="universe-planet-counts">{planetSummary(p)}</p>
        <p className="universe-planet-light">{p.lightLine}</p>
        {offPages(p.pillar) && <p className="universe-planet-off">{p.label} is not on your pages. Its planet stays, quietly, and lights again when you log here; add the page back in Settings → Your pages &amp; buttons.</p>}
        <ul className="universe-facts">{p.facts.map(f => <li key={f}>{keepWords(f)}</li>)}</ul>
      </li>)}</ul>
      {/* Session AL fifth pass (NB-052): a person who picked Chess reads why it has no planet of its own (ADR-028 H77: the
          planets are the four parts of ZIGoals) and where its days show, so a missing Chess planet is not a lost choice. */}
      {isShown(pages, 'chess') && <p className="fine universe-extras-note">Chess has no planet of its own: the four planets are the four parts of ZIGoals. A game or the daily puzzle that ticks off the habit chosen in Chess lights Habits.</p>}
      {discovery && (discovery.ready[0] ? <div className="universe-discovery" role="note" aria-label="Discovery"><p className="eyebrow">Discovery · {discovery.ready[0].title}</p><p>{discovery.ready[0].sentence}</p><p className="fine">Seen together in your own records over the last 90 days, never a cause.</p></div>
        : discovery.pending[0] && <div className="universe-discovery is-pending" role="note" aria-label="Discovery"><p className="eyebrow">A discovery is forming</p><p>{/* Session AL (DV-023e, P-DV-33): what it is waiting for, in plain words */}{discovery.pending[0].title}: it compares days with and without, and needs {CROSS_MIN_PER_SIDE} of each. So far {Math.min(discovery.pending[0].withA, CROSS_MIN_PER_SIDE)} with and {Math.min(discovery.pending[0].withoutA, CROSS_MIN_PER_SIDE)} without.</p></div>)}
      {/* Session AJ (item 29, D10): the Life Score, opt-in. */}
      {state.input && <LifeScorePanel input={state.input} />}
      {/* Session AJ (item 34, A7) */}
      <GuidedJourneysLink />
      <div className="universe-actions">
        <button type="button" className="secondary" disabled={busy || universe.empty} onClick={() => void share()}>Share my universe</button>
        <p className="fine">The image is drawn on this device and shows counts only: no amount, price or return. Light fills each day: all habits due, three kinds of Health log, a goal moved, money moved or checked.</p>
      </div>
    </>;
}
