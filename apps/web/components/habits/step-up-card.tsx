'use client';
import {useMemo, useRef} from 'react';
import type {Habit} from '../../lib/habits';
import {restUntil, restoreStepUpEntry, setStepUp, stepOffers, stepUpEntry} from '../../lib/habits-v2/step-up';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {showStatus, showUndo} from '../ui/undo-toast';
import type {HabitExtrasState} from './use-habit-extras';
import './habit-mind.css';

/**
 * Session AV lane 2 (r4-mind; LEDGER #327, Atoms' step up): the one quiet card on the Habits page when a habit with the
 * step-up card on is ready for a change — "You did Read on 23 of 26 due days. Try two pages?" or, after two thin weeks,
 * "Make it one page for now?". Yes changes what the habit's Details say it is now (Undo in the message); Not now rests
 * the card for two weeks. Nothing changes by itself. Only the first offer shows. Its own chunk; nothing shows when no
 * habit has one.
 */
export default function StepUpCard({habits, extras, today}: {habits: readonly Habit[]; extras: HabitExtrasState; today: string}) {
  const box = useRef<HTMLElement>(null);
  const offers = useMemo(() => extras.loaded && !extras.unreadable ? stepOffers(habits, extras.data, today) : [], [habits, extras.loaded, extras.unreadable, extras.data, today]);
  const first = offers[0];
  if (!first) return null;
  const {habit, offer} = first;
  const yes = () => {
    // Review B4D-5: Undo puts the habit's whole entry back (its size, the four-week clock and a resting card exactly).
    const to = offer.kind === 'down' ? 'small' as const : offer.to, before = stepUpEntry(extras.data, habit.id);
    try { extras.update(r => setStepUp(r, habit.id, {now: to, since: today, later: null})); } catch (e) { showStatus(`Not changed. ${deviceSettingFailureMessage(e)}`, {tone: 'error'}); return; }
    showUndo({message: `${habit.title}: now ${offer.words}. The habit itself stays as it is.`, undone: `${habit.title} is back as it was.`, restore: () => extras.update(r => restoreStepUpEntry(r, habit.id, before))});
  };
  const later = () => {
    try { extras.update(r => setStepUp(r, habit.id, {later: restUntil(today)})); } catch (e) { showStatus(`Not changed. ${deviceSettingFailureMessage(e)}`, {tone: 'error'}); return; }
    showStatus('The card rests for two weeks.');
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.habit-grid, .habit-grid-sections, main h1')?.focus?.());
  };
  return <section className="panel habit-step-card" aria-label={`A step for ${habit.title}`} ref={box}>
    <p className="eyebrow">{offer.kind === 'up' ? 'Ready for a step up?' : 'A smaller step for now?'}</p>
    <p>{offer.kind === 'up' ? `You did ${habit.title} on ${offer.done} of ${offer.due} due days in the last four weeks. Try “${offer.words}”?` : `${habit.title} was done on ${offer.done} of ${offer.due} due days these two weeks. Make it “${offer.words}” for now?`}</p>
    <div className="actions"><button type="button" className="secondary" onClick={yes}>{offer.kind === 'up' ? `Yes, ${offer.words}` : `Yes, ${offer.words} for now`}</button><button type="button" className="quiet" onClick={later}>Not now</button></div>
    <p className="fine">You decide; nothing changes by itself. Turn the card off in the habit&rsquo;s Details.</p>
  </section>;
}
