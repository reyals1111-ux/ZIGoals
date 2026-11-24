'use client';
import {useId, useState} from 'react';
import {NebulaFlow} from '../../nebula-flow';
import type {HealthData} from '../../../lib/health';
import {dailyData, healthZone} from '../../../lib/health-daily';
import {FOOD_PLUS} from '../../../lib/food-plus/schema';
import {DAY_PARTS, nutrientTiming, share, type TimingKey} from '../../../lib/food-plus/times';
import {useDeviceRecord} from '../../ai/use-device-record';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #108; MacroFactor's nutrient timing, Cronometer's timestamps): Health → Insights →
 * "When you eat": calories, protein, carbs, fat or fiber by part of the day, today or over 7 or 30 days, as a share and
 * an average a day. Only entries with a time count (the time each was logged on its day, or the one you set in the
 * Diary); the rest are counted apart and never placed. Information, not advice.
 */
const NUTRIENTS: readonly {key: TimingKey; label: string; unit: string; scale: number}[] = [
  {key: 'kcal', label: 'Calories', unit: 'kcal', scale: 1}, {key: 'proteinMg', label: 'Protein', unit: 'g', scale: 1000},
  {key: 'carbsMg', label: 'Carbs', unit: 'g', scale: 1000}, {key: 'fatMg', label: 'Fat', unit: 'g', scale: 1000}, {key: 'fiberMg', label: 'Fiber', unit: 'g', scale: 1000},
];
const RANGES = [{days: 1, label: 'Today'}, {days: 7, label: '7 days'}, {days: 30, label: '30 days'}] as const;
export default function NutrientTiming({data, today}: {data: HealthData; today: string}) {
  const record = useDeviceRecord(FOOD_PLUS), zone = healthZone(dailyData(data).preferences.timezone), id = useId();
  const [days, setDays] = useState<1 | 7 | 30>(7), [key, setKey] = useState<TimingKey>('proteinMg');
  if (!record.loaded) return null;
  const t = nutrientTiming(data, record.data, zone, today, days), n = NUTRIENTS.find(x => x.key === key)!;
  const perDay = (v: number) => formatNumber(v / n.scale / Math.max(1, t.daysWithTimes), {maximumFractionDigits: n.scale === 1 ? 0 : 1});
  const top = Math.max(0, ...t.parts.map(p => p[key]));
  return <section className="panel food-plus-card" aria-labelledby={`${id}-title`} id="health-nutrient-timing">
    <p className="eyebrow">NUTRIENT TIMING</p><h2 id={`${id}-title`}><NebulaFlow identity="nutrient-timing-title">When you eat</NebulaFlow></h2>
    <div className="food-plus-row">
      <fieldset className="health-quick-macros"><legend>Days</legend><div className="food-plus-row">{RANGES.map(r => <label key={r.days} className="food-plus-choice"><input type="radio" name={`${id}-days`} checked={days === r.days} onChange={() => setDays(r.days)}/> {r.label}</label>)}</div></fieldset>
      <label className="field"><span>Nutrient</span><select value={key} onChange={e => setKey(e.target.value as TimingKey)}>{NUTRIENTS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</select></label>
    </div>
    {!t.timedEntries ? <p>{t.untimedEntries ? `None of the ${t.untimedEntries} ${plural(t.untimedEntries, 'entry', 'entries')} in these days has a time yet. Entries logged on their own day take the time they were logged; in the Diary, tap “Add time” on an entry to give it one.` : 'Nothing is logged in these days yet. Each entry you log takes the time you logged it, and you can change it in the Diary; this card then shows what you eat in each part of the day.'}</p> : <>
      <ul className="food-plus-bars" aria-label={`${n.label} by part of the day`}>{t.parts.map((p, i) => { const s = share(t, p, key); return <li key={p.key}><span>{DAY_PARTS[i]!.en.split(' (')[0]}</span><span className="food-plus-bar" aria-hidden="true"><i style={{width: `${top ? Math.round(p[key] / top * 100) : 0}%`}}/></span><span data-body-figure="">{s === null ? '—' : `${s} %`}</span></li>; })}</ul>
      <div className="food-plus-table-frame" tabIndex={0} role="region" aria-label={`${n.label} by part of the day, table`}><table className="food-plus-table"><caption className="sr-only">{n.label} by part of the day, {formatDate(t.from)} to {formatDate(t.to)}</caption>
        <thead><tr><th scope="col">Part of the day</th><th scope="col">Entries</th><th scope="col">{t.daysWithTimes > 1 ? `${n.label} a day` : n.label}</th><th scope="col">Share</th></tr></thead>
        <tbody>{t.parts.map((p, i) => { const s = share(t, p, key); return <tr key={p.key}><th scope="row">{DAY_PARTS[i]!.en}</th><td>{p.entries}</td><td data-body-figure="">{p.entries ? `${perDay(p[key])} ${n.unit}` : '—'}</td><td data-body-figure="">{s === null ? '—' : `${s} %`}</td></tr>; })}</tbody></table></div>
      <p className="fine">{t.timedEntries} timed {plural(t.timedEntries, 'entry', 'entries')} on {t.daysWithTimes} {plural(t.daysWithTimes, 'day')}{t.untimedEntries ? `; ${t.untimedEntries} without a time are left out` : ''}. A value an entry does not carry is left out, never counted as 0. Information, not advice.</p>
    </>}
  </section>;
}
