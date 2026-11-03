'use client';
import {lazy, Suspense, useEffect, useMemo, useState, type ComponentType} from 'react';
import {HERMES_STEPS, hermesCheckLine, hermesProgress, hermesStatus, type HermesStepId} from '../../../lib/nova/hermes-record';
import {HERMES_PLANETS, hermesPathModel} from '../../../lib/nova/hermes-model';
import {LoadBoundary} from '../../load-boundary';
import {useShowcase} from '../../showcase-controls';
import {SectionHeading} from '../../ui/section-heading';
import {useHermes, type HermesState} from './use-hermes';
import '../../ai/ai.css';
import '../setup/setup.css';

const GuidePath = lazy(() => import('../setup/guide-path'));
/** Session AK WA (N11): the Showcase's labelled example of a linked Hermes (words only; no record, no request). */
const HermesShowcaseExample = lazy(() => import('./hermes-example'));
type StepPanel = ComponentType<{hermes: HermesState}>;
const PANELS: Readonly<Record<HermesStepId, StepPanel>> = {
  what: lazy(() => import('./steps/what')), install: lazy(() => import('./steps/install')), model: lazy(() => import('./steps/model')),
  api: lazy(() => import('./steps/api')), gateway: lazy(() => import('./steps/gateway')), browser: lazy(() => import('./steps/browser')),
  connect: lazy(() => import('./steps/connect')), privacy: lazy(() => import('./steps/privacy')), 'first-run': lazy(() => import('./steps/first-run')), further: lazy(() => import('./steps/further')),
};
const idOf = (pathId: string): HermesStepId | null => { const id = pathId.replace(/^hermes-/, ''); return (HERMES_STEPS as readonly string[]).includes(id) ? id as HermesStepId : null; };
/**
 * "Connect your Hermes Agent" (owner follow-up 3, N11; lane NC): ten planets on the same orbit path as "Build your own
 * NOVA", each with its guide and a check; progress on this device (`zigoals:nova-hermes:v1`). Facts from
 * docs/research/session-ak/HERMES_AGENT.md (Hermes Agent v0.22.5).
 */
export default function HermesGuide() {
  const showcase = useShowcase(), hermes = useHermes(), record = hermes.record.data, [open, setOpen] = useState<string | null>(null), [ready, setReady] = useState(false);
  useEffect(() => { queueMicrotask(() => setReady(true)); }, []);
  const model = useMemo(() => hermesPathModel(record), [record]), progress = hermesProgress(record), status = hermesStatus(record);
  const panel = (pathId: string) => {
    const id = idOf(pathId); if (!id) return null;
    const Panel = PANELS[id];
    return <div className="nova-panel" data-hermes-panel={id} role="region" aria-label={`${HERMES_PLANETS[id].label}: guide`}>
      <h3 className="nova-panel-title">{HERMES_STEPS.indexOf(id) + 1}. {HERMES_PLANETS[id].label}</h3>
      <LoadBoundary label={HERMES_PLANETS[id].label}><Suspense fallback={<p className="ai-note" role="status">Opening…</p>}><Panel hermes={hermes}/></Suspense></LoadBoundary>
    </div>;
  };
  const list = <ol className="nova-setup-list">{HERMES_STEPS.map(id => <li key={id} data-step={id} data-done={record.steps?.[id]?.doneOn ? true : undefined}>
    <button type="button" className="text-link" aria-expanded={open === `hermes-${id}`} onClick={() => setOpen(open === `hermes-${id}` ? null : `hermes-${id}`)}><b>{HERMES_PLANETS[id].label}</b></button> <span className="fine">· {HERMES_PLANETS[id].short}</span>
    {open === `hermes-${id}` && panel(`hermes-${id}`)}
  </li>)}</ol>;
  return <section className="nova-setup panel" aria-labelledby="nova-hermes-title" data-done={progress.done}>
    <SectionHeading id="nova-hermes-title" eyebrow="For agent builders" title="Your Hermes, step by step" lede="Press a planet for its guide; each ends with a check. Commands come one per block, for macOS, Windows and Linux."/>
    <p className="nova-progress" aria-live="polite"><b>{progress.done} of {progress.total} planets lit</b>{progress.next ? <> · next: {HERMES_PLANETS[progress.next].label}</> : ' · Hermes is linked'}</p>
    {showcase && <LoadBoundary quiet><Suspense fallback={null}><HermesShowcaseExample/></Suspense></LoadBoundary>}
    {status.connected && <p className="ai-note" role="status">{hermesCheckLine(status, {msWord: 'last answer '})}{status.reachable ? '' : '.'}</p>}
    {ready && hermes.record.loaded
      ? <LoadBoundary label="The Hermes path"><Suspense fallback={list}><GuidePath model={model} ariaLabel="Connect your Hermes Agent: ten planets, step by step" open={open} onOpen={setOpen} panel={panel} say={progress.next ? `Next: ${HERMES_PLANETS[progress.next].label}` : 'Hermes is linked.'}/></Suspense></LoadBoundary>
      : list}
  </section>;
}
