"use client";
import { nutritionDashboard } from "../../lib/life-intelligence";
import { formatHealthGrams, type HealthData } from "../../lib/health";
import { useShowcase } from "../showcase-controls";

export function NutritionDashboard({ data, date }: { data: HealthData; date: string }) {
  const result = nutritionDashboard(data, date);
  const showcase = useShowcase();
  const max = Math.max(1, ...result.history.map(day => day.nutrients.kcal));
  return <section className="nutrition-dashboard" aria-label="Nutrition patterns">
    <article className="panel nutrition-distribution">
      <header><p className="eyebrow">YOUR DAY, MEAL BY MEAL</p><h2>Where your energy comes from.</h2><p>{result.mealCount} meal {result.mealCount === 1 ? "group" : "groups"} · {result.entries} diary {result.entries === 1 ? "entry" : "entries"} on {date}</p></header>
      <div className="nutrition-distribution-track" aria-hidden="true">{result.meals.map((meal, index) => <span className={`nutrition-meal-${index}`} key={meal.meal} style={{ width: `${meal.share}%` }} />)}</div>
      <ol className="nutrition-meal-timeline">{result.meals.map((meal, index) => <li key={meal.meal}>
        <span className={`nutrition-meal-dot nutrition-meal-${index}`} aria-hidden="true" />
        <div><a href={`#diary-${meal.meal.toLowerCase()}`}>{meal.meal}</a><p>{meal.names.length ? meal.names.join(" · ") : "Nothing logged"}</p></div>
        <div><strong>{meal.kcal.toLocaleString()} <small>kcal</small></strong><span>{meal.entries ? `${Math.round(meal.share)}% of logged calories` : "No entry"}</span></div>
      </li>)}</ol>
      <p className="fine">Meal groups follow your diary labels. They do not imply a recorded meal time.</p>
    </article>
    <article className="panel nutrition-trend">
      <header><p className="eyebrow">30 DAYS OF PERSPECTIVE</p><h2>Your nutrition rhythm.</h2><p>{showcase ? "Showcase example history · fictional diary entries" : "Saved diary history · this browser"}</p></header>
      <div className="nutrition-trend-stats"><div><strong>{result.averageKcal?.toLocaleString() ?? "—"}</strong><span>kcal per logged day</span></div><div><strong>{result.loggedDays}<small> / 30</small></strong><span>days with entries</span></div></div>
      <div className="nutrition-month-bars" role="img" aria-label={`30-day calorie history ending ${date}. ${result.loggedDays} logged days. Exact values in the nutrition history table below.`}>{result.history.map(day => <div key={day.date} title={`${day.date}: ${day.entries ? `${day.nutrients.kcal} kcal` : "No entries"}`}><i style={{ height: `${day.entries ? Math.max(2, day.nutrients.kcal / max * 100) : 0}%` }} /></div>)}</div>
      <div className="nutrition-chart-axis"><span>{result.history[0]?.date}</span><span>{date}</span></div>
      <p className="fine">Blank dates have no diary entries and are excluded from the average. Values describe what you logged.</p>
      <details className="nutrition-exact-history"><summary>View nutrition history table</summary><div className="health-table-wrap" tabIndex={0} role="region" aria-label="Nutrition history table"><table><caption>{showcase ? "Showcase example" : "Saved"} nutrition · last 30 days</caption><thead><tr><th scope="col">Date</th><th scope="col">Calories</th><th scope="col">Protein</th><th scope="col">Carbs</th><th scope="col">Fat</th></tr></thead><tbody>{result.history.map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.entries ? `${day.nutrients.kcal.toLocaleString()} kcal` : "No entries"}</td>{(["proteinMg", "carbsMg", "fatMg"] as const).map(key => <td key={key}>{day.entries ? `${formatHealthGrams(day.nutrients[key])} g` : "—"}</td>)}</tr>)}</tbody></table></div></details>
    </article>
  </section>;
}
