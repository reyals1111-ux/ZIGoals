'use client';
import {minutesWords} from '../../lib/tasks/minutes';
import {useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import type {ParseSpan, ParsedTask} from '../../lib/tasks/parse';
import {describeRecur} from '../../lib/tasks/recurrence';
import {projectByName, type TaskInput} from '../../lib/tasks/engine';
import {LEVEL_WORDS, type TaskLevel, type Tasks} from '../../lib/tasks/schema';
import type {GoalOption} from './use-goal-options';
import {formatClock, formatDate} from '../../lib/visual-format';
import {TaskTitleInput} from './task-parts';
import {lineList, pastedOutline} from '../../lib/tasks/paste-list';

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
// Session AV lane 2 (LEDGER #1; Todoist's split suggestion): a long line joined by "and then", "also" … is offered as
// several tasks; the rule (lib/tasks/split.ts) is a chunk of its own, like the reader.
let splitter: ((text: string) => string[] | null) | null = null;
const loadSplit = () => import('../../lib/tasks/split').then(m => (splitter = m.splitSuggestion));
const plainLine = (text: string): ParsedTask => ({title: text.replace(/\s+/g, ' ').trim(), labels: [], spans: []});
/** The pieces read from a line in plain words ("Tomorrow · 6:00 PM · Every week · P1 · #Home · @bills"). */
function pieceWords(parsed: ParsedTask, record: Tasks, today: string): string[] {
  const existing = parsed.project ? projectByName(record, parsed.project) : undefined, pieces: string[] = [];
  if (parsed.due) pieces.push(parsed.due < today ? `${formatDate(parsed.due, {weekday: true})} (overdue)` : parsed.due === today ? 'Today' : formatDate(parsed.due, {weekday: true, year: parsed.due.slice(0, 4) !== today.slice(0, 4)}));
  if (parsed.time) pieces.push(formatClock(parsed.time));
  if (parsed.recur) pieces.push(describeRecur(parsed.recur));
  // Session AV (F-DEADLINES): "deadline Friday".
  if (parsed.deadline) pieces.push(`Deadline ${formatDate(parsed.deadline, {weekday: true, year: parsed.deadline.slice(0, 4) !== today.slice(0, 4)})}`);
  // Session AV (F-TASK-MINUTES): "for 30 min".
  if (parsed.minutes) pieces.push(`Takes ${minutesWords(parsed.minutes)}`);
  // Session AV lane 2 (LEDGER #3): "!2h", "!18:30".
  for (const r of parsed.reminders ?? []) pieces.push(r.at ? `Reminder ${formatClock(r.at.slice(11))}` : `Reminder ${minutesWords(r.before)} before`);
  if (parsed.level) pieces.push(LEVEL_WORDS[parsed.level]);
  if (parsed.project) pieces.push(existing ? `#${existing.name}` : `#${parsed.project} (a new project)`);
  for (const l of parsed.labels) pieces.push(`@${l}`);
  return pieces;
}
/** Session AV (1c, q1 #17): a pasted subtask names its parent line by index until the page gives the parent its id. */
export const PASTE_PARENT = 'paste:';
const KIND_WORDS: Record<ParseSpan['kind'], string> = {date: 'Day', time: 'Time', recur: 'Repeat', priority: 'Priority', project: 'Project', label: 'Label', deadline: 'Deadline', minutes: 'Length', reminder: 'Reminder'};
/** "More options" (Session AK G2, R2-17, kept): priority, a day, a time and a goal for the line; what the line itself says wins. */
const PRIORITY_CHOICES: [string, TaskLevel, string][] = [['high', 1, LEVEL_WORDS[1]], ['medium', 2, LEVEL_WORDS[2]], ['normal', 3, LEVEL_WORDS[3]], ['low', 4, LEVEL_WORDS[4]]];
export function SmartAdd({record, today, onAdd, onAddMany, defaults = {}, inputRef, makeProject, goals = []}: {record: Tasks; today: string; onAdd: (input: TaskInput) => boolean;
  /** Session AV (F-PASTE-LIST): a pasted list added as one change (one Undo); without it a list is an ordinary paste. */ onAddMany?: (inputs: TaskInput[]) => boolean;
  defaults?: Partial<TaskInput>; inputRef?: React.RefObject<HTMLInputElement | null>; makeProject: (name: string) => string | null; goals?: readonly GoalOption[]}) {
  const [more, setMore] = useState(false), [priority, setPriority] = useState('normal'), [due, setDue] = useState(''), [time, setTime] = useState(''), [goal, setGoal] = useState('');
  const chosenLevel = PRIORITY_CHOICES.find(c => c[0] === priority)?.[1];
  const id = useId(), [text, setText] = useState(''), [keep, setKeep] = useState<number[]>([]), [error, setError] = useState('');
  const own = useRef<HTMLInputElement>(null), field = inputRef ?? own;
  // Session AV (1c, q1 #17): `parents` makes an indented line a subtask; `typed` is a list offered from one typed line.
  const [pasted, setPasted] = useState<{lines: string[]; parents: (number | null)[]; more: number; typed?: boolean} | null>(null), listRef = useRef<HTMLDivElement>(null);
  const [reader, setReader] = useState<Parse | null>(() => parser);
  useEffect(() => { if (!reader) loadParser().then(fn => setReader(() => fn), () => undefined); }, [reader]);
  const [, setSplitReady] = useState(!!splitter);
  useEffect(() => { if (!splitter) loadSplit().then(() => setSplitReady(true), () => undefined); }, []);
  const parsed = useMemo(() => reader ? reader(text, today, {keep}) : plainLine(text), [reader, text, today, keep]);
  const pieces = pieceWords(parsed, record, today);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setError('Type a task first.'); setText(''); field.current?.focus(); return; }
    if (reader) add(parsed);
    else void loadParser().then(fn => { setReader(() => fn); add(fn(text, today, {keep})); }, () => add(plainLine(text)));
  };
  /** The task a parsed line makes (a new project made once, also when several lines name it), or null when its project could not be made. */
  const toInput = (parsed: ParsedTask, made = new Map<string, string>()): TaskInput | null => {
    const existing = parsed.project ? projectByName(record, parsed.project) : undefined;
    let projectId = defaults.projectId;
    if (parsed.project) { const key = parsed.project.toLowerCase(), got = existing?.id ?? made.get(key) ?? makeProject(parsed.project); if (!got) return null; made.set(key, got); projectId = got; }
    const fromMore: Partial<TaskInput> = more ? {...(chosenLevel && chosenLevel !== 3 ? {level: chosenLevel} : {}), ...(due ? {due} : {}), ...(due && time ? {time} : {}), ...(goal ? {goal} : {})} : {};
    const input: TaskInput = {...defaults, ...fromMore, title: parsed.title, ...(projectId ? {projectId} : {}), ...(parsed.project && projectId !== defaults.projectId ? {sectionId: undefined} : {}),
      ...(parsed.due ? {due: parsed.due} : {}), ...(parsed.time ? {time: parsed.time} : {}), ...(parsed.level ? {level: parsed.level} : {}),
      ...(parsed.recur ? {recur: {...parsed.recur, text: parsed.spans.find(s => s.kind === 'recur')?.text.slice(0, 120)}} : {}),
      ...(parsed.deadline ? {deadline: parsed.deadline} : {}),
      ...(parsed.minutes ? {minutes: parsed.minutes} : {}),
      ...(parsed.reminders?.length ? {reminders: parsed.reminders} : {}),
      labels: [...new Set([...(defaults.labels ?? []), ...parsed.labels])]};
    return input;
  };
  const add = (parsed: ParsedTask) => {
    if (!parsed.title) { setError('Add a few words for the task itself, not only a day or a tag.'); return; }
    const input = toInput(parsed);
    if (input && onAdd(input)) { setText(''); setKeep([]); setError(''); field.current?.focus(); }
  };
  // Session AV (owner follow-up 1, F-PASTE-LIST): a pasted list of two lines or more, one task per line.
  const takePaste = (raw: string) => {
    if (!onAddMany) return false;
    const list = pastedOutline(raw);
    if (!list) return false;
    setPasted(list); setError('');
    if (!reader) void loadParser().then(fn => setReader(() => fn), () => undefined);
    requestAnimationFrame(() => listRef.current?.focus());
    return true;
  };
  const readLine = (line: string) => reader ? reader(line, today) : plainLine(line);
  const addAll = () => {
    if (!pasted || !onAddMany) return;
    const made = new Map<string, string>(), inputs: TaskInput[] = [], at = new Map<number, number>();
    let failed = false;
    // An indented line is a subtask of its parent line (`paste:<index>` names it; the page gives it the parent's id). A
    // parent left out (only a day or a tag) leaves its subtasks at the top.
    pasted.lines.forEach((line, i) => {
      const p = readLine(line); if (!p.title) return;
      const input = failed ? null : toInput(p, made); if (!input) { failed = true; return; }
      const parent = pasted.parents[i] ?? null, parentAt = parent === null ? undefined : at.get(parent);
      at.set(i, inputs.length);
      inputs.push(parentAt === undefined ? input : {...input, parentId: `${PASTE_PARENT}${parentAt}`});
    });
    if (failed) return;
    if (!inputs.length) { setError('None of those lines has words for a task, only days or tags.'); return; }
    if (onAddMany(inputs)) { setPasted(null); setText(''); setKeep([]); setError(''); field.current?.focus(); }
  };
  const asOne = () => { if (!pasted) return; setText(pasted.typed ? text : pasted.lines.join(' ')); setPasted(null); field.current?.focus(); };
  // Session AV (1c, q1 #17; Todoist): one typed line naming several things ("melk, brood en eieren") is offered as that
  // many tasks; only when every part has words of its own (not "Call mum, tomorrow").
  const several = useMemo(() => { if (!onAddMany || !reader || pasted) return null; const items = lineList(text.trim()) ?? splitter?.(text) ?? null; return items && items.every(l => reader(l, today).title) ? items : null; }, [onAddMany, reader, pasted, text, today]);
  const offerList = () => { if (!several) return; setPasted({lines: several, parents: several.map(() => null), more: 0, typed: true}); setError(''); requestAnimationFrame(() => listRef.current?.focus()); };
  return <form className="tasks-smart-add" onSubmit={submit} aria-label="Add a task" noValidate>
    <div className="tasks-smart-row">
      <TaskTitleInput inputRef={field} label="New task" value={text} error={error} describedBy={`${id}-preview ${id}-help`}
        placeholder="Pay rent every month on the 1st p1 #Home @bills" onPasteText={takePaste} onChange={v => { setText(v); if (error && v.trim()) setError(''); if (!v) setKeep([]); }} />
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
    {/* Session AV (A10-11, CI 1941): one line at 768, so the first task starts on the first screen; the Dutch examples are in Help. */}
    <p id={`${id}-help`} className="fine tasks-smart-help">A day, a time, “every …”, “deadline …”, !2h (a reminder), p1–p4, #project or @label, in English or Dutch.</p>
    {parsed.spans.length > 0 && <ul className="tasks-pieces" aria-label="Read from your line">
      {parsed.spans.map(s => <li key={s.start} className="tasks-piece" data-kind={s.kind}><mark dir="auto">{s.text}</mark> <span className="sr-only">is read as the</span> <small>{KIND_WORDS[s.kind]}</small>
        <button type="button" className="text-link" aria-label={`Keep “${s.text}” as text`} onClick={() => setKeep(k => [...k, s.start])}>Keep as text</button></li>)}
    </ul>}
    {pasted && <div ref={listRef} className="tasks-paste-list" role="group" tabIndex={-1} aria-labelledby={`${id}-pasted`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setPasted(null); field.current?.focus(); } }}>
      <p id={`${id}-pasted`}><strong>{pasted.lines.length} tasks from {pasted.typed ? 'your line' : 'what you pasted'}</strong>{pasted.more ? ` (the first ${pasted.lines.length}; ${pasted.more} more lines are left out)` : ''}</p>
      <ol className="tasks-paste-items">{pasted.lines.map((line, i) => { const p = readLine(line), bits = pieceWords(p, record, today), sub = pasted.parents[i] != null; return <li key={i} data-subtask={sub || undefined}>{sub && <small>Subtask of “{readLine(pasted.lines[pasted.parents[i]!]!).title || pasted.lines[pasted.parents[i]!]}”: </small>}<span dir="auto">{p.title || line}</span>{bits.length ? <small> · {bits.join(' · ')}</small> : null}{!p.title && <small> · only a day or a tag: left out</small>}</li>; })}</ol>
      <span className="tasks-paste-actions"><button type="button" className="secondary" onClick={addAll}>Add {pasted.lines.length} tasks</button><button type="button" className="quiet" onClick={asOne}>Add as one task</button><button type="button" className="quiet" onClick={() => { setPasted(null); field.current?.focus(); }}>Cancel</button></span>
    </div>}
    <p id={`${id}-preview`} className="tasks-smart-preview" aria-live="polite">{text.trim() && parsed.title ? <>Will add “<span dir="auto">{parsed.title}</span>”{pieces.length ? ` · ${pieces.join(' · ')}` : ''}.</> : ''}</p>
    {several && <p className="tasks-line-list"><button type="button" className="secondary" onClick={offerList}>Make {several.length} tasks</button> <small>one for each of “{several.join('”, “')}”</small></p>}
  </form>;
}
