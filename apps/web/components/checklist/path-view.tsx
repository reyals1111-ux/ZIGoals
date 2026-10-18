'use client';
import {useCallback, useMemo, useState} from 'react';
import {Path} from '../path/path';
import {checklistMilestones, checklistPath, type DerivedDot} from '../../lib/checklist/derive';
import {PATH_COLOURS} from '../../lib/path/colours';
import type {PathStep, StepIntent} from '../../lib/path/model';
import {DotPanel} from './dot-panel';
import {ValueStepper} from './value-stepper';
import type {ChecklistState} from './use-checklist';

/** Dots that take more once done: another glass, a new night, a new fast, more minutes. */
const AGAIN = new Set(['water', 'sleep', 'fast', 'meditation']);
export type PanelState = {id: string; mode: 'value' | 'details'; message?: string} | null;

/** The press of a dot, shared by the Path and the List (P7.10, P7.11 any order, P7.12 the stepper). */
export function useDotPress(state: ChecklistState) {
  const [panel, setPanel] = useState<PanelState>(null), [busy, setBusy] = useState<string | null>(null);
  const press = useCallback(async (dot: DerivedDot, intent: StepIntent) => {
    if (intent === 'open') return;
    const again = dot.kind === 'health' && !!dot.input && AGAIN.has(dot.input);
    if (dot.state === 'done' && !again && dot.kind !== 'custom') { setPanel(p => p?.id === dot.id ? null : {id: dot.id, mode: 'details'}); return; }
    if (intent === 'value') { setPanel(p => p?.id === dot.id && p.mode === 'value' ? null : {id: dot.id, mode: 'value'}); return; }
    setBusy(dot.id);
    const out = await state.tick(dot, 'tick');
    setBusy(null);
    setPanel(out.ok ? null : {id: dot.id, mode: 'details', message: out.message});
  }, [state]);
  const log = useCallback(async (dot: DerivedDot, value: number) => {
    setBusy(dot.id);
    const out = await state.tick(dot, 'value', value);
    setBusy(null);
    setPanel(out.ok ? null : {id: dot.id, mode: 'value', message: out.message});
  }, [state]);
  const renderPanel = useCallback((dot: DerivedDot) => {
    if (!panel || panel.id !== dot.id) return null;
    if (panel.mode === 'value' && dot.value) return <>
      <ValueStepper key={dot.id} label={dot.label} value={dot.value} colour={PATH_COLOURS[dot.colour].token} busy={busy === dot.id} onLog={n => void log(dot, n)} onCancel={() => setPanel(null)}/>
      {panel.message && <p className="checklist-stepper-error" role="alert">{panel.message}</p>}
    </>;
    return <DotPanel dot={dot} message={panel.message} canUndo={state.canUndo(dot.id)} onUndo={() => void state.undoLast(dot.id).then(out => setPanel(out.ok ? null : {id: dot.id, mode: 'details', message: out.message}))} onClose={() => setPanel(null)}/>;
  }, [panel, busy, log, state]);
  return {panel, setPanel, press, renderPanel, busy};
}

/** The Path view (P7.4–P7.11): today's favourites as the shared path engine's dots, in the person's orbits and order. */
export function PathView({state}: {state: ChecklistState}) {
  const {panel, press, renderPanel} = useDotPress(state);
  const byId = useMemo(() => new Map(state.dots.map(d => [d.id, d])), [state.dots]);
  const model = useMemo(() => checklistPath(state.record.data, state.dots, checklistMilestones({on: false, dayXp: 0})), [state.record.data, state.dots]);
  const onStep = useCallback((step: PathStep, intent: StepIntent) => { const dot = byId.get(step.id); if (dot) void press(dot, intent); }, [byId, press]);
  const say = state.summary && state.summary.total > 0 && state.summary.done === 0 ? 'Tap a dot to begin' : state.summary?.next === null && (state.summary?.total ?? 0) > 0 ? 'All dots lit!' : undefined;
  return <Path model={model} ariaLabel="Today's path" onStep={onStep} panelFor={panel?.id ?? null} renderPanel={step => { const dot = byId.get(step.id); return dot ? renderPanel(dot) : null; }} zigi={say ? {say} : {}} className="checklist-path"/>;
}
