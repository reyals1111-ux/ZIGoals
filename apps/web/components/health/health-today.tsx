"use client";
import {latestWeightObservation} from '../../lib/body-measurements';
import Link from "next/link";
import { dailyHealthSummary, formatHealthGrams,formatNutrient,nutritionSummaryText } from "../../lib/health";
import { dailyData } from "../../lib/health-daily";
import { weightReadingText } from "../../lib/health-units";
import { formatMacroGrams } from "../../lib/health-plausible";
import { mealsLoggedLine, noNutritionKnown } from "../../lib/health-today-meals";
import { useHealthToday } from "./use-health-today";
import { useHealth } from "./use-health";
import { useJournalZone } from "../use-journal-zone";
import { useDeviceZone } from "../use-device-zone";
import { GlassBar } from "../progress/glass-progress";
import "./health.css";
import { formatDate, formatNumber } from "../../lib/visual-format";

export function HealthToday() {
  const { data, loaded, error } = useHealth();
  // The Health journal's day, as on the Health page (QA-24), not the device's day.
  const today = useHealthToday(dailyData(data).preferences.timezone);
  // Session W Part 17 (QA-24-B): the Health zone, then the journal zone, then the device's; said when it is not the device's.
  const journal = useJournalZone().zone, zone = dailyData(data).preferences.timezone ?? journal, device = useDeviceZone();
  const summary = loaded ? dailyHealthSummary(data, today) : null;
  const weight = latestWeightObservation(data,today);
  return <section className="panel health-today" aria-label="Today's health">
    <div className="health-section-heading"><div><p className="eyebrow">HEALTH · PRIVATE</p><h2>Your daily balance.</h2></div><span className="health-symbol" aria-hidden="true">↗</span></div>
    {loaded && !error && zone && device && zone !== device && <p className="fine health-today-zone">Today in {zone}</p>}
    {!loaded ? <p>Loading your private health entries…</p> : error ? <p>Health data needs attention. Open Health to review it.</p> : summary && summary.entries > 0 && noNutritionKnown(summary) ? <>
      {/* Session AL release review (RR-5): entries that give no nutrition at all show by name, with one plain line, never
          "Unknown" four times; unknown stays unknown (no 0 kcal). */}
      <p className="health-today-meals" title={mealsLoggedLine(data, today)}><strong>{mealsLoggedLine(data, today)}</strong></p>
      <p className="fine">Nutrition not given {summary.entries === 1 ? "for this entry" : "for these entries"}. Add it in Health → Foods &amp; recipes; nothing is counted as 0.</p>
    </> : summary && summary.entries > 0 ? <>
      <p className="fine health-today-meals" title={mealsLoggedLine(data, today)}>{mealsLoggedLine(data, today)}</p>
      {/* Session AL fourth pass (PR-088): Today's card reads as Health's own summary: a partial day shows what is known with a
          "+" ("200+ kcal known so far"), never "Unknown kcal logged"; each macro is the number with a small partial line. */}
      <div className="health-today-value">{summary.nutrients.kcal !== null ? <><strong>{formatNutrient(summary.nutrients.kcal)}</strong><span>kcal logged{data.targets.kcal ? ` / ${formatNumber(data.targets.kcal)} target` : ""}</span></> : summary.knownNutrients.kcal !== null ? <><strong>{formatNutrient(summary.knownNutrients.kcal)}+</strong><span>kcal known so far{data.targets.kcal ? ` / ${formatNumber(data.targets.kcal)} target` : ""}</span></> : <><strong><span aria-hidden="true">—</span><span className="sr-only">Unknown</span></strong><span>calories not given by these entries</span></>}</div>
      {data.targets.kcal && summary.nutrients.kcal!==null && <GlassBar identity="health-today-kcal" className="health-today-meter" role="progressbar" aria-label="Today's calorie target" aria-valuemin={0} aria-valuemax={data.targets.kcal} aria-valuenow={Math.min(data.targets.kcal, summary.nutrients.kcal)} value={summary.nutrients.kcal / data.targets.kcal}/>}
      {summary.nutrients.kcal===null&&<p className="fine">{nutritionSummaryText(summary,"kcal","kcal")}</p>}<div className="health-today-macros">{([["Protein", "proteinMg"], ["Carbs", "carbsMg"], ["Fat", "fatMg"]] as const).map(([label, key]) => { const all = summary.nutrients[key], known = summary.knownNutrients[key], c = summary.coverage[key]; return <span key={key}><strong>{all !== null ? `${formatMacroGrams(all)} g` : known !== null ? `${formatMacroGrams(known)}+ g` : <><span aria-hidden="true">—</span><span className="sr-only">Unknown</span></>}</strong>{label}{data.targets[key] ? ` / ${formatHealthGrams(data.targets[key]!)} g` : ""}{all === null && <small className="health-macro-partial"> · Partial · {c.known} of {c.total} entries</small>}</span>; })}</div>
    </> : <p>{data.targets.kcal ? "Your targets are ready. Add your first meal for today." : "Make room for feeling good. Set your own targets and log your first meal."}</p>}
    {loaded && !error && <div className="health-today-extra">{weight && <span>{weightReadingText(weight.grams, dailyData(data).preferences.weightUnit) /* fifth pass (N-MO-14): as entered */} · {formatDate(weight.date)}</span>}{summary && summary.steps > 0 && <span>{formatNumber(summary.steps)} steps today</span>}</div>}
    <Link href="/app/health" className="text-link">Open Health →</Link>
  </section>;
}
