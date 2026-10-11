import { afterEach, describe, expect, it, vi } from "vitest";
import { createHabit, emptyHabitData, type HabitInput } from "./habits";
import { startHabitTimer } from "./habit-actions";

const id = "59a35604-3696-4a78-b455-4015acb66885", timerId = "ff829326-f352-4a26-80d0-eb8c31cde62e";
const input: HabitInput = { title: "Fictional reading", category: "Learning", description: "", notes: "", schedule: { kind: "daily" }, measurement: { kind: "duration", unit: "minutes" }, target: 30 };

describe("a saved timer's day key comes from date parts, not a locale's display pattern (QA-34)", () => {
  afterEach(() => vi.restoreAllMocks());
  it("stays YYYY-MM-DD in the timer's zone even when a locale displays dates another way", () => {
    const Original = Intl.DateTimeFormat;
    // Locale data changes between browsers and ICU versions; en-CA has displayed both 2026-09-20 and 9/20/2026.
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
      const real = new Original(locales, options);
      if (locales === "en-CA") { const shown = new Original("en-US", options); return { format: (date?: Date | number) => shown.format(date), formatToParts: (date?: Date | number) => real.formatToParts(date), resolvedOptions: () => real.resolvedOptions() } as unknown as Intl.DateTimeFormat; }
      return real;
    } as unknown as typeof Intl.DateTimeFormat);
    const start = new Date("2026-09-20T22:30:00.000Z");
    const running = startHabitTimer(createHabit(emptyHabitData(), input, new Date("2026-09-20T08:00:00.000Z"), id), id, timerId, start, "Europe/Brussels");
    // 22:30 UTC is 00:30 on 21 September in Brussels.
    expect(running.habits[0]!.timer?.date).toBe("2026-09-21");
  });
});
