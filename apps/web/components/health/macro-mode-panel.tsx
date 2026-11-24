'use client';
import {useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {useDeviceRecord} from '../ai/use-device-record';
import {MACRO_MODE, MACRO_MODES, setMacroMode, splitGrams, type MacroMode} from '../../lib/health-aa/macro-mode';
import {netCarbsOfDay, netCarbsWords} from '../../lib/health-aa/net-carbs-day';
import {dailyHealthSummary, type HealthData} from '../../lib/health';
import {useDayTargets} from './food-plus/use-day-targets';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import './health-aa.css';

const LABELS: Record<MacroMode, string> = {standard: 'Standard', 'net-carbs': 'Net carbs', keto: 'Keto view', custom: 'Custom split'};
/** N7: macro modes, display only: net carbs, a keto view, a custom split; the stored targets never change. */
export function MacroModePanel({data, date}: {data: HealthData; date: string}) {
  const record = useDeviceRecord(MACRO_MODE), r = record.loaded && !record.unreadable ? record.data : {version: 1 as const, mode: 'standard' as const};
  const [error, setError] = useState(''), [split, setSplit] = useState(r.split ?? {fat: 30, protein: 30, carbs: 40});
  // Review b2b #4: the day's net carbs by the one rule the Carbs tile and NOVA/ZIGi use, with the sugar alcohols set per food.
  const {sugarAlcohols} = useDayTargets(data.targets, date);
  const day = dailyHealthSummary(data, date), net = netCarbsOfDay(data.diary, date, sugarAlcohols), words = netCarbsWords(net);
  const kcal = data.targets.kcal, grams = r.split && kcal ? splitGrams(kcal, r.split) : null;
  const choose = (mode: MacroMode) => { try { record.update(c => setMacroMode(c, mode, mode === 'custom' ? split : undefined)); setError(''); } catch (e) { setError(e instanceof Error && /100/.test(e.message) ? e.message : `Not saved on this device. ${deviceSettingFailureMessage(e)}`); } };
  return <section className="panel health-aa-card" aria-labelledby="macro-mode-title">
    <p className="eyebrow">How your macros are shown</p><h2 id="macro-mode-title"><NebulaFlow identity="macro-mode-title">Macro mode</NebulaFlow></h2>
    <div className="health-macro-modes" role="group" aria-label="Macro mode">{MACRO_MODES.map(m => <button type="button" key={m} className="quiet" aria-pressed={r.mode === m} onClick={() => choose(m)}>{LABELS[m]}</button>)}</div>
    {(r.mode === 'net-carbs' || r.mode === 'keto') && <p data-net-carbs="">Net carbs today: <strong>{net.grams === null ? 'unknown' : `${net.grams} g`}</strong>{net.grams !== null && <small> · {words.how}</small>}{words.fiberNote && <small className="health-micro-unknown"> · {words.fiberNote}</small>}</p>}
    {r.mode === 'custom' && <form className="health-macro-split" onSubmit={e => { e.preventDefault(); choose('custom'); }}>{(['fat', 'protein', 'carbs'] as const).map(k => <label key={k}><span>{k[0]!.toUpperCase() + k.slice(1)} %</span><input type="number" min={0} max={100} value={split[k]} onChange={e => setSplit({...split, [k]: Number(e.target.value)})} /></label>)}<div className="actions" style={{gridColumn: '1 / -1'}}><button type="submit" className="secondary">Use this split</button></div></form>}
    {grams && kcal && <p>With {kcal} kcal a day this split means about <strong>{grams.fat} g fat · {grams.protein} g protein · {grams.carbs} g carbs</strong>{r.mode === 'keto' ? ' (70 / 25 / 5)' : ''}.{day.nutrients.kcal !== null ? ` Logged today: ${Math.round(day.nutrients.kcal)} kcal.` : ''}</p>}
    {r.mode === 'standard' && <p className="fine">Carbs, protein and fat as logged, against the targets you set.</p>}
    {error && <p role="alert">{error}</p>}
    <p className="fine">A view only: your targets and your records stay exactly as they are.</p>
  </section>;
}
