"use client";
import { habitConsistency } from "../../lib/life-intelligence";
import { type Habit } from "../../lib/habits";
import { useShowcase } from "../showcase-controls";

export function HabitConsistency({ habits, today }: { habits: Habit[]; today: string }) {
  const result = habitConsistency(habits, today);
  const showcase = useShowcase();
  const maximum = Math.max(1, ...result.week.map(day => day.checkins));
  const monthMaximum = Math.max(1, ...result.days.map(day => day.checkins));
  return <section className="habit-consistency" aria-label="Habit consistency history">
    <article className="panel habit-consistency-month"><header><p className="eyebrow">SMALL RETURNS ADD UP</p><h2>Your last 30 days.</h2><p>{showcase ? "Showcase example history · fictional check-ins" : "Your saved check-ins · this browser"}</p></header>
      <div className="habit-consistency-stats"><div><strong>{result.activeDays}<small> / 30</small></strong><span>days you checked in</span></div><div><strong>{result.checkins}</strong><span>recorded check-ins</span></div></div>
      <div className="habit-month-grid" role="img" aria-label={`30-day check-in heatmap: ${result.activeDays} days with check-ins. Exact daily counts are in the history table.`}>{result.days.map(day => <span key={day.date} data-level={day.checkins === 0 ? "none" : day.checkins / monthMaximum < .5 ? "some" : day.checkins < monthMaximum ? "many" : "full"} title={`${day.date}: ${day.checkins} check-ins, ${day.completed} completed`}><span>{Number(day.date.slice(-2))}</span></span>)}</div>
      <div className="habit-map-legend"><span>{result.days[0]?.date} → {today}</span><span><i /> No check-in <i className="filled" /> Check-ins</span></div>
      <details className="habit-consistency-table"><summary>View daily check-in history</summary><div className="habit-history-table-wrap" tabIndex={0} role="region" aria-label="Daily habit history"><table><caption>{showcase ? "Showcase example" : "Saved"} check-ins · last 30 days</caption><thead><tr><th scope="col">Date</th><th scope="col">Check-ins</th><th scope="col">Completed</th></tr></thead><tbody>{result.days.map(day => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.checkins}</td><td>{day.completed}</td></tr>)}</tbody></table></div></details>
    </article>
    <article className="panel habit-week-momentum"><header><p className="eyebrow">YOUR WEEK IN MOTION</p><h2>Keep finding your rhythm.</h2><p>A check-in is a recorded value. Each Habit’s card tracks its own target and streak.</p></header>
      <div className="habit-week-bars" role="img" aria-label={`Last seven days: ${result.week.map(day => `${day.date}: ${day.checkins} check-ins`).join("; ")}`}>{result.week.map(day => <div key={day.date}><strong>{day.checkins}</strong><div><i style={{ height: `${day.checkins / maximum * 100}%` }} /></div><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</span></div>)}</div>
      <p className="fine">Check-ins can include partial progress. Skipped, paused and future days do not become invented successes. Review individual Habit history for target-period outcomes.</p>
    </article>
  </section>;
}
