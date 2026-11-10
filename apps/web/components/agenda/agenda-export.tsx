'use client';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {AGENDA_SOURCES, SOURCE_LABEL, buildAgenda, type AgendaInput, type AgendaSource, type AgendaView} from '../../lib/agenda/build';
import {buildIcs} from '../../lib/ics/ics';
import {addLocalDays} from '../../lib/local-date';
import {exportFileName} from '../../lib/showcase-detect';
import {formatNumber} from '../../lib/visual-format';
import {openTasks} from '../../lib/tasks/engine';
import type {Tasks} from '../../lib/tasks/schema';

/**
 * Export to a calendar (Session AK, F5d), loaded the first time the person opens it: the range (what is in view, or the
 * next 30 or 60 days), which kinds of item, and whether each item's detail line goes in (off by default). Download is
 * the one action: the .ics file is made here and saved by the browser; nothing is sent anywhere, and nothing is stored.
 */
type Range = 'view' | 'next30' | 'next60';
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
/** Session AL (P-LS-37, LS-009): open tasks with a day in the range go in too (an all-day event, or timed at their time). */
export default function AgendaExport({input, tasks = null, hidden, view, viewFrom, viewTo, viewLabel, today, showcase, onClose}: {input: AgendaInput; tasks?: Tasks | null; hidden: readonly AgendaSource[]; view: AgendaView; viewFrom: string; viewTo: string; viewLabel: string; today: string; showcase: boolean; onClose: () => void}) {
  const id = useId(), box = useRef<HTMLDivElement>(null);
  // Session AK (F8, WCAG 2.4.3): the button that opened the choices is gone, so focus moves to the first choice (the range
  // picked) rather than falling to the page; Close returns it to "Choose what to export" (agenda-page.tsx).
  useEffect(() => { box.current?.querySelector<HTMLInputElement>('input:checked')?.focus(); }, []);
  const [range, setRange] = useState<Range>('view'), [details, setDetails] = useState(false), [status, setStatus] = useState('');
  const [chosen, setChosen] = useState<ReadonlySet<AgendaSource>>(() => new Set(AGENDA_SOURCES.filter(s => !hidden.includes(s))));
  const [from, to] = range === 'view' ? [viewFrom, viewTo] : [today, addLocalDays(today, range === 'next30' ? 29 : 59)];
  const items = useMemo(() => buildAgenda(input, from, to).flatMap(d => d.items), [input, from, to]);
  const [withTasks, setWithTasks] = useState(true);
  const taskEvents = useMemo(() => tasks ? openTasks(tasks, today).filter(t => t.due && t.due >= from && t.due <= to).map(t => ({id: `task:${t.id}:${t.due}`, date: t.due!, time: t.time ?? null, minutes: t.time ? 30 : 0, title: t.title, detail: 'Task'})) : [], [tasks, today, from, to]);
  const picked = [...items.filter(i => chosen.has(i.source)), ...(withTasks ? taskEvents : [])];
  const count = (s: AgendaSource) => items.filter(i => i.source === s).length;
  // Security review F10 (R1-F3): a Showcase file marks every event, since a calendar app ignores the file's own name.
  const download = () => {
    try {
      const ics = buildIcs(picked.map(i => ({id: i.id, date: i.date, time: i.time, minutes: i.minutes, summary: showcase ? `Example · ${i.title}` : i.title, ...(details && i.detail ? {description: i.detail} : {})})), {stamp: new Date(), name: showcase ? 'ZIGoals agenda (Example)' : 'ZIGoals agenda'});
      const name = exportFileName(`zigoals-agenda-${from}-to-${to}.ics`, showcase);
      const url = URL.createObjectURL(new Blob([ics], {type: 'text/calendar;charset=utf-8'})), link = document.createElement('a');
      link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setStatus(`Saved ${name} with ${plural(picked.length, 'event')}. Open it with your calendar app to add them.`);
    } catch { setStatus('The file could not be made on this device.'); }
  };
  return <div ref={box} className="agenda-export" role="group" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="sr-only">Export choices</h3>
    <fieldset><legend>Which days</legend>
      <label className="agenda-check"><input type="radio" name={`${id}-range`} checked={range === 'view'} onChange={() => setRange('view')} /><span>This {view}: {viewLabel}</span></label>
      <label className="agenda-check"><input type="radio" name={`${id}-range`} checked={range === 'next30'} onChange={() => setRange('next30')} /><span>The next 30 days</span></label>
      <label className="agenda-check"><input type="radio" name={`${id}-range`} checked={range === 'next60'} onChange={() => setRange('next60')} /><span>The next 60 days</span></label>
    </fieldset>
    <fieldset><legend>What goes in</legend>
      {tasks && <label className="agenda-check" data-pillar="task"><input type="checkbox" checked={withTasks} onChange={e => setWithTasks(e.target.checked)} /><span>Tasks</span><small>{formatNumber(taskEvents.length)}</small></label>}
      {AGENDA_SOURCES.map(s => <label key={s} className="agenda-check" data-pillar={s}><input type="checkbox" checked={chosen.has(s)} onChange={e => setChosen(c => { const next = new Set(c); if (e.target.checked) next.add(s); else next.delete(s); return next; })} /><span>{SOURCE_LABEL[s]}</span><small>{formatNumber(count(s))}</small></label>)}
      <label className="agenda-check"><input type="checkbox" checked={details} onChange={e => setDetails(e.target.checked)} /><span>Add each item’s detail line (for example “Monthly bill due”)</span></label>
    </fieldset>
    <p className="agenda-export-sum">{picked.length ? `${plural(picked.length, 'event')}: titles and days, with a time where an item has one${details ? ', and their detail lines' : ''}. Nothing else about you is in the file.` : 'Nothing to export with these choices.'}</p>
    <div className="agenda-export-actions">
      <button type="button" className="primary" disabled={!picked.length} onClick={download}>Download .ics</button>
      <button type="button" className="quiet" onClick={onClose}>Close</button>
    </div>
    <p className="fine" role="status">{status}</p>
  </div>;
}
