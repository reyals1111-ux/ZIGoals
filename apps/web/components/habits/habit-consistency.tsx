"use client";
import type { LayoutAttrs } from "../layout-edit";
import { useMemo, type CSSProperties } from "react";
import { habitConsistency } from "../../lib/life-intelligence";
import { latestHabitRule, type Habit } from "../../lib/habits";
import { useShowcase } from "../showcase-controls";
import { useEntrance } from "../use-entrance";
import { formatDate, formatWeekday } from "../../lib/visual-format";
import { plural } from "../../lib/plural";
import { AskZigiCorner } from "../ai/ask-zigi-item";
import { HabitTrendList, TrendTeachLine, hasTrend } from "./habit-trend-list";
import { habitTrendList } from "../../lib/habits-v2/trend";

export function HabitConsistency({ habits, today, ...layout }: LayoutAttrs & { habits: Habit[]; today: string }) {
  const result = useMemo(() => habitConsistency(habits, today), [habits, today]);
  const showcase = useShowcase();
  const maximum = Math.max(1, ...result.week.map(day => day.checkins));
  // Session AV (Part 4b, D20-4): with no habit yet (none, or only archived ones and a quiet week) the week teaches instead of showing empty bars.
  const noHabits = !habits.some(habit => latestHabitRule(habit).state !== "archived") && !result.week.some(day => day.checkins > 0);
  const monthEntrance = useEntrance<HTMLElement>("habit-month", result.days.length > 0), weekEntrance = useEntrance<HTMLElement>("habit-week", result.week.some(day => day.checkins > 0));
  // Session AW (habits-tj7; owner decision 1e, FR-TJ-7): a card with nothing to show yet stays hidden until there is data,
  // and one teaching line stands in its place, under the cards that do have data: the 30 days with no check-in in them,
  // "Your week in motion" at all 0, and "Trend per habit" while every habit reads "Not enough days yet".
  const monthShown = result.days.some(day => day.checkins > 0), weekShown = result.week.some(day => day.checkins > 0);
  const anyTrend = useMemo(() => hasTrend(habitTrendList(habits, today)), [habits, today]), trendShown = !noHabits && anyTrend;
  const lone = monthShown !== weekShown; // the one card of the first row takes the row (habit-r3.css)
  return <>
    {(monthShown || weekShown || trendShown) && <section {...layout} className={`habit-consistency${lone ? " habit-consistency-lone" : ""}`} aria-label="Habit consistency history">
    {monthShown && <article ref={monthEntrance} className="panel habit-consistency-month"><AskZigiCorner kind="habit-history" metric="days" label="your last 30 days of check-ins"/><header><p className="eyebrow">SMALL RETURNS ADD UP</p><h2>Your last 30 days.</h2><p>{showcase ? "Showcase example history · fictional check-ins" : "Your saved check-ins · this browser"}</p></header>
      <div className="habit-consistency-stats"><div><strong>{result.activeDays}<small> / 30</small></strong><span>days you checked in</span></div><div><strong>{result.checkins}</strong><span>recorded check-ins</span></div></div>
      <div className="habit-month-grid" role="img" aria-label={`30-day check-in heatmap: ${result.activeDays} ${plural(result.activeDays,'day')} with check-ins. Exact daily counts are in the history table.`}>{result.days.map((day, index) => <span key={day.date} style={{ "--i": index } as CSSProperties} data-level={/* Session AH (HA15, N-089): the share of that day's scheduled habits done, so one habit done on a one-habit day is full and a busy day shows how much of it was done */ day.checkins === 0 ? "none" : day.checkins / Math.max(1, day.scheduled) < .5 ? "some" : day.checkins < day.scheduled ? "many" : "full"} title={`${formatDate(day.date)}: ${day.checkins} ${plural(day.checkins,'check-in')}, ${day.completed} completed`}><span>{Number(day.date.slice(-2))}</span></span>)}</div>
      <div className="habit-map-legend"><span>{result.days[0] ? formatDate(result.days[0].date) : ''} → {formatDate(today)}</span><span className="habit-month-legend"><i /> None done <i data-level="some" /> Under half <i data-level="many" /> Most <i data-level="full" /> All scheduled done</span></div>
      <details className="habit-consistency-table"><summary>View daily check-in history</summary><div className="habit-history-table-wrap" tabIndex={0} role="region" aria-label="Daily habit history"><table><caption>{showcase ? "Showcase" : "Saved"} check-ins · last 30 days</caption><thead><tr><th scope="col">Date</th><th scope="col">Check-ins</th><th scope="col">Completed</th></tr></thead><tbody>{result.days.map(day => <tr key={day.date}><th scope="row">{formatDate(day.date)}</th><td>{day.checkins}</td><td>{day.completed}</td></tr>)}</tbody></table></div></details>
    </article>}
    {weekShown && <article ref={weekEntrance} className="panel habit-week-momentum"><header><p className="eyebrow">YOUR WEEK IN MOTION</p><h2>Keep finding your rhythm.</h2><p>A check-in is a scheduled habit day completed (a partly done day shows on its card). Each Habit’s card tracks its own target and streak.</p></header>
      <div className="habit-week-bars" role="img" aria-label={`Last seven days: ${result.week.map(day => `${formatDate(day.date, {weekday: true, year: false})}: ${day.checkins} ${plural(day.checkins,'check-in')}`).join("; ")}`}>{result.week.map((day, index) => <div key={day.date}><strong>{day.checkins}</strong><div><i style={{ height: `${day.checkins / maximum * 100}%`, "--i": index } as CSSProperties} /></div><span>{formatWeekday(day.date)}</span></div>)}</div>
      <p className="fine">Check-ins can include partial progress. Skipped, paused and future days do not become invented successes. Review individual Habit history for target-period outcomes.</p>
    </article>}
    {/* Session AV lane 2 (health r3; LEDGER #276): each habit's last 30 days beside the 30 before. */}
    {trendShown && <HabitTrendList habits={habits} today={today} />}
  </section>}
    {(!monthShown || !weekShown || !trendShown) && <div className="habit-consistency-teach" role="group" aria-label="Habit history to come">
      {!monthShown && <p className="fine habit-teach-line" data-teach="month"><strong>Your last 30 days</strong> · No check-ins in the last 30 days yet. Complete a habit and its day shows here.</p>}
      {!weekShown && <p className="fine habit-teach-line" data-teach="week"><strong>Your week in motion</strong> · {noHabits ? "Your week shows here once you have a habit. Add one with + New habit." : "No check-ins in the last seven days yet. Complete a habit and your week shows here."}</p>}
      {!trendShown && <TrendTeachLine />}
    </div>}
  </>;
}
