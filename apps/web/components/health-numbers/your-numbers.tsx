'use client';
import {Suspense, lazy, useId, useMemo, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {HEALTH_NUMBERS, type HealthNumber} from '../../lib/health-numbers/store';
import {BP_LINE, LAB_LINE, VERDICT_WORDS, addNumbers, bpEntry, bpReadings, knownNames, labEntry, markers, rangeText, removeNumber, restoreNumber, verdictOf, type Marker} from '../../lib/health-numbers/engine';
import type {DraftRow} from '../../lib/health-numbers/scan';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {isShowcase} from '../../lib/showcase-storage';
import NumbersChart from './numbers-chart';
import './your-numbers.css';

const LabSheetScan = lazy(() => import('./lab-sheet-scan'));

/**
 * Session AK (BUILD list 2 #4, lane G1a): Health → "Your numbers" — blood pressure readings and lab values typed from
 * the person's own sheet (or drafted from a photo of it through their own AI, then checked). Each lab marker gets a trend
 * line; the only verdict is "inside / outside the range you copied". ZIGoals sets no ranges, never says "normal", and
 * gives no interpretation. Stored in `zigoals:health-numbers:v1`, on this device. Loaded when its fold opens.
 */
const newId = () => `hn-${crypto.randomUUID()}`;
const fmt = (v: number) => formatNumber(v, {maximumFractionDigits: 3});
type Removed = {entry: HealthNumber; label: string} | null;

export default function YourNumbers({today}: {today: string}) {
  const rec = useDeviceRecord(HEALTH_NUMBERS), id = useId();
  const [status, setStatus] = useState(''), [removed, setRemoved] = useState<Removed>(null);
  const bp = useMemo(() => bpReadings(rec.data), [rec.data]), labs = useMemo(() => markers(rec.data), [rec.data]);
  if (!rec.loaded) return <p className="fine">Reading your numbers…</p>;
  const write = (fn: Parameters<typeof rec.update>[0], said: string) => { try { rec.update(fn); setStatus(said); return true; } catch (e) { setStatus(e instanceof Error && e.message ? e.message : 'This could not be saved on this device. Nothing was changed.'); return false; } };
  const remove = (e: HealthNumber, label: string) => { if (write(r => removeNumber(r, e.id), `Removed: ${label}.`)) setRemoved({entry: e, label}); };
  const undo = () => { if (removed && write(r => restoreNumber(r, removed.entry), `Back: ${removed.label}.`)) setRemoved(null); };
  return <div className="your-numbers">
    <p className="your-numbers-lede">{BP_LINE} {LAB_LINE}</p>
    {rec.unreadable && <p role="alert">Your saved numbers could not be read on this device, so none show. Nothing was changed.</p>}
    {isShowcase() && rec.data.entries.length > 0 && <p className="fine your-numbers-showcase">Showcase: fictional example readings, not a real person&rsquo;s.</p>}
    <section className="your-numbers-part" aria-labelledby={`${id}-bp`}>
      <h3 id={`${id}-bp`}>Blood pressure</h3>
      {bp.length ? <>
        <NumbersChart title="Blood pressure" unit="mmHg" series={[{label: 'Upper (systolic)', points: bp.map(e => ({date: e.date, value: e.systolic!}))}, {label: 'Lower (diastolic)', points: bp.map(e => ({date: e.date, value: e.diastolic!})), dashed: true}]}/>
        <ul className="your-numbers-list" aria-label="Blood pressure readings, newest first">{[...bp].reverse().slice(0, 8).map(e => { const label = `${e.systolic}/${e.diastolic} mmHg on ${formatDate(e.date)}`; return <li key={e.id}>
          <span><strong>{e.systolic}/{e.diastolic}</strong> mmHg{e.pulse ? ` · pulse ${e.pulse}` : ''} · {formatDate(e.date)}{e.note ? <small> {e.note}</small> : null}</span>
          <button type="button" className="quiet" aria-label={`Remove ${label}`} onClick={() => remove(e, label)}>Remove</button>
        </li>; })}</ul>
        {bp.length > 8 && <p className="fine">{bp.length - 8} older readings are in the chart and in Export everything.</p>}
      </> : <p className="health-empty-inline">No readings yet. Type the two numbers from your monitor (the upper first), with the pulse if it shows one. A few readings a week, at the same time of day, draw a line you can take to a visit.</p>}
      <BpForm today={today} onAdd={e => write(r => addNumbers(r, [e]), `Saved: ${e.systolic}/${e.diastolic} mmHg on ${formatDate(e.date)}.`)}/>
    </section>
    <section className="your-numbers-part" aria-labelledby={`${id}-lab`}>
      <h3 id={`${id}-lab`}>Lab values</h3>
      {labs.length ? <ul className="your-numbers-markers">{labs.map(m => <MarkerCard key={m.key} marker={m} onRemove={remove}/>)}</ul>
        : <p className="health-empty-inline">No lab values yet. Copy a value from your lab sheet with its unit, and the reference range printed beside it if there is one. Each value then gets its own line, and is marked only as inside or outside that range.</p>}
      <LabForm today={today} names={knownNames(rec.data)} onAdd={(entries, said) => write(r => addNumbers(r, entries), said)}/>
    </section>
    <p className="your-numbers-status" role="status" aria-live="polite">{status}{removed && <> <button type="button" className="text-link" onClick={undo}>Undo</button></>}</p>
    <p className="fine">Kept on this device only; in Export everything. Settings → Your data → Report for a visit can include them.</p>
  </div>;
}

function MarkerCard({marker: m, onRemove}: {marker: Marker; onRemove: (e: HealthNumber, label: string) => void}) {
  const v = verdictOf(m.latest), range = rangeText(m.latest, fmt), band = m.latest.refLow !== undefined || m.latest.refHigh !== undefined ? {low: m.latest.refLow, high: m.latest.refHigh} : null;
  return <li className="your-numbers-marker">
    <div className="your-numbers-marker-head">
      <strong>{m.name}</strong>
      <span>{fmt(m.latest.value!)} {m.unit} · {formatDate(m.latest.date)}</span>
      <span className="fine">{range ? `Range you copied: ${range}${m.unit ? ` ${m.unit}` : ''}` : 'No range copied, so no check'}</span>
      {v && <span className={`your-numbers-verdict is-${v === 'inside' ? 'inside' : 'outside'}`}>{VERDICT_WORDS[v]}</span>}
    </div>
    {m.points.length > 1 && <NumbersChart title={m.name} unit={m.unit} band={band} series={[{label: m.name, points: m.points.map(p => ({date: p.date, value: p.value!}))}]}/>}
    <details className="health-trend-table"><summary>Every {m.name} value ({m.points.length})</summary>
      <ul className="your-numbers-list">{[...m.points].reverse().map(p => { const pv = verdictOf(p), label = `${m.name} ${fmt(p.value!)} ${m.unit} on ${formatDate(p.date)}`; return <li key={p.id}>
        <span>{formatDate(p.date)}: <strong>{fmt(p.value!)}</strong> {m.unit}{pv ? ` · ${VERDICT_WORDS[pv].toLowerCase()}` : ''}{p.note ? <small> {p.note}</small> : null}</span>
        <button type="button" className="quiet" aria-label={`Remove ${label}`} onClick={() => onRemove(p, label)}>Remove</button>
      </li>; })}</ul>
    </details>
  </li>;
}

function BpForm({today, onAdd}: {today: string; onAdd: (e: HealthNumber) => boolean}) {
  const [date, setDate] = useState(today), [sys, setSys] = useState(''), [dia, setDia] = useState(''), [pulse, setPulse] = useState(''), [note, setNote] = useState(''), [problem, setProblem] = useState('');
  const submit = (ev: FormEvent) => {
    ev.preventDefault(); setProblem('');
    let entry: HealthNumber; try { entry = bpEntry({date, systolic: sys, diastolic: dia, pulse, note}, newId(), today); } catch (e) { setProblem(e instanceof Error ? e.message : 'Check the numbers.'); return; }
    if (onAdd(entry)) { setSys(''); setDia(''); setPulse(''); setNote(''); }
  };
  return <form className="your-numbers-form" aria-label="Add a blood pressure reading" onSubmit={submit}>
    <div className="your-numbers-grid">
      <label className="field"><span>Day</span><input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} required/></label>
      <label className="field"><span>Upper (systolic)</span><input inputMode="numeric" autoComplete="off" value={sys} onChange={e => setSys(e.target.value)} required/></label>
      <label className="field"><span>Lower (diastolic)</span><input inputMode="numeric" autoComplete="off" value={dia} onChange={e => setDia(e.target.value)} required/></label>
      <label className="field"><span>Pulse (optional)</span><input inputMode="numeric" autoComplete="off" value={pulse} onChange={e => setPulse(e.target.value)}/></label>
    </div>
    <label className="field"><span>Note (optional)</span><input maxLength={280} value={note} onChange={e => setNote(e.target.value)} placeholder="Morning, seated"/></label>
    {problem && <p role="alert">{problem}</p>}
    <div className="actions"><button type="submit" className="primary">Save reading</button></div>
  </form>;
}

type Row = DraftRow & {key: string};
const blank = (): Row => ({key: newId(), name: '', value: '', unit: '', refLow: '', refHigh: ''});
function LabForm({today, names, onAdd}: {today: string; names: {name: string; unit: string}[]; onAdd: (entries: HealthNumber[], said: string) => boolean}) {
  const id = useId();
  const [date, setDate] = useState(today), [rows, setRows] = useState<Row[]>(() => [blank()]), [problem, setProblem] = useState(''), [scan, setScan] = useState(false), [fromPhoto, setFromPhoto] = useState(false);
  const set = (key: string, patch: Partial<DraftRow>) => setRows(rs => rs.map(r => {
    if (r.key !== key) return r;
    const next = {...r, ...patch}, known = patch.name !== undefined && !r.unit ? names.find(n => n.name.toLocaleLowerCase('en') === patch.name!.trim().toLocaleLowerCase('en')) : undefined;
    return known && !next.unit ? {...next, unit: known.unit} : next;
  }));
  const submit = (ev: FormEvent) => {
    ev.preventDefault(); setProblem('');
    const filled = rows.filter(r => r.name.trim() || r.value.trim());
    if (!filled.length) { setProblem('Give a value its name and number first.'); return; }
    const entries: HealthNumber[] = [];
    for (const [i, r] of filled.entries()) {
      try { entries.push(labEntry({date, ...r}, newId(), today)); } catch (e) { setProblem(`${filled.length > 1 ? `Row ${i + 1}: ` : ''}${e instanceof Error ? e.message : 'check the row'}`); return; }
    }
    if (onAdd(entries, `Saved ${entries.length} ${entries.length === 1 ? 'value' : 'values'} from ${formatDate(date)}.`)) { setRows([blank()]); setFromPhoto(false); }
  };
  return <form className="your-numbers-form" aria-label="Add lab values" onSubmit={submit}>
    <label className="field"><span>Day on the sheet</span><input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} required/></label>
    <datalist id={`${id}-names`}>{names.map(n => <option key={`${n.name}|${n.unit}`} value={n.name}/>)}</datalist>
    {fromPhoto && <p className="fine">Drafted from your photo. Check every name, number, unit and range against the sheet before saving.</p>}
    {rows.map((r, i) => <fieldset key={r.key} className="your-numbers-row"><legend className="sr-only">Row {i + 1}</legend>
      <label className="field your-numbers-name"><span>Name</span><input list={`${id}-names`} maxLength={60} value={r.name} onChange={e => set(r.key, {name: e.target.value})} placeholder="Glucose"/></label>
      <label className="field"><span>Value</span><input inputMode="decimal" autoComplete="off" value={r.value} onChange={e => set(r.key, {value: e.target.value})}/></label>
      <label className="field"><span>Unit, as on the sheet</span><input maxLength={20} value={r.unit} onChange={e => set(r.key, {unit: e.target.value})} placeholder="mmol/L"/></label>
      <label className="field"><span>Range low (optional)</span><input inputMode="decimal" autoComplete="off" value={r.refLow} onChange={e => set(r.key, {refLow: e.target.value})}/></label>
      <label className="field"><span>Range high (optional)</span><input inputMode="decimal" autoComplete="off" value={r.refHigh} onChange={e => set(r.key, {refHigh: e.target.value})}/></label>
      {rows.length > 1 && <button type="button" className="quiet" aria-label={`Remove row ${i + 1}`} onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))}>Remove row</button>}
    </fieldset>)}
    <p className="fine">Copy the range only from your own sheet; leave it empty when none is printed. ZIGoals never fills one in.</p>
    {problem && <p role="alert">{problem}</p>}
    <div className="actions">
      <button type="submit" className="primary">{rows.length > 1 ? `Save ${rows.length} values` : 'Save value'}</button>
      <button type="button" className="secondary" disabled={rows.length >= 40} onClick={() => setRows(rs => [...rs, blank()])}>Another value</button>
    </div>
    <details className="your-numbers-photo" onToggle={e => setScan((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>Read my lab sheet from a photo (optional)</summary>
      {scan && <Suspense fallback={<p className="fine">Opening…</p>}><LabSheetScan today={today} onDraft={d => { if (d.date) setDate(d.date); setRows(d.rows.map(r => ({...r, key: newId()}))); setFromPhoto(true); }}/></Suspense>}
    </details>
  </form>;
}
