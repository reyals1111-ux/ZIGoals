'use client';
import {useCallback, useMemo, useState} from 'react';
import Link from 'next/link';
import {Path} from '../path/path';
import {checklistMilestones, checklistPath, pathLine, type DerivedDot} from '../../lib/checklist/derive';
import {checklistDisplayColours} from '../../lib/checklist/display-colours';
import {PATH_COLOURS} from '../../lib/path/colours';
import {nebulaColour} from '../../lib/path/orbit-colours';
import {orbitGlyph} from '../../lib/checklist/glyphs';
import type {PathModel, PathStep, StepIntent} from '../../lib/path/model';
import {DotPanel} from './dot-panel';
import {ValueStepper} from './value-stepper';
import {useEscapeLayer} from './escape-layers';
import {logHabitValue} from '../../lib/habits';
import {dailyData, saveHealthPreferences} from '../../lib/health-daily';
import {showUndo} from '../ui/undo-toast';
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
  // Session AL fifth pass (LS-016): the water target's confirmation stays in the open stepper after the ask goes.
  const [waterSaid, setWaterSaid] = useState<{id: string; text: string} | null>(null);
  if (waterSaid && panel?.id !== waterSaid.id) setWaterSaid(null);
  // Escape closes an open stepper or a dot's details before it closes the Checklist (L3b).
  useEscapeLayer(panel !== null, () => setPanel(null));
  // Session AL (P-LS-27): a done habit can be opened again for today from its details, with Undo (Habits keeps the record).
  const untick = useCallback(async (dot: DerivedDot, habitId: string) => {
    const habits = state.stores.habits, before = habits.data.habits.find(h => h.id === habitId);
    try {
      await habits.update(h => logHabitValue(h, habitId, habits.today, 0));
      setPanel(null);
      showUndo({message: `${dot.label}: not done today.`, undone: `${dot.label}: done again.`, restore: () => habits.update(h => before && h.habits.some(x => x.id === habitId) ? {...h, habits: h.habits.map(x => x.id === habitId ? before : x)} : h)});
    } catch (e) { setPanel({id: dot.id, mode: 'details', message: e instanceof Error && e.message.length < 200 ? e.message : 'Not changed. Open Habits to change it.'}); }
  }, [state.stores.habits]);
  const press = useCallback(async (dot: DerivedDot, intent: StepIntent) => {
    if (intent === 'open') return;
    const again = dot.kind === 'health' && !!dot.input && AGAIN.has(dot.input);
    // Session AL fourth pass (LS-H26): a second tap on a done habit takes the tick back, as the habit card's ✓ does, with
    // Undo in the toast. Its details (time, Open Habits) stay one tap away under the row's ⋯.
    const doneHabit = dot.state === 'done' && dot.kind === 'habit' && intent === 'tick' ? (dot.item.ref as {habitId?: string} | undefined)?.habitId : undefined;
    if (doneHabit) { await untick(dot, doneHabit); return; }
    if (dot.state === 'done' && !again && dot.kind !== 'custom') { setPanel(p => p?.id === dot.id ? null : {id: dot.id, mode: 'details'}); return; }
    if (intent === 'value') { setPanel(p => p?.id === dot.id && p.mode === 'value' ? null : {id: dot.id, mode: 'value'}); return; }
    setBusy(dot.id);
    const out = await state.tick(dot, 'tick');
    setBusy(null);
    setPanel(out.ok ? null : {id: dot.id, mode: 'details', message: out.message});
  }, [state, untick]);
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
      {(dot.askWaterTarget || waterSaid?.id === dot.id) && <WaterTargetAsk health={state.stores.health} said={waterSaid?.id === dot.id ? waterSaid.text : ''} onSaid={text => setWaterSaid({id: dot.id, text})}/>}
    </>;
    const habitId = dot.kind === 'habit' && dot.state === 'done' ? (dot.item.ref as {habitId?: string} | undefined)?.habitId : undefined;
    return <DotPanel dot={dot} message={panel.message} canUndo={state.canUndo(dot.id)} onUndo={() => void state.undoLast(dot.id).then(out => setPanel(out.ok ? null : {id: dot.id, mode: 'details', message: out.message}))} onClose={() => setPanel(null)}
      onUntick={habitId ? () => void untick(dot, habitId) : undefined}/>;
  }, [panel, busy, log, state, untick, waterSaid]);
  return {panel, setPanel, press, renderPanel, busy};
}

/** The Water target Health offers when none is set (the onboarding's and the Showcase's 2,000 ml). */
const WATER_TARGET_OFFER_ML = 2000;
/**
 * Session AL fifth pass (LS-016, X3-26, LC-002): Water is done only at the person's own Health water target. While none
 * is set, its stepper says so and offers 2,000 ml a day (kept only on a press; any other target is set in Health →
 * Journal settings). The planet stays unlit until a target is set and reached.
 */
function WaterTargetAsk({health, said, onSaid: setSaid}: {health: ChecklistState['stores']['health']; said: string; onSaid: (text: string) => void}) {
  async function keep() {
    try {
      await health.update(h => saveHealthPreferences(h, {...dailyData(h).preferences, waterTargetMl: WATER_TARGET_OFFER_ML}));
      setSaid('Daily water target set: 2,000 ml. Change it in Health → Journal settings.');
    } catch (e) { setSaid(e instanceof Error && e.message.length < 200 ? e.message : 'The target was not saved.'); }
  }
  return <div className="checklist-water-target" role="group" aria-label="Daily water target">
    {said ? <p role="status">{said}</p> : <>
      <p>No daily water target yet. Water lights up when the day reaches your target.</p>
      <div className="checklist-stepper-actions"><button type="button" className="secondary" disabled={!health.loaded || !!health.error} onClick={() => void keep()}>Use 2,000 ml a day</button><Link className="quiet" href="/app/health?view=settings">Set my own in Health</Link></div>
    </>}
  </div>;
}

/** Session AG (owner Part 6): no chests on the path — only the day's finale, "All planets lit", stays (no reward line). */
const finaleOnly = (model: PathModel): PathModel => ({...model, milestones: model.milestones.filter(m => m.at === 'end').map(m => ({id: m.id, at: m.at, label: m.label, ...(m.reachedLabel ? {reachedLabel: m.reachedLabel} : {})}))});

/** The Path view (P7.4–P7.11): today's favourites as the shared path engine's dots, in the person's orbits and order. */
export function PathView({state, jumpDock = null, arrive = null}: {state: ChecklistState; jumpDock?: HTMLElement | null; arrive?: string | null}) {
  const {panel, press, renderPanel} = useDotPress(state);
  const byId = useMemo(() => new Map(state.dots.map(d => [d.id, d])), [state.dots]);
  // Session AG: each node in its own colour (its habit card's tone, or its own), no two neighbours alike, with its own glyph.
  const model = useMemo(() => {
    const colours = checklistDisplayColours(state.record.data, state.dots);
    return finaleOnly(checklistPath(state.record.data, state.dots.map(d => ({...d, colour: colours.get(d.id) ?? d.colour, glyph: orbitGlyph(d)})), checklistMilestones({on: false, dayXp: 0})));
  }, [state.record.data, state.dots]);
  const onStep = useCallback((step: PathStep, intent: StepIntent) => { const dot = byId.get(step.id); if (dot) void press(dot, intent); }, [byId, press]);
  const say = pathLine(state.summary, state.dots); // Session AL (PR-085): "All planets lit!" only when every planet is lit
  return <Path model={model} ariaLabel="Today's path" onStep={onStep} panelFor={panel?.id ?? null} renderPanel={step => { const dot = byId.get(step.id); return dot ? renderPanel(dot) : null; }} zigi={say ? {say} : {}} className="checklist-path" variant="orbit" jumpDock={jumpDock} arrive={arrive}/>;
}
