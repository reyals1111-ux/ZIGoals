'use client';
import Link from 'next/link';
import {Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {RemindersGlyph} from '../header-art/glyphs/reminders';
import {EmptyState} from '../ui/empty-state';
import {LoadBoundary} from '../load-boundary';
import {ZgSkeleton} from '../skeleton/zg-skeleton';
import {ActionIntent} from '../action-intent';
import {formatClock, formatDate, formatMonth, formatNumber, formatWeekday} from '../../lib/visual-format';
import {AGENDA_SOURCES, AGENDA_VIEWS, SOURCE_LABEL, agendaRange, buildAgenda, countBySource, shiftAnchor, sourcesWithRecords, type AgendaItem, type AgendaSource, type AgendaView} from '../../lib/agenda/build';
import {setAgendaView, setExtraShown, setSourceShown} from '../../lib/agenda/store';
import {EXTRA_LABEL, EXTRA_SOURCES, countExtras, eventAgendaItems, taskAgendaItems, withExtras, type DayItem, type DayWithExtras, type ExtraSource, type TaskAgendaItem} from '../../lib/agenda/time-items';
import {removeCalendar, restoreCalendar, storedEventCount} from '../../lib/ics/calendar';
import {deviceDay} from '../../lib/tasks/device';
import {useTaskList} from '../tasks/use-task-list';
import {TaskAddForm, TaskStatusLine, PRIORITY_WORDS} from '../tasks/task-parts';
import {useGoalOptions, type GoalOption} from '../tasks/use-goal-options';
import {addLocalDays} from '../../lib/local-date';
import {useAgenda} from './use-agenda';
import './agenda.css';

/**
 * /app/agenda (Session AK, F5d): one calendar of the person's own plans — habits, planned contributions, bills, workouts,
 * meals, unbonding dates and reviews — by day, week or month. Each item opens the page it lives on; nothing is checked
 * off here (each page's own flow does that, with its own confirm). The view and the hidden sources are remembered on
 * this device (`zigoals:agenda:v1`), written only when the person changes them. "Export to a calendar" loads on use and
 * makes an .ics file on the device. Reached from Today, Help and Search; not in the navigation.
 *
 * Session AK (T1, T2): the person's tasks sit among these (lib/agenda/time-items.ts) and are the one kind ticked here
 * (with Undo; the day view also adds one for its day); calendars imported from an .ics file show read-only with their
 * calendar's name, beside the export, with a remove control (Undo). Their kinds have their own filter field.
 */
const AgendaExport = lazy(() => import('./agenda-export'));
// Session AK (T2): the .ics reader and its preview, loaded the first time the person imports a calendar.
const CalendarImport = lazy(() => import('./calendar-import'));
const VIEW_LABEL: Record<AgendaView, string> = {day: 'Day', week: 'Week', month: 'Month'};
const ONE: Record<AgendaSource, string> = {habit: 'Habit', contribution: 'Contribution', bill: 'Bill', workout: 'Workout', meal: 'Meal', unbonding: 'Unbonding', review: 'Review'};
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
const TEACH: Record<AgendaSource, [string, string]> = {
  habit: ['Add a habit', '/app/habits?add=habit'], contribution: ['Give a goal a plan', '/app/goals'], bill: ['Add a bill', '/app/wealth?view=bills'],
  workout: ['Log a workout', '/app/health?view=workouts'], meal: ['Plan a meal', '/app/health#planner'], unbonding: ['Staking', '/app/staking'], review: ['Turn on the weekly review', '/app/settings/reminders'],
};
/** Session AK (T1, T2): what a person's tasks and imported calendars need to show here, for the filter's "none yet". */
const EXTRA_TEACH: Record<ExtraSource, [string, string]> = {task: ['Add a task', '/app/tasks'], event: ['Import a calendar', '#agenda-import-title']};

export function AgendaPage() {
  const {loaded, input, today, showcase, record, unreadable, calendars, zone} = useAgenda();
  // Session AK (T1): tasks are the one kind the Agenda ticks (with Undo), and the day view adds them.
  const list = useTaskList(), goals = useGoalOptions();
  const [importing, setImporting] = useState(false), importButton = useRef<HTMLButtonElement>(null);
  const [chosen, setChosen] = useState<AgendaView | null>(null), [anchor, setAnchor] = useState<string | null>(null), [exporting, setExporting] = useState(false), [note, setNote] = useState('');
  const view: AgendaView = chosen ?? (record.loaded && !record.unreadable ? record.data.view : undefined) ?? 'week';
  const at = anchor ?? today, hidden = useMemo(() => record.unreadable ? [] : record.data.hidden ?? [], [record.unreadable, record.data.hidden]);
  const range = useMemo(() => agendaRange(view, at), [view, at]);
  const all = useMemo(() => input ? buildAgenda(input, range.from, range.to) : null, [input, range.from, range.to]);
  const hiddenExtra = useMemo(() => record.unreadable ? [] : record.data.hiddenExtra ?? [], [record.unreadable, record.data.hiddenExtra]);
  const extra = useMemo<DayItem[]>(() => [
    ...(list.tasks.loaded && !list.tasks.unreadable ? taskAgendaItems(list.tasks.data, range.from, range.to, today, deviceDay) : []),
    ...(calendars.loaded && !calendars.unreadable ? eventAgendaItems(calendars.data, range.from, range.to, zone) : []),
  ], [list.tasks.loaded, list.tasks.unreadable, list.tasks.data, calendars.loaded, calendars.unreadable, calendars.data, range.from, range.to, today, zone]);
  const days = useMemo<DayWithExtras[] | null>(() => all ? withExtras(all.map(d => ({date: d.date, items: d.items.filter(i => !hidden.includes(i.source))})), extra, hiddenExtra) : null, [all, hidden, extra, hiddenExtra]);
  const counts = useMemo(() => all ? countBySource(view === 'month' ? all.filter(d => d.date >= range.first && d.date <= range.last) : all) : null, [all, view, range.first, range.last]);
  const extraCounts = useMemo(() => countExtras(view === 'month' ? extra.filter(i => i.date >= range.first && i.date <= range.last) : extra), [extra, view, range.first, range.last]);
  const known = useMemo(() => input ? sourcesWithRecords(input) : new Set<AgendaSource>(), [input]);
  const knownExtra = useMemo(() => new Set<ExtraSource>([...(list.tasks.data.tasks.some(t => t.due) ? ['task' as const] : []), ...(calendars.data.calendars.length ? ['event' as const] : [])]), [list.tasks.data.tasks, calendars.data.calendars]);
  const exportButton = useRef<HTMLButtonElement>(null);

  const pickView = useCallback((v: AgendaView) => {
    setChosen(v); setNote('');
    try { record.update(r => setAgendaView(r, v)); } catch { setNote('The view changed; it could not be remembered on this device.'); }
  }, [record]);
  const toggle = (source: AgendaSource, shown: boolean) => {
    try { record.update(r => setSourceShown(r, source, shown)); setNote(''); } catch { setNote('That filter could not be kept on this device.'); }
  };
  const toggleExtra = (source: ExtraSource, shown: boolean) => {
    try { record.update(r => setExtraShown(r, source, shown)); setNote(''); } catch { setNote('That filter could not be kept on this device.'); }
  };
  const tickTask = (item: TaskAgendaItem, done: boolean) => { const t = list.tasks.data.tasks.find(x => x.id === item.taskId); if (t) list.toggle(t, done); };
  const [calStatus, setCalStatus] = useState<{text: string; undo?: () => void} | null>(null);
  const removeCal = (calId: string) => {
    const index = calendars.data.calendars.findIndex(c => c.id === calId), cal = calendars.data.calendars[index];
    if (!cal || calendars.unreadable) return;
    try { calendars.update(r => removeCalendar(r, calId)); setCalStatus({text: `Removed “${cal.name}” from your agenda.`, undo: () => { try { calendars.update(r => restoreCalendar(r, cal, index)); setCalStatus({text: `“${cal.name}” is back.`}); } catch { setCalStatus({text: 'The calendar could not be put back on this device.'}); } }}); }
    catch { setCalStatus({text: 'The calendar could not be removed on this device.'}); }
  };
  const label = view === 'day' ? formatDate(at, {weekday: true}) : view === 'week' ? `${formatDate(range.from, {year: range.from.slice(0, 4) === range.to.slice(0, 4) ? false : undefined})} – ${formatDate(range.to)}` : formatMonth(range.first);
  const total = days ? days.filter(d => view !== 'month' || (d.date >= range.first && d.date <= range.last)).reduce((n, d) => n + d.items.length, 0) : 0;
  const kinds = AGENDA_SOURCES.length + EXTRA_SOURCES.length, hiddenCount = hidden.length + hiddenExtra.length;
  const rowProps = {today, goals: goals.byKey, onTick: tickTask};

  return <div className="agenda-page" data-agenda={loaded ? 'ready' : 'loading'}>
    {AGENDA_VIEWS.map(v => <ActionIntent key={v} param="view" value={v} onAction={() => setChosen(v)} />)}
    <ActionIntent param="export" value="1" ready={loaded} onAction={() => setExporting(true)} />
    <PageHeader className="page-heading agenda-hero" titleId="agenda-title" eyebrow="Agenda" title="Your days, all in one place"
      lede="Habits, tasks, planned contributions, bills, workouts, meals, unbonding dates and reviews, from your own records, beside the calendars you import. Tap an item to open it where it lives; tick a task right here. Nothing here leaves this device unless you export it."
      actions={<p className="agenda-links"><Link className="text-link" href="/app/timeline">Today as a timeline →</Link></p>}
      art={<OrbitArt glyph={RemindersGlyph} spin={22} />} />
    {!loaded || !input || !days || !counts ? <ZgSkeleton label="Opening your agenda…" className="agenda-skeleton" block lines={3} /> : <>
      {showcase && <p className="agenda-showcase fine" role="note">Showcase · fictional. Items with no record of their own yet are marked Example.</p>}
      {unreadable.length > 0 && <p className="notice" role="status">Some records could not be read on this device ({unreadable.join(', ')}), so their items are left out rather than guessed.</p>}
      {known.size === 0 && knownExtra.size === 0 && <EmptyState title="Your agenda fills itself" level={2} art="orbit" action={<p className="agenda-teach">{(['habit', 'meal', 'bill', 'review'] as const).map(s => <Link key={s} className="secondary" href={TEACH[s][1]}>{TEACH[s][0]}</Link>)}<Link className="secondary" href={EXTRA_TEACH.task[1]}>{EXTRA_TEACH.task[0]}</Link></p>}>
        Add a habit or a task with a day, give a goal a contribution plan, add a bill, plan a meal or turn on the weekly review. Each one shows here on its days. You can also import a calendar file from your calendar app, and export your agenda to it.
      </EmptyState>}
      <section className="panel agenda-panel" aria-labelledby="agenda-range">
        <div className="agenda-toolbar">
          <div className="agenda-views" role="group" aria-label="View">{AGENDA_VIEWS.map(v => <button key={v} type="button" className="secondary" aria-pressed={view === v} onClick={() => pickView(v)}>{VIEW_LABEL[v]}</button>)}</div>
          <div className="agenda-nav">
            <button type="button" className="quiet" aria-label={`Previous ${view}`} onClick={() => setAnchor(shiftAnchor(view, at, -1))}>←</button>
            <button type="button" className="secondary" disabled={at === today} onClick={() => setAnchor(today)}>Today</button>
            <button type="button" className="quiet" aria-label={`Next ${view}`} onClick={() => setAnchor(shiftAnchor(view, at, 1))}>→</button>
          </div>
        </div>
        <h2 id="agenda-range" className="agenda-range" aria-live="polite">{label} <small>{plural(total, 'item')}</small></h2>
        <details className="agenda-filter">
          <summary>Show: {hiddenCount ? `${kinds - hiddenCount} of ${kinds} kinds` : 'everything'}</summary>
          <fieldset><legend className="sr-only">Kinds of items to show</legend>
            {AGENDA_SOURCES.map(s => <label key={s} className="agenda-check" data-pillar={s}><input type="checkbox" checked={!hidden.includes(s)} onChange={e => toggle(s, e.target.checked)} /><span>{SOURCE_LABEL[s]}</span><small>{counts[s] ? formatNumber(counts[s]) : known.has(s) ? '0' : 'none yet'}</small></label>)}
            {EXTRA_SOURCES.map(s => <label key={s} className="agenda-check" data-pillar={s}><input type="checkbox" checked={!hiddenExtra.includes(s)} onChange={e => toggleExtra(s, e.target.checked)} /><span>{EXTRA_LABEL[s]}</span><small>{extraCounts[s] ? formatNumber(extraCounts[s]) : knownExtra.has(s) ? '0' : 'none yet'}</small></label>)}
          </fieldset>
        </details>
        {view === 'day' && <DayList day={days[0]!} heading={false} {...rowProps} />}
        {view === 'day' && days[0]!.date >= today && !list.tasks.unreadable && <TaskAddForm compact onAdd={list.add} goals={[]} today={today} fixedDue={days[0]!.date} label={`Add a task for ${formatDate(days[0]!.date, {weekday: true, year: false})}`} submit="Add task" />}
        {view === 'week' && <ol className="agenda-week">{days.map(d => <li key={d.date}><DayList day={d} heading {...rowProps} /></li>)}</ol>}
        {view === 'month' && <MonthGrid days={days} first={range.first} last={range.last} selected={at} onSelect={setAnchor} {...rowProps} />}
        <TaskStatusLine status={list.status} error={list.error} onUndo={list.runUndo} />
        {note && <p className="fine" role="status">{note}</p>}
      </section>
      <section className="panel agenda-export-panel" aria-labelledby="agenda-export-title">
        <h2 id="agenda-export-title">Export to a calendar</h2>
        <p>Make an .ics file on this device and open it with your calendar app. You choose what goes in it: titles and days only, unless you add the details.</p>
        {!exporting ? <button ref={exportButton} type="button" className="secondary" onPointerEnter={() => void import('./agenda-export').catch(() => undefined)} onClick={() => setExporting(true)}>Choose what to export</button>
          : <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening the export…</p>}><AgendaExport input={input} hidden={hidden} view={view} viewFrom={view === 'month' ? range.first : range.from} viewTo={view === 'month' ? range.last : range.to} viewLabel={label} today={today} showcase={showcase} onClose={() => { setExporting(false); queueMicrotask(() => exportButton.current?.focus()); }} /></Suspense></LoadBoundary>}
      </section>
      <section className="panel agenda-export-panel agenda-import-panel" aria-labelledby="agenda-import-title">
        <h2 id="agenda-import-title" tabIndex={-1}>Import a calendar</h2>
        <p>Add the events of another calendar from an .ics file your calendar app exports. They show here, read-only, with their calendar’s name. No account and no connection: the file is read on this device.</p>
        {calendars.data.calendars.length > 0 && <ul className="agenda-calendars" aria-label="Imported calendars">{calendars.data.calendars.map(c => <li key={c.id}>
          <span><strong>{c.name}</strong> <small>{plural(c.events.length, 'event')} · imported {formatDate(c.importedAt, {year: false})}</small></span>
          <button type="button" className="text-link" aria-label={`Remove the imported calendar “${c.name}”`} onClick={() => removeCal(c.id)}>Remove</button>
        </li>)}</ul>}
        {calendars.data.calendars.length > 0 && <p className="fine">{formatNumber(storedEventCount(calendars.data))} of 1,500 imported events kept on this device.</p>}
        <p role="status" className="fine">{calStatus?.text} {calStatus?.undo && <button type="button" className="text-link" onClick={() => { const undo = calStatus.undo!; setCalStatus(null); undo(); }}>Undo</button>}</p>
        {!importing ? <button ref={importButton} type="button" className="secondary" disabled={calendars.unreadable} onPointerEnter={() => void import('./calendar-import').catch(() => undefined)} onClick={() => setImporting(true)}>Choose a calendar file</button>
          : <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening the import…</p>}><CalendarImport today={today} onAdded={(text, undo) => setCalStatus({text, undo: () => { try { undo(); setCalStatus({text: 'The import was undone.'}); } catch { setCalStatus({text: 'The import could not be undone on this device.'}); } }})} onClose={() => { setImporting(false); queueMicrotask(() => importButton.current?.focus()); }} /></Suspense></LoadBoundary>}
      </section>
      <p className="fine agenda-fine">The agenda is read from your records each time you open it. Tasks can be ticked here, with Undo; everything else opens on its own page to check it in, fund it or log it. Imported events are read-only and stay on this device. A bill shows its day, never its amount.</p>
    </>}
  </div>;
}
export default AgendaPage;

type RowProps = {today: string; goals: ReadonlyMap<string, GoalOption>; onTick: (item: TaskAgendaItem, done: boolean) => void};
function DayList({day, today, heading, goals, onTick}: {day: DayWithExtras; heading: boolean} & RowProps) {
  const title = <>{formatDate(day.date, {weekday: true, year: false})}{day.date === today && <span className="agenda-today">Today</span>}</>;
  return <div className="agenda-day" data-today={day.date === today || undefined}>
    {heading && <h3 className="agenda-day-title">{title}</h3>}
    {day.items.length ? <ul className="agenda-items">{day.items.map(i => i.source === 'task' ? <TaskItemRow key={i.id} item={i} goals={goals} onTick={onTick} /> : i.source === 'event' ? <EventItemRow key={i.id} item={i} /> : <ItemRow key={i.id} item={i} />)}</ul> : <p className="agenda-nothing">Nothing planned.</p>}
  </div>;
}
function ItemRow({item}: {item: AgendaItem}) {
  return <li className="agenda-item" data-source={item.source} data-pillar={item.pillar} data-state={item.state}>
    <span className="agenda-time">{item.time ? formatClock(item.time) : 'Any time'}</span>
    <div className="agenda-item-main">
      <Link prefetch={false} className="agenda-item-title" href={item.href}>{item.title}</Link>
      <p className="agenda-item-meta"><span>{ONE[item.source]}</span>{item.detail && <span> · {item.detail}</span>}{item.state === 'done' && <span className="agenda-badge"> Done</span>}{item.state === 'skipped' && <span className="agenda-badge"> Skipped</span>}{item.example && <span className="agenda-badge is-example"> Example</span>}</p>
    </div>
  </li>;
}

/** Session AK (T1): a task on the Agenda — tick it here (the page's status line has the Undo), open it, or focus on it. */
function TaskItemRow({item, goals, onTick}: {item: TaskAgendaItem; goals: ReadonlyMap<string, GoalOption>; onTick: (item: TaskAgendaItem, done: boolean) => void}) {
  const goal = item.goal ? goals.get(item.goal) : undefined, done = item.state === 'done';
  return <li className="agenda-item agenda-task" data-source="task" data-pillar={item.pillar} data-state={item.state}>
    <span className="agenda-time">{item.time ? formatClock(item.time) : 'Any time'}</span>
    <div className="agenda-item-main agenda-task-main">
      <label className="agenda-task-tick"><input type="checkbox" checked={done} onChange={e => onTick(item, e.target.checked)} /><span className="sr-only">{done ? `Mark “${item.title}” not done` : `Mark “${item.title}” done`}</span></label>
      <div className="agenda-task-text">
        <Link prefetch={false} className="agenda-item-title" href={item.href}>{item.title}</Link>
        <p className="agenda-item-meta"><span>Task</span>{item.priority !== 'normal' && <span> · {PRIORITY_WORDS[item.priority]} priority</span>}{item.overdueSince && <span className="agenda-overdue"> · Overdue since {formatDate(item.overdueSince, {year: false})}</span>}{goal && <span> · {goal.name}</span>}{done && <span className="agenda-badge"> Done</span>}</p>
      </div>
      {!done && <Link prefetch={false} className="text-link agenda-task-focus" href={`/app/tasks?focus=${encodeURIComponent(item.taskId)}`} aria-label={`Focus on “${item.title}”`}>Focus</Link>}
    </div>
  </li>;
}
/** Session AK (T2): an imported event — read-only, named by its calendar; it opens nothing. */
function EventItemRow({item}: {item: Extract<DayItem, {source: 'event'}>}) {
  return <li className="agenda-item agenda-event" data-source="event" data-pillar="life" data-state="open">
    <span className="agenda-time">{item.time ? formatClock(item.time) : 'All day'}</span>
    <div className="agenda-item-main">
      <span className="agenda-item-title">{item.title}</span>
      <p className="agenda-item-meta"><span>From {item.calendar}</span>{item.parts && <span> · day {item.part} of {item.parts}</span>}{item.time && item.minutes > 0 && <span> · {formatNumber(item.minutes)} min</span>}</p>
    </div>
  </li>;
}

/** The month as a grid of day buttons (arrows move, Page Up/Down change month, Home/End the week's ends); the chosen day's items below. */
function MonthGrid({days, first, last, selected, today, onSelect, goals, onTick}: {days: DayWithExtras[]; first: string; last: string; selected: string; onSelect: (date: string) => void} & RowProps) {
  const grid = useRef<HTMLOListElement>(null), moved = useRef(false);
  useEffect(() => { if (moved.current) { moved.current = false; grid.current?.querySelector<HTMLButtonElement>(`[data-date="${selected}"]`)?.focus(); } }, [selected]);
  const go = (date: string) => { moved.current = true; onSelect(date); };
  const keys = (e: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const index = days.findIndex(d => d.date === date), weekday = index % 7;
    const step: Record<string, number> = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday};
    if (e.key in step) { e.preventDefault(); const to = days[index + step[e.key]!]; go(to ? to.date : addLocalDays(date, step[e.key]!)); }
    else if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); go(shiftAnchor('month', date, e.key === 'PageUp' ? -1 : 1)); }
  };
  const chosen = days.find(d => d.date === selected) ?? days.find(d => d.date === first)!;
  return <div className="agenda-month">
    <div className="agenda-weekdays" aria-hidden="true">{days.slice(0, 7).map(d => <span key={d.date}>{formatWeekday(d.date)}</span>)}</div>
    <ol ref={grid} className="agenda-grid" aria-label="Days of the month">{days.map(d => {
      const out = d.date < first || d.date > last, pillars = [...new Set(d.items.map(i => i.pillar))];
      return <li key={d.date} data-out={out || undefined}>
        <button type="button" className="agenda-cell" data-date={d.date} tabIndex={d.date === chosen.date ? 0 : -1} aria-pressed={d.date === chosen.date} aria-current={d.date === today ? 'date' : undefined}
          aria-label={`${formatDate(d.date, {weekday: true})}: ${d.items.length ? plural(d.items.length, 'item') : 'nothing planned'}`} onClick={() => onSelect(d.date)} onKeyDown={e => keys(e, d.date)}>
          <span className="agenda-cell-weekday" aria-hidden="true">{formatWeekday(d.date)}</span>
          <span className="agenda-cell-day" aria-hidden="true">{Number(d.date.slice(8))}</span>
          {d.items.length > 0 && <span className="agenda-cell-dots" aria-hidden="true">{pillars.slice(0, 4).map(p => <i key={p} data-pillar={p} />)}<b>{d.items.length}</b></span>}
        </button>
      </li>;
    })}</ol>
    <DayList day={chosen} today={today} heading goals={goals} onTick={onTick} />
  </div>;
}
