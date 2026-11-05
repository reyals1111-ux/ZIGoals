'use client';
import {useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import type {ParseSpan, ParsedTask} from '../../lib/tasks/parse';
import {describeRecur} from '../../lib/tasks/recurrence';
import {projectByName, type TaskInput} from '../../lib/tasks/engine';
import {LEVEL_WORDS, type TaskLevel, type Tasks} from '../../lib/tasks/schema';
import type {GoalOption} from './use-goal-options';
import {formatClock, formatDate} from '../../lib/visual-format';
import {TaskTitleInput} from './task-parts';

/**
 * Session AL (Part 8, P-LS-03, LS-001): the Tasks page's add line. What the line reader takes out (a day, a time, a
 * repeat, p1–p4, #project, @label) is shown as marked pieces under the field, each with "Keep as text" (Todoist's
 * escape), and the preview says exactly what Add will save. A #project that does not exist yet is made on Add (said in
 * the preview). Nothing is saved before Add. `defaults` come from the view (a project's view adds into that project).
 */
/**
 * CI14 (page weights; budgets are never raised): the line reader (lib/tasks/parse.ts) is a chunk of its own, asked for as
 * soon as this module loads (it is there long before a first word is typed). In the moment before it arrives, a line reads
 * as its plain words, and Add waits for the reader, so what is saved is always the line as read.
 */
type Parse = typeof import('../../lib/tasks/parse').parseTaskLine;
let parser: Parse | null = null;
const loadParser = () => import('../../lib/tasks/parse').then(m => (parser = m.parseTaskLine));
if (typeof window !== 'undefined') void loadParser().catch(() => undefined);
const plainLine = (text: string): ParsedTask => ({title: text.replace(/\s+/g, ' ').trim(), labels: [], spans: []});
const KIND_WORDS: Record<ParseSpan['kind'], string> = {date: 'Day', time: 'Time', recur: 'Repeat', priority: 'Priority', project: 'Project', label: 'Label'};
/** "More options" (Session AK G2, R2-17, kept): priority, a day, a time and a goal for the line; what the line itself says wins. */
const PRIORITY_CHOICES: [string, TaskLevel, string][] = [['high', 1, LEVEL_WORDS[1]], ['medium', 2, LEVEL_WORDS[2]], ['normal', 3, LEVEL_WORDS[3]], ['low', 4, LEVEL_WORDS[4]]];
export function SmartAdd({record, today, onAdd, defaults = {}, inputRef, makeProject, goals = []}: {record: Tasks; today: string; onAdd: (input: TaskInput) => boolean; defaults?: Partial<TaskInput>; inputRef?: React.RefObject<HTMLInputElement | null>; makeProject: (name: string) => string | null; goals?: readonly GoalOption[]}) {
  const [more, setMore] = useState(false), [priority, setPriority] = useState('normal'), [due, setDue] = useState(''), [time, setTime] = useState(''), [goal, setGoal] = useState('');
  const chosenLevel = PRIORITY_CHOICES.find(c => c[0] === priority)?.[1];
  const id = useId(), [text, setText] = useState(''), [keep, setKeep] = useState<number[]>([]), [error, setError] = useState('');
  const own = useRef<HTMLInputElement>(null), field = inputRef ?? own;
  const [reader, setReader] = useState<Parse | null>(() => parser);
  useEffect(() => { if (!reader) loadParser().then(fn => setReader(() => fn), () => undefined); }, [reader]);
  const parsed = useMemo(() => reader ? reader(text, today, {keep}) : plainLine(text), [reader, text, today, keep]);
  const existing = parsed.project ? projectByName(record, parsed.project) : undefined;
  const pieces: string[] = [];
  if (parsed.due) pieces.push(parsed.due < today ? `${formatDate(parsed.due, {weekday: true})} (overdue)` : parsed.due === today ? 'Today' : formatDate(parsed.due, {weekday: true, year: parsed.due.slice(0, 4) !== today.slice(0, 4)}));
  if (parsed.time) pieces.push(formatClock(parsed.time));
  if (parsed.recur) pieces.push(describeRecur(parsed.recur));
  if (parsed.level) pieces.push(LEVEL_WORDS[parsed.level]);
  if (parsed.project) pieces.push(existing ? `#${existing.name}` : `#${parsed.project} (a new project)`);
  for (const l of parsed.labels) pieces.push(`@${l}`);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setError('Type a task first.'); setText(''); field.current?.focus(); return; }
    if (reader) add(parsed);
    else void loadParser().then(fn => { setReader(() => fn); add(fn(text, today, {keep})); }, () => add(plainLine(text)));
  };
  const add = (parsed: ParsedTask) => {
    const existing = parsed.project ? projectByName(record, parsed.project) : undefined;
    if (!parsed.title) { setError('Add a few words for the task itself, not only a day or a tag.'); return; }
    let projectId = defaults.projectId;
    if (parsed.project) { const made = existing?.id ?? makeProject(parsed.project); if (!made) return; projectId = made; }
    const fromMore: Partial<TaskInput> = more ? {...(chosenLevel && chosenLevel !== 3 ? {level: chosenLevel} : {}), ...(due ? {due} : {}), ...(due && time ? {time} : {}), ...(goal ? {goal} : {})} : {};
    const input: TaskInput = {...defaults, ...fromMore, title: parsed.title, ...(projectId ? {projectId} : {}), ...(parsed.project && projectId !== defaults.projectId ? {sectionId: undefined} : {}),
      ...(parsed.due ? {due: parsed.due} : {}), ...(parsed.time ? {time: parsed.time} : {}), ...(parsed.level ? {level: parsed.level} : {}),
      ...(parsed.recur ? {recur: {...parsed.recur, text: parsed.spans.find(s => s.kind === 'recur')?.text.slice(0, 120)}} : {}),
      labels: [...new Set([...(defaults.labels ?? []), ...parsed.labels])]};
    if (onAdd(input)) { setText(''); setKeep([]); setError(''); field.current?.focus(); }
  };
  return <form className="tasks-smart-add" onSubmit={submit} aria-label="Add a task" noValidate>
    <div className="tasks-smart-row">
      <TaskTitleInput inputRef={field} label="New task" value={text} error={error} describedBy={`${id}-preview ${id}-help`}
        placeholder="Pay rent every month on the 1st p1 #Home @bills" onChange={v => { setText(v); if (error && v.trim()) setError(''); if (!v) setKeep([]); }} />
      <button type="submit" className="secondary">Add task</button>
      <button type="button" className="quiet tasks-add-toggle" aria-expanded={more} aria-controls={`${id}-more`} onClick={() => setMore(m => !m)}>More options</button>
    </div>
    {/* With More options open, its choices stay for the next task (LS-H41). */}
    {more && <div id={`${id}-more`} className="tasks-add-more" role="group" aria-label="More options">
      <label className="field"><span>Priority</span><select value={priority} onChange={e => setPriority(e.target.value)}>{PRIORITY_CHOICES.map(([value, , label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field"><span>Due (optional)</span><input type="date" value={due} onChange={e => { setDue(e.target.value); if (!e.target.value) setTime(''); }} />{due && due < today && <small className="tasks-field-note">A past day: it shows as overdue.</small>}</label>
      <label className="field"><span>Time (optional)</span><input type="time" value={time} disabled={!due} onChange={e => setTime(e.target.value)} /></label>
      {goals.length > 0 && <label className="field"><span>Goal (optional)</span><select value={goal} onChange={e => setGoal(e.target.value)}><option value="">No goal</option>{goals.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}</select></label>}
    </div>}
    <p id={`${id}-help`} className="fine tasks-smart-help">Type a day, a time, “every …”, p1–p4, #project or @label; they are read as you type.</p>
    {parsed.spans.length > 0 && <ul className="tasks-pieces" aria-label="Read from your line">
      {parsed.spans.map(s => <li key={s.start} className="tasks-piece" data-kind={s.kind}><mark dir="auto">{s.text}</mark> <span className="sr-only">is read as the</span> <small>{KIND_WORDS[s.kind]}</small>
        <button type="button" className="text-link" aria-label={`Keep “${s.text}” as text`} onClick={() => setKeep(k => [...k, s.start])}>Keep as text</button></li>)}
    </ul>}
    <p id={`${id}-preview`} className="tasks-smart-preview" aria-live="polite">{text.trim() && parsed.title ? <>Will add “<span dir="auto">{parsed.title}</span>”{pieces.length ? ` · ${pieces.join(' · ')}` : ''}.</> : ''}</p>
  </form>;
}
