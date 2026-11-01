'use client';
import {lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode} from 'react';
import {markCelebrated, novaOnline, setCardHidden, SETUP_STEPS, setupProgress, stepDone, type SetupStepId} from '../../../lib/nova/setup';
import {PLANETS} from '../../../lib/nova/setup-guide';
import {setupPathModel} from '../../../lib/nova/setup-model';
import {LoadBoundary} from '../../load-boundary';
import {SectionHeading} from '../../ui/section-heading';
import {NovaOnlineBadge} from './setup-card';
import {useSetup, type SetupState} from './use-setup';
import '../../ai/ai.css';
import './setup.css';

const GuidePath = lazy(() => import('./guide-path'));
type StepPanel = ComponentType<{setup: SetupState}>;
/** Each planet's guide is its own chunk, loaded when that planet is opened. */
const PANELS: Readonly<Record<SetupStepId, StepPanel>> = {
  meet: lazy(() => import('./steps/meet')), privacy: lazy(() => import('./steps/privacy')), brain: lazy(() => import('./steps/brain')),
  'first-chat': lazy(() => import('./steps/first-chat')), scopes: lazy(() => import('./steps/scopes')), memory: lazy(() => import('./steps/memory')),
  voice: lazy(() => import('./steps/voice')), briefs: lazy(() => import('./steps/briefs')), workflows: lazy(() => import('./steps/workflows')), yours: lazy(() => import('./steps/yours')),
};
/**
 * "Build your own NOVA" (owner follow-up 2, N3; lane NC): ten planets on Earn's Start-here orbit path (the shared path
 * engine's orbit look), each with its guide and a check that proves it worked; progress kept on this device
 * (`zigoals:nova-setup:v1`). Before the path's chunk arrives, the same ten steps stand as a plain list of buttons. When
 * the tenth planet lights, a calm celebration shows once and the "NOVA online" badge stays.
 */
export default function NovaSetupGuide() {
  const setup = useSetup(), record = setup.record.data, [open, setOpen] = useState<string | null>(null), [ready, setReady] = useState(false);
  useEffect(() => { queueMicrotask(() => setReady(true)); }, []);
  const model = useMemo(() => setupPathModel(record), [record]), progress = setupProgress(record), online = novaOnline(record);
  const [celebrate, setCelebrate] = useState(false);
  // The celebration plays once: the record remembers it was shown.
  useEffect(() => {
    if (!setup.record.loaded || !online || record.celebrated) return;
    setCelebrate(true);
    try { setup.record.update(markCelebrated); } catch { /* it may show again next time; nothing else depends on it */ }
  }, [setup.record, online, record.celebrated]);
  const panel = (id: string) => {
    if (!(SETUP_STEPS as readonly string[]).includes(id)) return null;
    const step = id as SetupStepId, Panel = PANELS[step];
    return <div className="nova-panel" data-setup-panel={step} role="region" aria-label={`${PLANETS[step].label}: guide`}>
      <h3 className="nova-panel-title">{SETUP_STEPS.indexOf(step) + 1}. {PLANETS[step].label}</h3>
      <LoadBoundary label={PLANETS[step].label}><Suspense fallback={<p className="ai-note" role="status">Opening…</p>}><Panel setup={setup}/></Suspense></LoadBoundary>
    </div>;
  };
  const say = progress.next ? `Next: ${PLANETS[progress.next].label}` : 'NOVA is online.';
  return <section className="nova-setup panel" aria-labelledby="nova-setup-title" data-done={progress.done}>
    <SectionHeading id="nova-setup-title" eyebrow="Ten planets, one private assistant" title="Your NOVA, step by step"
      lede="Press a planet for its guide. Each one ends with a check that proves it worked. Everything stays on this device."/>
    <p className="nova-progress" aria-live="polite"><b>{progress.done} of {progress.total} planets lit</b>{progress.next ? <> · next: {PLANETS[progress.next].label}</> : ' · all lit'}</p>
    {!online && record.cardHidden && <p className="fine">The setup card is off on NOVA. <button type="button" className="text-link" onClick={() => { try { setup.record.update(r => setCardHidden(r, false)); } catch { /* stays off */ } }}>Show it on NOVA again</button></p>}
    {online && <div className={`nova-online${celebrate ? ' nova-online-new' : ''}`} role="status"><NovaOnlineBadge/>{celebrate ? <p>Every planet is lit. NOVA is online: private, yours, and ready when you are.</p> : <p>NOVA is online. Re-run any check whenever something changes.</p>}</div>}
    {ready && setup.record.loaded
      ? <LoadBoundary label="The setup path"><Suspense fallback={<SetupList record={record} onOpen={setOpen} open={open} panel={panel}/>}><GuidePath model={model} ariaLabel="Build your own NOVA: ten planets, step by step" open={open} onOpen={setOpen} panel={panel} say={say}/></Suspense></LoadBoundary>
      : <SetupList record={record} onOpen={setOpen} open={open} panel={panel}/>}
  </section>;
}
/** Before the path's chunk arrives (or if it cannot load): the ten steps as buttons with their state, each opening its guide. */
function SetupList({record, open, onOpen, panel}: {record: ReturnType<typeof useSetup>['record']['data']; open: string | null; onOpen: (id: string | null) => void; panel: (id: string) => ReactNode}) {
  return <ol className="nova-setup-list">{SETUP_STEPS.map(id => <li key={id} data-step={id} data-done={stepDone(record, id) || undefined}>
    <button type="button" className="text-link" aria-expanded={open === id} onClick={() => onOpen(open === id ? null : id)}><b>{PLANETS[id].label}</b></button> <span className="fine">{stepDone(record, id) ? '· done' : `· ${PLANETS[id].short}`}</span>
    {open === id && panel(id)}
  </li>)}</ol>;
}
