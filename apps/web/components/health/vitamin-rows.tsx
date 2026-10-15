'use client';
import {useState} from 'react';
import {GlassBar} from '../progress/glass-progress';
import {useDeviceRecord} from '../ai/use-device-record';
import {HEALTH_VITAMINS, VITAMIN_SCALE, parseVitamin, setVitaminTarget, vitaminDay, type VitaminKey} from '../../lib/health-vitamins/schema';
import {formatNutrient, type HealthData} from '../../lib/health';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';

/**
 * Session AB-Cloud Part 4 (ADR-023 C20): vitamins after the seven nutrients in the micronutrient view, in its own style:
 * today's totals where entries carry a value (unknown is never zero) against targets the person can edit like the seven.
 * The record (`zigoals:health-vitamins:v1`) is device-first and syncs under Health's consent. AB-Design may restyle it.
 */
export function VitaminRows({data, date}: {data: HealthData; date: string}) {
  const record = useDeviceRecord(HEALTH_VITAMINS), r = record.loaded && !record.unreadable ? record.data : {version: 1 as const};
  const rows = vitaminDay(data, date, r), [editing, setEditing] = useState<VitaminKey | null>(null), [draft, setDraft] = useState(''), [error, setError] = useState('');
  function save(key: VitaminKey) {
    try { const v = parseVitamin(draft); record.update(c => setVitaminTarget(c, key, v === 0 ? null : v)); setEditing(null); setError(''); }
    catch (e) { setError(e instanceof Error && !/storage|quota/i.test(e.message) ? e.message : `Not saved on this device. ${deviceSettingFailureMessage(e)}`); }
  }
  return <div className="health-vitamins" data-region="vitamins">
    <h3 id="vitamins-title">Vitamins</h3>
    <ul className="health-micro-list" aria-labelledby="vitamins-title">{rows.map(m => { const shown = m.total === null ? null : m.total / VITAMIN_SCALE, target = m.target / VITAMIN_SCALE, share = shown === null ? 0 : Math.min(1, shown / target); return <li key={m.key}>
      <div><strong>{m.label}</strong> <small>at least {formatNutrient(target)} {m.unit} a day{m.entries > 0 && m.known < m.entries ? <span className="health-micro-unknown"><span className="sr-only">. </span>{m.entries - m.known} of {m.entries} entries have no value</span> : ''}</small></div>
      <div>{editing === m.key ? <form className="health-micro-edit" onSubmit={e => { e.preventDefault(); save(m.key); }}><input aria-label={`${m.label} target in ${m.unit}`} type="text" inputMode="decimal" value={draft} onChange={e => setDraft(e.target.value)} /><button type="submit" className="secondary">Save</button></form> : <button type="button" className="quiet" onClick={() => { setEditing(m.key); setDraft(String(target)); setError(''); }} aria-label={`Edit ${m.label} target`}>{shown === null ? 'Unknown' : `${formatNutrient(shown)} ${m.unit}`}</button>}</div>
      <GlassBar identity={`vitamin:${m.key}`} className="health-micro-bar" aria-label={`${m.label}: ${shown === null ? 'unknown' : `${formatNutrient(shown)} of ${formatNutrient(target)} ${m.unit}`}`} role="progressbar" aria-valuenow={shown ?? 0} aria-valuemin={0} aria-valuemax={target} value={share} />
    </li>; })}</ul>
    {error && <p role="alert">{error}</p>}
    <p className="fine">Vitamins come from the values you enter on a food&rsquo;s label; a blank stays unknown. An empty target goes back to the reference value.</p>
  </div>;
}
