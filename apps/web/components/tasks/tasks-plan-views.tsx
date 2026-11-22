'use client';
import {useEffect, useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus} from '../ui/undo-toast';
import TaskPlanSettings from './task-plan-settings';
import type {useTaskList} from './use-task-list';
import type {useGoalOptions} from './use-goal-options';
import {addLocalDays} from '../../lib/local-date';
import {editMany, openTasks} from '../../lib/tasks/engine';
import {minutesWords} from '../../lib/tasks/minutes';
import {LEVEL_SHORT, taskLevel, type Task, type Tasks} from '../../lib/tasks/schema';
import {TASK_PLAN, finishesByDay, goalStreak, harvestDoneLog} from '../../lib/tasks/plan-record';
import {
  CHART_GROUPS, CHART_MEASURES, TABLE_COLUMNS, addObjective, carryObjectives, chartSeries, dayColumns, finishObjective, linkObjective, monthGrid, objectiveProgress, plannedVsActual,
  removeObjective, tableRows, timelineBars, weekObjectives, weekStart, yearGrid, type ChartGroup, type ChartMeasure, type TableColumn,
} from '../../lib/tasks/layouts';
import {formatClock, formatDate, formatMonth, formatNumber, formatWeekday} from '../../lib/visual-format';
import {fieldText, projectFields, sortByField} from '../../lib/tasks/custom-fields';
/** A Monday-to-Sunday week (any), for the month grid's weekday heads in the person's language (lib/visual-format.ts). */
const WEEK_HEADS = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'] as const;
import TasksOrganise from './tasks-organise';
import './tasks-plan.css';

/**
 * Session AV lane 2 (tasks; Sunsama, Todoist, TickTick, Notion), one chunk loaded when one of these Tasks views opens:
 * - "This week" (LEDGER #22, #23, #25, #9): the week's objectives with their tasks (Sunsama), the open tasks with no day to
 *   plan into the week, planned against spent per day, the daily goal's streak, and the planning choices.
 * - "Table" (LEDGER #7, #12, #29): every open task in sortable columns, created and changed times included.
 * - "Calendar" (LEDGER #7, #13): 3 days with their times, or a month; for all tasks or one project.
 * - "Timeline" (LEDGER #13, #29): a project's tasks as bars from their day to their deadline (a Gantt view).
 * - "Insights" (LEDGER #13, #30, #9): a year of finished tasks as a heatmap, and a chart built from your lists.
 * - "Areas and templates" (LEDGER #10, #12, #17, #20, #28): tasks-organise.tsx.
 * Every write is the list's own change, with its Undo.
 */
export type PlanKind = 'week' | 'table' | 'days' | 'timeline' | 'insights' | 'organise';
type List = ReturnType<typeof useTaskList>;
type Goals = ReturnType<typeof useGoalOptions>;
const n = (x: number) => formatNumber(x);
const day = (d: string, today: string, weekday = true) => formatDate(d, {weekday, year: d.slice(0, 4) !== today.slice(0, 4)});
export default function TasksPlanViews({kind, list, goals}: {kind: PlanKind; list: List; goals: Goals}) {
  const record = list.tasks.data, today = list.today;
  if (kind === 'week') return <WeekView list={list} goals={goals} record={record} today={today} />;
  if (kind === 'table') return <TableView list={list} record={record} today={today} />;
  if (kind === 'days') return <DaysView list={list} record={record} today={today} />;
  if (kind === 'timeline') return <TimelineView record={record} today={today} />;
  if (kind === 'insights') return <InsightsView list={list} record={record} today={today} />;
  return <TasksOrganise list={list} record={record} today={today} />;
}

function ProjectPick({record, value, onChange, label = 'Project'}: {record: Tasks; value: string; onChange: (v: string) => void; label?: string}) {
  const live = (record.projects ?? []).filter(p => !p.archived);
  return <label className="field"><span>{label}</span><select value={value} onChange={e => onChange(e.target.value)}><option value="">All tasks</option>{live.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>;
}

/* ---- This week --------------------------------------------------------------------------------------------------- */

function WeekView({list, goals, record, today}: {list: List; goals: Goals; record: Tasks; today: string}) {
  const id = useId(), [week, setWeek] = useState(() => weekStart(today)), [title, setTitle] = useState(''), [goal, setGoal] = useState(''), [error, setError] = useState('');
  const objectives = weekObjectives(record, week), days = Array.from({length: 7}, (_, i) => addLocalDays(week, i)), end = days[6]!;
  const unplanned = openTasks(record, today).filter(t => !t.due && !t.parentId).slice(0, 12);
  const add = () => {
    if (!title.trim()) { setError('Give the objective a few words.'); return; }
    if (list.change(r => addObjective(r, {week, title, ...(goal ? {goal} : {})}, `objective_${crypto.randomUUID()}`), `Objective for the week: “${title.trim()}”.`, 'The objective is taken back.')) { setTitle(''); setGoal(''); setError(''); }
  };
  const openObjectives = objectives.filter(o => !o.doneAt).length;
  return <section className="tasks-plan-view" aria-labelledby={`${id}-title`}>
    <div className="tasks-plan-head">
      <button type="button" className="quiet" aria-label="The week before" onClick={() => setWeek(addLocalDays(week, -7))}>←</button>
      <h3 id={`${id}-title`}>{week === weekStart(today) ? 'This week · ' : ''}{day(week, today, false)} – {day(end, today, false)}</h3>
      <button type="button" className="quiet" aria-label="The week after" onClick={() => setWeek(addLocalDays(week, 7))}>→</button>
      {week !== weekStart(today) && <button type="button" className="text-link" onClick={() => setWeek(weekStart(today))}>This week</button>}
    </div>
    <h4>Objectives</h4>
    {objectives.length ? <ul className="tasks-objectives" aria-label="Objectives this week">{objectives.map(o => {
      const progress = objectiveProgress(record, o.id), linkable = openTasks(record, today).filter(t => !t.parentId && t.objective !== o.id).slice(0, 50);
      return <li key={o.id} data-done={o.doneAt ? true : undefined}>
        <label className="tasks-objective-check"><input type="checkbox" checked={!!o.doneAt} onChange={e => list.change(r => finishObjective(r, o.id, e.target.checked, new Date()), e.target.checked ? `Objective reached: “${o.title}”.` : `“${o.title}” is open again.`)} /> <span dir="auto">{o.title}</span></label>
        <small>{progress.tasks.length ? `${n(progress.done)} of ${n(progress.tasks.length)} tasks done` : 'No tasks linked yet'}{o.goal ? ` · goal: ${goals.byKey.get(o.goal)?.name ?? 'a goal no longer here'}` : ''}</small>
        {progress.tasks.length > 0 && <ul className="tasks-objective-tasks">{progress.tasks.map(t => <li key={t.id}><span aria-hidden="true">{t.doneAt ? '✓ ' : '○ '}</span><span dir="auto">{t.title}</span>{t.due ? ` · ${day(t.due, today)}` : ''}
          <button type="button" className="text-link" aria-label={`Unlink “${t.title}” from “${o.title}”`} onClick={() => list.change(r => linkObjective(r, t.id, null), `“${t.title}” no longer serves “${o.title}”.`)}>Unlink</button></li>)}</ul>}
        <span className="tasks-objective-actions">
          {linkable.length > 0 && <label className="field"><span>Link a task</span><select value="" onChange={e => { const tid = e.target.value; const t = record.tasks.find(x => x.id === tid); if (t) list.change(r => linkObjective(r, tid, o.id), `“${t.title}” serves “${o.title}”.`, 'Unlinked again.'); }}><option value="">Choose…</option>{linkable.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>}
          <button type="button" className="text-link" aria-label={`Remove the objective “${o.title}”`} onClick={() => list.change(r => removeObjective(r, o.id), `Removed the objective “${o.title}”.`, 'The objective is back.')}>Remove</button>
        </span>
      </li>; })}</ul> : <p className="fine">No objectives for this week yet. Name the two or three things that would make it a good week; then link the tasks that move them on.</p>}
    <form className="tasks-inline-form tasks-objective-add" noValidate onSubmit={e => { e.preventDefault(); add(); }}>
      <label className="field"><span>New objective</span><input dir="auto" value={title} maxLength={140} placeholder="Finish the report draft" aria-invalid={error ? true : undefined} onChange={e => { setTitle(e.target.value); setError(''); }} /></label>
      {goals.open.length > 0 && <label className="field"><span>Serves a goal (optional)</span><select value={goal} onChange={e => setGoal(e.target.value)}><option value="">No goal</option>{goals.open.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}</select></label>}
      <button type="submit" className="secondary">Add objective</button>
      {error && <p className="tasks-field-error" role="alert">{error}</p>}
    </form>
    {openObjectives > 0 && <p><button type="button" className="quiet" onClick={() => list.change(r => carryObjectives(r, week, () => `objective_${crypto.randomUUID()}`), `${n(openObjectives)} open ${openObjectives === 1 ? 'objective' : 'objectives'} carried to the next week.`, 'Taken back.')}>Carry {n(openObjectives)} open to next week</button></p>}
    <h4>Plan into the week</h4>
    {unplanned.length ? <ul className="tasks-week-unplanned" aria-label="Open tasks with no day">{unplanned.map(t => <li key={t.id}><span dir="auto">{t.title}</span>
      <label className="field"><span className="sr-only">Plan “{t.title}” for</span><select value="" onChange={e => { const d = e.target.value; if (d) list.change(r => editMany(r, [t.id], () => ({due: d}), today, {allowPast: true}), `“${t.title}” is planned for ${day(d, today)}.`, 'It has no day again.'); }}><option value="">Plan for…</option>{days.filter(d => d >= today).map(d => <option key={d} value={d}>{day(d, today)}</option>)}</select></label></li>)}</ul>
      : <p className="fine">Every open task has a day.</p>}
    <WeekTable list={list} record={record} days={days} today={today} />
    <TaskPlanSettings />
  </section>;
}
function WeekTable({list, record, days, today}: {list: List; record: Tasks; days: string[]; today: string}) {
  const plan = useDeviceRecord(TASK_PLAN), byDay = useMemo(() => finishesByDay(plan.data, record, list.doneDay), [plan.data, record, list.doneDay]);
  const rows = days.map(d => { const tasks = record.tasks.filter(t => !t.parentId && (t.doneAt ? list.doneDay(t.doneAt) === d : t.due === d)); return {d, tasks, pva: plannedVsActual(tasks), done: byDay.get(d) ?? 0}; });
  const goal = plan.data.dailyGoal, streak = goal ? goalStreak(byDay, goal, today) : null;
  return <>
    <h4>Planned and spent</h4>
    <div className="tasks-table-frame" role="region" aria-label="Planned and spent this week" tabIndex={0}>
      <table className="tasks-table"><thead><tr><th scope="col">Day</th><th scope="col">Tasks</th><th scope="col">Planned</th><th scope="col">Spent</th><th scope="col">Done</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.d} aria-current={r.d === today ? 'date' : undefined}><th scope="row">{day(r.d, today)}</th><td>{n(r.tasks.length)}</td><td>{r.pva.planned ? minutesWords(r.pva.planned) : '—'}</td><td>{r.pva.actual ? minutesWords(r.pva.actual) : '—'}</td><td>{n(r.done)}{goal ? ` of ${n(goal)}` : ''}</td></tr>)}</tbody></table>
    </div>
    {streak && <p className="fine">Daily goal of {n(goal!)}: {streak.current ? `${n(streak.current)} ${streak.current === 1 ? 'day' : 'days'} in a row` : 'no streak yet'}, best {n(streak.best)}.</p>}
  </>;
}

/* ---- Table ------------------------------------------------------------------------------------------------------- */

const COLUMN_WORDS: Record<TableColumn, string> = {title: 'Task', project: 'Project', priority: 'Priority', due: 'Day', deadline: 'Deadline', minutes: 'Planned', spent: 'Spent', labels: 'Labels', created: 'Added', changed: 'Changed'};
function TableView({list, record, today}: {list: List; record: Tasks; today: string}) {
  const id = useId(), [sort, setSort] = useState<TableColumn | `field:${string}`>('due'), [dir, setDir] = useState<'asc' | 'desc'>('asc'), [project, setProject] = useState('');
  // Session AV lane 2 (tasks-r2, LEDGER #229): with one project chosen, its own fields are columns too, sortable.
  const defs = useMemo(() => project ? projectFields(record, project) : [], [record, project]), byField = sort.startsWith('field:') ? defs.find(f => `field:${f.id}` === sort) : undefined;
  const rows = useMemo(() => byField ? sortByField(tableRows(record, today, 'title', 'asc', project || undefined), byField, dir) : tableRows(record, today, sort.startsWith('field:') ? 'due' : sort as TableColumn, dir, project || undefined), [record, today, sort, dir, project, byField]);
  const by = (c: TableColumn | `field:${string}`) => { if (c === sort) setDir(dir === 'asc' ? 'desc' : 'asc'); else { setSort(c); setDir(c === 'created' || c === 'changed' ? 'desc' : 'asc'); } };
  const cell = (t: Task, c: TableColumn) => {
    switch (c) {
      case 'title': return <span dir="auto">{t.title}</span>;
      case 'project': return record.projects?.find(p => p.id === t.projectId)?.name ?? 'Inbox';
      case 'priority': return `P${taskLevel(t)} · ${LEVEL_SHORT[taskLevel(t)]}`;
      case 'due': return t.due ? `${day(t.due, today)}${t.time ? `, ${formatClock(t.time)}` : ''}` : '—';
      case 'deadline': return t.deadline ? day(t.deadline, today) : '—';
      case 'minutes': return t.minutes ? minutesWords(t.minutes) : '—';
      case 'spent': return t.spent ? minutesWords(t.spent) : '—';
      case 'labels': return t.labels?.length ? t.labels.map(l => `@${l}`).join(' ') : '—';
      case 'created': return day(t.createdAt.slice(0, 10), today);
      case 'changed': return day((t.updatedAt ?? t.createdAt).slice(0, 10), today);
    }
  };
  return <section className="tasks-plan-view" aria-labelledby={`${id}-title`}>
    <div className="tasks-plan-head"><h3 id={`${id}-title`}>Table <small>{n(rows.length)} open</small></h3><ProjectPick record={record} value={project} onChange={setProject} /></div>
    {rows.length ? <div className="tasks-table-frame" role="region" aria-labelledby={`${id}-title`} tabIndex={0}>
      <table className="tasks-table"><thead><tr><th scope="col"><span className="sr-only">Done</span></th>{TABLE_COLUMNS.map(c => <th key={c} scope="col" aria-sort={c === sort ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
        <button type="button" className="tasks-sort" onClick={() => by(c)}>{COLUMN_WORDS[c]}<span aria-hidden="true">{c === sort ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</span></button></th>)}
        {defs.map(f => <th key={f.id} scope="col" aria-sort={byField?.id === f.id ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}><button type="button" className="tasks-sort" onClick={() => by(`field:${f.id}`)}><span dir="auto">{f.name}</span><span aria-hidden="true">{byField?.id === f.id ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</span></button></th>)}</tr></thead>
        <tbody>{rows.map(t => <tr key={t.id}><td><input type="checkbox" aria-label={`Done: ${t.title}`} checked={false} onChange={() => list.toggle(t, true)} /></td>{TABLE_COLUMNS.map(c => c === 'title' ? <th key={c} scope="row">{cell(t, c)}</th> : <td key={c}>{cell(t, c)}</td>)}{defs.map(f => <td key={f.id} dir="auto">{fieldText(f, t.fields?.[f.id])}</td>)}</tr>)}</tbody></table>
    </div> : <p className="fine">No open tasks{project ? ' in this project' : ''}. Add some, and sort them here by day, deadline, priority, length, or when they were added or changed.</p>}
  </section>;
}

/* ---- Calendar: 3 days or a month, all tasks or one project ------------------------------------------------------- */

function DaysView({list, record, today}: {list: List; record: Tasks; today: string}) {
  const id = useId(), [mode, setMode] = useState<'three' | 'month'>('three'), [from, setFrom] = useState(today), [month, setMonth] = useState(today.slice(0, 7)), [project, setProject] = useState('');
  const columns = useMemo(() => dayColumns(record, from, today, 3, project || undefined), [record, from, today, project]);
  const weeks = useMemo(() => monthGrid(record, month, list.doneDay, project || undefined), [record, month, list.doneDay, project]);
  const shiftMonth = (by: number) => { const [y, m] = month.split('-').map(Number) as [number, number], d = new Date(Date.UTC(y, m - 1 + by, 1)); setMonth(d.toISOString().slice(0, 7)); };
  const monthName = formatMonth(`${month}-01T12:00:00Z`, {timeZone: 'UTC'});
  return <section className="tasks-plan-view" aria-labelledby={`${id}-title`}>
    <div className="tasks-plan-head">
      <h3 id={`${id}-title`}>Calendar</h3>
      <span className="tasks-plan-switch" role="group" aria-label="Show"><button type="button" className="quiet" aria-pressed={mode === 'three'} onClick={() => setMode('three')}>3 days</button><button type="button" className="quiet" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>Month</button></span>
      <ProjectPick record={record} value={project} onChange={setProject} />
    </div>
    {mode === 'three' ? <>
      <div className="tasks-plan-head"><button type="button" className="quiet" aria-label="Three days earlier" onClick={() => setFrom(addLocalDays(from, -3))}>←</button><span>{day(from, today)} – {day(addLocalDays(from, 2), today)}</span><button type="button" className="quiet" aria-label="Three days later" onClick={() => setFrom(addLocalDays(from, 3))}>→</button>{from !== today && <button type="button" className="text-link" onClick={() => setFrom(today)}>Today</button>}</div>
      <div className="tasks-three-days">{columns.map(c => <section key={c.day} className="tasks-day-column" aria-label={day(c.day, today)} data-today={c.day === today || undefined}>
        <h4>{c.day === today ? 'Today · ' : ''}{day(c.day, today)}</h4>
        {c.timed.length + c.allDay.length === 0 ? <p className="fine">Nothing planned.</p> : <ul>
          {c.timed.map(t => <li key={t.id}><strong>{formatClock(t.time!)}{t.minutes ? `–${formatClock(endOf(t.time!, t.minutes))}` : ''}</strong> <span dir="auto">{t.title}</span></li>)}
          {c.allDay.map(t => <li key={t.id}><span dir="auto">{t.title}</span>{t.due && t.due < today ? <small> · from {day(t.due, today)}</small> : null}{t.minutes ? <small> · {minutesWords(t.minutes)}</small> : null}</li>)}
        </ul>}
      </section>)}</div>
    </> : <>
      <div className="tasks-plan-head"><button type="button" className="quiet" aria-label="The month before" onClick={() => shiftMonth(-1)}>←</button><span>{monthName}</span><button type="button" className="quiet" aria-label="The month after" onClick={() => shiftMonth(1)}>→</button>{month !== today.slice(0, 7) && <button type="button" className="text-link" onClick={() => setMonth(today.slice(0, 7))}>This month</button>}</div>
      <div className="tasks-table-frame" role="region" aria-label={monthName} tabIndex={0}>
        <table className="tasks-month"><thead><tr>{WEEK_HEADS.map(w => <th key={w} scope="col">{formatWeekday(`${w}T12:00:00Z`, {timeZone: 'UTC'})}</th>)}</tr></thead>
          <tbody>{weeks.map(w => <tr key={w[0]!.day}>{w.map(c => <td key={c.day} data-out={!c.inMonth || undefined} data-today={c.day === today || undefined} aria-label={`${day(c.day, today)}: ${c.tasks.length ? `${c.tasks.length} ${c.tasks.length === 1 ? 'task' : 'tasks'}` : 'nothing'}`}>
            <span className="tasks-month-day" aria-hidden="true">{Number(c.day.slice(8))}</span>
            {c.tasks.slice(0, 3).map(t => <span key={t.id} className="tasks-month-task" data-done={t.doneAt ? true : undefined} dir="auto">{t.doneAt ? '✓ ' : ''}{t.title}</span>)}
            {c.tasks.length > 3 && <span className="tasks-month-more">+{c.tasks.length - 3} more</span>}</td>)}</tr>)}</tbody></table>
      </div>
    </>}
  </section>;
}
const endOf = (clock: string, minutes: number) => { const m = (Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5)) + minutes) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

/* ---- Timeline (Gantt) ---------------------------------------------------------------------------------------------- */

function TimelineView({record, today}: {record: Tasks; today: string}) {
  const id = useId(), firstProject = (record.projects ?? []).find(p => !p.archived)?.id ?? '', [project, setProject] = useState(firstProject);
  const {bars, undated, from, to} = useMemo(() => timelineBars(record, today, project || undefined), [record, today, project]);
  const span = Math.max(1, Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000) + 1);
  const at = (d: string) => Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
  const todayAt = at(today);
  return <section className="tasks-plan-view" aria-labelledby={`${id}-title`}>
    <div className="tasks-plan-head"><h3 id={`${id}-title`}>Timeline</h3><ProjectPick record={record} value={project} onChange={setProject} /></div>
    {bars.length ? <>
      <p className="fine">{day(from, today)} – {day(to, today)}. Each bar runs from the task’s day to its deadline.{undated ? ` ${n(undated)} ${undated === 1 ? 'task has' : 'tasks have'} no day yet and ${undated === 1 ? 'is' : 'are'} not shown.` : ''}</p>
      <ol className="tasks-timeline" aria-label="Tasks on the timeline">{bars.map(b => <li key={b.task.id} data-late={b.late || undefined}>
        <span className="tasks-timeline-title" dir="auto">{b.task.title}</span>
        <span className="tasks-timeline-track" aria-hidden="true">
          {todayAt >= 0 && todayAt < span && <span className="tasks-timeline-today" style={{insetInlineStart: `${(todayAt / span) * 100}%`}} />}
          <span className="tasks-timeline-bar" style={{insetInlineStart: `${(at(b.start) / span) * 100}%`, width: `${Math.max(1.5, ((at(b.end) - at(b.start) + 1) / span) * 100)}%`}} />
        </span>
        <small>{b.start === b.end ? day(b.start, today) : `${day(b.start, today)} → ${day(b.end, today)}`}{b.late ? ' · late' : ''}</small>
      </li>)}</ol>
    </> : <p className="fine">Nothing to draw yet{undated ? `: ${n(undated)} ${undated === 1 ? 'task has' : 'tasks have'} no day` : ''}. Give tasks a day and a deadline, and they show here as bars from one to the other.</p>}
  </section>;
}

/* ---- Insights: the year, and a chart from your lists ------------------------------------------------------------------ */

const GROUP_WORDS: Record<ChartGroup, string> = {week: 'Week', project: 'Project', label: 'Label', priority: 'Priority'};
const MEASURE_WORDS: Record<ChartMeasure, string> = {done: 'Tasks finished', open: 'Open tasks', minutes: 'Planned minutes (open)'};
function InsightsView({list, record, today}: {list: List; record: Tasks; today: string}) {
  const id = useId(), plan = useDeviceRecord(TASK_PLAN), [group, setGroup] = useState<ChartGroup>('week'), [measure, setMeasure] = useState<ChartMeasure>('done');
  useEffect(() => { if (!plan.loaded || plan.unreadable) return; const next = harvestDoneLog(plan.data, record, today, list.doneDay); if (next !== plan.data) { try { plan.update(() => next); } catch { showStatus('The count of finished tasks could not be kept on this device.', {tone: 'error'}); } } }, [plan, record, today, list.doneDay]);
  const byDay = useMemo(() => finishesByDay(plan.data, record, list.doneDay), [plan.data, record, list.doneDay]);
  const year = useMemo(() => yearGrid(byDay, today), [byDay, today]);
  const series = useMemo(() => chartSeries(record, group, group === 'week' && measure === 'open' ? 'open' : measure, {today, byDay, doneDay: list.doneDay}), [record, group, measure, today, byDay, list.doneDay]);
  const max = Math.max(1, ...series.map(s => s.value)), busiest = [...byDay].filter(([d]) => d <= today).sort((a, b) => b[1] - a[1])[0];
  const goal = plan.data.dailyGoal, streak = goal ? goalStreak(byDay, goal, today) : null;
  return <section className="tasks-plan-view" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Insights</h3>
    <h4>Your year</h4>
    <p className="fine">{year.total ? `${n(year.total)} ${year.total === 1 ? 'task' : 'tasks'} finished on ${n(year.activeDays)} ${year.activeDays === 1 ? 'day' : 'days'} in the last year${busiest ? `; the most in a day was ${n(busiest[1])}, on ${day(busiest[0], today)}` : ''}.` : 'When you finish tasks, each day of the year fills in here. Finishes are counted from now on, also after the tasks leave the list.'}{streak ? ` Daily goal of ${n(goal!)}: ${n(streak.current)} ${streak.current === 1 ? 'day' : 'days'} in a row, best ${n(streak.best)}.` : ''}</p>
    <div className="tasks-year-frame" role="img" aria-label={`A year of finished tasks: ${n(year.total)} in all`}>
      <div className="tasks-year" aria-hidden="true">{year.weeks.map(w => <span key={w[0]!.day} className="tasks-year-week">{w.map(c => <span key={c.day} className="tasks-year-day" data-level={c.level} data-future={c.future || undefined} title={c.future ? undefined : `${day(c.day, today)}: ${n(c.count)}`} />)}</span>)}</div>
    </div>
    <p className="tasks-year-key fine" aria-hidden="true">Fewer <span className="tasks-year-day" data-level="0" /><span className="tasks-year-day" data-level="1" /><span className="tasks-year-day" data-level="2" /><span className="tasks-year-day" data-level="3" /><span className="tasks-year-day" data-level="4" /> More</p>
    <h4>A chart from your lists</h4>
    <div className="tasks-plan-settings-fields">
      <label className="field"><span>Show</span><select value={measure} onChange={e => setMeasure(e.target.value as ChartMeasure)}>{CHART_MEASURES.map(m => <option key={m} value={m}>{MEASURE_WORDS[m]}</option>)}</select></label>
      <label className="field"><span>By</span><select value={group} onChange={e => setGroup(e.target.value as ChartGroup)}>{CHART_GROUPS.map(g => <option key={g} value={g}>{GROUP_WORDS[g]}</option>)}</select></label>
    </div>
    {series.some(s => s.value) ? <ul className="tasks-chart" aria-label={`${MEASURE_WORDS[measure]} by ${GROUP_WORDS[group].toLowerCase()}`}>{series.map(s => <li key={s.label}>
      <span className="tasks-chart-label" dir="auto">{group === 'week' ? `Week of ${day(s.label, today, false)}` : s.label}</span>
      <span className="tasks-chart-track" aria-hidden="true"><span className="tasks-chart-bar" style={{width: `${(s.value / max) * 100}%`}} /></span>
      <span className="tasks-chart-value">{measure === 'minutes' ? minutesWords(s.value || 0) || '0' : n(s.value)}</span>
    </li>)}</ul> : <p className="fine">Nothing to count yet for this choice. Try another one, or come back when you have finished a few tasks.</p>}
  </section>;
}
