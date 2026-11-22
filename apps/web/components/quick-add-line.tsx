'use client';
import {lazy, Suspense, useEffect, useMemo, useRef, useState} from 'react';
import {useHealth} from './health/use-health';
import {useHabits} from './habits/use-habits';
import {useHabitHealthLinks} from './habits/use-habit-health-links';
import {exerciseData} from '../lib/health-counters';
import {dailyData} from '../lib/health-daily';
import {latestHabitRule} from '../lib/habits';
import {parse, type QuickAddContext, type QuickAddKnown, type QuickAddResult} from '../lib/quick-add/parse';
import {describeChoice, describeQuickAdd, savedLine} from '../lib/quick-add/describe';
import {applyQuickAdd, type QuickAddStores, type QuickAddWrite} from '../lib/quick-add/save';
import {newHealthId} from '../lib/health';
import {storageMessageOr} from '../lib/storage-error-copy';
import {formatClock} from '../lib/visual-format';
import {plainErrorMessage} from '../lib/plain-error';
import {lineLanguage, splitItems} from '../lib/quick-log/multi';
import {QuickAddMic} from './quick-add-mic';
import {taskIntent, type TaskIntent} from '../lib/tasks/intent';
import {tasksToday} from '../lib/tasks/device';
import {describeRecur} from '../lib/tasks/recurrence';
import {LEVEL_WORDS} from '../lib/tasks/schema';
import {minutesWords} from '../lib/tasks/minutes';
import {lineList, pastedOutline} from '../lib/tasks/paste-list';
import {splitSuggestion, spokenTasks} from '../lib/tasks/split';
import {parseTaskLine, type ParsedTask} from '../lib/tasks/parse';
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
/**
 * Session AL fifth pass (MO-065, for L7): what one Save wrote, for ZIGi's and NOVA's actions log. `recordId` is the saved
 * record's own Activity id (a water, weight or movement entry's id; `habit:<id>:<day>` for a habit day), so Activity marks
 * that row and drops the line once the row is gone (Undo, Remove). A night or a counter has no such row here: null.
 */
export type QuickAddSaved = {kind: QuickAddKnown['kind']; title: string; recordId: string | null};
export function savedRecordId(item: QuickAddKnown, write: QuickAddWrite, at: string, id: string): string | null {
  if (item.kind === 'water' || item.kind === 'steps' || item.kind === 'activity') return id;
  if (item.kind === 'weight') return write.health?.weights.find(w => w.updatedAt === at)?.id ?? null;
  if (item.kind === 'habit') { const habit = write.habits?.habits.find(h => h.id === item.habitId), entry = habit?.entries.find(e => e.updatedAt === at); return habit && entry ? `habit:${habit.id}:${entry.date}` : null; }
  return null;
}
/** Session AV (1c, q1 #15): what a read task line saves (its deadline and minutes included). */
function taskInput(p: ParsedTask) {
  return {title: p.title, ...(p.due ? {due: p.due} : {}), ...(p.time ? {time: p.time} : {}), ...(p.level ? {level: p.level} : {}), ...(p.labels.length ? {labels: p.labels} : {}), ...(p.recur ? {recur: p.recur} : {}), ...(p.deadline ? {deadline: p.deadline} : {}), ...(p.minutes ? {minutes: p.minutes} : {}), ...(p.reminders?.length ? {reminders: p.reminders} : {})};
}
/** Session AV (1c, q1 #17): a to-do line naming several things ("taak: melk, brood en eieren"), each with words of its own. */
function severalOf(intent: TaskIntent): ParsedTask[] | null {
  // Session AV lane 2 (LEDGER #1; Todoist's split suggestion): a long line joined by "and then", "also" … is offered too.
  const items = lineList(intent.line) ?? splitSuggestion(intent.line);
  if (!items) return null;
  const today = tasksToday(), read = items.map(l => parseTaskLine(l, today));
  return read.every(p => p.title) ? read : null;
}
export function QuickAddLine({initialText, onlyIfUnderstood = false, close, onUnderstood, onSaved}: {initialText?: string; onlyIfUnderstood?: boolean; /** Closes Quick add when a confirmed goal opens the goal form. */ close?: () => void;
  /** Session AL (BN-069, for L7): told once whether `initialText` was understood (a preview shows), so ZIGi can leave out its examples list above a real preview. */
  onUnderstood?: (understood: boolean) => void;
  /** Session AL fifth pass (MO-065): told after a line is saved (ZIGi's and NOVA's answers note it in their actions log). */
  onSaved?: (saved: QuickAddSaved) => void} = {}) {
  const health = useHealth(), habits = useHabits(), links = useHabitHealthLinks();
  const [text, setText] = useState(''), [result, setResult] = useState<QuickAddResult | null>(null), [chosen, setChosen] = useState<QuickAddKnown | null>(null);
  const [saved, setSaved] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [wake, setWake] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const context = useMemo<QuickAddContext>(() => {
    const preferences = dailyData(health.data).preferences;
    return {
      habits: habits.data.habits.filter(h => latestHabitRule(h).state === 'active').map(h => { const rule = latestHabitRule(h); const measure = links.loaded ? links.data.links[h.id]?.measure : undefined; return {id: h.id, title: h.title, unit: 'unit' in rule.measurement ? rule.measurement.unit : 'done', kind: rule.measurement.kind, target: rule.target, ...(measure ? {healthMeasure: measure} : {})}; }),
      counters: exerciseData(health.data).counters.map(c => ({id: c.id, name: c.name})),
      waterUnit: preferences.waterUnit, weightUnit: preferences.weightUnit, today: habits.today,
    };
  }, [health.data, habits.data, habits.today, links.loaded, links.data.links]);
  const ready = health.loaded && habits.loaded && !health.error && !habits.error;
  const primed = useRef(false);
  // Session AL fifth pass (M-091): opened before Health and Habits were read, the sheet's Close held the focus; the field
  // takes it once it can be typed in, while its sheet is open and nothing else in it was chosen.
  useEffect(() => { const input = field.current, dialog = input?.closest('dialog'); if (!ready || !input || !dialog?.open) return; const at = document.activeElement; if (!at || at === document.body || at === dialog || (at instanceof HTMLElement && at.getAttribute('aria-label') === 'Close Quick add')) input.focus(); }, [ready]);
  const told = useRef(onUnderstood); told.current = onUnderstood;
  useEffect(() => { if (!initialText || primed.current || !ready) return; primed.current = true; setText(initialText); const read = parse(initialText, 'en', context); setResult(read); told.current?.(read.kind !== 'unknown'); }, [initialText, ready, context]);
  const [multi, setMulti] = useState<string | null>(null), [task, setTask] = useState<TaskIntent | null>(null);
  // Session AV (1c, q1 #17): a pasted list (one task per line), or a to-do line naming several things, as several tasks.
  const [taskList, setTaskList] = useState<ParsedTask[] | null>(null);
  // Session AV lane 2 (LEDGER #4; Todoist's Ramble): what "remove that" took out of a spoken list.
  const [dropped, setDropped] = useState<string[]>([]);
  /** A spoken line naming several to-dos ("buy milk and then call mum, remove that, book the dentist") as that many tasks. */
  function spoken(words: string): boolean {
    const said = spokenTasks(words), today = tasksToday();
    if (!said) return false;
    const read = said.items.map(l => taskIntent(l, today)?.parsed ?? null);
    if (!said.items.length || read.some(p => !p?.title)) return false;
    setSaved(''); setError(''); setResult(null); setChosen(null); setMulti(null); setTask(null); setDropped(said.removed);
    if (read.length === 1) { setTaskList(null); setTask({confidence: 'sure', parsed: read[0]!, line: said.items[0]!}); return true; }
    setTaskList(read as ParsedTask[]);
    return true;
  }
  /**
   * Session AL (P-LS-04, LS-004): a to-do ("call mom tomorrow at 5pm", "task buy milk", "remind me to floss at 21:00")
   * becomes a task preview, never a food or health log. A sure to-do is read before anything else; a line that only
   * might be one ("dentist friday 10am") is offered as a task when no log reading takes it.
   */
  function preview(line = text) {
    setSaved(''); setError(''); setChosen(null); setWake(''); setTask(null); setTaskList(null); setDropped([]);
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
      // Session AV (1c, q1 #15): the deadline and the minutes the line names are kept too (they are cut from the title).
      const p = intent.parsed, made = addTask(taskInput(p), {allowPast: true, ...(p.project ? {projectName: p.project} : {})});
      const {task: added, undo} = made;
      const words = `Task added: “${added.title}”${added.due ? ` · ${added.due === tasksToday() ? 'today' : formatDate(added.due, {weekday: true, year: false})}` : ''}${made?.project ? ` · in ${made.project.made ? 'the new project' : 'the project'} “${made.project.name}”` : ''}.`;
      showUndo({message: words, restore: undo, undone: `Task “${added.title}” removed.`, link: {href: `/app/tasks?task=${encodeURIComponent(added.id)}`, label: 'Open Tasks'}});
      setSaved(words); setTask(null); setText('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The task was not saved. Nothing was changed.'); }
    finally { setBusy(false); }
  }
  async function saveTaskList(list: ParsedTask[]) {
    setBusy(true); setError('');
    try {
      const {addTasks} = await import('../lib/tasks/device');
      const {tasks: added, undo} = addTasks(list.map(p => ({...taskInput(p), ...(p.project ? {projectName: p.project} : {})})), {allowPast: true});
      const words = `${added.length} tasks added to Tasks.`;
      showUndo({message: words, restore: undo, undone: `${added.length} tasks removed.`, link: {href: '/app/tasks', label: 'Open Tasks'}});
      setSaved(words); setTaskList(null); setTask(null); setText('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The tasks were not saved. Nothing was changed.'); }
    finally { setBusy(false); }
  }
  /** Session AV (1c, q1 #17): a pasted list of two lines or more is read as tasks, one per line (the field keeps one line). */
  function pasteList(raw: string): boolean {
    const list = pastedOutline(raw);
    if (!list) return false;
    const today = tasksToday(), read = list.lines.map(l => parseTaskLine(l, today)).filter(p => p.title);
    if (read.length < 2) return false;
    setSaved(''); setError(''); setResult(null); setChosen(null); setMulti(null); setTask(null); setText(list.lines[0]!); setTaskList(read);
    return true;
  }
  async function save(item: QuickAddKnown) {
    setBusy(true); setError('');
    try {
      const now = new Date(), id = newHealthId();
      // A night's code (Sleep) loads only when a sleep line is saved (Session W Part 9). Session AL fifth pass (MO-065): one id
      // for the preview and the write, so the record saved is the one named afterwards.
      const apply = item.kind === 'sleep' ? (await import('../lib/quick-add/sleep')).applyQuickAddSleep as (item: QuickAddKnown, stores: QuickAddStores, now: Date) => QuickAddWrite : (i: QuickAddKnown, stores: QuickAddStores, at: Date) => applyQuickAdd(i, stores, at, id);
      const write = apply(item, {health: health.data, habits: habits.data}, now);
      // Session AL (P-LS-48, LS-041): every save offers Undo in the app's toast; it puts the store record back.
      const line = savedLine(item, write.habitTotal), written: QuickAddWrite = {};
      if (write.health) await changeWithUndo(health.update, current => (written.health = apply(item, {health: current, habits: habits.data}, now).health!), line, {undone: 'Removed again.'});
      if (write.habits) await changeWithUndo(habits.update, current => (written.habits = apply(item, {health: health.data, habits: current}, now).habits!), line, {undone: 'Taken back.'});
      setSaved(line); setResult(null); setChosen(null); setText(''); setWake('');
      try { onSaved?.({kind: item.kind, title: line, recordId: savedRecordId(item, written, now.toISOString(), id)}); } catch { /* the record is saved; only the note is missing */ }
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
    <label className="field"><span>Type a line</span><input ref={field} data-sheet-focus type="text" value={text} maxLength={200} autoComplete="off" enterKeyHint="go" placeholder="drank 2 glasses of water" disabled={!ready || busy} onPaste={event => { const raw = event.clipboardData?.getData('text/plain') ?? ''; if (/[\r\n]/.test(raw.trim()) && pasteList(raw)) event.preventDefault(); }} onChange={event => { setText(event.target.value); if (result) setResult(null); if (chosen) setChosen(null); if (task) setTask(null); if (taskList) setTaskList(null); }} /></label>
    {/* Session AL (N-NB-24): Preview is the line's action, drawn as the app's secondary button (it was quiet grey text and looked disabled). */}
    <div className="actions"><button type="submit" className="secondary" disabled={!ready || busy || !text.trim()} aria-describedby={!ready || !text.trim() ? 'quick-add-preview-why' : undefined}>Preview</button>
      {/* Session AL (D-072, P-DVR-69): a disabled Preview says why */}
      <span id="quick-add-preview-why" className={ready ? 'sr-only' : 'fine quick-add-line-why'}>{health.error || habits.error ? 'Quick add needs your Health and Habits, which could not be read on this device.' : !ready ? 'Reading your habits and Health on this device…' : !text.trim() ? 'Type a line to preview it.' : ''}</span></div>
    {!onlyIfUnderstood && <QuickAddMic disabled={!ready || busy} onText={words => { setText(words); if (!spoken(words)) preview(words); }}/>}
    <div aria-live="polite" className="quick-add-line-preview">
      {dropped.length > 0 && (task || taskList) && <p className="fine">Left out, as you said “remove that”: “{dropped.join('”, “')}”.</p>}
      {active && <div className="quick-add-line-card"><p className="quick-add-line-will">Will save: {describeQuickAdd(active)} · {active.day}</p>
        {active.kind === 'water' && active.shown.unit === 'glasses' && <p className="fine">A glass is counted as 250 mL.</p>}
        {active.kind === 'sleep' && <><label className="field"><span>When did you wake up ({active.day})?</span><input type="time" required value={wake} onChange={event => setWake(event.target.value)} /></label>
          <p className="fine">{bedtime ? `A night in Sleep: in bed from ${formatClock(bedtime)}, worked out from your wake time and how long you slept.` : 'It becomes a night in Health → Sleep, ending when you woke up.'} Time to fall asleep and time awake aren’t known, so Sleep marks it estimated.</p></>}
        <div className="actions"><button type="button" className="primary" disabled={busy || needsWake} aria-describedby={needsWake ? 'quick-add-wake-hint' : undefined} onClick={() => void save(active)}>{busy ? 'Saving…' : 'Save'}</button>{/* Session AL (MO-064, for L7): a disabled Save says why */}{needsWake && <span id="quick-add-wake-hint" className="fine quick-add-line-why">Add your wake time to save.</span>}<button type="button" className="quiet" disabled={busy} onClick={() => { setResult(null); setChosen(null); setText(''); setWake(''); field.current?.focus(); }}>Clear</button></div></div>}
      {task && <div className="quick-add-line-card" data-kind="task"><p className="quick-add-line-will">Will add a task: “<span dir="auto">{task.parsed.title}</span>”{task.parsed.due ? ` · ${task.parsed.due < tasksToday() ? `${formatDate(task.parsed.due, {weekday: true, year: false})} (overdue)` : task.parsed.due === tasksToday() ? 'today' : formatDate(task.parsed.due, {weekday: true, year: false})}` : ' · no day'}{task.parsed.time ? ` · ${formatClock(task.parsed.time)}` : ''}{task.parsed.recur ? ` · ${describeRecur(task.parsed.recur)}` : ''}{task.parsed.deadline ? ` · deadline ${formatDate(task.parsed.deadline, {weekday: true, year: false})}` : ''}{task.parsed.minutes ? ` · takes ${minutesWords(task.parsed.minutes)}` : ''}{task.parsed.level ? ` · ${LEVEL_WORDS[task.parsed.level]}` : ''}{task.parsed.project ? ` · #${task.parsed.project}` : ''}{task.parsed.labels.map(l => ` · @${l}`).join('')}</p>
        <p className="fine">It goes to {task.parsed.project ? <>the project “<span dir="auto">{task.parsed.project}</span>” in Tasks</> : 'your Tasks Inbox'}{task.parsed.due ? ' and shows on your Agenda on its day' : ''}. Not a log: nothing is added to Health.</p>
        {severalOf(task) && <p className="fine">Or one task for each: “{severalOf(task)!.map(p => p.title).join('”, “')}”.</p>}
        <div className="actions"><button type="button" className="primary" disabled={busy} onClick={() => void saveTask(task)}>{busy ? 'Saving…' : 'Add task'}</button>
          {severalOf(task) && <button type="button" className="secondary" disabled={busy} onClick={() => { setTaskList(severalOf(task)); setTask(null); }}>Make {severalOf(task)!.length} tasks</button>}
          {task.confidence === 'maybe' && <button type="button" className="quiet" disabled={busy} onClick={() => { setTask(null); const read = parse(text, lineLanguage(text), context); setResult(read); }}>It’s a log, not a task</button>}
          <button type="button" className="quiet" disabled={busy} onClick={() => { setTask(null); setText(''); field.current?.focus(); }}>Clear</button></div></div>}
      {taskList && <div className="quick-add-line-card" data-kind="tasks" role="group" aria-label={`${taskList.length} tasks`}><p className="quick-add-line-will">Will add {taskList.length} tasks:</p>
        <ol className="quick-add-line-tasks">{taskList.map((p, i) => <li key={i}><span dir="auto">{p.title}</span>{p.due ? ` · ${p.due === tasksToday() ? 'today' : formatDate(p.due, {weekday: true, year: false})}` : ''}{p.time ? ` · ${formatClock(p.time)}` : ''}{p.deadline ? ` · deadline ${formatDate(p.deadline, {weekday: true, year: false})}` : ''}{p.minutes ? ` · takes ${minutesWords(p.minutes)}` : ''}{p.project ? ` · #${p.project}` : ''}</li>)}</ol>
        <p className="fine">They go to your Tasks; one Undo takes them all back. Not a log: nothing is added to Health.</p>
        <div className="actions"><button type="button" className="primary" disabled={busy} onClick={() => void saveTaskList(taskList)}>{busy ? 'Saving…' : `Add ${taskList.length} tasks`}</button>
          <button type="button" className="quiet" disabled={busy} onClick={() => { setTaskList(null); setText(''); field.current?.focus(); }}>Clear</button></div></div>}
      {result?.kind === 'ambiguous' && !chosen && <div className="quick-add-line-card"><p>Did you mean…</p><div className="actions">{result.choices.map((choice, index) => <button key={index} type="button" className="secondary" onClick={() => setChosen(choice)}>{describeChoice(choice)}</button>)}</div></div>}
      {result?.kind === 'needs-more' && <p className="quick-add-line-hint">{result.hint}</p>}
      {multi && <Suspense fallback={null}><QuickAddBundle key={multi} line={multi} several today={habits.today} close={close} otherwise={<QuickLogCards line={multi} lang={lineLanguage(multi)} fallback={<p className="quick-add-line-hint" role="status">I didn’t understand those yet. Try: 2 glasses of water, read 20 minutes, a banana.</p>}/>}/></Suspense>}
      {result?.kind === 'unknown' && <Suspense fallback={null}><QuickAddBundle key={text} line={text} today={habits.today} close={close} otherwise={<QuickLogCards line={text} fallback={<p className="quick-add-line-hint" role="status">I didn’t understand that yet. Try: {result.examples.join(' · ')}. A to-do starts with “task” (task: call the bank tomorrow).</p>}/>}/></Suspense>}
      {saved && <p role="status" className="quick-add-line-saved">{saved}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  </form>;
}
