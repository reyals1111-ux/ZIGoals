'use client';
import {useEffect, useId, useState} from 'react';
import {dailyHealthSummary, type HealthData} from '../../../lib/health';
import {ORACLE_NUTRIENTS, oracleAmount, oracleFoods, oracleNutrient, type OracleFood, type OracleRank} from '../../../lib/food-plus/oracle';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #100; Cronometer's Oracle): Health → Insights → "Foods high in a nutrient". Choose
 * protein, fiber, a mineral, a vitamin or omega-3, and see the offline food library's richest foods as people eat them, by
 * a usual portion or per 100 kcal. For protein with a target, today's gap and what a portion of each covers. The library
 * loads on the first look (its own chunk and data, kept on this device). From public food tables; information, not advice.
 */
export default function Oracle({data, today}: {data: HealthData; today: string}) {
  const id = useId(), [key, setKey] = useState('protein'), [rank, setRank] = useState<OracleRank>('portion');
  const [found, setFound] = useState<OracleFood[] | null | 'failed'>(null);
  useEffect(() => {
    let live = true;
    queueMicrotask(() => { if (live) setFound(null); });
    void Promise.all([import('../../../lib/food-generic/load')]).then(async ([load]) => {
      const {sources} = await load.loadGenericLibrary();
      if (live) setFound(sources.length ? oracleFoods(sources, key, rank) : 'failed');
    }).catch(() => { if (live) setFound('failed'); });
    return () => { live = false; };
  }, [key, rank]);
  const nutrient = oracleNutrient(key)!;
  const summary = dailyHealthSummary(data, today), target = data.targets.proteinMg, eaten = summary.knownNutrients.proteinMg ?? 0;
  const gap = key === 'protein' && target ? Math.max(0, target - eaten) : null;
  return <section className="food-plus-card" aria-labelledby={`${id}-title`} id="health-oracle">
    <p className="eyebrow">THE ORACLE</p><h2 id={`${id}-title`}>Foods high in a nutrient</h2>
    <div className="food-plus-row">
      <label className="field"><span>Nutrient</span><select value={key} onChange={e => setKey(e.target.value)}>{ORACLE_NUTRIENTS.map(x => <option key={x.key} value={x.key}>{x.label}</option>)}</select></label>
      <fieldset className="health-quick-macros"><legend>Rank by</legend><div className="food-plus-row">
        <label className="food-plus-choice"><input type="radio" name={`${id}-rank`} checked={rank === 'portion'} onChange={() => setRank('portion')}/> A usual portion</label>
        <label className="food-plus-choice"><input type="radio" name={`${id}-rank`} checked={rank === 'kcal'} onChange={() => setRank('kcal')}/> Per 100 kcal</label>
      </div></fieldset>
    </div>
    {gap !== null && <p data-body-figure="">{gap > 0 ? `${oracleAmount(gap, nutrient)} of protein to go today, to your ${oracleAmount(target!, nutrient)} target.` : `Today’s protein target (${oracleAmount(target!, nutrient)}) is reached.`}</p>}
    {found === null ? <p className="fine" role="status">Opening the offline food library…</p>
      : found === 'failed' ? <p className="fine" role="status">The offline food library could not be opened on this device just now. Try again later; nothing else changed.</p>
      : !found.length ? <p className="fine">No food in the offline library carries a value for {nutrient.label.toLowerCase()} yet.</p>
      : <ol className="food-plus-list" aria-label={`Foods high in ${nutrient.label.toLowerCase()}, ${rank === 'portion' ? 'by a usual portion' : 'per 100 kcal'}`}>{found.map(f => <li key={`${f.sourceName}-${f.name}`}><span>{f.name}</span><small>{rank === 'portion' ? `${oracleAmount(f.perPortion, nutrient)} in ${f.portionGrams} g` : `${oracleAmount(f.per100kcal!, nutrient)} per 100 kcal`} · {oracleAmount(f.per100g, nutrient)} per 100 g{gap ? ` · a portion covers ${Math.min(100, Math.round(f.perPortion / gap * 100))} % of today’s gap` : ''}</small></li>)}</ol>}
    <p className="fine">From public food tables (the offline library), foods as people eat them: dried herbs, spices, seaweed and powders are left out; portions are rough usual amounts. Information, not advice.</p>
  </section>;
}
