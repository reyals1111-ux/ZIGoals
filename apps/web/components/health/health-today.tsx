"use client";
import {latestWeightObservation} from '../../lib/body-measurements';
import Link from "next/link";
import { dailyHealthSummary, formatHealthGrams } from "../../lib/health";
import { useLocalToday } from "../use-local-today";
import { useHealth } from "./use-health";
import "./health.css";

export function HealthToday() {
  const { data, loaded, error } = useHealth();
  const today = useLocalToday();
  const summary = loaded ? dailyHealthSummary(data, today) : null;
  const weight = latestWeightObservation(data,today);
  return <section className="panel health-today" aria-label="Today's health">
    <div className="health-section-heading"><div><p className="eyebrow">HEALTH · PRIVATE</p><h2>Your daily balance.</h2></div><span className="health-symbol" aria-hidden="true">↗</span></div>
    {!loaded ? <p>Loading your private health entries…</p> : error ? <p>Health data needs attention. Open Health to review it.</p> : summary && summary.entries > 0 ? <>
      <div className="health-today-value"><strong>{summary.nutrients.kcal.toLocaleString()}</strong><span>kcal logged{data.targets.kcal ? ` / ${data.targets.kcal.toLocaleString()} target` : ""}</span></div>
      {data.targets.kcal && <div className="health-today-meter" role="progressbar" aria-label="Today's calorie target" aria-valuemin={0} aria-valuemax={data.targets.kcal} aria-valuenow={Math.min(data.targets.kcal, summary.nutrients.kcal)}><span style={{ width: `${Math.min(100, summary.nutrients.kcal / data.targets.kcal * 100)}%` }}/></div>}
      <div className="health-today-macros">{([["Protein", "proteinMg"], ["Carbs", "carbsMg"], ["Fat", "fatMg"]] as const).map(([label, key]) => <span key={key}><strong>{formatHealthGrams(summary.nutrients[key])} g</strong>{label}{data.targets[key] ? ` / ${formatHealthGrams(data.targets[key]!)} g` : ""}</span>)}</div>
    </> : <p>{data.targets.kcal ? "Your targets are ready. Add your first meal for today." : "Make room for feeling good. Set your own targets and log your first meal."}</p>}
    {loaded && !error && <div className="health-today-extra">{weight && <span>{formatHealthGrams(weight.grams)} kg · {weight.date}</span>}{summary && summary.steps > 0 && <span>{summary.steps.toLocaleString()} steps today</span>}</div>}
    <Link href="/app/health" className="text-link">Open Health →</Link>
  </section>;
}
