'use client';
import {useCallback, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {usePlatform} from '../platform/use-platform';
import {useAverageGoals} from '../goals/use-average-goals';
import {useHabits} from '../habits/use-habits';
import {NOTES, type Notes} from '../../lib/notes/schema';
import {applyUndo, type NotesUndo} from '../../lib/notes/store';
import {linkIndex, type LinkSources} from '../../lib/notes/links';

type WithUndo = {record: Notes; undo: NotesUndo};
const withUndo = (out: Notes | WithUndo): out is WithUndo => !('version' in out) && 'record' in out && 'undo' in out;
/**
 * Session AK (B): the notes record in a component, with one place for what a change says and its Undo. `change` applies
 * a pure change (lib/notes/store.ts) and shows the sentence; with an Undo it offers it until the next change.
 */
export function useNotes() {
  const notes = useDeviceRecord(NOTES);
  const [status, setStatus] = useState(''), [undo, setUndo] = useState<NotesUndo | null>(null);
  /** Applies a pure change; a change that returns `{record, undo}` offers that Undo. */
  const change = useCallback((fn: (r: Notes) => Notes | WithUndo, said: string, offer?: NotesUndo | null): boolean => {
    let made: NotesUndo | null = offer ?? null;
    try { notes.update(r => { const out = fn(r); if (withUndo(out)) { made = out.undo; return out.record; } return out; }); setStatus(said); setUndo(made); return true; }
    catch (e) { setStatus(e instanceof Error ? e.message : 'This could not be saved on this device. Nothing was changed.'); setUndo(null); return false; }
  }, [notes]);
  const runUndo = useCallback(() => { if (!undo) return; try { notes.update(r => applyUndo(r, undo)); setStatus(undo.said); } catch (e) { setStatus(e instanceof Error ? e.message : 'Undo could not be applied.'); } setUndo(null); }, [notes, undo]);
  return {notes, status, setStatus, undo, runUndo, change};
}

/**
 * The goals and habits [[links]] can reach: tracked and average goals (by name) and habits (by title), read from this
 * device's own records. Never fetches anything (no market quotes are needed for names).
 */
export function useLinkTargets(): Omit<LinkSources, 'notes'> & {loaded: boolean} {
  const platform = usePlatform(), averages = useAverageGoals(), habits = useHabits();
  const goals = useMemo(() => [
    ...(platform.loaded && !platform.error ? platform.data.goals.map(g => ({id: g.id, name: g.name, href: `/app/goals/tracked/${encodeURIComponent(g.id)}`})) : []),
    ...(averages.loaded && !averages.unreadable ? averages.data.goals.map(g => ({id: `average:${g.id}`, name: g.name, href: `/app/goals/average/${encodeURIComponent(g.id)}`})) : []),
  ], [platform.loaded, platform.error, platform.data, averages.loaded, averages.unreadable, averages.data]);
  const list = useMemo(() => habits.loaded && !habits.error ? habits.data.habits.map(h => ({id: h.id, title: h.title})) : [], [habits.loaded, habits.error, habits.data]);
  return {goals, habits: list, loaded: platform.loaded && averages.loaded && habits.loaded};
}
export function useLinkIndex(record: Notes, targets: Omit<LinkSources, 'notes'>) {
  return useMemo(() => linkIndex({notes: record.notes, goals: targets.goals, habits: targets.habits}), [record.notes, targets.goals, targets.habits]);
}
