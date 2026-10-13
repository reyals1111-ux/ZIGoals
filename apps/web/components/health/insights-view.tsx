'use client';
import {NebulaFlow} from '../nebula-flow';
import {foodInsights} from '../../lib/health-aa/food-insights';
import {dailyData} from '../../lib/health-daily';
import type {HealthData} from '../../lib/health';
import './health-aa.css';

/** N12: food insight cards over the last 28 logged days: honest, no judgement, nothing shown under seven days. */
export function InsightsView({data, today}: {data: HealthData; today: string}) {
  const cards = foodInsights(data, today, dailyData(data).preferences.timezone);
  return <section className="panel health-aa-card" aria-labelledby="food-insights-title">
    <p className="eyebrow">Your own patterns</p><h2 id="food-insights-title"><NebulaFlow identity="food-insights-title">Food insights</NebulaFlow></h2>
    {cards.length === 0 ? <p className="health-empty-inline">Seven logged days of the last twenty-eight make the first cards.</p> : <div className="health-insight-cards">{cards.map(c => <article key={c.id} className="health-aa-card" aria-labelledby={`insight-${c.id}`}><h3 id={`insight-${c.id}`}>{c.title}</h3><p>{c.line}</p>{c.detail.length > 0 && <ul>{c.detail.map(d => <li key={d}>{d}</li>)}</ul>}</article>)}</div>}
    <p className="fine">Read from your diary as it is; nothing is judged and nothing is advised.</p>
  </section>;
}
