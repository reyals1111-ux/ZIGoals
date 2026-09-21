import { dailyHealthSummary, HEALTH_MEALS, healthHistory, scaleNutrition, type HealthData } from "./health";
import { habitDay, type Habit } from "./habits";
import { addLocalDays, localDate } from "./local-date";

/** Saved diary snapshots, never current library values or assumed missing meals. */
export function nutritionDashboard(data: HealthData, date: string) {
  const summary = dailyHealthSummary(data, date);
  const history = healthHistory(data, date, 30);
  const logged = history.filter(day => day.entries > 0);
  const meals = HEALTH_MEALS.map(meal => {
    const entries = data.diary.filter(entry => entry.date === date && entry.meal === meal);
    const kcal = entries.reduce((sum, entry) => sum + scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli).kcal, 0);
    return { meal, kcal, entries: entries.length, share: summary.nutrients.kcal ? kcal / summary.nutrients.kcal * 100 : 0, names: entries.map(entry => entry.snapshot.name) };
  });
  return { ...summary, meals, history, mealCount: meals.filter(meal => meal.entries > 0).length, remaining: data.targets.kcal === null ? null : data.targets.kcal - summary.nutrients.kcal, loggedDays: logged.length, averageKcal: logged.length ? Math.round(logged.reduce((sum, day) => sum + day.nutrients.kcal, 0) / logged.length) : null };
}

/** Check-in days are distinct from completed target-period streaks shown on cards. */
export function habitConsistency(habits: Habit[], today: string) {
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = addLocalDays(today, index - 29);
    const outcomes = habits.map(habit => habitDay(habit, date, today));
    const checkins = habits.filter(habit => habit.entries.some(entry => entry.date === date && entry.disposition === "logged")).length;
    return { date, completed: outcomes.filter(day => day.status === "complete").length, scheduled: outcomes.filter(day => day.scheduled).length, checkins };
  });
  return { days, week: days.slice(-7), checkins: days.reduce((sum, day) => sum + day.checkins, 0), activeDays: days.filter(day => day.checkins > 0).length };
}

export function activityPresentation(event: { category: string; title: string; detail: string; assetType?: string }) {
  if (event.category === "WEALTH") {
    if (event.assetType === "etf" && event.detail === "Stocks") return { label: "ETF", icon: "activity", tone: "stock" };
    const assetKinds: Record<string, { label: string; icon: string; tone: string }> = {
      Stablecoins: { label: "Stablecoin", icon: "chain", tone: "crypto" },
      Crypto: { label: "Crypto", icon: "chain", tone: "crypto" }, Stocks: { label: "Stock", icon: "activity", tone: "stock" }, ETFs: { label: "ETF", icon: "activity", tone: "stock" }, "Precious Metals": { label: "Metal", icon: "future", tone: "metal" }, Cash: { label: "Cash", icon: "wallet", tone: "cash" },
    };
    return assetKinds[event.detail] ?? { label: "Wealth", icon: "wallet", tone: "wealth" };
  }
  if (event.category === "FAVOURITE") return { label: "Favourite", icon: "star", tone: "favourite" };
  if (event.category === "HABIT") return { label: "Habit", icon: "habits", tone: "habit" };
  if (event.category === "HEALTH") return { label: "Health", icon: "health", tone: "health" };
  if (/correction|reversal/i.test(event.title)) return { label: "Correction", icon: "refresh", tone: "correction" };
  if (/contribution|withdrawal|income/i.test(event.title)) return { label: "Contribution", icon: "arrow", tone: "contribution" };
  return { label: "Goal", icon: "goals", tone: "goal" };
}

export function activityDateHeading(at: string, today = localDate()) {
  const date = localDate(new Date(at));
  if (date === today) return "Today";
  if (date === addLocalDays(today, -1)) return "Yesterday";
  return new Date(at).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}
