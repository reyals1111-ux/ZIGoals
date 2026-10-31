'use client';
import {useId, useMemo, useState} from 'react';
import {AGENDA_SOURCES, SOURCE_LABEL, buildAgenda, type AgendaInput, type AgendaSource, type AgendaView} from '../../lib/agenda/build';
import {buildIcs} from '../../lib/ics/ics';
import {addLocalDays} from '../../lib/local-date';
import {exportFileName} from '../../lib/showcase-detect';
import {formatNumber} from '../../lib/visual-format';

/**
 * Export to a calendar (Session AK, F5d), loaded the first time the person opens it: the range (what is in view, or the
 * next 30 or 60 days), which kinds of item, and whether each item's detail line goes in (off by default). Download is
 * the one action: the .ics file is made here and saved by the browser; nothing is sent anywhere, and nothing is stored.
 */
type Range = 'view' | 'next30' | 'next60';
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
export default function AgendaExport({input, hidden, view, viewFrom, viewTo, viewLabel, today, showcase, onClose}: {input: AgendaInput; hidden: readonly AgendaSource[]; view: AgendaView; viewFrom: string; viewTo: string; viewLabel: string; today: string; showcase: boolean; onClose: () => void}) {
  const id = useId();
  const [range, setRange] = useState<Range>('view'), [details, setDetails] = useState(false), [status, setStatus] = useState('');
  const [chosen, setChosen] = useState<ReadonlySet<AgendaSource>>(() => new Set(AGENDA_SOURCES.filter(s => !hidden.includes(s))));
  const [from, to] = range === 'view' ? [viewFrom, viewTo] : [today, addLocalDays(today, range === 'next30' ? 29 : 59)];
  const items = useMemo(() => buildAgenda(input, from, to).flatMap(d => d.items), [input, from, to]);
  const picked = items.filter(i => chosen.has(i.source));
  const count = (s: AgendaSource) => items.filter(i => i.source === s).length;
  const download = () => {
    try {
      const ics = buildIcs(picked.map(i => ({id: i.id, date: i.date, time: i.time, minutes: i.minutes, summary: i.title, ...(details && i.detail ? {description: i.detail} : {})})), {stamp: new Date(), name: showcase ? 'ZIGoals agenda (Example)' : 'ZIGoals agenda'});
      const name = exportFileName(`zigoals-agenda-${from}-to-${to}.ics`, showcase);
      const url = URL.createObjectURL(new Blob([ics], {type: 'text/calendar;charset=utf-8'})), link = document.createElement('a');
      link.href = url; link.download = name; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setStatus(`Saved ${name} with ${plural(picked.length, 'event')}. Open it with your calendar app to add them.`);
    } catch { setStatus('The file could not be made on this device.'); }
  };
  return <div className="agenda-export" role="group" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="sr-only">Export choices</h3>
    <fieldset><legend>Which days</legend>
      <label className="agenda-check"><input type="radio" name={`${id}-range`} checked={range === 'view'} onChange={() => setRange('view')} /><span>This {view}: {viewLabel}</span></label>
      <label className="agenda-check"><input type="radio" name={`${id}-range`} checked={range === 'next30'} onChange={() => setRange('next30')} /><span>The next 30 days</span></label>
      <label className="agenda-check"><input type="radio" name={`${id}-range`} checked={range === 'next60'} onChange={() => setRange('next60')} /><span>The next 60 days</span></label>
    </fieldset>
    <fieldset><legend>What goes in</legend>
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
