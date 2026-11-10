'use client';
import {Suspense, lazy, useCallback, useEffect, useRef, useState} from 'react';
import {runWorkflow, type RunEvent, type StepState} from '../../../lib/nova/workflows/run';
import {NOVA_WORKFLOWS, noteRun, type WorkflowDef} from '../../../lib/nova/workflows/schema';
import {LoadBoundary} from '../../load-boundary';
import {SafeText} from '../../ai/safe-text';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useNovaModel} from './use-nova-model';
import {useNovaSources} from './use-nova-sources';

const WorkflowCards = lazy(() => import('./workflow-cards'));
/**
 * One workflow running (Session AK, owner follow-up 2 N6): each step appears as it runs, with what it read (or why it found
 * nothing), then the words — the person's model's when it may be used, else NOVA's own — then the cards to confirm.
 * Stop ends the run; nothing has been written by then (only a card the person adds writes).
 */
const STATE_WORDS: Record<StepState, string> = {running: 'Working…', done: 'Done', skipped: 'Nothing here', failed: 'Could not finish'};
type Step = Extract<RunEvent, {type: 'step'}>;
export function WorkflowRun({def, onClose}: {def: WorkflowDef; onClose: () => void}) {
  const sources = useNovaSources(), model = useNovaModel('workflows'), workflows = useDeviceRecord(NOVA_WORKFLOWS);
  const [steps, setSteps] = useState<Step[]>([]), [words, setWords] = useState<Extract<RunEvent, {type: 'words'}> | null>(null);
  const [cards, setCards] = useState<Extract<RunEvent, {type: 'cards'}> | null>(null), [status, setStatus] = useState<'idle' | 'running' | 'done' | 'stopped'>('idle');
  const abort = useRef<AbortController | null>(null), heading = useRef<HTMLHeadingElement>(null);
  const start = useCallback(async () => {
    if (!sources.local) return;
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setSteps([]); setWords(null); setCards(null); setStatus('running');
    try { workflows.update(current => noteRun(current, def.customId ?? def.id, new Date())); } catch { /* the setup check is a convenience */ }
    for await (const event of runWorkflow(def, {local: sources.local, send: model.ask ? sources.send : null, model: model.ask, signal: controller.signal})) {
      if (controller.signal.aborted) break;
      if (event.type === 'step') setSteps(current => [...current.filter(s => s.id !== event.id), event]);
      else if (event.type === 'words') setWords(event);
      else if (event.type === 'cards') setCards(event);
    }
    setStatus(controller.signal.aborted ? 'stopped' : 'done');
  }, [def, sources.local, sources.send, model.ask, workflows]);
  const started = useRef(false);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (started.current || !sources.ready || !sources.local) return; started.current = true; queueMicrotask(() => void start()); }, [sources.ready, sources.local, start]);
  useEffect(() => () => abort.current?.abort(), []);
  return <section className="nova-wf-run" aria-labelledby="nova-wf-run-title">
    <div className="nova-wf-run-head">
      <h3 id="nova-wf-run-title" ref={heading} tabIndex={-1}>{def.title}</h3>
      <p className="ai-note">{model.ask ? `Words: ${model.label}.` : `Words: on this device. ${model.why}`} Every change is a card you confirm.</p>
    </div>
    {!sources.ready && <p className="ai-note" role="status">Reading your records…</p>}
    {sources.ready && !sources.local && <p className="ai-note" role="status">Nothing is read on this screen.</p>}
    <ol className="nova-wf-steps" aria-live="polite">
      {def.steps.map(s => {
        const seen = steps.find(x => x.id === s.id), state = seen?.state ?? null;
        return <li key={s.id} className="nova-wf-step" data-state={state ?? 'waiting'}>
          <p className="nova-wf-step-head"><span className="nova-wf-step-mark" aria-hidden="true">{state === 'done' ? '✓' : state === 'running' ? '…' : state === 'failed' ? '!' : state === 'skipped' ? '–' : '○'}</span><strong>{s.label}</strong><span className="nova-wf-step-state">{state === 'skipped' && seen?.note && /not shared/i.test(seen.note) ? 'Not shared' : state ? STATE_WORDS[state] : 'Waiting'}</span></p>
          {seen?.facts && <ul className="nova-wf-facts">{seen.facts.map((f, i) => <li key={i}>{f}</li>)}</ul>}
          {seen?.note && <p className="ai-note">{seen.note}</p>}
        </li>;
      })}
    </ol>
    {words && <div className="nova-wf-words">
      <p className="eyebrow">{words.by === 'model' ? `WORDED BY ${model.provider === 'local' ? 'YOUR LOCAL MODEL' : 'YOUR MODEL'}` : 'MADE ON THIS DEVICE'}</p>
      <SafeText text={words.text}/>
      {words.by === 'model' && model.sent && <details className="nova-wf-sent"><summary>What went to {model.route === 'local' ? 'your local model' : 'your provider'}{model.sent.redactions ? ` (${model.sent.redactions} redacted)` : ''}</summary><pre>{model.sent.text}</pre></details>}
    </div>}
    {cards && <LoadBoundary quiet><Suspense fallback={<p className="ai-note" role="status">Preparing the cards…</p>}><WorkflowCards text={cards.text} label={`Cards from ${def.title}`}/></Suspense></LoadBoundary>}
    {cards?.note && <p className="ai-note">{cards.note}</p>}
    <div className="ai-card-actions">
      {status === 'running' ? <button type="button" className="secondary" onClick={() => abort.current?.abort()}>Stop</button>
        : <button type="button" className="secondary" disabled={!sources.local} onClick={() => void start()}>Run again</button>}
      <button type="button" className="text-link" onClick={onClose}>Back to workflows</button>
      {status === 'stopped' && <span className="ai-note" role="status">Stopped. Nothing was saved.</span>}
    </div>
  </section>;
}
