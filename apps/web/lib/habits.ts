import { z } from "zod";
import { addLocalDays, localDate, localWeekday } from "./local-date";

export const HABITS_KEY = "zigoals:habits:v1";
const dateSchema = z.string().regex(/^20\d{2}-\d{2}-\d{2}$|^21\d{2}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!, 12);
  return date.getFullYear() === year && date.getMonth() === month! - 1 && date.getDate() === day;
}, "Use a real calendar date between 2000 and 2199.");
const timestampSchema = z.iso.datetime();
const countSchema = z.number().int().min(0).max(10000);
export const habitScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }).strict(),
  z.object({ kind: z.literal("weekdays"), days: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine((days) => new Set(days).size === days.length) }).strict(),
]);
export const habitGoalLinkSchema = z.object({
  chainId: z.string().trim().min(1).max(100),
  owner: z.string().trim().min(1).max(200),
  goalId: z.string().regex(/^\d+$/).max(80),
}).strict();
export const habitInputSchema = z.object({
  title: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  description: z.string().max(500),
  notes: z.string().max(2000),
  goalLink: habitGoalLinkSchema.optional(),
  schedule: habitScheduleSchema,
  target: countSchema.refine((count) => count >= 1),
}).strict();
const ruleSchema = z.object({
  from: dateSchema,
  schedule: habitScheduleSchema,
  target: countSchema.refine((count) => count >= 1),
  state: z.enum(["active", "paused", "archived"]),
}).strict();
const entrySchema = z.object({ date: dateSchema, count: countSchema, note: z.string().max(2000), updatedAt: timestampSchema }).strict();
const habitSchema = habitInputSchema.omit({ schedule: true, target: true }).extend({
  id: z.uuid(),
  startDate: dateSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  rules: z.array(ruleSchema).min(1).max(2000),
  entries: z.array(entrySchema).max(20000),
}).strict().superRefine((habit, context) => {
  if (habit.rules[0]!.from !== habit.startDate || habit.rules.some((rule, index) => index > 0 && rule.from <= habit.rules[index - 1]!.from)) {
    context.addIssue({ code: "custom", message: "Habit rules must begin at its start date and be in date order." });
  }
  if (new Set(habit.entries.map((entry) => entry.date)).size !== habit.entries.length || habit.entries.some((entry) => entry.date < habit.startDate)) {
    context.addIssue({ code: "custom", message: "Habit entries must have unique dates on or after its start." });
  }
  if (habit.updatedAt < habit.createdAt) context.addIssue({ code: "custom", message: "Invalid habit timestamps." });
});
export const habitDataSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("zigoals-habits"),
  habits: z.array(habitSchema).max(200),
}).strict().refine((data) => new Set(data.habits.map((habit) => habit.id)).size === data.habits.length, "Habit identifiers must be unique.");
export type HabitInput = z.infer<typeof habitInputSchema>;
export type Habit = z.infer<typeof habitSchema>;
export type HabitData = z.infer<typeof habitDataSchema>;
export type HabitGoalLink = z.infer<typeof habitGoalLinkSchema>;
export type HabitRule = z.infer<typeof ruleSchema>;
export type HabitState = HabitRule["state"];
export type HabitDayStatus = "complete" | "due" | "missed" | "not-scheduled" | "paused" | "archived" | "future" | "not-started";

export function emptyHabitData(): HabitData {
  return { schemaVersion: 1, kind: "zigoals-habits", habits: [] };
}
export function habitRuleOn(habit: Habit, date: string): HabitRule | undefined {
  for (let index = habit.rules.length - 1; index >= 0; index--) {
    if (habit.rules[index]!.from <= date) return habit.rules[index];
  }
  return undefined;
}
export function latestHabitRule(habit: Habit): HabitRule {
  return habit.rules[habit.rules.length - 1]!;
}
export function goalLinkMatches(link: HabitGoalLink | undefined, scope: HabitGoalLink): boolean {
  return !!link && link.chainId === scope.chainId && link.owner === scope.owner && link.goalId === scope.goalId;
}
function replaceHabit(data: HabitData, id: string, transform: (habit: Habit) => Habit): HabitData {
  if (!data.habits.some((habit) => habit.id === id)) throw new Error("This habit is no longer available. Refresh and try again.");
  return habitDataSchema.parse({ ...data, habits: data.habits.map((habit) => habit.id === id ? transform(habit) : habit) });
}
function changeRule(habit: Habit, patch: Partial<HabitRule>, now: Date): Habit {
  const from = dateSchema.parse(localDate(now));
  if (from < latestHabitRule(habit).from) throw new Error("Your calendar is earlier than the last habit change. Check your device date.");
  const rule = { ...latestHabitRule(habit), ...patch, from };
  const rules = [...habit.rules.filter((previous) => previous.from < from), rule];
  return { ...habit, rules, updatedAt: now.toISOString() };
}
export function createHabit(data: HabitData, raw: HabitInput, now = new Date(), id: string = crypto.randomUUID()): HabitData {
  const { schedule, target, ...details } = habitInputSchema.parse(raw);
  const startDate = dateSchema.parse(localDate(now));
  return habitDataSchema.parse({ ...data, habits: [...data.habits, {
    ...details, id, startDate, createdAt: now.toISOString(), updatedAt: now.toISOString(), entries: [],
    rules: [{ from: startDate, schedule, target, state: "active" }],
  }] });
}
export function editHabit(data: HabitData, id: string, raw: HabitInput, now = new Date()): HabitData {
  const { schedule, target, ...details } = habitInputSchema.parse(raw);
  return replaceHabit(data, id, (habit) => ({ ...changeRule(habit, { schedule, target }, now), ...details, goalLink: details.goalLink }));
}
export function setHabitState(data: HabitData, id: string, state: HabitState, now = new Date()): HabitData {
  return replaceHabit(data, id, (habit) => changeRule(habit, { state }, now));
}
function dayResult(rule: HabitRule | undefined, entry: Habit["entries"][number] | undefined, date: string, today: string): { status: HabitDayStatus; count: number; target: number; note: string; scheduled: boolean } {
  const count = entry?.count ?? 0;
  const target = rule?.target ?? 1;
  const scheduled = !!rule && rule.state === "active" && (rule.schedule.kind === "daily" || rule.schedule.days.includes(localWeekday(date)));
  const status: HabitDayStatus = date > today ? "future" : !rule ? "not-started" : rule.state !== "active" ? rule.state : !scheduled ? "not-scheduled" : count >= target ? "complete" : date === today ? "due" : "missed";
  return { status, count, target, note: entry?.note ?? "", scheduled };
}
export function habitDay(habit: Habit, date: string, today = localDate()) {
  return dayResult(habitRuleOn(habit, date), habit.entries.find((item) => item.date === date), date, today);
}
export function logHabitCount(data: HabitData, id: string, rawDate: string, rawCount: number, note = "", now = new Date()): HabitData {
  const date = dateSchema.parse(rawDate);
  const count = countSchema.parse(rawCount);
  const today = localDate(now);
  return replaceHabit(data, id, (habit) => {
    if (date > today || !habitDay(habit, date, today).scheduled) throw new Error("Choose a scheduled, active day up to today.");
    const entry = entrySchema.parse({ date, count, note, updatedAt: now.toISOString() });
    return { ...habit, updatedAt: now.toISOString(), entries: [...habit.entries.filter((item) => item.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)) };
  });
}
export function habitStats(habit: Habit, today = localDate()) {
  const weekStart = addLocalDays(today, -((localWeekday(today) + 6) % 7));
  let currentStreak = 0, bestStreak = 0, weeklyCompleted = 0, weeklyScheduled = 0;
  const entries = new Map(habit.entries.map((entry) => [entry.date, entry]));
  let ruleIndex = 0;
  // Only traverse calendar days since this habit started; no invented pre-history.
  for (let date = habit.startDate; date <= today; date = addLocalDays(date, 1)) {
    while (habit.rules[ruleIndex + 1] && habit.rules[ruleIndex + 1]!.from <= date) ruleIndex++;
    const day = dayResult(habit.rules[ruleIndex], entries.get(date), date, today);
    if (!day.scheduled) continue;
    if (date >= weekStart) { weeklyScheduled++; if (day.status === "complete") weeklyCompleted++; }
    if (day.status === "complete") { currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); }
    else if (date !== today) currentStreak = 0;
  }
  return { currentStreak, bestStreak, weeklyCompleted, weeklyScheduled, weeklyConsistency: weeklyScheduled ? Math.round(weeklyCompleted / weeklyScheduled * 100) : 0 };
}
export function getHabitActivities(data: HabitData): { id: string; category: "HABIT"; title: string; detail: string; at: string; href: string }[] {
  return data.habits.flatMap((habit) => habit.entries.filter((entry) => entry.count > 0).map((entry) => {
    const target = habitRuleOn(habit, entry.date)?.target ?? 1;
    return { id: `habit:${habit.id}:${entry.date}`, category: "HABIT" as const, title: habit.title, detail: `${entry.date} · ${entry.count} / ${target} ${entry.count >= target ? "completed" : "logged"}`, at: entry.updatedAt, href: "/app/habits" };
  })).sort((a, b) => b.at.localeCompare(a.at));
}
