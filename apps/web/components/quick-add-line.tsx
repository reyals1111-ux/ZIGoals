'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useHealth} from './health/use-health';
import {useHabits} from './habits/use-habits';
import {exerciseData} from '../lib/health-counters';
import {dailyData} from '../lib/health-daily';
import {latestHabitRule} from '../lib/habits';
import {parse, type QuickAddContext, type QuickAddKnown, type QuickAddResult} from '../lib/quick-add/parse';
import {describeChoice, describeQuickAdd, savedLine} from '../lib/quick-add/describe';
import {applyQuickAdd} from '../lib/quick-add/save';
import {storageMessageOr} from '../lib/storage-error-copy';

/**
 * A2: the Quick-add line. One field, Enter or Preview shows exactly what would be saved, and nothing is written before
 * Save. Unknown input is explained with three examples. The parser runs on this device against the person's own habit
 * titles and counter names; the records are ordinary Health and Habit records. The dialog stays open for the next line.
 */
export function QuickAddLine() {
  const health = useHealth(), habits = useHabits();
  const [text, setText] = useState(''), [result, setResult] = useState<QuickAddResult | null>(null), [chosen, setChosen] = useState<QuickAddKnown | null>(null);
  const [saved, setSaved] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [wake, setWake] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const context = useMemo<QuickAddContext>(() => {
    const preferences = dailyData(health.data).preferences;
    return {
      habits: habits.data.habits.filter(h => latestHabitRule(h).state === 'active').map(h => { const rule = latestHabitRule(h); return {id: h.id, title: h.title, unit: 'unit' in rule.measurement ? rule.measurement.unit : 'done', kind: rule.measurement.kind, target: rule.target}; }),
      counters: exerciseData(health.data).counters.map(c => ({id: c.id, name: c.name})),
      waterUnit: preferences.waterUnit, weightUnit: preferences.weightUnit,
    };
  }, [health.data, habits.data]);
  const ready = health.loaded && habits.loaded && !health.error && !habits.error;
  function preview() { setSaved(''); setError(''); setChosen(null); setWake(''); setResult(parse(text, 'en', context)); }
  async function save(item: QuickAddKnown) {
    setBusy(true); setError('');
    try {
      const now = new Date();
      const write = applyQuickAdd(item, {health: health.data, habits: habits.data}, now);
      if (write.health) await health.update(current => applyQuickAdd(item, {health: current, habits: habits.data}, now).health!);
      if (write.habits) await habits.update(current => applyQuickAdd(item, {health: health.data, habits: current}, now).habits!);
      setSaved(savedLine(item, write.habitTotal)); setResult(null); setChosen(null); setText(''); setWake('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(/scheduled/.test(message) && item.kind === 'habit' && item.day === 'yesterday' ? 'That habit wasn’t scheduled yesterday.' : message ? storageMessageOr(cause, message) : 'This line was not saved. Nothing was changed.');
    } finally { setBusy(false); }
  }
  // After a save the field is enabled again and takes focus for the next line.
  useEffect(() => { if (saved && !busy) field.current?.focus(); }, [saved, busy]);
  const found = chosen ?? (result && result.kind !== 'ambiguous' && result.kind !== 'needs-more' && result.kind !== 'unknown' ? result : null);
  // Session W Part 9: a night needs its wake time (the bedtime is worked out from it); nothing else is asked.
  const active = found?.kind === 'sleep' && wake ? {...found, wake} : found, needsWake = active?.kind === 'sleep' && !active.wake;
  const bedtime = active?.kind === 'sleep' && active.wake ? (() => { const [h, m] = active.wake.split(':').map(Number); const t = ((h! * 60 + m! - Math.round(active.minutes)) % 1440 + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; })() : null;
  return <form className="quick-add-line" aria-label="Type a line" onSubmit={event => { event.preventDefault(); preview(); }}>
    <label className="field"><span>Type a line</span><input ref={field} data-sheet-focus type="text" value={text} maxLength={200} autoComplete="off" enterKeyHint="go" placeholder="drank 2 glasses of water" disabled={!ready || busy} onChange={event => { setText(event.target.value); if (result) setResult(null); if (chosen) setChosen(null); }} /></label>
    <div className="actions"><button type="submit" className="quiet" disabled={!ready || busy || !text.trim()}>Preview</button></div>
    <div aria-live="polite" className="quick-add-line-preview">
      {active && <div className="quick-add-line-card"><p className="quick-add-line-will">Will save: {describeQuickAdd(active)} · {active.day}</p>
        {active.kind === 'water' && active.shown.unit === 'glasses' && <p className="fine">A glass is counted as 250 mL.</p>}
        {active.kind === 'sleep' && <><label className="field"><span>When did you wake up ({active.day})?</span><input type="time" required value={wake} onChange={event => setWake(event.target.value)} /></label>
          <p className="fine">{bedtime ? `A night in Sleep: in bed from ${bedtime}, worked out from your wake time and how long you slept.` : 'It becomes a night in Health → Sleep, ending when you woke up.'} Time to fall asleep and time awake aren’t known, so Sleep marks it estimated.</p></>}
        <div className="actions"><button type="button" className="primary" disabled={busy || needsWake} onClick={() => void save(active)}>{busy ? 'Saving…' : 'Save'}</button><button type="button" className="quiet" disabled={busy} onClick={() => { setResult(null); setChosen(null); setText(''); setWake(''); field.current?.focus(); }}>Clear</button></div></div>}
      {result?.kind === 'ambiguous' && !chosen && <div className="quick-add-line-card"><p>Did you mean…</p><div className="actions">{result.choices.map((choice, index) => <button key={index} type="button" className="secondary" onClick={() => setChosen(choice)}>{describeChoice(choice)}</button>)}</div></div>}
      {result?.kind === 'needs-more' && <p className="quick-add-line-hint">{result.hint}</p>}
      {result?.kind === 'unknown' && <p className="quick-add-line-hint" role="status">I didn’t understand that yet. Try: {result.examples.join(' · ')}</p>}
      {saved && <p role="status" className="quick-add-line-saved">{saved}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  </form>;
}
