'use client';
import {useId, useMemo, useState} from 'react';
import {needWords, NEED_MIN_ALL, NEED_MIN_FREE, sleepNeed} from '../../../lib/sleep/naps-need';
import {setSleepGoal} from '../../../lib/sleep/engine';
import {formatMinutes} from '../../../lib/zone-time';
import {plainErrorMessage} from '../../../lib/plain-error';
import {showUndo} from '../../ui/undo-toast';
import type {SleepStore} from './use-sleep';
import './av2-bodymind-sleep.css';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #238, Rise's sleep need): in Health → Sleep → Your sleep goal, an estimate of the
 * person's own sleep need from their logged nights (lib/sleep/naps-need.ts sleepNeed), labelled an estimate and offered as
 * a suggested goal. Nothing changes until "Use … as my goal" (the existing goal write, with Undo); the bedtime window
 * stays as it is. Its own chunk.
 */
export default function SleepNeed({store, onDone}: {store: SleepStore; onDone: (text: string) => void}) {
  const id = useId(), need = useMemo(() => sleepNeed(store.sleep, store.today), [store.sleep, store.today]), [problem, setProblem] = useState('');
  if (!need) return <p className="fine sleep-need-empty">Log at least {NEED_MIN_ALL} nights in 30 days (or {NEED_MIN_FREE} weekend nights) and an estimate of your own sleep need shows here, from the nights you slept without an alarm.</p>;
  const keep = async () => {
    const previous = store.sleep.goal, minutes = need.minutes;
    try {
      await store.update(s => setSleepGoal(s, {minutes, ...(s.goal?.bedFrom && s.goal.bedTo ? {bedFrom: s.goal.bedFrom, bedTo: s.goal.bedTo} : {})}, new Date()));
      setProblem('');
      onDone(`Your sleep goal is now ${formatMinutes(minutes)}, from the estimate.`);
      showUndo({message: `Sleep goal: ${formatMinutes(minutes)}.`, undone: previous ? `Your sleep goal is back to ${formatMinutes(previous.minutes)}.` : 'The sleep goal is removed again.', restore: () => store.update(s => { if (!previous) return setSleepGoal(s, null, new Date()); const {updatedAt: _at, ...goal} = previous; void _at; return setSleepGoal(s, goal, new Date()); })});
    } catch (e) { setProblem(plainErrorMessage(e, 'The goal could not be saved.')); }
  };
  return <div className="sleep-need" role="group" aria-labelledby={`${id}-title`}>
    <p className="sleep-need-head"><span className="eyebrow" id={`${id}-title`}>Your sleep need, an estimate</span><strong>{formatMinutes(need.minutes)}</strong></p>
    <p className="fine">{needWords(need, formatMinutes)}</p>
    {need.goal !== need.minutes && <button type="button" className="secondary" onClick={() => void keep()}>Use {formatMinutes(need.minutes)} as my goal</button>}
    {problem && <p role="alert">{problem}</p>}
  </div>;
}
