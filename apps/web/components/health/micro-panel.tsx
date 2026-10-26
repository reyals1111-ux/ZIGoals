'use client';
import {useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {GlassBar} from '../progress/glass-progress';
import {useDeviceRecord} from '../ai/use-device-record';
import {MICRO_TARGETS, microDay, richIn, setMicroTarget, type MicroKey} from '../../lib/health-aa/micro';
import {additionalNutrients, formatNutrient, type HealthData} from '../../lib/health';
import {readFormNumber} from '../../lib/decimal-input';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {VitaminRows} from './vitamin-rows';
import './health-aa.css';

/**
 * N4: micronutrient targets (the seven the format holds, ADR-022 B6; default reference values the person can edit on
 * this device), today's totals only where the entries carry a value (unknown is never zero), and "which of my foods are
 * high in …" over the person's own foods and recipes.
 */
export function MicroPanel({data, date}: {data: HealthData; date: string}) {
  const record = useDeviceRecord(MICRO_TARGETS), r = record.loaded && !record.unreadable ? record.data : {version: 1 as const};
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
      <div><strong>{m.label}</strong> <small>{m.direction === 'at-least' ? 'at least' : 'at most'} {formatNutrient(target)} {m.unit} a day{m.entries > 0 && m.known < m.entries ? <span className="health-micro-unknown"><span className="sr-only">. </span>{m.entries - m.known} of {m.entries} entries have no value</span> : ''}</small></div>
      <div>{editing === m.key ? <form className="health-micro-edit" onSubmit={e => { e.preventDefault(); save(m.key); }}><input aria-label={`${m.label} target in ${m.unit}`} type="text" inputMode="decimal" value={draft} onChange={e => setDraft(e.target.value)} /><button type="submit" className="secondary">Save</button></form> : <button type="button" className="quiet" onClick={() => { setEditing(m.key); setDraft(String(target)); setError(''); }} aria-label={`Edit ${m.label} target`}>{shown === null ? (m.entries === 0 ? 'Nothing logged' : 'No value logged') : `${formatNutrient(shown)} ${m.unit}`}</button>}</div>
      <GlassBar identity={`micro:${m.key}`} className="health-micro-bar" aria-label={`${m.label}: ${shown === null ? 'unknown' : `${formatNutrient(shown)} of ${formatNutrient(target)} ${m.unit}`}`} role="progressbar" aria-valuenow={shown ?? 0} aria-valuemin={0} aria-valuemax={target} value={share} />
    </li>; })}</ul>
    {error && <p role="alert">{error}</p>}
    <p className="fine">Default reference values, yours to edit; an entry without a value stays unknown, never zero. Not medical advice.</p>
    <VitaminRows data={data} date={date} />
    <div className="health-rich"><h3>Which of my foods are high in…</h3><div className="health-rich-row" role="group" aria-label="Nutrient">{additionalNutrients.map(([key, label]) => <button type="button" key={key} className="quiet" aria-pressed={pick === key} onClick={() => setPick(key)}>{label}</button>)}</div>
      {rich.length ? <ol>{rich.map(f => <li key={f.id}>{f.name} <small>· {formatNutrient(f.mgPerServing / scaleOf(pick))} {additionalNutrients.find(([k]) => k === pick)![2]} {f.serving === 'per serving' ? 'per serving' : `per ${f.serving}`}{f.kind === 'recipe' ? ' · recipe' : ''}</small></li>)}</ol> : <p className="health-empty-inline">None of your foods carries a value for this yet. Add it on the food’s label.</p>}</div>
  </section>;
}
