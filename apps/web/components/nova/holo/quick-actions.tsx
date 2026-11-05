'use client';
import Link from 'next/link';
import {useId, useState, type FormEvent} from 'react';
import {useHealth} from '../../health/use-health';
import {useHabits} from '../../habits/use-habits';
import {HabitCompletion} from '../../habits/habit-completion';
import {usePlatform} from '../../platform/use-platform';
import {usePomodoro} from '../../focus/use-pomodoro';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {changeWithUndo} from '../../ui/remove-with-undo';
import {showStatus, showUndo} from '../../ui/undo-toast';
import {addWater, bodyWeightGrams, dailyData} from '../../../lib/health-daily';
import {newHealthId, saveWeight} from '../../../lib/health';
import {waterButtons} from '../../../lib/health-quick/quick';
import {weightText} from '../../../lib/health-units';
import {habitDay} from '../../../lib/habits';
import {goalHref} from '../../../lib/checklist/derive';
import {FOCUS_SESSIONS} from '../../../lib/focus-sessions/schema';
import {POMODORO_DEFAULTS, cleanSettings} from '../../../lib/focus-sessions/pomodoro';
import {startPomodoro, stopPomodoro} from '../../../lib/focus-sessions/pomodoro-run';
import {TASKS} from '../../../lib/tasks/schema';
import {addTask} from '../../../lib/tasks/engine';
import {NOTES} from '../../../lib/notes/schema';
import {captureInto} from '../../../lib/notes/store';
import {plainErrorMessage} from '../../../lib/plain-error';
import {quickActionsFor, type QuickAction} from '../../../lib/nova/holo/actions';
import {useHealthHud} from './use-hud-data';

/**
 * Session AL Part 11 (lane L8): a HUD panel's quick actions (lib/nova/holo/actions.ts says which). Each writes a real
 * record through the page's own write function and its store hook — so the page, every other panel and every other tab
 * update at once (the stores' own change events and BroadcastChannel) — and offers the app's one Undo (showUndo or
 * changeWithUndo, which put the STORE record back). Money is never written here: "Add to a goal" opens the goal's own
 * contribution form.
 * Review m11 (lane L8d): each action is a small HUD panel too (corner brackets, the grid, its pillar's neon), and a habit
 * row keeps its name and its controls on one line.
 */
export default function QuickActions({widget}: {widget: string}) {
  return <div className="holo-actions">{quickActionsFor(widget).map(a => <Action key={a} kind={a}/>)}</div>;
}
function Action({kind}: {kind: QuickAction}) {
  switch (kind) {
    case 'water': return <WaterAction/>;
    case 'weight': return <WeightAction/>;
    case 'habit': return <HabitAction/>;
    case 'focus': return <FocusAction/>;
    case 'task': return <TaskAction/>;
    case 'goal': return <GoalAction/>;
    case 'note': return <NoteAction/>;
  }
}
const fail = (e: unknown, fallback: string) => showStatus(plainErrorMessage(e, fallback), {tone: 'error'});

function WaterAction() {
  const health = useHealth(), {day} = useHealthHud(), [busy, setBusy] = useState(false);
  const first = health.loaded && !health.error ? waterButtons(health.data)[0] : undefined;
  if (!first) return null;
  const amount = first.label.replace(/^Add /, '');
  const log = async () => {
    setBusy(true);
    // The same id and payload as Health's own water button and Today's one-tap water.
    try { await changeWithUndo(health.update, latest => addWater(latest, {id: newHealthId(), date: day, amountMilli: first.amountMilli, unit: first.unit}, new Date().toISOString()), `Water logged: ${amount}.`, {undone: 'Water entry removed.'}); }
    catch (e) { fail(e, 'Could not log water on this device.'); }
    finally { setBusy(false); }
  };
  return <section className="holo-action" data-pillar="health"><span className="holo-brackets" aria-hidden="true"/><h3>Water</h3><button type="button" className="nova-btn nova-btn-primary" disabled={busy} onClick={() => void log()}>Log {amount} of water</button></section>;
}
function WeightAction() {
  const health = useHealth(), {day} = useHealthHud(), id = useId(), [raw, setRaw] = useState(''), [error, setError] = useState('');
  if (!health.loaded || health.error) return null;
  const unit = dailyData(health.data).preferences.weightUnit, reading = health.data.weights.find(w => w.date === day);
  const save = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    let grams: number;
    try { grams = bodyWeightGrams(raw, unit); } catch (cause) { setError(plainErrorMessage(cause, 'Enter your weight as a number.')); return; }
    try { await changeWithUndo(health.update, latest => saveWeight(latest, {id: latest.weights.find(w => w.date === day)?.id ?? newHealthId(), date: day, grams}, new Date().toISOString()), `Weight saved: ${weightText(grams, unit)}.`, {undone: 'Weight entry put back as it was.'}); setRaw(''); }
    catch (cause) { setError(plainErrorMessage(cause, 'Could not save this weight on this device.')); }
  };
  return <section className="holo-action" data-pillar="health"><span className="holo-brackets" aria-hidden="true"/><h3>Weight</h3>
    <form className="holo-inline-form" onSubmit={e => void save(e)}>
      <label className="nova-field" htmlFor={`${id}-w`}><span>Weight today ({unit}){reading ? <small> · now {weightText(reading.grams, unit)}, a new one replaces it</small> : null}</span>
        <input id={`${id}-w`} value={raw} onChange={e => setRaw(e.target.value)} inputMode="decimal" autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined}/></label>
      <button type="submit" className="nova-btn">Log weight</button>
    </form>
    {error && <p id={`${id}-e`} className="nova-fine" role="alert">{error}</p>}
  </section>;
}
function HabitAction() {
  const habits = useHabits();
  if (!habits.loaded || habits.error) return null;
  const due = habits.data.habits.filter(h => { const d = habitDay(h, habits.today, habits.today); return d.scheduled && d.status !== 'skipped'; }).slice(0, 6);
  return <section className="holo-action" data-pillar="habits"><span className="holo-brackets" aria-hidden="true"/><h3>Tick a habit</h3>
    {due.length ? <ul className="holo-habit-list">{due.map(h => <li key={h.id}><span className="holo-habit-title">{h.title}</span><HabitCompletion habit={h} store={habits.card} part="controls" compact/></li>)}</ul>
      : <p className="nova-fine">No habit is due today. <Link className="nova-link" href="/app/habits?add=habit" prefetch={false}>Add a habit</Link></p>}
  </section>;
}
function FocusAction() {
  const snap = usePomodoro(), record = useDeviceRecord(FOCUS_SESSIONS);
  const saved = record.loaded && !record.unreadable ? record.data.pomodoro : undefined, settings = cleanSettings({...POMODORO_DEFAULTS, ...(saved ?? {})});
  const start = () => {
    try { startPomodoro({settings}); showUndo({message: `Focus timer started: ${settings.work} minutes.`, restore: () => stopPomodoro(), undone: 'Focus timer stopped.'}); }
    catch (e) { fail(e, 'The focus timer could not start here.'); }
  };
  return <section className="holo-action" data-pillar="habits"><span className="holo-brackets" aria-hidden="true"/><h3>Focus</h3>
    {snap.run ? <p className="nova-fine">A focus run is going. Its time left shows on the Focus panel and in Running now.</p>
      : <button type="button" className="nova-btn nova-btn-primary" onClick={start}>Start a {settings.work}-minute focus timer</button>}
  </section>;
}
function TaskAction() {
  const tasks = useDeviceRecord(TASKS), today = useLocalToday(), id = useId(), [title, setTitle] = useState(''), [error, setError] = useState('');
  const add = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    const words = title.trim();
    if (!words) { setError('Write a few words for the task first.'); return; }
    if (tasks.unreadable) { setError('Your tasks on this device could not be read, so nothing was changed.'); return; }
    try { await changeWithUndo(tasks.update, r => addTask(r, {title: words, due: today}, {id: `task_${crypto.randomUUID()}`, at: new Date(), today}), `Added “${words}” for today.`, {undone: `“${words}” removed.`}); setTitle(''); }
    catch (cause) { setError(plainErrorMessage(cause, 'This task could not be saved on this device.')); }
  };
  return <section className="holo-action" data-pillar="goals"><span className="holo-brackets" aria-hidden="true"/><h3>Add a task for today</h3>
    <form className="holo-inline-form" onSubmit={e => void add(e)}>
      <label className="nova-field" htmlFor={`${id}-t`}><span>New task</span><input id={`${id}-t`} value={title} maxLength={200} onChange={e => setTitle(e.target.value)} autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined}/></label>
      <button type="submit" className="nova-btn">Add task</button>
    </form>
    {error && <p id={`${id}-e`} className="nova-fine" role="alert">{error}</p>}
  </section>;
}
function GoalAction() {
  const platform = usePlatform();
  if (!platform.loaded || platform.error) return null;
  const goals = platform.data.goals.filter(g => g.status === 'active' && g.type !== 'PROJECT').slice(0, 6);
  return <section className="holo-action" data-pillar="goals"><span className="holo-brackets" aria-hidden="true"/><h3>Add to a goal</h3>
    {goals.length ? <><ul className="holo-goal-links">{goals.map(g => <li key={g.id}><Link className="nova-chip-link" href={`${goalHref(g.id)}?contribute=1#funding-wealth`} prefetch={false}>{g.name}</Link></li>)}</ul>
      <p className="nova-fine">Opens the goal’s own contribution form: you choose the amount there. Nothing moves from here.</p></>
      : <p className="nova-fine">No goal takes contributions yet. <Link className="nova-link" href="/app/goals/new" prefetch={false}>Set a goal</Link></p>}
  </section>;
}
function NoteAction() {
  const notes = useDeviceRecord(NOTES), today = useLocalToday(), id = useId(), [text, setText] = useState(''), [error, setError] = useState('');
  const capture = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (notes.unreadable) { setError('Your notes on this device could not be read, so nothing was changed.'); return; }
    try { await changeWithUndo(notes.update, r => captureInto(r, {text, day: today, now: new Date().toISOString(), source: 'nova'}).record, 'Note captured in your inbox.', {undone: 'Note removed.'}); setText(''); }
    catch (cause) { setError(plainErrorMessage(cause, 'This note could not be saved on this device.')); }
  };
  return <section className="holo-action" data-pillar="orbit"><span className="holo-brackets" aria-hidden="true"/><h3>Capture a note</h3>
    <form className="holo-inline-form" onSubmit={e => void capture(e)}>
      <label className="nova-field" htmlFor={`${id}-n`}><span>Your note</span><textarea id={`${id}-n`} rows={3} value={text} onChange={e => setText(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined}/></label>
      <button type="submit" className="nova-btn">Capture</button>
    </form>
    {error && <p id={`${id}-e`} className="nova-fine" role="alert">{error}</p>}
  </section>;
}
