'use client';
import {NebulaFlow} from '../nebula-flow';
import {GlassRing} from '../progress/glass-progress';
import {addWater, dailyData, waterSummary} from '../../lib/health-daily';
import {newHealthId, type HealthData} from '../../lib/health';
import {DEFAULT_WATER_SIZES_ML} from '../../lib/health-quick/schema';
import {waterText} from '../../lib/health-units';
import {zigiSignals} from '../zigi/bus';
import type {HealthPerform} from './aa-types';
import './health-aa.css';

/** N11: today's water as a goal ring with one-tap buttons in the person's own sizes (Health → Quick logging). */
export function WaterRing({data, date, perform}: {data: HealthData; date: string; perform: HealthPerform}) {
  const daily = dailyData(data), s = waterSummary(data, date), sizes = data.quick?.waterSizesMl ?? [...DEFAULT_WATER_SIZES_ML], unit = daily.preferences.waterUnit;
  const target = s.targetMl ?? null, share = target ? Math.min(1, s.millilitres / target) : 0;
  const add = (ml: number) => void perform(latest => addWater(latest, {id: newHealthId(), date, amountMilli: ml * 1000, unit}, new Date().toISOString()), `${waterText(ml, unit)} of water recorded.`, () => { try { zigiSignals.emitValidated('health_log_recorded'); } catch { /* decoration */ } });
  return <section className="panel health-aa-card water-ring-card" aria-labelledby="water-ring-title">
    <GlassRing identity="water-ring" className="water-ring" arcs={[{key: 'water', end: share * 100}]} role="img" aria-label={target ? `${waterText(s.millilitres, unit)} of ${waterText(target, unit)} today` : `${waterText(s.millilitres, unit)} today, no goal set`}><strong>{waterText(s.millilitres, unit).replace(/\s.*$/, '')}</strong><small>{target ? `of ${waterText(target, unit)}` : unit === 'ml' ? 'mL' : 'fl oz'}</small></GlassRing>
    <div><p className="eyebrow">Water</p><h2 id="water-ring-title"><NebulaFlow identity="water-ring-title">{target ? (share >= 1 ? 'Goal reached today.' : 'A sip at a time.') : 'Set a daily goal in Targets.'}</NebulaFlow></h2>
      <div className="water-sizes" role="group" aria-label="Add water">{sizes.map(ml => <button type="button" className="secondary" key={ml} onClick={() => add(ml)}>+ {waterText(ml, unit)}</button>)}</div>
      <p className="fine">Your own sizes, from Health → Quick logging. Reminders live under Settings → Reminders.</p></div>
  </section>;
}
