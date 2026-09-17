import { z } from "zod";
import { addLocalDays, localDate, localWeekday } from "./local-date";

export const HABITS_KEY = "zigoals:habits:v1";
const dateSchema = z.string().regex(/^20\d{2}-\d{2}-\d{2}$|^21\d{2}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!, 12);
  return date.getFullYear() === year && date.getMonth() === month! - 1 && date.getDate() === day;
}, "Use a real calendar date between 2000 and 2199.");
const timestampSchema = z.iso.datetime();
const valueSchema = z.number().finite().min(0).max(1_000_000_000);

export const habitScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }).strict(),
  z.object({ kind: z.literal("weekdays"), days: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine((days) => new Set(days).size === days.length) }).strict(),
  z.object({ kind: z.literal("interval"), every: z.number().int().min(2).max(365), anchor: dateSchema }).strict(),
  z.object({ kind: z.literal("frequency"), times: z.number().int().min(1).max(365), period: z.enum(["week", "month", "year"]) }).strict(),
  z.object({ kind: z.literal("month-dates"), days: z.array(z.number().int().min(1).max(31)).min(1).max(31).refine((days) => new Set(days).size === days.length) }).strict(),
]).superRefine((schedule, context) => {
  if (schedule.kind !== "frequency") return;
  const maximum = { week: 7, month: 28, year: 365 }[schedule.period];
  if (schedule.times > maximum) context.addIssue({ code: "custom", path: ["times"], message: `Frequency cannot exceed ${maximum} times per ${schedule.period}.` });
});
export const habitMeasurementSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("boolean") }).strict(),
  z.object({ kind: z.literal("count"), unit: z.string().trim().min(1).max(24).default("times") }).strict(),
  z.object({ kind: z.literal("duration"), unit: z.enum(["minutes", "hours"]).default("minutes") }).strict(),
  z.object({ kind: z.literal("quantity"), unit: z.string().trim().min(1).max(24) }).strict(),
  z.object({ kind: z.literal("custom"), unit: z.string().trim().min(1).max(24) }).strict(),
]);
export const habitGoalLinkSchema = z.object({ chainId: z.string().trim().min(1).max(100), owner: z.string().trim().min(1).max(200), goalId: z.string().regex(/^\d+$/).max(80) }).strict();
const endConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),
  z.object({ kind: z.literal("date"), date: dateSchema }).strict(),
  z.object({ kind: z.literal("completions"), count: z.number().int().min(1).max(100_000) }).strict(),
  z.object({ kind: z.literal("goal"), goal: habitGoalLinkSchema }).strict(),
]);
const inputShape = z.object({
  title: z.string().trim().min(1).max(100), category: z.string().trim().min(1).max(50), description: z.string().max(500), notes: z.string().max(2000), goalLink: habitGoalLinkSchema.optional(),
  type: z.enum(["build", "quit", "limit"]).default("build"), measurement: habitMeasurementSchema.default({ kind: "count", unit: "times" }), schedule: habitScheduleSchema,
  target: valueSchema, targetPeriod: z.enum(["day", "week", "month", "year"]).default("day"), timeOfDay: z.enum(["anytime", "morning", "afternoon", "evening"]).default("anytime"),
  endCondition: endConditionSchema.default({ kind: "none" }), stackAfterId: z.uuid().optional(),
}).strict();
function addSemanticIssues(value: { type: "build" | "quit" | "limit"; measurement: z.infer<typeof habitMeasurementSchema>; target: number; schedule: z.infer<typeof habitScheduleSchema>; targetPeriod: "day" | "week" | "month" | "year" }, context: z.RefinementCtx) {
  if (value.type === "build" && value.target <= 0) context.addIssue({ code: "custom", path: ["target"], message: "BUILD targets must be greater than zero." });
  if (value.type === "quit" && value.target !== 0) context.addIssue({ code: "custom", path: ["target"], message: "QUIT habits use zero as the allowed maximum." });
  if (value.type === "limit" && value.measurement.kind === "boolean") context.addIssue({ code: "custom", path: ["measurement"], message: "LIMIT habits need a numeric measurement." });
  if (value.measurement.kind === "boolean" && value.type === "build" && value.target !== 1) context.addIssue({ code: "custom", path: ["target"], message: "Boolean BUILD habits use a target of one." });
  if (value.measurement.kind === "count" && !Number.isInteger(value.target)) context.addIssue({ code: "custom", path: ["target"], message: "Count targets must be whole numbers." });
  if (value.schedule.kind === "frequency" && value.targetPeriod !== "day") context.addIssue({ code: "custom", path: ["targetPeriod"], message: "Frequency recurrence already defines its target period." });
}
export const habitInputSchema = inputShape.superRefine(addSemanticIssues);
const ruleSchema = z.object({
  from: dateSchema, schedule: habitScheduleSchema, type: z.enum(["build", "quit", "limit"]), measurement: habitMeasurementSchema, target: valueSchema,
  targetPeriod: z.enum(["day", "week", "month", "year"]), endCondition: endConditionSchema, state: z.enum(["active", "paused", "archived"]),
}).strict().superRefine(addSemanticIssues);
const entrySchema = z.object({
  date: dateSchema, count: valueSchema, disposition: z.enum(["logged", "skipped", "failed"]), note: z.string().max(2000),
  mood: z.enum(["energized", "good", "neutral", "difficult", "calm"]).optional(), updatedAt: timestampSchema,
}).strict();
const habitSchema = z.object({
  id: z.uuid(), title: z.string().trim().min(1).max(100), category: z.string().trim().min(1).max(50), description: z.string().max(500), notes: z.string().max(2000), goalLink: habitGoalLinkSchema.optional(),
  timeOfDay: z.enum(["anytime", "morning", "afternoon", "evening"]), endCondition: endConditionSchema, stackAfterId: z.uuid().optional(), startDate: dateSchema,
  createdAt: timestampSchema, updatedAt: timestampSchema, rules: z.array(ruleSchema).min(1).max(2000), entries: z.array(entrySchema).max(20000),
}).strict().superRefine((habit, context) => {
  if (habit.rules[0]!.from !== habit.startDate || habit.rules.some((rule, index) => index > 0 && rule.from <= habit.rules[index - 1]!.from)) context.addIssue({ code: "custom", message: "Habit rules must begin at its start date and be in date order." });
  if (new Set(habit.entries.map((entry) => entry.date)).size !== habit.entries.length || habit.entries.some((entry) => entry.date < habit.startDate)) context.addIssue({ code: "custom", message: "Habit entries must have unique dates on or after its start." });
  if (habit.updatedAt < habit.createdAt) context.addIssue({ code: "custom", message: "Invalid habit timestamps." });
  if (JSON.stringify(habit.endCondition) !== JSON.stringify(habit.rules.at(-1)!.endCondition)) context.addIssue({ code: "custom", message: "The current end condition must match the latest historical rule." });
});
const habitDataV2Schema = z.object({ schemaVersion: z.literal(2), kind: z.literal("zigoals-habits"), habits: z.array(habitSchema).max(200) }).strict().superRefine((data, context) => {
  if (new Set(data.habits.map((habit) => habit.id)).size !== data.habits.length) context.addIssue({ code: "custom", message: "Habit identifiers must be unique." });
  const ids = new Set(data.habits.map((habit) => habit.id));
  for (const habit of data.habits) {
    if (habit.stackAfterId === habit.id) context.addIssue({ code: "custom", message: "A habit cannot be stacked after itself." });
    if (habit.stackAfterId && !ids.has(habit.stackAfterId)) context.addIssue({ code: "custom", message: "A stacked habit must reference an available habit." });
  }
});

const v1ScheduleSchema = z.discriminatedUnion("kind", [z.object({ kind: z.literal("daily") }).strict(), z.object({ kind: z.literal("weekdays"), days: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine((days) => new Set(days).size === days.length) }).strict()]);
const v1RuleSchema = z.object({ from: dateSchema, schedule: v1ScheduleSchema, target: z.number().int().min(1).max(10000), state: z.enum(["active", "paused", "archived"]) }).strict();
const v1EntrySchema = z.object({ date: dateSchema, count: z.number().int().min(0).max(10000), note: z.string().max(2000), updatedAt: timestampSchema }).strict();
const v1HabitSchema = z.object({
  id: z.uuid(), title: z.string().trim().min(1).max(100), category: z.string().trim().min(1).max(50), description: z.string().max(500), notes: z.string().max(2000), goalLink: habitGoalLinkSchema.optional(),
  startDate: dateSchema, createdAt: timestampSchema, updatedAt: timestampSchema, rules: z.array(v1RuleSchema).min(1).max(2000), entries: z.array(v1EntrySchema).max(20000),
}).strict().superRefine((habit, context) => {
  if (habit.rules[0]!.from !== habit.startDate || habit.rules.some((rule, index) => index > 0 && rule.from <= habit.rules[index - 1]!.from)) context.addIssue({ code: "custom", message: "Invalid V1 rule history." });
  if (new Set(habit.entries.map((entry) => entry.date)).size !== habit.entries.length || habit.entries.some((entry) => entry.date < habit.startDate)) context.addIssue({ code: "custom", message: "Invalid V1 entry history." });
  if (habit.updatedAt < habit.createdAt) context.addIssue({ code: "custom", message: "Invalid V1 timestamps." });
});
const habitDataV1Schema = z.object({ schemaVersion: z.literal(1), kind: z.literal("zigoals-habits"), habits: z.array(v1HabitSchema).max(200) }).strict().refine((data) => new Set(data.habits.map((habit) => habit.id)).size === data.habits.length, "Habit identifiers must be unique.");

export type HabitInput = z.input<typeof habitInputSchema>;
export type Habit = z.infer<typeof habitSchema>;
export type HabitData = z.infer<typeof habitDataV2Schema>;
export type HabitGoalLink = z.infer<typeof habitGoalLinkSchema>;
export type HabitRule = z.infer<typeof ruleSchema>;
export type HabitState = HabitRule["state"];
export type HabitDayStatus = "complete" | "partial" | "due" | "skipped" | "failed" | "not-scheduled" | "paused" | "archived" | "future" | "not-started";

function migrateV1(data: z.infer<typeof habitDataV1Schema>): HabitData {
  return habitDataV2Schema.parse({ schemaVersion: 2, kind: data.kind, habits: data.habits.map((habit) => ({
    ...habit, timeOfDay: "anytime", endCondition: { kind: "none" },
    rules: habit.rules.map((rule) => ({ ...rule, type: "build", measurement: { kind: "count", unit: "times" }, targetPeriod: "day", endCondition: { kind: "none" } })),
    entries: habit.entries.map((entry) => ({ ...entry, disposition: "logged" })),
  })) });
}
export const habitDataSchema: z.ZodType<HabitData> = z.union([habitDataV2Schema, habitDataV1Schema]).transform((data) => data.schemaVersion === 1 ? migrateV1(data) : data);
export function emptyHabitData(): HabitData { return { schemaVersion: 2, kind: "zigoals-habits", habits: [] }; }
export function habitRuleOn(habit: Habit, date: string): HabitRule | undefined { for (let index = habit.rules.length - 1; index >= 0; index--) if (habit.rules[index]!.from <= date) return habit.rules[index]; return undefined; }
export function latestHabitRule(habit: Habit): HabitRule { return habit.rules[habit.rules.length - 1]!; }
export function goalLinkMatches(link: HabitGoalLink | undefined, scope: HabitGoalLink): boolean { return !!link && link.chainId === scope.chainId && link.owner === scope.owner && link.goalId === scope.goalId; }
function replaceHabit(data: HabitData, id: string, transform: (habit: Habit) => Habit): HabitData {
  if (!data.habits.some((habit) => habit.id === id)) throw new Error("This habit is no longer available. Refresh and try again.");
  return habitDataSchema.parse({ ...data, habits: data.habits.map((habit) => habit.id === id ? transform(habit) : habit) });
}
function changeRule(habit: Habit, patch: Partial<HabitRule>, now: Date): Habit {
  const from = dateSchema.parse(localDate(now));
  if (from < latestHabitRule(habit).from) throw new Error("Your calendar is earlier than the last habit change. Check your device date.");
  const rule = ruleSchema.parse({ ...latestHabitRule(habit), ...patch, from });
  const rules = [...habit.rules.filter((previous) => previous.from < from), rule];
  return { ...habit, endCondition: rule.endCondition, rules, updatedAt: now.toISOString() };
}
export function createHabit(data: HabitData, raw: HabitInput, now = new Date(), id: string = crypto.randomUUID()): HabitData {
  const parsed = habitInputSchema.parse(raw); const { schedule, target, type, measurement, targetPeriod, endCondition, ...details } = parsed; const startDate = dateSchema.parse(localDate(now));
  if (endCondition.kind === "date" && endCondition.date < startDate) throw new Error("An end date cannot be before this habit begins.");
  return habitDataSchema.parse({ ...data, habits: [...data.habits, { ...details, id, startDate, endCondition, createdAt: now.toISOString(), updatedAt: now.toISOString(), entries: [], rules: [{ from: startDate, schedule, target, type, measurement, targetPeriod, endCondition, state: "active" }] }] });
}
export function editHabit(data: HabitData, id: string, raw: HabitInput, now = new Date()): HabitData {
  const parsed = habitInputSchema.parse(raw); const { schedule: rawSchedule, target, type, measurement, targetPeriod, endCondition, ...details } = parsed; const from = dateSchema.parse(localDate(now));
  return replaceHabit(data, id, (habit) => {
    const current = latestHabitRule(habit); let schedule = rawSchedule;
    if (schedule.kind === "interval") schedule = { ...schedule, anchor: current.schedule.kind === "interval" ? current.schedule.anchor : from };
    const endChanged = JSON.stringify(endCondition) !== JSON.stringify(habit.endCondition);
    if (endChanged && endCondition.kind === "date" && endCondition.date < from) throw new Error("An end date cannot be before this habit change.");
    return { ...changeRule(habit, { schedule, target, type, measurement, targetPeriod, endCondition }, now), ...details, endCondition, goalLink: details.goalLink };
  });
}
export function setHabitState(data: HabitData, id: string, state: HabitState, now = new Date()): HabitData { return replaceHabit(data, id, (habit) => changeRule(habit, { state }, now)); }

function daysBetween(from: string, to: string): number { return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000); }
function recurrenceMatches(rule: HabitRule, date: string): boolean {
  const schedule = rule.schedule;
  if (schedule.kind === "daily" || schedule.kind === "frequency") return true;
  if (schedule.kind === "weekdays") return schedule.days.includes(localWeekday(date));
  if (schedule.kind === "interval") return date >= schedule.anchor && daysBetween(schedule.anchor, date) % schedule.every === 0;
  return schedule.days.includes(Number(date.slice(-2)));
}
function individualSuccess(rule: HabitRule, count: number): boolean { return rule.type === "build" ? count >= rule.target : count <= rule.target; }
function baseEndAllows(rule: HabitRule, date: string): boolean { return rule.endCondition.kind !== "date" || date <= rule.endCondition.date; }
function periodBounds(date: string, period: "day" | "week" | "month" | "year") {
  if (period === "day") return { start: date, end: date };
  if (period === "week") { const start = addLocalDays(date, -((localWeekday(date) + 6) % 7)); return { start, end: addLocalDays(start, 6) }; }
  if (period === "month") { const start = `${date.slice(0, 7)}-01`; const next = new Date(`${start}T12:00:00Z`); next.setUTCMonth(next.getUTCMonth() + 1); return { start, end: addLocalDays(next.toISOString().slice(0, 10), -1) }; }
  return { start: `${date.slice(0, 4)}-01-01`, end: `${date.slice(0, 4)}-12-31` };
}
function aggregatePeriod(rule: HabitRule): "week" | "month" | "year" | undefined { return rule.schedule.kind === "frequency" ? rule.schedule.period : rule.targetPeriod === "day" ? undefined : rule.targetPeriod; }
export function habitTargetPeriod(rule: HabitRule): "day" | "week" | "month" | "year" { return rule.schedule.kind === "frequency" ? rule.schedule.period : rule.targetPeriod; }
function ruleOutcomeKey(rule: HabitRule): string {
  return JSON.stringify({ schedule: rule.schedule, type: rule.type, measurement: rule.measurement, target: rule.target, targetPeriod: rule.targetPeriod, endCondition: rule.endCondition });
}
type AggregateOutcome = {
  start: string; end: string; period: "week" | "month" | "year"; unit: "weeks" | "months" | "years";
  status: "complete" | "failed" | "open"; complete: boolean; failed: boolean; partial: boolean; scheduledDates: string[];
};
function rawAggregateOutcomes(habit: Habit, today: string): AggregateOutcome[] {
  type Group = { start: string; end: string; period: "week" | "month" | "year"; latestRule: HabitRule; signatures: Set<string>; scheduledDates: string[] };
  const groups = new Map<string, Group>();
  for (let date = habit.startDate; date <= today; date = addLocalDays(date, 1)) {
    const rule = habitRuleOn(habit, date); const period = rule ? aggregatePeriod(rule) : undefined;
    if (!rule || !period || rule.state !== "active" || !baseEndAllows(rule, date) || !recurrenceMatches(rule, date)) continue;
    const bounds = periodBounds(date, period); const key = `${period}:${bounds.start}`; const existing = groups.get(key);
    if (existing) { existing.latestRule = rule; existing.signatures.add(ruleOutcomeKey(rule)); existing.scheduledDates.push(date); }
    else groups.set(key, { ...bounds, period, latestRule: rule, signatures: new Set([ruleOutcomeKey(rule)]), scheduledDates: [date] });
  }
  return [...groups.values()].map((group) => {
    const entries = habit.entries.filter((entry) => {
      if (entry.date < group.start || entry.date > group.end || entry.date > today) return false;
      const rule = habitRuleOn(habit, entry.date);
      return !!rule && rule.state === "active" && baseEndAllows(rule, entry.date) && recurrenceMatches(rule, entry.date) && aggregatePeriod(rule) === group.period;
    });
    const logged = entries.filter((entry) => entry.disposition === "logged");
    const explicitFailure = entries.some((entry) => entry.disposition === "failed");
    const mixedRules = group.signatures.size > 1; const rule = group.latestRule;
    const amount = logged.reduce((sum, entry) => sum + entry.count, 0);
    const complete = !mixedRules && (rule.schedule.kind === "frequency"
      ? logged.filter((entry) => individualSuccess(rule, entry.count)).length >= rule.schedule.times
      : rule.type === "build" ? amount >= rule.target : logged.length > 0 && amount <= rule.target);
    let fullCoverage = group.start >= habit.startDate;
    for (let date = group.start; fullCoverage && date <= group.end; date = addLocalDays(date, 1)) {
      const historical = habitRuleOn(habit, date);
      fullCoverage = !!historical && historical.state === "active" && baseEndAllows(historical, date) && aggregatePeriod(historical) === group.period && ruleOutcomeKey(historical) === ruleOutcomeKey(rule);
    }
    const failed = explicitFailure || (group.end < today && fullCoverage && !complete);
    const partial = !complete && !failed && entries.some((entry) => entry.disposition === "logged" || entry.disposition === "skipped");
    return { start: group.start, end: group.end, period: group.period, unit: `${group.period}s` as AggregateOutcome["unit"], status: complete ? "complete" as const : failed ? "failed" as const : "open" as const, complete, failed, partial, scheduledDates: group.scheduledDates };
  }).sort((a, b) => a.start.localeCompare(b.start));
}
function completedOutcomesBefore(habit: Habit, date: string): number {
  const cutoff = addLocalDays(date, -1); if (cutoff < habit.startDate) return 0;
  const dayCompletions = habit.entries.filter((entry) => {
    if (entry.date > cutoff || entry.disposition !== "logged") return false;
    const rule = habitRuleOn(habit, entry.date);
    return !!rule && !aggregatePeriod(rule) && rule.state === "active" && baseEndAllows(rule, entry.date) && recurrenceMatches(rule, entry.date) && individualSuccess(rule, entry.count);
  }).length;
  return dayCompletions + rawAggregateOutcomes(habit, cutoff).filter((outcome) => outcome.complete).length;
}
function endAllows(habit: Habit, rule: HabitRule, date: string): boolean {
  const end = rule.endCondition;
  if (end.kind === "date") return date <= end.date;
  if (end.kind === "completions") return completedOutcomesBefore(habit, date) < end.count;
  return true;
}
function scheduledOn(habit: Habit, rule: HabitRule | undefined, date: string): boolean { return !!rule && rule.state === "active" && endAllows(habit, rule, date) && recurrenceMatches(rule, date); }
function periodResult(habit: Habit, rule: HabitRule, date: string, today: string) {
  const period = aggregatePeriod(rule)!; const bounds = periodBounds(date, period);
  return rawAggregateOutcomes(habit, today).find((outcome) => outcome.period === period && outcome.start === bounds.start)
    ?? { complete: false, partial: false, failed: false, status: "open" as const, start: bounds.start, end: bounds.end, period, unit: `${period}s` as const, scheduledDates: [] };
}
export function habitDay(habit: Habit, date: string, today = localDate()) {
  const rule = habitRuleOn(habit, date); const entry = habit.entries.find((item) => item.date === date); const count = entry?.count ?? 0; const target = rule?.target ?? 1;
  if (date > today) return { status: "future" as const, count, target, note: entry?.note ?? "", mood: entry?.mood, scheduled: false };
  if (!rule) return { status: "not-started" as const, count, target, note: entry?.note ?? "", mood: entry?.mood, scheduled: false };
  if (rule.state !== "active") return { status: rule.state, count, target, note: entry?.note ?? "", mood: entry?.mood, scheduled: false };
  const scheduled = scheduledOn(habit, rule, date);
  if (!scheduled) return { status: "not-scheduled" as const, count, target, note: entry?.note ?? "", mood: entry?.mood, scheduled: false };
  if (entry?.disposition === "skipped") return { status: "skipped" as const, count, target, note: entry.note, mood: entry.mood, scheduled };
  if (entry?.disposition === "failed") return { status: "failed" as const, count, target, note: entry.note, mood: entry.mood, scheduled };
  const period = aggregatePeriod(rule);
  if (period) {
    const result = periodResult(habit, rule, date, today);
    if (entry) return { status: result.complete ? "complete" as const : result.failed ? "failed" as const : "partial" as const, count, target, note: entry.note, mood: entry.mood, scheduled };
    if (date !== today || result.complete) return { status: "not-scheduled" as const, count, target, note: "", mood: undefined, scheduled: false };
    return { status: result.partial ? "partial" as const : "due" as const, count, target, note: "", mood: undefined, scheduled };
  }
  if (!entry) return { status: date === today ? "due" as const : "failed" as const, count, target, note: "", mood: undefined, scheduled };
  if (individualSuccess(rule, count)) return { status: "complete" as const, count, target, note: entry.note, mood: entry.mood, scheduled };
  return { status: date === today && rule.type === "build" && count > 0 ? "partial" as const : "failed" as const, count, target, note: entry.note, mood: entry.mood, scheduled };
}

type LogOptions = { note?: string; mood?: Habit["entries"][number]["mood"]; mode?: "set" | "add" };
export function logHabitValue(data: HabitData, id: string, rawDate: string, rawValue: number, options: LogOptions = {}, now = new Date()): HabitData {
  const date = dateSchema.parse(rawDate); const value = valueSchema.parse(rawValue); const today = localDate(now);
  return replaceHabit(data, id, (habit) => {
    const rule = habitRuleOn(habit, date); if (date > today || !scheduledOn(habit, rule, date)) throw new Error("Choose a scheduled, active day up to today.");
    if (rule!.measurement.kind === "count" && !Number.isInteger(value)) throw new Error("Count values must be whole numbers.");
    const previous = habit.entries.find((item) => item.date === date); const count = valueSchema.parse(options.mode === "add" ? (previous?.count ?? 0) + value : value);
    const entry = entrySchema.parse({ date, count, disposition: "logged", note: options.note ?? previous?.note ?? "", mood: options.mood ?? previous?.mood, updatedAt: now.toISOString() });
    return { ...habit, updatedAt: now.toISOString(), entries: [...habit.entries.filter((item) => item.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)) };
  });
}
export function logHabitCount(data: HabitData, id: string, date: string, count: number, note = "", now = new Date()): HabitData { return logHabitValue(data, id, date, count, { note }, now); }
export function setHabitEntryStatus(data: HabitData, id: string, rawDate: string, disposition: "skipped" | "failed", note = "", now = new Date()): HabitData {
  const date = dateSchema.parse(rawDate); const today = localDate(now);
  return replaceHabit(data, id, (habit) => {
    const rule = habitRuleOn(habit, date); if (date > today || !scheduledOn(habit, rule, date)) throw new Error("Choose a scheduled, active day up to today.");
    const previous = habit.entries.find((item) => item.date === date); const entry = entrySchema.parse({ date, count: previous?.count ?? 0, disposition, note, mood: previous?.mood, updatedAt: now.toISOString() });
    return { ...habit, updatedAt: now.toISOString(), entries: [...habit.entries.filter((item) => item.date !== date), entry].sort((a, b) => a.date.localeCompare(b.date)) };
  });
}

export function habitStats(habit: Habit, today = localDate()) {
  type StreakUnit = "days" | "weeks" | "months" | "years";
  type Outcome = { start: string; end: string; unit: StreakUnit; status: "complete" | "failed" | "skipped" | "open" };
  const weekStart = addLocalDays(today, -((localWeekday(today) + 6) % 7)); const weekEnd = addLocalDays(weekStart, 6);
  const outcomes: Outcome[] = [];
  for (let date = habit.startDate; date <= today; date = addLocalDays(date, 1)) {
    const rule = habitRuleOn(habit, date); if (!rule || rule.state !== "active" || !endAllows(habit, rule, date)) continue;
    if (aggregatePeriod(rule)) continue;
    const day = habitDay(habit, date, today); if (!day.scheduled) continue;
    outcomes.push({ start: date, end: date, unit: "days", status: day.status === "complete" ? "complete" : day.status === "failed" ? "failed" : day.status === "skipped" ? "skipped" : "open" });
  }
  for (const result of rawAggregateOutcomes(habit, today)) {
    if (!result.scheduledDates.some((date) => { const rule = habitRuleOn(habit, date); return !!rule && endAllows(habit, rule, date); })) continue;
    outcomes.push({ start: result.start, end: result.end, unit: result.unit, status: result.status });
  }
  outcomes.sort((a, b) => a.start.localeCompare(b.start));
  const streakBoard: Record<StreakUnit, { current: number; best: number }> = { days: { current: 0, best: 0 }, weeks: { current: 0, best: 0 }, months: { current: 0, best: 0 }, years: { current: 0, best: 0 } };
  let previousUnit: StreakUnit | undefined; let successCount = 0, failCount = 0, skipDecisions = 0, weeklyCompleted = 0, weeklyScheduled = 0;
  for (const outcome of outcomes) {
    if (outcome.start <= weekEnd && outcome.end >= weekStart) { weeklyScheduled++; if (outcome.status === "complete") weeklyCompleted++; }
    const streak = streakBoard[outcome.unit]; if (previousUnit !== outcome.unit) streak.current = 0;
    if (outcome.status === "complete") { successCount++; streak.current++; streak.best = Math.max(streak.best, streak.current); }
    else if (outcome.status === "failed" || outcome.status === "skipped") { if (outcome.status === "failed") failCount++; else skipDecisions++; streak.current = 0; }
    previousUnit = outcome.unit;
  }
  const skipCount = habit.entries.filter((entry) => entry.disposition === "skipped" && entry.date <= today).length;
  const decided = successCount + failCount + skipDecisions; const completionPercentage = decided ? Math.round(successCount / decided * 100) : 0;
  const currentPeriod = aggregatePeriod(latestHabitRule(habit)); const streakUnit: StreakUnit = currentPeriod ? `${currentPeriod}s` as StreakUnit : "days";
  return { currentStreak: streakBoard[streakUnit].current, bestStreak: streakBoard[streakUnit].best, streakUnit, streakBoard, weeklyCompleted, weeklyScheduled, weeklyConsistency: weeklyScheduled ? Math.round(weeklyCompleted / weeklyScheduled * 100) : 0, successCount, failCount, skipCount, completionPercentage, consistency: completionPercentage };
}
export function habitTrends(habit: Habit, today = localDate()) {
  const windows = [{ key: "day", days: 1 }, { key: "week", days: 7 }, { key: "month", days: 30 }, { key: "year", days: 365 }] as const;
  return windows.map(({ key, days }) => {
    const start = addLocalDays(today, -(days - 1)); let success = 0, total = 0;
    for (let date = start < habit.startDate ? habit.startDate : start; date <= today; date = addLocalDays(date, 1)) { const result = habitDay(habit, date, today); if (!result.scheduled || result.status === "due" || result.status === "partial") continue; total++; if (result.status === "complete") success++; }
    return { period: key, success, total, percentage: total ? Math.round(success / total * 100) : 0 };
  });
}
export function scheduleLabel(schedule: HabitRule["schedule"]): string {
  if (schedule.kind === "daily") return "Every day";
  if (schedule.kind === "weekdays") return schedule.days.map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(" · ");
  if (schedule.kind === "interval") return `Every ${schedule.every} days`;
  if (schedule.kind === "frequency") return `${schedule.times}× per ${schedule.period}`;
  return `Monthly on ${schedule.days.join(", ")}`;
}
export function measurementUnit(rule: HabitRule): string { return rule.measurement.kind === "boolean" ? "" : rule.measurement.unit; }
export function smartDoneValue(rule: HabitRule): number { return rule.type === "build" ? rule.target : 0; }
export function getHabitActivities(data: HabitData): { id: string; category: "HABIT"; title: string; detail: string; at: string; href: string }[] {
  return data.habits.flatMap((habit) => habit.entries.filter((entry) => {
    if (entry.disposition !== "logged") return false;
    const rule = habitRuleOn(habit, entry.date);
    return !!rule && (rule.type !== "build" || entry.count > 0);
  }).map((entry) => {
    const rule = habitRuleOn(habit, entry.date)!; const outcome = individualSuccess(rule, entry.count) ? "completed" : "logged";
    return { id: `habit:${habit.id}:${entry.date}`, category: "HABIT" as const, title: habit.title, detail: `${entry.date} · ${entry.count} / ${rule.target} ${outcome}`, at: entry.updatedAt, href: "/app/habits" };
  })).sort((a, b) => b.at.localeCompare(a.at));
}
