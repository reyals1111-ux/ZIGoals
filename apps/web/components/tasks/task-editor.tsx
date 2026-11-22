'use client';
import {DEADLINE_REPEAT_MESSAGE, pausedDue, PAUSE_PAST_MESSAGE} from '../../lib/tasks/engine';
import {addLocalDays} from '../../lib/local-date';
import {minutesWords} from '../../lib/tasks/minutes';
import {Suspense, lazy, useId, useRef, useState, type FormEvent} from 'react';
import {HEALTH_LINKS, LEVEL_WORDS, TASK_NOTES_MAX, taskLevel, type HealthLink, type Recur, type Task, type TaskLevel, type Tasks} from '../../lib/tasks/schema';
import {describeRecur, firstDue} from '../../lib/tasks/recurrence';
import {parseTaskLine} from '../../lib/tasks/parse';
import {REMINDER_CHOICES} from '../../lib/tasks/reminders';
import {formatClock, formatDate} from '../../lib/visual-format';
import {COMMENT_MAX, COMMENTS_MAX, commentParts, weekStart} from '../../lib/tasks/layouts';
import {HEALTH_WORDS, TaskTitleInput, type EditScope} from './task-parts';
import type {GoalOption} from './use-goal-options';
import type {TaskPatch} from './use-task-list';
import {TaskFieldInputs, useTaskFields} from './task-fields';

const HabitLinkField = lazy(() => import('./habit-link-field'));
/** Session AV lane 2 (roadmap, LEDGER #8): photos and voice notes on the task, on this device (its own chunk). */
const TaskAttachments = lazy(() => import('./task-attachments'));
/** Session AV lane 2 (tasks-r2, LEDGER #223): in or out of today's My Day (its own chunk). */
const MyDayButton = lazy(() => import('./my-day-parts'));
/** Session AV (1c, q1 #1): the editor offers up to three reminders a task (the record keeps up to five). */
const MAX_EDITOR_REMINDERS = 3;

// Session AL fourth pass (LS-067): the task editor in its own chunk (task-parts.tsx loads it when a task is first edited).
/** A repeat typed in words ("every month on the 1st"), read with the Tasks line reader. */
export function readRepeat(text: string, day: string): Recur | null | 'invalid' {
  const clean = text.trim();
  if (!clean) return null;
  const read = parseTaskLine(/^(every|each|daily|weekly|monthly|yearly|annually)/i.test(clean) ? clean : `every ${clean}`, day);
  return read.recur && !read.title ? read.recur : 'invalid';
}

/**
 * The full editor. Session AL: title, notes, priority, day, time, repeat (in words), reminders, project and section,
 * labels, and links to a goal, a habit or a Health area; Escape cancels (LS-H09); a blank title says why (LS-052).
 */
export function TaskEditor({task, today, goals, linked, record, habits = [], onSave, onCancel}: {task: Task; today: string; goals: readonly GoalOption[]; /** The goal the task is linked to, also when it is no longer active (finished). */ linked?: GoalOption; record?: Tasks; habits?: readonly {id: string; title: string}[]; onSave: (patch: TaskPatch, scope?: EditScope) => void; onCancel: () => void}) {
  const id = useId();
  // C-LS-08: an edit to a repeating task asks first whether it is for this time only or for this and every time after.
  const [ask, setAsk] = useState<TaskPatch | null>(null), askRef = useRef<HTMLButtonElement>(null);
  const [title, setTitle] = useState(task.title), [level, setLevel] = useState<TaskLevel>(taskLevel(task)), [due, setDue] = useState(task.due ?? ''), [time, setTime] = useState(task.time ?? ''), [goal, setGoal] = useState(task.goal ?? '');
  const [deadline, setDeadline] = useState(task.deadline ?? '');
  // Session AV (owner follow-up 1, F-REPEAT-PAUSE): pause a repeating task until a day.
  const [pauseUntil, setPauseUntil] = useState(''), [pauseError, setPauseError] = useState('');
  const pause = () => { try { const d = pausedDue(task, pauseUntil, today); setPauseError(''); onSave({due: d}, 'all'); } catch (e) { setPauseError(e instanceof Error ? e.message : PAUSE_PAST_MESSAGE); } };
  // Session AV (owner follow-up 1, F-TASK-MINUTES): how long it takes, in minutes.
  const [minutes, setMinutes] = useState(task.minutes ? String(task.minutes) : ''), minutesValue = minutes.trim() === '' ? null : /^\d{1,4}$/.test(minutes.trim()) && Number(minutes) >= 1 && Number(minutes) <= 1440 ? Number(minutes) : 'invalid' as const;
  const [notes, setNotes] = useState(task.notes ?? ''), [repeat, setRepeat] = useState(task.recur?.text ?? (task.recur ? describeRecur(task.recur).replace(/ \(\d+ left\)$/, '').toLowerCase() : '')), [labels, setLabels] = useState((task.labels ?? []).map(l => `@${l}`).join(' '));
  const [projectId, setProjectId] = useState(task.projectId ?? ''), [sectionId, setSectionId] = useState(task.sectionId ?? ''), [reminders, setReminders] = useState<string[]>(() => (task.reminders ?? []).filter(r => !r.at).map(r => String(r.before)));
  // Session AV lane 2 (tasks, LEDGER #3, #17, #25, #27, #8, #23): a reminder at its own date and time, start-early days, a
  // background task, the minutes worked, the week objective and comments (text and links, on this device).
  const [remindAt, setRemindAt] = useState(() => task.reminders?.find(r => r.at)?.at ?? ''), [early, setEarly] = useState(task.early ? String(task.early) : ''), [parallel, setParallel] = useState(!!task.parallel);
  const [spent, setSpent] = useState(task.spent ? String(task.spent) : ''), spentValue = spent.trim() === '' ? null : /^\d{1,5}$/.test(spent.trim()) ? Number(spent) : 'invalid' as const;
  const [objective, setObjective] = useState(task.objective ?? ''), [comments, setComments] = useState(task.comments ?? []), [comment, setComment] = useState('');
  const weekNow = weekStart(today), objectives = (record?.objectives ?? []).filter(o => o.week >= weekNow || o.id === objective);
  const [habit, setHabit] = useState(task.habit ?? ''), [health, setHealth] = useState<string>(task.health ?? ''), [titleError, setTitleError] = useState('');
  const known = goals.some(g => g.key === goal || g.id === goal);
  const recur = readRepeat(repeat, due || today), repeatsNow = recur !== null && (recur !== 'invalid' || !!task.recur);
  // Session AL (P-LS-46, LS-048): the task changed elsewhere (another tab, ZIGi) while this editor was open.
  const base = useRef(task.updatedAt ?? task.createdAt), stale = (task.updatedAt ?? task.createdAt) !== base.current;
  const sections = (record?.sections ?? []).filter(s => s.projectId === projectId);
  // Session AV lane 2 (tasks-r2, LEDGER #229): the values of the chosen project's own fields.
  const custom = useTaskFields(task, record, projectId);
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setTitleError('A task needs a title.'); return; }
    if (recur === 'invalid' || minutesValue === 'invalid' || spentValue === 'invalid') return;
    const fieldValues = custom.read(); if (fieldValues === 'invalid') return;
    // Session AV (1c, q1 #15): a repeating task has no separate deadline (the engine refuses one); the field said so.
    const repeating = !!recur;
    const unchangedRepeat = task.recur && repeat === (task.recur.text ?? describeRecur(task.recur).replace(/ \(\d+ left\)$/, '').toLowerCase());
    const patch: TaskPatch = {title, level, due: due || null, time: due && time ? time : null, goal: goal || null, notes: notes.trim() ? notes : null, deadline: deadline && !repeating ? deadline : null, minutes: minutesValue,
      ...(unchangedRepeat ? {} : {recur: recur ? {...recur, text: repeat.trim().slice(0, 120)} : null}),
      labels: labels.split(/[\s,]+/).map(l => l.replace(/^@/, '')).filter(Boolean),
      ...(record ? {projectId: projectId || null, sectionId: sectionId || null} : {}),
      reminders: [...[...new Set(reminders.filter(r => r !== '').map(Number))].slice(0, MAX_EDITOR_REMINDERS).map(before => ({before})), ...(remindAt ? [{before: 0, at: remindAt}] : [])], habit: habit || null, health: (health || null) as HealthLink | null,
      early: due && early ? Number(early) : null, parallel: parallel ? true : null, spent: spentValue, objective: objective || null, comments, ...(fieldValues !== undefined ? {fields: fieldValues} : {})};
    // A change to the repeat itself is a change to the series; anything else on a repeating task asks which times.
    if (task.recur && task.due && !task.doneAt && unchangedRepeat) { setAsk(patch); requestAnimationFrame(() => askRef.current?.focus()); return; }
    onSave(patch);
  };
  if (ask) return <div className="task-editor tasks-add task-editor-scope" role="group" aria-labelledby={`${id}-scope`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setAsk(null); } }}>
    <p id={`${id}-scope`}><strong dir="auto">“{task.title}”</strong> repeats ({describeRecur(task.recur!)}). Change only this time ({formatDate(task.due!, {weekday: true, year: false})}), or this and every time after?</p>
    <span className="task-editor-actions">
      <button ref={askRef} type="button" className="secondary" onClick={() => onSave(ask, 'one')}>Only this time</button>
      <button type="button" className="secondary" onClick={() => onSave(ask, 'all')}>This and all future times</button>
      <button type="button" className="quiet" onClick={() => setAsk(null)}>Back to the edit</button>
    </span>
  </div>;
  return <form className="task-editor tasks-add" aria-label={`Edit “${task.title}”`} onSubmit={save} noValidate onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); } }}>
    {stale && <p className="notice task-editor-stale" role="status">This task was changed in another tab or by an assistant while you edited it. Save to keep your version, or Cancel and open it again to see theirs.</p>}
    <TaskTitleInput label="Title" value={title} error={titleError} onChange={v => { setTitle(v); if (v.trim()) setTitleError(''); }} />
    <label className="field"><span>Priority</span><select value={level} onChange={e => setLevel(Number(e.target.value) as TaskLevel)}>{([1, 2, 3, 4] as const).map(p => <option key={p} value={p}>{LEVEL_WORDS[p]}</option>)}</select></label>
    <label className="field"><span>Due</span><input type="date" value={due} aria-describedby={due && due < today ? `${id}-past` : undefined} onChange={e => { setDue(e.target.value); if (!e.target.value) setTime(''); }} />{due && due < today && <small id={`${id}-past`} className="tasks-field-note">A past day: it shows as overdue.</small>}</label>
    <label className="field"><span>Time</span><input type="time" value={time} disabled={!due} onChange={e => setTime(e.target.value)} /></label>
    <Suspense fallback={null}><MyDayButton task={task} today={today}/></Suspense>
    {/* Session AV (owner follow-up 1, F-DEADLINES): the day it must be done by, apart from the day it is planned for. */}
    {/* Session AV (1c, q1 #15): off while the task repeats, with the engine's own sentence. */}
    <label className="field"><span>Deadline — optional</span><input type="date" value={repeatsNow ? '' : deadline} disabled={repeatsNow} aria-describedby={`${id}-deadline`} onChange={e => setDeadline(e.target.value)} /></label>
    <small id={`${id}-deadline`} className={!repeatsNow && deadline && due && deadline < due ? 'tasks-field-error' : 'tasks-field-note'}>{repeatsNow ? DEADLINE_REPEAT_MESSAGE : deadline && due && deadline < due ? 'The deadline is before the planned day. Move one of them, or keep it: the task shows in Today from its deadline.' : 'The day it must be done by. Due is the day you plan to do it; from its deadline the task is also in Today.'}</small>
    <label className="field"><span>Takes (minutes) — optional</span><input inputMode="numeric" autoComplete="off" value={minutes} placeholder="30" aria-describedby={`${id}-minutes`} aria-invalid={minutesValue === 'invalid' || undefined} onChange={e => setMinutes(e.target.value)} />
      <small id={`${id}-minutes`} className={minutesValue === 'invalid' ? 'tasks-field-error' : 'tasks-field-note'} role={minutesValue === 'invalid' ? 'alert' : undefined}>{minutesValue === 'invalid' ? 'Enter whole minutes from 1 to 1,440, for example 30 or 90.' : minutesValue ? `About ${minutesWords(minutesValue)}; Today adds up the minutes of the day.` : 'How long it takes. Today adds up the minutes of its tasks.'}</small></label>
    <label className="field"><span>Repeat</span><input value={repeat} maxLength={120} placeholder="every Monday" aria-describedby={`${id}-repeat`} aria-invalid={recur === 'invalid' || undefined} onChange={e => setRepeat(e.target.value)} />
      <small id={`${id}-repeat`} className={recur === 'invalid' ? 'tasks-field-error' : 'tasks-field-note'} role={recur === 'invalid' ? 'alert' : undefined}>{recur === 'invalid' ? 'Try “every Monday”, “every 2 weeks”, “every month on the 1st” or “every! 3 days”.' : recur ? `${describeRecur(recur)}${due ? '' : ' · starts today'}` : 'Empty: it does not repeat.'}</small></label>
    {task.recur && !task.doneAt && <div className="task-editor-pause" role="group" aria-labelledby={`${id}-pause`}>
      <span id={`${id}-pause`} className="task-editor-pause-title">Pause the repeat</span>
      {/* Session AV lane 2 (q1 #43 Minor): a paused repeat says so, with Resume (its next day from today). */}
      {(() => { const natural = task.due && !task.recur.afterDone && task.recur.interval === 1 ? firstDue(task.recur, today) : null; return natural && task.due! > natural ? <p className="task-editor-paused" role="note">Paused until {formatDate(task.due!, {weekday: true, year: task.due!.slice(0, 4) !== today.slice(0, 4)})}. <button type="button" className="text-link" onClick={() => onSave({due: natural}, 'all')}>Resume from {formatDate(natural, {weekday: true, year: false})}</button></p> : null; })()}
      <label className="field"><span>Until</span><input type="date" min={addLocalDays(today, 1)} value={pauseUntil} aria-invalid={pauseError ? true : undefined} aria-describedby={pauseError ? `${id}-pause-error` : `${id}-pause-note`} onChange={e => { setPauseUntil(e.target.value); setPauseError(''); }} /></label>
      <button type="button" className="secondary" disabled={!pauseUntil} onClick={pause}>Pause until then</button>
      {pauseError ? <small id={`${id}-pause-error`} className="tasks-field-error" role="alert">{pauseError}</small> : <small id={`${id}-pause-note`} className="tasks-field-note">The times before that day are skipped, not marked done; it comes back on its first day from then.</small>}
    </div>}
    {/* Session AV (1c, q1 #1; Todoist, TickTick): more than one reminder, up to three here. */}
    {(reminders.length ? reminders : ['']).map((value, i) => <label key={i} className="field"><span>{i === 0 ? 'Reminder' : `Reminder ${i + 1}`}</span><select value={value} disabled={!due} onChange={e => { const v = e.target.value; setReminders(rs => { const next = rs.length ? [...rs] : ['']; next[i] = v; return i > 0 && v === '' ? next.filter((_, k) => k !== i) : next; }); }}><option value="">{i === 0 ? 'None' : 'Remove this reminder'}</option>{REMINDER_CHOICES.map(c => <option key={c.before} value={c.before} disabled={reminders.some((r, k) => k !== i && r === String(c.before))}>{c.label}</option>)}</select></label>)}
    {/* Session AV lane 2 (LEDGER #3; Todoist, TickTick): a reminder at a date and time of its own, also for a task with no day. */}
    <label className="field"><span>Remind me at — optional</span><input type="datetime-local" value={remindAt} aria-describedby={`${id}-remind-at`} onChange={e => setRemindAt(e.target.value.slice(0, 16))} />
      <small id={`${id}-remind-at`} className="tasks-field-note">{remindAt ? `A reminder on ${formatDate(remindAt.slice(0, 10), {weekday: true, year: false})} at ${formatClock(remindAt.slice(11, 16))}.` : 'Any day and time, apart from the task’s own. In the add line, “!2h” reminds 2 hours before and “!18:30” at that time.'}</small></label>
    {/* Session AV lane 2 (LEDGER #17; Things' start early): in Today some days before its day. */}
    <label className="field"><span>Start early</span><select value={early} disabled={!due} onChange={e => setEarly(e.target.value)}><option value="">On its day</option>{[1, 2, 3, 5, 7, 14].map(n => <option key={n} value={n}>{n === 1 ? '1 day before' : `${n} days before`}</option>)}</select></label>
    {/* Session AV lane 2 (LEDGER #27; Sunsama's background tasks). */}
    <label className="task-editor-check"><input type="checkbox" checked={parallel} onChange={e => setParallel(e.target.checked)} /> <span>Runs in the background (a wash, a download): not added to the day’s minutes</span></label>
    <label className="field"><span>Time spent (minutes) — optional</span><input inputMode="numeric" autoComplete="off" value={spent} placeholder="0" aria-invalid={spentValue === 'invalid' || undefined} aria-describedby={`${id}-spent`} onChange={e => setSpent(e.target.value)} />
      <small id={`${id}-spent`} className={spentValue === 'invalid' ? 'tasks-field-error' : 'tasks-field-note'} role={spentValue === 'invalid' ? 'alert' : undefined}>{spentValue === 'invalid' ? 'Enter whole minutes, for example 25.' : typeof minutesValue === 'number' && typeof spentValue === 'number' ? `Planned ${minutesWords(minutesValue)}, spent ${minutesWords(spentValue)}.` : 'The timer in Tasks → Today adds to this; you can also type it.'}</small></label>
    {objectives.length > 0 && <label className="field"><span>Week objective</span><select value={objective} onChange={e => setObjective(e.target.value)}><option value="">None</option>{objectives.map(o => <option key={o.id} value={o.id}>{o.title}{o.week !== weekNow ? ` (week of ${formatDate(o.week, {year: false})})` : ''}</option>)}</select></label>}
    {due && reminders.length > 0 && reminders.length < MAX_EDITOR_REMINDERS && reminders.every(r => r !== '') && <p className="task-editor-more-reminders"><button type="button" className="text-link" onClick={() => setReminders(rs => [...rs, ''])}>+ Add another reminder</button></p>}
    {record && <label className="field"><span>Project</span><select value={projectId} onChange={e => { setProjectId(e.target.value); setSectionId(''); }}><option value="">Inbox</option>{(record.projects ?? []).filter(p => !p.archived || p.id === projectId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    {record && sections.length > 0 && <label className="field"><span>Section</span><select value={sectionId} onChange={e => setSectionId(e.target.value)}><option value="">No section</option>{sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
    <TaskFieldInputs fields={custom} />
    <label className="field"><span>Labels</span><input value={labels} maxLength={400} placeholder="@calls @home" onChange={e => setLabels(e.target.value)} /></label>
    {(goals.length > 0 || goal) && <label className="field"><span>Goal</span><select value={goal} onChange={e => setGoal(e.target.value)}><option value="">No goal</option>{!known && goal && <option value={goal}>{linked && (linked.key === goal || linked.id === goal) ? `${linked.name}${linked.closed ? ` (${linked.closed})` : ''}` : 'A goal no longer here'}</option>}{goals.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}</select></label>}
    {habits.length > 0 ? <label className="field"><span>Habit</span><select value={habit} onChange={e => setHabit(e.target.value)}><option value="">No habit</option>{habit && !habits.some(h => h.id === habit) && <option value={habit}>A habit no longer here</option>}{habits.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}</select></label>
      : <Suspense fallback={null}><HabitLinkField value={habit} onChange={setHabit} /></Suspense>}
    <label className="field"><span>Health</span><select value={health} onChange={e => setHealth(e.target.value)}><option value="">Not about Health</option>{HEALTH_LINKS.map(h => <option key={h} value={h}>{HEALTH_WORDS[h]}</option>)}</select></label>
    <label className="field task-editor-notes"><span>Notes</span><textarea dir="auto" value={notes} maxLength={TASK_NOTES_MAX} rows={3} onChange={e => setNotes(e.target.value)} /></label>
    {/* Session AV lane 2 (LEDGER #8; Todoist's comments): a thread of short notes, links open in a new tab; kept with Save. */}
    <div className="task-editor-comments" role="group" aria-labelledby={`${id}-comments`}>
      <span id={`${id}-comments`} className="task-editor-pause-title">Comments{comments.length ? ` (${comments.length})` : ''}</span>
      {comments.length > 0 ? <ul className="task-comments">{comments.map(c => <li key={c.id}><small>{formatDate(c.at.slice(0, 10), {year: false})}</small> <span dir="auto">{commentParts(c.text).map((p, i) => p.href ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow">{p.text}</a> : <span key={i}>{p.text}</span>)}</span>
        <button type="button" className="text-link" aria-label={`Remove the comment “${c.text.slice(0, 40)}”`} onClick={() => setComments(cs => cs.filter(x => x.id !== c.id))}>Remove</button></li>)}</ul> : <p className="fine">No comments yet. Add a thought, a phone number or a link (a web address opens in a new tab).</p>}
      <label className="field"><span>New comment</span><textarea dir="auto" value={comment} maxLength={COMMENT_MAX} rows={2} onChange={e => setComment(e.target.value)} /></label>
      <button type="button" className="secondary" disabled={!comment.trim() || comments.length >= COMMENTS_MAX} onClick={() => { setComments(cs => [...cs, {id: `c_${crypto.randomUUID().slice(0, 12)}`, at: new Date().toISOString(), text: comment.trim()}]); setComment(''); }}>Add comment</button>
      <small className="tasks-field-note">Comments are kept with the task when you Save, on this device only.</small>
    </div>
    <Suspense fallback={null}><TaskAttachments taskId={task.id} taskTitle={task.title} liveTaskIds={record?.tasks.map(t => t.id)}/></Suspense>
    <span className="task-editor-actions"><button type="submit" className="secondary">Save</button><button type="button" className="quiet" onClick={onCancel}>Cancel</button></span>
  </form>;
}

export default TaskEditor;
