'use client';
import {lazy, Suspense, useEffect, useMemo, useRef, useState} from 'react';
import {useHealth} from './health/use-health';
import {useHabits} from './habits/use-habits';
import {exerciseData} from '../lib/health-counters';
import {dailyData} from '../lib/health-daily';
import {latestHabitRule} from '../lib/habits';
import {parse, type QuickAddContext, type QuickAddKnown, type QuickAddResult} from '../lib/quick-add/parse';
import {describeChoice, describeQuickAdd, savedLine} from '../lib/quick-add/describe';
import {applyQuickAdd, type QuickAddStores, type QuickAddWrite} from '../lib/quick-add/save';
import {storageMessageOr} from '../lib/storage-error-copy';
import {formatClock} from '../lib/visual-format';
import {plainErrorMessage} from '../lib/plain-error';
import {lineLanguage, splitItems} from '../lib/quick-log/multi';
import {QuickAddMic} from './quick-add-mic';
import {taskIntent, type TaskIntent} from '../lib/tasks/intent';
import {tasksToday} from '../lib/tasks/device';
import {describeRecur} from '../lib/tasks/recurrence';
import {LEVEL_WORDS} from '../lib/tasks/schema';
import {formatDate} from '../lib/visual-format';
import {showUndo} from './ui/undo-toast';
import {changeWithUndo} from './ui/remove-with-undo';
// Session AI (J10): several items in one line, or an item Quick add's own reader does not know, as ZIGi's cards.
const QuickLogCards = lazy(() => import('./quick-log-cards'));
// Session AK (6.1): a goal sentence ("save €5,000 for a trip by June and walk 8k steps") as a reviewed bundle, read on this
// device; its code loads only for a line the reader above did not take. A chunk that cannot load leaves the usual path.
const QuickAddBundle = lazy(() => import('./quick-add-bundle').catch(() => ({default: ({otherwise}: {otherwise: React.ReactNode}) => <>{otherwise}</>})));

/**
 * A2: the Quick-add line. One field, Enter or Preview shows exactly what would be saved, and nothing is written before
 * Save. Unknown input is explained with three examples. The parser runs on this device against the person's own habit
 * titles and counter names; the records are ordinary Health and Habit records. The dialog stays open for the next line.
 */
/**
 * Session Z-Cloud Part 3: ZIGi's panel, with no AI connected, hands the person's own words (typed or spoken) here as
 * `initialText`: they are previewed at once, and with `onlyIfUnderstood` nothing shows unless the parser understood them.
 * Nothing is written before Save, exactly as in Quick add.
 */
export function QuickAddLine({initialText, onlyIfUnderstood = false, close}: {initialText?: string; onlyIfUnderstood?: boolean; /** Closes Quick add when a confirmed goal opens the goal form. */ close?: () => void} = {}) {
  const health = useHealth(), habits = useHabits();
  const [text, setText] = useState(''), [result, setResult] = useState<QuickAddResult | null>(null), [chosen, setChosen] = useState<QuickAddKnown | null>(null);
  const [saved, setSaved] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [wake, setWake] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const context = useMemo<QuickAddContext>(() => {
    const preferences = dailyData(health.data).preferences;
    return {
      habits: habits.data.habits.filter(h => latestHabitRule(h).state === 'active').map(h => { const rule = latestHabitRule(h); return {id: h.id, title: h.title, unit: 'unit' in rule.measurement ? rule.measurement.unit : 'done', kind: rule.measurement.kind, target: rule.target}; }),
      counters: exerciseData(health.data).counters.map(c => ({id: c.id, name: c.name})),
      waterUnit: preferences.waterUnit, weightUnit: preferences.weightUnit, today: habits.today,
    };
  }, [health.data, habits.data, habits.today]);
  const ready = health.loaded && habits.loaded && !health.error && !habits.error;
  const primed = useRef(false);
  useEffect(() => { if (!initialText || primed.current || !ready) return; primed.current = true; setText(initialText); setResult(parse(initialText, 'en', context)); }, [initialText, ready, context]);
  const [multi, setMulti] = useState<string | null>(null), [task, setTask] = useState<TaskIntent | null>(null);
  /**
   * Session AL (P-LS-04, LS-004): a to-do ("call mom tomorrow at 5pm", "task buy milk", "remind me to floss at 21:00")
   * becomes a task preview, never a food or health log. A sure to-do is read before anything else; a line that only
   * might be one ("dentist friday 10am") is offered as a task when no log reading takes it.
   */
  function preview(line = text) {
    setSaved(''); setError(''); setChosen(null); setWake(''); setTask(null);
    const intent = taskIntent(line, tasksToday());
    if (intent?.confidence === 'sure') { setMulti(null); setResult(null); setTask(intent); return; }
    const several = splitItems(line).length >= 2; setMulti(several ? line : null);
    const read = several ? null : parse(line, lineLanguage(line), context);
    setResult(read);
    if (intent && (several || !read || read.kind === 'unknown' || read.kind === 'needs-more')) { setMulti(null); setResult(null); setTask(intent); }
  }
  async function saveTask(intent: TaskIntent) {
    setBusy(true); setError('');
    try {
      const {addTask} = await import('../lib/tasks/device');
      const p = intent.parsed, {task: added, undo} = addTask({title: p.title, ...(p.due ? {due: p.due} : {}), ...(p.time ? {time: p.time} : {}), ...(p.level ? {level: p.level} : {}), ...(p.labels.length ? {labels: p.labels} : {}), ...(p.recur ? {recur: p.recur} : {})}, {allowPast: true});
      const words = `Task added: “${added.title}”${added.due ? ` · ${added.due === tasksToday() ? 'today' : formatDate(added.due, {weekday: true, year: false})}` : ''}.`;
      showUndo({message: words, restore: undo, undone: `Task “${added.title}” removed.`, link: {href: `/app/tasks?task=${encodeURIComponent(added.id)}`, label: 'Open Tasks'}});
      setSaved(words); setTask(null); setText('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The task was not saved. Nothing was changed.'); }
    finally { setBusy(false); }
  }
  async function save(item: QuickAddKnown) {
    setBusy(true); setError('');
    try {
      const now = new Date();
      // A night's code (Sleep) loads only when a sleep line is saved (Session W Part 9).
      const apply = item.kind === 'sleep' ? (await import('../lib/quick-add/sleep')).applyQuickAddSleep as (item: QuickAddKnown, stores: QuickAddStores, now: Date) => QuickAddWrite : applyQuickAdd;
      const write = apply(item, {health: health.data, habits: habits.data}, now);
      // Session AL (P-LS-48, LS-041): every save offers Undo in the app's toast; it puts the store record back.
      const line = savedLine(item, write.habitTotal);
      if (write.health) await changeWithUndo(health.update, current => apply(item, {health: current, habits: habits.data}, now).health!, line, {undone: 'Removed again.'});
      if (write.habits) await changeWithUndo(habits.update, current => apply(item, {health: health.data, habits: current}, now).habits!, line, {undone: 'Taken back.'});
      setSaved(line); setResult(null); setChosen(null); setText(''); setWake('');
    } catch (cause) {
      const message = plainErrorMessage(cause, '');
      setError(/scheduled/.test(message) && item.kind === 'habit' && item.day === 'yesterday' ? 'That habit wasn’t scheduled yesterday.' : message ? storageMessageOr(cause, message) : 'This line was not saved. Nothing was changed.');
    } finally { setBusy(false); }
  }
  // After a save the field is enabled again and takes focus for the next line.
  useEffect(() => { if (saved && !busy) field.current?.focus(); }, [saved, busy]);
  const found = chosen ?? (result && result.kind !== 'ambiguous' && result.kind !== 'needs-more' && result.kind !== 'unknown' ? result : null);
  // Session W Part 9: a night needs its wake time (the bedtime is worked out from it); nothing else is asked.
  const active = found?.kind === 'sleep' && wake ? {...found, wake} : found, needsWake = active?.kind === 'sleep' && !active.wake;
  const bedtime = active?.kind === 'sleep' && active.wake ? (() => { const [h, m] = active.wake.split(':').map(Number); const t = ((h! * 60 + m! - Math.round(active.minutes)) % 1440 + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; })() : null;
  if (onlyIfUnderstood && !saved && (!result || result.kind === 'unknown')) return null;
  return <form className="quick-add-line" aria-label="Type a line" onSubmit={event => { event.preventDefault(); preview(); }}>
    <label className="field"><span>Type a line</span><input ref={field} data-sheet-focus type="text" value={text} maxLength={200} autoComplete="off" enterKeyHint="go" placeholder="drank 2 glasses of water" disabled={!ready || busy} onChange={event => { setText(event.target.value); if (result) setResult(null); if (chosen) setChosen(null); if (task) setTask(null); }} /></label>
    <div className="actions"><button type="submit" className="quiet" disabled={!ready || busy || !text.trim()}>Preview</button></div>
    {!onlyIfUnderstood && <QuickAddMic disabled={!ready || busy} onText={words => { setText(words); preview(words); }}/>}
    <div aria-live="polite" className="quick-add-line-preview">
      {active && <div className="quick-add-line-card"><p className="quick-add-line-will">Will save: {describeQuickAdd(active)} · {active.day}</p>
        {active.kind === 'water' && active.shown.unit === 'glasses' && <p className="fine">A glass is counted as 250 mL.</p>}
        {active.kind === 'sleep' && <><label className="field"><span>When did you wake up ({active.day})?</span><input type="time" required value={wake} onChange={event => setWake(event.target.value)} /></label>
          <p className="fine">{bedtime ? `A night in Sleep: in bed from ${formatClock(bedtime)}, worked out from your wake time and how long you slept.` : 'It becomes a night in Health → Sleep, ending when you woke up.'} Time to fall asleep and time awake aren’t known, so Sleep marks it estimated.</p></>}
        <div className="actions"><button type="button" className="primary" disabled={busy || needsWake} onClick={() => void save(active)}>{busy ? 'Saving…' : 'Save'}</button><button type="button" className="quiet" disabled={busy} onClick={() => { setResult(null); setChosen(null); setText(''); setWake(''); field.current?.focus(); }}>Clear</button></div></div>}
      {task && <div className="quick-add-line-card" data-kind="task"><p className="quick-add-line-will">Will add a task: “<span dir="auto">{task.parsed.title}</span>”{task.parsed.due ? ` · ${task.parsed.due < tasksToday() ? `${formatDate(task.parsed.due, {weekday: true, year: false})} (overdue)` : task.parsed.due === tasksToday() ? 'today' : formatDate(task.parsed.due, {weekday: true, year: false})}` : ' · no day'}{task.parsed.time ? ` · ${formatClock(task.parsed.time)}` : ''}{task.parsed.recur ? ` · ${describeRecur(task.parsed.recur)}` : ''}{task.parsed.level ? ` · ${LEVEL_WORDS[task.parsed.level]}` : ''}{task.parsed.labels.map(l => ` · @${l}`).join('')}</p>
        <p className="fine">It goes to your Tasks Inbox{task.parsed.due ? ' and shows on your Agenda on its day' : ''}. Not a log: nothing is added to Health.</p>
        <div className="actions"><button type="button" className="primary" disabled={busy} onClick={() => void saveTask(task)}>{busy ? 'Saving…' : 'Add task'}</button>
          {task.confidence === 'maybe' && <button type="button" className="quiet" disabled={busy} onClick={() => { setTask(null); const read = parse(text, lineLanguage(text), context); setResult(read); }}>It’s a log, not a task</button>}
          <button type="button" className="quiet" disabled={busy} onClick={() => { setTask(null); setText(''); field.current?.focus(); }}>Clear</button></div></div>}
      {result?.kind === 'ambiguous' && !chosen && <div className="quick-add-line-card"><p>Did you mean…</p><div className="actions">{result.choices.map((choice, index) => <button key={index} type="button" className="secondary" onClick={() => setChosen(choice)}>{describeChoice(choice)}</button>)}</div></div>}
      {result?.kind === 'needs-more' && <p className="quick-add-line-hint">{result.hint}</p>}
      {multi && <Suspense fallback={null}><QuickAddBundle key={multi} line={multi} several today={habits.today} close={close} otherwise={<QuickLogCards line={multi} lang={lineLanguage(multi)} fallback={<p className="quick-add-line-hint" role="status">I didn’t understand those yet. Try: 2 glasses of water, read 20 minutes, a banana.</p>}/>}/></Suspense>}
      {result?.kind === 'unknown' && <Suspense fallback={null}><QuickAddBundle key={text} line={text} today={habits.today} close={close} otherwise={<QuickLogCards line={text} fallback={<p className="quick-add-line-hint" role="status">I didn’t understand that yet. Try: {result.examples.join(' · ')}. A to-do starts with “task” (task: call the bank tomorrow).</p>}/>}/></Suspense>}
      {saved && <p role="status" className="quick-add-line-saved">{saved}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  </form>;
}
