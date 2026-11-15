'use client';
import Link from 'next/link';
import {Suspense, lazy, useCallback, useMemo, useRef, useState} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {RemindersGlyph} from '../header-art/glyphs/reminders';
import {EmptyState} from '../ui/empty-state';
import {LoadBoundary} from '../load-boundary';
import {ZgSkeleton} from '../skeleton/zg-skeleton';
import {ActionIntent} from '../action-intent';
import {formatClock, formatDate, formatMonth, formatNumber} from '../../lib/visual-format';
import {AGENDA_SOURCES, AGENDA_VIEWS, SOURCE_LABEL, agendaRange, buildAgenda, countBySource, shiftAnchor, sourcesWithRecords, type AgendaSource, type AgendaView} from '../../lib/agenda/build';
import {setAgendaView, setExtraShown, setSourceShown} from '../../lib/agenda/store';
import {EXTRA_LABEL, EXTRA_SOURCES, countExtras, eventAgendaItems, taskAgendaItems, withExtras, type DayItem, type DayWithExtras, type ExtraSource, type TaskAgendaItem} from '../../lib/agenda/time-items';
import {removeCalendar, restoreCalendar, storedEventCount} from '../../lib/ics/calendar';
import {deviceDay} from '../../lib/tasks/device';
import {useTaskList} from '../tasks/use-task-list';
import {useGoalOptions} from '../tasks/use-goal-options';
import {editTask} from '../../lib/tasks/engine';
import {useAgenda} from './use-agenda';
import {ChunkFailed, chunk} from '../use-chunk';
import './agenda.css';
import {useUndoShortcut} from '../tasks/use-undo-shortcut';
import {showStatus, showUndo} from '../ui/undo-toast';

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
// CI14 (weights): the days, rows, month grid and task form load as their own chunk, asked for as this page loads (agenda-days.tsx).
const useAgendaDays = chunk(() => import('./agenda-days'));
const AgendaExport = lazy(() => import('./agenda-export'));
// Session AK (T2): the .ics reader and its preview, loaded the first time the person imports a calendar.
const CalendarImport = lazy(() => import('./calendar-import'));
// Session AP (time-blocking): the day by the hour, loaded the first time the person opens it.
const AgendaHourGrid = lazy(() => import('./agenda-hour-grid'));
const VIEW_LABEL: Record<AgendaView, string> = {day: 'Day', week: 'Week', month: 'Month'};
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
const TEACH: Record<AgendaSource, [string, string]> = {
  habit: ['Add a habit', '/app/habits?add=habit'], contribution: ['Give a goal a plan', '/app/goals'], bill: ['Add a bill', '/app/wealth?view=bills'],
  workout: ['Log a workout', '/app/health?view=workouts'], meal: ['Plan a meal', '/app/health#planner'], unbonding: ['Staking', '/app/staking'], review: ['Turn on the weekly review', '/app/settings/reminders'],
};
/** Session AK (T1, T2): what a person's tasks and imported calendars need to show here, for the filter's "none yet". */
const EXTRA_TEACH: Record<ExtraSource, [string, string]> = {task: ['Add a task', '/app/tasks'], event: ['Import a calendar', '#agenda-import-title']};

export function AgendaPage() {
  const parts = useAgendaDays(), rows = parts.mod;
  const {loaded: read, input, today, showcase, record, unreadable, calendars, zone} = useAgenda(), loaded = read && !!rows;
  // Session AK (T1): tasks are the one kind the Agenda ticks (with Undo), and the day view adds them.
  const list = useTaskList(), goals = useGoalOptions();
  useUndoShortcut(); // Session AL (P-LS-08): Ctrl/⌘+Z runs the toast's Undo, never in a text field.
  const [hours, setHours] = useState(false), [importing, setImporting] = useState(false), importButton = useRef<HTMLButtonElement>(null);
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
  // Session AL (P-LS-10, C-LS-16/17/18): a task moves to another day (and time) by dragging it onto a day, or with its
  // Move control (the keyboard way); the toast offers Undo.
  const moveTask = (taskId: string, date: string, time?: string | null) => {
    const t = list.tasks.data.tasks.find(x => x.id === taskId); if (!t || t.doneAt) return;
    if (t.due === date && (time === undefined || (time ?? undefined) === t.time)) return;
    list.change(r => editTask(r, taskId, {due: date, ...(time !== undefined ? {time} : {})}, today, {allowPast: true}), `Moved “${t.title}” to ${date === today ? 'today' : formatDate(date, {weekday: true, year: false})}${time ? ` at ${formatClock(time)}` : ''}.`, `“${t.title}” is back on its day.`);
  };
  const [calStatus, setCalStatus] = useState<{text: string; undo?: () => void} | null>(null);
  const removeCal = (calId: string) => {
    const index = calendars.data.calendars.findIndex(c => c.id === calId), cal = calendars.data.calendars[index];
    if (!cal || calendars.unreadable) return;
    // Session AL (A7, PRIMITIVES 3e): the one Undo toast; restore puts the calendar back into the latest record, in its place
    // (lib/ics/calendar.ts restoreCalendar, tested in lib/ics/import.test.ts).
    try { calendars.update(r => removeCalendar(r, calId)); setCalStatus(null); showUndo({message: `Removed “${cal.name}” from your agenda.`, undone: `“${cal.name}” is back.`, restore: () => calendars.update(r => restoreCalendar(r, cal, index))}); }
    catch { showStatus('The calendar could not be removed on this device.', {tone: 'error'}); }
  };
  const label = view === 'day' ? formatDate(at, {weekday: true}) : view === 'week' ? `${formatDate(range.from, {year: range.from.slice(0, 4) === range.to.slice(0, 4) ? false : undefined})} – ${formatDate(range.to)}` : formatMonth(range.first);
  const total = days ? days.filter(d => view !== 'month' || (d.date >= range.first && d.date <= range.last)).reduce((n, d) => n + d.items.length, 0) : 0;
  const kinds = AGENDA_SOURCES.length + EXTRA_SOURCES.length, hiddenCount = hidden.length + hiddenExtra.length;
  const rowProps = {today, goals: goals.byKey, onTick: tickTask, onMove: moveTask};

  return <div className="agenda-page" data-agenda={loaded ? 'ready' : 'loading'}>
    {AGENDA_VIEWS.map(v => <ActionIntent key={v} param="view" value={v} onAction={() => setChosen(v)} />)}
    <ActionIntent param="export" value="1" ready={loaded} onAction={() => setExporting(true)} />
    <PageHeader className="page-heading agenda-hero" titleId="agenda-title" eyebrow="Agenda" title="Your days, all in one place"
      lede="Habits, tasks, planned contributions, bills, workouts, meals, unbonding dates and reviews, from your own records, beside the calendars you import. Tap an item to open it where it lives; tick a task right here. Nothing here leaves this device unless you export it."
      actions={<p className="agenda-links"><Link className="text-link" href="/app/timeline">Today as a timeline →</Link></p>}
      art={<OrbitArt glyph={RemindersGlyph} spin={22} />} />
    {parts.failed ? <LoadBoundary label="Your agenda"><ChunkFailed what="The agenda"/></LoadBoundary> : !loaded || !rows || !input || !days || !counts ? <ZgSkeleton label="Opening your agenda…" className="agenda-skeleton" block lines={3} /> : <>
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
          <summary>Show: {hiddenCount ? `${kinds - hiddenCount} of ${kinds} kinds` : 'everything'} <span className="agenda-filter-change">{/* Session AL (DV-194): the control says it opens */}Choose kinds</span></summary>
          <fieldset><legend className="sr-only">Kinds of items to show</legend>
            {AGENDA_SOURCES.map(s => <label key={s} className="agenda-check" data-pillar={s}><input type="checkbox" checked={!hidden.includes(s)} onChange={e => toggle(s, e.target.checked)} /><span>{SOURCE_LABEL[s]}</span><small>{counts[s] ? formatNumber(counts[s]) : known.has(s) ? '0' : 'none yet'}</small></label>)}
            {EXTRA_SOURCES.map(s => <label key={s} className="agenda-check" data-pillar={s}><input type="checkbox" checked={!hiddenExtra.includes(s)} onChange={e => toggleExtra(s, e.target.checked)} /><span>{EXTRA_LABEL[s]}</span><small>{extraCounts[s] ? formatNumber(extraCounts[s]) : knownExtra.has(s) ? '0' : 'none yet'}</small></label>)}
          </fieldset>
        </details>
        {view === 'day' && <p className="agenda-hours-toggle"><button type="button" className="secondary" aria-pressed={hours} onPointerEnter={() => void import('./agenda-hour-grid').catch(() => undefined)} onClick={() => setHours(h => !h)}>By the hour</button></p>}
        {view === 'day' && (hours ? <LoadBoundary label="The day by the hour"><Suspense fallback={<p className="fine">Opening the hours…</p>}><AgendaHourGrid day={days[0]!} today={today} onMove={moveTask} onTick={tickTask} /></Suspense></LoadBoundary> : <rows.DayList day={days[0]!} heading={false} {...rowProps} />)}
        {view === 'day' && days[0]!.date >= today && !list.tasks.unreadable && <rows.TaskAddForm compact onAdd={list.add} goals={[]} today={today} fixedDue={days[0]!.date} label={`Add a task for ${formatDate(days[0]!.date, {weekday: true, year: false})}`} submit="Add task" />}
        {view === 'week' && <ol className="agenda-week">{days.map(d => <li key={d.date}><rows.DayList day={d} heading {...rowProps} /></li>)}</ol>}
        {view === 'month' && <rows.MonthGrid days={days} first={range.first} last={range.last} selected={at} onSelect={setAnchor} {...rowProps} />}
        <rows.TaskStatusLine status={list.status} error={list.error} onUndo={list.runUndo} />
        {note && <p className="fine" role="status">{note}</p>}
      </section>
      <section className="panel agenda-export-panel" aria-labelledby="agenda-export-title">
        <h2 id="agenda-export-title">Export to a calendar</h2>
        <p>Make an .ics file on this device and open it with your calendar app. You choose what goes in it: titles and days only, unless you add the details.</p>
        {!exporting ? <button ref={exportButton} type="button" className="secondary" onPointerEnter={() => void import('./agenda-export').catch(() => undefined)} onClick={() => setExporting(true)}>Choose what to export</button>
          : <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening the export…</p>}><AgendaExport input={input} tasks={list.tasks.loaded && !list.tasks.unreadable ? list.tasks.data : null} hidden={hidden} view={view} viewFrom={view === 'month' ? range.first : range.from} viewTo={view === 'month' ? range.last : range.to} viewLabel={label} today={today} showcase={showcase} onClose={() => { setExporting(false); queueMicrotask(() => exportButton.current?.focus()); }} /></Suspense></LoadBoundary>}
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
          : <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening the import…</p>}><CalendarImport today={today} applyTasks={list.change} onAdded={(text, undo) => setCalStatus({text, undo: () => { try { undo(); setCalStatus({text: 'The import was undone.'}); } catch { setCalStatus({text: 'The import could not be undone on this device.'}); } }})} onClose={() => { setImporting(false); queueMicrotask(() => importButton.current?.focus()); }} /></Suspense></LoadBoundary>}
      </section>
      <p className="fine agenda-fine">The agenda is read from your records each time you open it. Tasks can be ticked here, with Undo; everything else opens on its own page to check it in, fund it or log it. Imported events are read-only and stay on this device. A bill shows its day, never its amount.</p>
    </>}
  </div>;
}
export default AgendaPage;
