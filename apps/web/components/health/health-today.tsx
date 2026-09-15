"use client";
import Link from "next/link";
import { dailyHealthSummary, formatHealthGrams } from "../../lib/health";
import { localDate } from "../../lib/local-date";
import { useHealth } from "./use-health";
import "./health.css";

export function HealthToday() {
  const { data, loaded, error } = useHealth();
  const summary = loaded ? dailyHealthSummary(data, localDate()) : null;
  return <section className="panel health-today" aria-label="Today's health">
    <div className="health-section-heading"><div><p className="eyebrow">HEALTH · PRIVATE</p><h2>Your daily balance.</h2></div><span className="health-symbol" aria-hidden="true">↗</span></div>
    {!loaded ? <p>Loading your private health entries…</p> : error ? <p>Health data needs attention. Open Health to review it.</p> : summary && summary.entries > 0 ? <>
      <div className="health-today-value"><strong>{summary.nutrients.kcal.toLocaleString()}</strong><span>kcal logged{data.targets.kcal ? ` / ${data.targets.kcal.toLocaleString()} target` : ""}</span></div>
      <p>{formatHealthGrams(summary.nutrients.proteinMg)} g protein · {summary.entries} meal {summary.entries === 1 ? "entry" : "entries"}</p>
    </> : <p>{data.targets.kcal ? "Your targets are ready. Add your first meal for today." : "Make room for feeling good. Set your own targets and log your first meal."}</p>}
    <Link href="/app/health" className="text-link">Open Health →</Link>
  </section>;
}
