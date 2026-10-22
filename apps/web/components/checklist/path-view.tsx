'use client';
import {useCallback, useMemo, useState} from 'react';
import {Path} from '../path/path';
import {checklistMilestones, checklistPath, type DerivedDot} from '../../lib/checklist/derive';
import {checklistDisplayColours} from '../../lib/checklist/display-colours';
import {PATH_COLOURS} from '../../lib/path/colours';
import {nebulaColour} from '../../lib/path/orbit-colours';
import {orbitGlyph} from '../../lib/checklist/glyphs';
import type {PathModel, PathStep, StepIntent} from '../../lib/path/model';
import {DotPanel} from './dot-panel';
import {ValueStepper} from './value-stepper';
import {useEscapeLayer} from './escape-layers';
import type {ChecklistState} from './use-checklist';
// Session AF (L3b): the orbit look of the shared path, the Checklist's own (Earn's paths never load it).
import '../path/path-orbit.css';
// Session AG Polish (owner Part 3): the orbits wear the Habits page's own section banners, from its own stylesheet.
import '../habits/habits-aa.css';

/** Dots that take more once done: another glass, a new night, a new fast, more minutes. */
const AGAIN = new Set(['water', 'sleep', 'fast', 'meditation']);
export type PanelState = {id: string; mode: 'value' | 'details'; message?: string} | null;

/** The press of a dot, shared by the Path and the List (P7.10, P7.11 any order, P7.12 the stepper). */
export function useDotPress(state: ChecklistState) {
  const [panel, setPanel] = useState<PanelState>(null), [busy, setBusy] = useState<string | null>(null);
  // Escape closes an open stepper or a dot's details before it closes the Checklist (L3b).
  useEscapeLayer(panel !== null, () => setPanel(null));
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
      <ValueStepper key={dot.id} label={dot.label} value={dot.value} colour={PATH_COLOURS[nebulaColour(dot.colour)].token} busy={busy === dot.id} onLog={n => void log(dot, n)} onCancel={() => setPanel(null)}/>
      {panel.message && <p className="checklist-stepper-error" role="alert">{panel.message}</p>}
    </>;
    return <DotPanel dot={dot} message={panel.message} canUndo={state.canUndo(dot.id)} onUndo={() => void state.undoLast(dot.id).then(out => setPanel(out.ok ? null : {id: dot.id, mode: 'details', message: out.message}))} onClose={() => setPanel(null)}/>;
  }, [panel, busy, log, state]);
  return {panel, setPanel, press, renderPanel, busy};
}

/** Session AG (owner Part 6): no chests on the path — only the day's finale, "All planets lit", stays (no reward line). */
const finaleOnly = (model: PathModel): PathModel => ({...model, milestones: model.milestones.filter(m => m.at === 'end').map(m => ({id: m.id, at: m.at, label: m.label, ...(m.reachedLabel ? {reachedLabel: m.reachedLabel} : {})}))});

/** The Path view (P7.4–P7.11): today's favourites as the shared path engine's dots, in the person's orbits and order. */
export function PathView({state, jumpDock = null}: {state: ChecklistState; jumpDock?: HTMLElement | null}) {
  const {panel, press, renderPanel} = useDotPress(state);
  const byId = useMemo(() => new Map(state.dots.map(d => [d.id, d])), [state.dots]);
  // Session AG: each node in its own colour (its habit card's tone, or its own), no two neighbours alike, with its own glyph.
  const model = useMemo(() => {
    const colours = checklistDisplayColours(state.record.data, state.dots);
    return finaleOnly(checklistPath(state.record.data, state.dots.map(d => ({...d, colour: colours.get(d.id) ?? d.colour, glyph: orbitGlyph(d)})), checklistMilestones({on: false, dayXp: 0})));
  }, [state.record.data, state.dots]);
  const onStep = useCallback((step: PathStep, intent: StepIntent) => { const dot = byId.get(step.id); if (dot) void press(dot, intent); }, [byId, press]);
  const say = state.summary && state.summary.total > 0 && state.summary.done === 0 ? 'Tap a planet to begin' : state.summary?.next === null && (state.summary?.total ?? 0) > 0 ? 'All planets lit!' : undefined;
  return <Path model={model} ariaLabel="Today's path" onStep={onStep} panelFor={panel?.id ?? null} renderPanel={step => { const dot = byId.get(step.id); return dot ? renderPanel(dot) : null; }} zigi={say ? {say} : {}} className="checklist-path" variant="orbit" jumpDock={jumpDock}/>;
}
