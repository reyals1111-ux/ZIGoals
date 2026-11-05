'use client';
import {Suspense, lazy, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {GlassBar} from '../progress/glass-progress';
import {useDeviceRecord} from '../ai/use-device-record';
import {MICRO_TARGETS, microDay, richIn, setMicroTarget, type MicroKey} from '../../lib/health-aa/micro';
import {additionalNutrients, formatNutrient, type HealthData} from '../../lib/health';
import {readFormNumber} from '../../lib/decimal-input';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {VitaminRows} from './vitamin-rows';
import {HEALTH_VITAMINS} from '../../lib/health-vitamins/schema';
import {EXTRA_SCALE, NUTRIENT_EXTRAS_RECORD} from '../../lib/health-vitamins/extras';
import {nutrientDay, type ReportContext} from '../../lib/health-aa/nutrient-report';
import './health-aa.css';
// Session AK (task 4.4): the full report (every nutrient, 7-day averages, top sources) loads only when opened.
const NutrientReport = lazy(() => import('./nutrient-report').then(m => ({default: m.NutrientReport})));

/**
 * N4: micronutrient targets (the seven the format holds, ADR-022 B6; default reference values the person can edit on
 * this device), today's totals only where the entries carry a value (unknown is never zero), and "which of my foods are
 * high in …" over the person's own foods and recipes.
 */
export function MicroPanel({data, date}: {data: HealthData; date: string}) {
  const record = useDeviceRecord(MICRO_TARGETS), r = record.loaded && !record.unreadable ? record.data : {version: 1 as const};
  const [report, setReport] = useState(false);
  const rows = microDay(data, date, r), [editing, setEditing] = useState<MicroKey | null>(null), [draft, setDraft] = useState(''), [error, setError] = useState(''), [pick, setPick] = useState<MicroKey>('ironMg');
  const scaleOf = (key: MicroKey) => additionalNutrients.find(([k]) => k === key)![3];
  function save(key: MicroKey) {
    try { const scale = scaleOf(key); const v = draft.trim() ? Math.round(readFormNumber(draft, {max: 1_000_000}) * scale) : null; record.update(c => setMicroTarget(c, key, v)); setEditing(null); setError(''); }
    catch (e) { setError(e instanceof Error && !/storage|quota/i.test(e.message) ? e.message : `Not saved on this device. ${deviceSettingFailureMessage(e)}`); }
  }
  const rich = richIn(data, pick);
  return <section className="panel health-aa-card" aria-labelledby="micro-title">
    <p className="eyebrow">Beyond the macros</p><h2 id="micro-title"><NebulaFlow identity="micro-title">Micronutrients</NebulaFlow></h2>
    <ul className="health-micro-list">{rows.map(m => { const shown = m.total === null ? null : m.total / m.scale, target = m.target / m.scale; const share = shown === null ? 0 : Math.min(1, shown / target); return <li key={m.key}>
      <div><strong>{m.label}</strong> <small>{m.direction === 'at-least' ? 'at least' : 'at most'} {formatNutrient(target)} {m.unit} a day{/* Session AL (P-MO-66, MO-014): a neutral count of what is known, not an amber "7 of 8 entries have no value" on every tile */}{m.entries > 0 && m.known < m.entries ? <span className="health-micro-coverage"><span className="sr-only">. </span>from {m.known} of {m.entries} {m.entries === 1 ? 'entry' : 'entries'}</span> : ''}</small></div>
      <div>{editing === m.key ? <form className="health-micro-edit" onSubmit={e => { e.preventDefault(); save(m.key); }}><input aria-label={`${m.label} target in ${m.unit}`} type="text" inputMode="decimal" value={draft} onChange={e => setDraft(e.target.value)} /><button type="submit" className="secondary">Save</button></form> : <button type="button" className="quiet" onClick={() => { setEditing(m.key); setDraft(String(target)); setError(''); }} aria-label={`Edit ${m.label} target`}>{shown === null ? (m.entries === 0 ? 'Nothing logged' : 'No value logged') : `${formatNutrient(shown)} ${m.unit}`}</button>}</div>
      <GlassBar identity={`micro:${m.key}`} className="health-micro-bar" aria-label={`${m.label}: ${shown === null ? 'unknown' : `${formatNutrient(shown)} of ${formatNutrient(target)} ${m.unit}`}`} role="progressbar" aria-valuenow={shown ?? 0} aria-valuemin={0} aria-valuemax={target} value={share} />
    </li>; })}</ul>
    {error && <p role="alert">{error}</p>}
    <p className="fine">{/* Session AL (P-MO-67, MO-135) */}These micronutrient lines start from general reference intakes (yours to edit); your calories and macros have no defaults and stay as you set them in Targets. An entry without a value stays unknown, never zero. Information, not medical advice.</p>
    <VitaminRows data={data} date={date} />
    <ExtraRows data={data} date={date} />
    <div className="actions"><button type="button" className="secondary" aria-expanded={report} onClick={() => setReport(!report)}>{report ? 'Close the nutrient report' : 'Open the nutrient report'}</button></div>
    {report && <Suspense fallback={<p className="fine">Opening the report…</p>}><NutrientReport data={data} date={date} /></Suspense>}
    <div className="health-rich"><h3>Which of my foods are high in…</h3><div className="health-rich-row" role="group" aria-label="Nutrient">{additionalNutrients.map(([key, label]) => <button type="button" key={key} className="quiet" aria-pressed={pick === key} onClick={() => setPick(key)}>{label}</button>)}</div>
      {rich.length ? <ol>{rich.map(f => <li key={f.id}>{f.name} <small>· {formatNutrient(f.mgPerServing / scaleOf(pick))} {additionalNutrients.find(([k]) => k === pick)![2]} {f.serving === 'per serving' ? 'per serving' : `per ${f.serving}`}{f.kind === 'recipe' ? ' · recipe' : ''}</small></li>)}</ol> : <p className="health-empty-inline">None of your foods carries a value for this yet. Add it on the food’s label.</p>}</div>
  </section>;
}

/**
 * Session AL fourth pass (C-MO-13, MO-014): the extended micronutrients a source gave (magnesium, zinc, B1, B2, B3, B6,
 * omega-3) as tiles beside the seven and the vitamins: today's total where entries carry a value, how many did, and the
 * general reference intake it is read against (information, never a target or advice). Nothing logged with one: one line.
 */
function ExtraRows({data, date}: {data: HealthData; date: string}) {
  const vitamins = useDeviceRecord(HEALTH_VITAMINS), extras = useDeviceRecord(NUTRIENT_EXTRAS_RECORD), micro = useDeviceRecord(MICRO_TARGETS);
  const ctx: ReportContext = {data, vitamins: vitamins.loaded && !vitamins.unreadable ? vitamins.data : {version: 1}, extras: extras.loaded && !extras.unreadable ? extras.data : {version: 1}, micro: micro.loaded && !micro.unreadable ? micro.data : {version: 1}};
  const rows = nutrientDay(ctx, date).filter(r => r.key.startsWith('extra:'));
  const shown = rows.filter(r => r.total !== null);
  return <section className="health-extra-micros" aria-label="More micronutrients">
    <h3>More from your foods</h3>
    {shown.length ? <ul className="health-micro-list">{shown.map(r => { const value = r.total! / EXTRA_SCALE, reference = r.reference === null ? null : r.reference / EXTRA_SCALE; return <li key={r.key}>
      <div><strong>{r.label}</strong> <small>{reference !== null ? `general reference ${formatNutrient(reference)} ${r.unit} a day` : 'no reference'}{r.known < r.entries ? <span className="health-micro-coverage"><span className="sr-only">. </span>from {r.known} of {r.entries} {r.entries === 1 ? 'entry' : 'entries'}</span> : ''}</small></div>
      <div><span>{formatNutrient(value)} {r.unit}</span></div>
      {reference !== null && <GlassBar identity={`micro:${r.key}`} className="health-micro-bar" role="progressbar" aria-label={`${r.label}: ${formatNutrient(value)} of ${formatNutrient(reference)} ${r.unit}`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={reference} value={Math.min(1, value / reference)} />}
    </li>; })}</ul> : <p className="fine">Magnesium, zinc, B vitamins and omega-3 show here when a food you logged today carries them (a barcode or label that gives them). {rows[0]?.entries ? 'None of today’s entries does yet.' : 'Nothing logged today yet.'}</p>}
  </section>;
}
