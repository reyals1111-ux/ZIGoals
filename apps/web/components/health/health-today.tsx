"use client";
import {latestWeightObservation} from '../../lib/body-measurements';
import Link from "next/link";
import { dailyHealthSummary, formatHealthGrams,formatNutrient,nutritionSummaryText } from "../../lib/health";
import { dailyData } from "../../lib/health-daily";
import { useHealthToday } from "./use-health-today";
import { useHealth } from "./use-health";
import { MotionTrack } from "../motion-track";
import "./health.css";
import { formatNumber } from "../../lib/visual-format";

export function HealthToday() {
  const { data, loaded, error } = useHealth();
  // The Health journal's day, as on the Health page (QA-24), not the device's day.
  const today = useHealthToday(dailyData(data).preferences.timezone);
  const summary = loaded ? dailyHealthSummary(data, today) : null;
  const weight = latestWeightObservation(data,today);
  return <section className="panel health-today" aria-label="Today's health">
    <div className="health-section-heading"><div><p className="eyebrow">HEALTH · PRIVATE</p><h2>Your daily balance.</h2></div><span className="health-symbol" aria-hidden="true">↗</span></div>
    {!loaded ? <p>Loading your private health entries…</p> : error ? <p>Health data needs attention. Open Health to review it.</p> : summary && summary.entries > 0 ? <>
      <div className="health-today-value"><strong>{formatNutrient(summary.nutrients.kcal)}</strong><span>kcal logged{data.targets.kcal ? ` / ${formatNumber(data.targets.kcal)} target` : ""}</span></div>
      {data.targets.kcal && summary.nutrients.kcal!==null && <MotionTrack identity="health-today-kcal" className="health-today-meter" role="progressbar" aria-label="Today's calorie target" aria-valuemin={0} aria-valuemax={data.targets.kcal} aria-valuenow={Math.min(data.targets.kcal, summary.nutrients.kcal)}><span style={{ width: `${Math.min(100, summary.nutrients.kcal / data.targets.kcal * 100)}%` }}/></MotionTrack>}
      {summary.nutrients.kcal===null&&<p className="fine">{nutritionSummaryText(summary,"kcal","kcal")}</p>}<div className="health-today-macros">{([["Protein", "proteinMg"], ["Carbs", "carbsMg"], ["Fat", "fatMg"]] as const).map(([label, key]) => <span key={key}><strong>{nutritionSummaryText(summary,key,"g",1000)}</strong>{label}{data.targets[key] ? ` / ${formatHealthGrams(data.targets[key]!)} g` : ""}</span>)}</div>
    </> : <p>{data.targets.kcal ? "Your targets are ready. Add your first meal for today." : "Make room for feeling good. Set your own targets and log your first meal."}</p>}
    {loaded && !error && <div className="health-today-extra">{weight && <span>{formatHealthGrams(weight.grams)} kg · {weight.date}</span>}{summary && summary.steps > 0 && <span>{formatNumber(summary.steps)} steps today</span>}</div>}
    <Link href="/app/health" className="text-link">Open Health →</Link>
  </section>;
}
