/** English singular/plural for counts shown in the UI (Session G, Part 5; QA-28 "1 times per day"). */
export function plural(count: number, one: string, many = `${one}s`): string {
  return count === 1 ? one : many;
}

/** The units the app itself offers (habit templates and defaults), with their singular. */
const SINGULAR_UNITS: Record<string, string> = {
  times: "time", minutes: "minute", hours: "hour", steps: "step", pages: "page", glasses: "glass", sessions: "session",
  reps: "rep", servings: "serving", cups: "cup", "check-ins": "check-in", days: "day", weeks: "week", months: "month",
};

/**
 * A habit's measurement unit after a value: "1 time", "2 times", "1 minute". Only the plural units the app offers
 * become singular after exactly 1; any other unit stays exactly as typed.
 */
export function unitFor(value: number, unit: string): string {
  return value === 1 ? SINGULAR_UNITS[unit] ?? unit : unit;
}
