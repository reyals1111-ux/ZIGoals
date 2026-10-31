'use client';
import {useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {REPORT_SECTIONS, SECTION_LABELS, buildReport, reportRange, sectionHasData, type ReportSectionId} from '../../lib/clinician-report/build';
import {ENERGY} from '../../lib/energy/schema';
import {dailyData} from '../../lib/health-daily';
import {addLocalDays} from '../../lib/local-date';
import {isShowcase} from '../../lib/showcase-storage';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {useLocalToday} from '../use-local-today';
import {ReportDocument} from './report-document';
import './report.css';

/**
 * Session AK (lane S, item 14): the report's form (dates, quick ranges, the parts to include) and the report itself,
 * shown over the page with "Print or save as PDF" and "Close". While it is open the print stylesheet prints only the
 * report (report.css). The report is built from this device's records each time; nothing is stored or uploaded.
 */
const PRESETS = [{days: 30, label: '30 days'}, {days: 90, label: '90 days'}, {days: 365, label: 'A year'}] as const;
export default function ReportBuilder() {
  const today = useLocalToday(), health = useHealth(), habits = useHabits(), energy = useDeviceRecord(ENERGY), id = useId();
  const [from, setFrom] = useState(() => addLocalDays(today, -29)), [to, setTo] = useState(today);
  const [chosen, setChosen] = useState<ReadonlySet<ReportSectionId>>(() => new Set(['sleep', 'mood', 'notes', 'weight']));
  const [shown, setShown] = useState(false), opener = useRef<HTMLButtonElement>(null);
  const ready = health.loaded && habits.loaded && energy.loaded;
  const records = useMemo(() => ({health: health.loaded && !health.error ? health.data : null, habits: habits.loaded && !habits.error ? habits.data : null, energy: energy.loaded && !energy.unreadable ? energy.data : null}), [health.loaded, health.error, health.data, habits.loaded, habits.error, habits.data, energy.loaded, energy.unreadable, energy.data]);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to);
  const range = valid ? reportRange(from, to, today) : null;
  const has = useMemo(() => Object.fromEntries(REPORT_SECTIONS.map(s => [s, valid ? sectionHasData({...records, from, to, today}, s) : false])) as Record<ReportSectionId, boolean>, [records, from, to, today, valid]);
  const report = useMemo(() => shown && range ? buildReport({...records, from: range.from, to: range.to, today, sections: REPORT_SECTIONS.filter(s => chosen.has(s))}) : null, [shown, range?.from, range?.to, records, today, chosen]); // eslint-disable-line react-hooks/exhaustive-deps -- the range is read by its two ends
  const toggle = (s: ReportSectionId, on: boolean) => setChosen(c => { const n = new Set(c); if (on) n.add(s); else n.delete(s); return n; });
  const close = useCallback(() => { setShown(false); queueMicrotask(() => opener.current?.focus()); }, []);
  if (!ready) return <p className="fine">Reading your records…</p>;
  return <div className="report-builder">
    <fieldset className="report-dates"><legend>Dates</legend>
      <div className="report-presets" role="group" aria-label="Quick ranges">{PRESETS.map(p => <button key={p.days} type="button" className="secondary" aria-pressed={from === addLocalDays(today, 1 - p.days) && to === today} onClick={() => { setFrom(addLocalDays(today, 1 - p.days)); setTo(today); }}>{p.label}</button>)}</div>
      <div className="report-date-fields">
        <label className="field"><span>From</span><input type="date" value={from} max={today} onChange={e => setFrom(e.target.value)}/></label>
        <label className="field"><span>To</span><input type="date" value={to} max={today} onChange={e => setTo(e.target.value)}/></label>
      </div>
      {range && (range.from !== (from <= to ? from : to) || range.to !== (from <= to ? to : from)) && <p className="fine">The report covers at most a year and never days ahead, so it uses {range.days} days.</p>}
      {!valid && <p role="alert">Choose both dates.</p>}
    </fieldset>
    <fieldset className="report-sections"><legend>Include</legend>
      {REPORT_SECTIONS.map(s => <label key={s} className="check-row report-check"><input type="checkbox" checked={chosen.has(s)} onChange={e => toggle(s, e.target.checked)}/> <span>{SECTION_LABELS[s]}{!has[s] && <span className="fine"> · nothing logged in these dates</span>}</span></label>)}
      <p className="fine">ZIGoals keeps no medication or symptom list, so the report has none; notes are the short ones you wrote with a mood or a night.</p>
    </fieldset>
    <p><button ref={opener} type="button" className="primary" disabled={!valid || chosen.size === 0} aria-describedby={`${id}-note`} onClick={() => setShown(true)}>Show the report</button></p>
    <p id={`${id}-note`} className="fine">It opens over this page. Print it, or choose “Save as PDF” in the print window. Nothing leaves this device unless you share the file.</p>
    {report && <ReportOverlay onClose={close}><ReportDocument report={report} weightUnit={records.health ? dailyData(records.health).preferences.weightUnit : 'kg'} showcase={isShowcase()}/></ReportOverlay>}
  </div>;
}

/** The report over the page (a modal dialog on screen); while open, printing prints only the report. */
function ReportOverlay({children, onClose}: {children: ReactNode; onClose: () => void}) {
  const heading = useRef<HTMLDivElement>(null), titleId = useId();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('report-open');
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { root.classList.remove('report-open'); window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return createPortal(<div className="report-root" role="dialog" aria-modal="true" aria-labelledby={titleId}>
    <div className="report-toolbar"><span id={titleId} className="report-toolbar-title" tabIndex={-1} ref={heading}>Report for a visit</span>
      <button type="button" className="primary" onClick={() => window.print()}>Print or save as PDF</button><button type="button" className="secondary" onClick={onClose}>Close</button></div>
    {children}
  </div>, document.body);
}
