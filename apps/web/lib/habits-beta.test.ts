import { describe, expect, it } from "vitest";
import {
  createHabit,
  editHabit,
  emptyHabitData,
  habitDataSchema,
  habitDay,
  habitStats,
  logHabitValue,
  setHabitEntryStatus,
  setHabitState,
  type HabitInput,
} from "./habits";

const id = "f46b40cd-7d6d-4295-962f-87945a1c706b";
const at = (date: string) => new Date(`${date}T12:00:00`);
const base: HabitInput = {
  title: "Read",
  category: "Learning",
  description: "",
  notes: "",
  schedule: { kind: "daily" },
  target: 1,
};
const make = (patch: Partial<HabitInput> = {}, date = "2026-09-01") =>
  createHabit(emptyHabitData(), { ...base, ...patch }, at(date), id);

describe("Habits V2 migration and prospective rules", () => {
  it("deterministically migrates V1 history without changing values or dates", () => {
    const raw = {
      schemaVersion: 1,
      kind: "zigoals-habits",
      habits: [{
        id,
        title: "Walk",
        category: "Movement",
        description: "Outside",
        notes: "Private",
        startDate: "2026-09-01",
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-02T10:00:00.000Z",
        rules: [{ from: "2026-09-01", schedule: { kind: "weekdays", days: [1, 3, 5] }, target: 3, state: "active" }],
        entries: [{ date: "2026-09-02", count: 2, note: "Two loops", updatedAt: "2026-09-02T10:00:00.000Z" }],
      }],
    };

    const migrated = habitDataSchema.parse(raw);

    expect(migrated).toMatchObject({ schemaVersion: 2, kind: "zigoals-habits" });
    expect(migrated.habits[0]).toMatchObject({ title: "Walk", timeOfDay: "anytime", endCondition: { kind: "none" } });
    expect(migrated.habits[0]!.rules[0]).toMatchObject({
      from: "2026-09-01",
      type: "build",
      measurement: { kind: "count", unit: "times" },
      target: 3,
      targetPeriod: "day",
      schedule: { kind: "weekdays", days: [1, 3, 5] },
    });
    expect(migrated.habits[0]!.entries).toEqual([{
      date: "2026-09-02",
      count: 2,
      disposition: "logged",
      note: "Two loops",
      updatedAt: "2026-09-02T10:00:00.000Z",
    }]);
    expect(habitDataSchema.parse(raw)).toEqual(migrated);
  });

  it("fails closed on malformed and future-version data", () => {
    expect(habitDataSchema.safeParse({ schemaVersion: 3, kind: "zigoals-habits", habits: [] }).success).toBe(false);
    expect(habitDataSchema.safeParse({ schemaVersion: 1, kind: "zigoals-habits", habits: [{ nope: true }] }).success).toBe(false);
  });

  it("keeps changed type, measurement, target and recurrence prospective", () => {
    let data = make({ target: 2 });
    data = logHabitValue(data, id, "2026-09-01", 2, {}, at("2026-09-01"));
    data = editHabit(data, id, {
      ...base,
      type: "limit",
      measurement: { kind: "quantity", unit: "USD" },
      target: 50,
      schedule: { kind: "daily" },
    }, at("2026-09-02"));
    data = logHabitValue(data, id, "2026-09-02", 75, {}, at("2026-09-02"));

    expect(habitDay(data.habits[0]!, "2026-09-01", "2026-09-02")).toMatchObject({ status: "complete", target: 2 });
    expect(habitDay(data.habits[0]!, "2026-09-02", "2026-09-02")).toMatchObject({ status: "failed", target: 50 });
    expect(data.habits[0]!.rules).toHaveLength(2);
  });
});

describe("recurrence, status and end semantics", () => {
  it("supports every-N-days and specific month dates without penalizing other days", () => {
    const interval = make({ schedule: { kind: "interval", every: 3, anchor: "2026-09-01" } });
    expect(habitDay(interval.habits[0]!, "2026-09-01", "2026-09-08").status).toBe("failed");
    expect(habitDay(interval.habits[0]!, "2026-09-02", "2026-09-08").status).toBe("not-scheduled");
    expect(habitDay(interval.habits[0]!, "2026-09-07", "2026-09-08").status).toBe("failed");

    const monthDates = make({ schedule: { kind: "month-dates", days: [1, 15, 31] } });
    expect(habitDay(monthDates.habits[0]!, "2026-09-15", "2026-09-16").scheduled).toBe(true);
    expect(habitDay(monthDates.habits[0]!, "2026-09-16", "2026-09-16").status).toBe("not-scheduled");
  });

  it("distinguishes partial, skipped and failed logs", () => {
    let data = make({ target: 10 });
    data = logHabitValue(data, id, "2026-09-01", 4, {}, at("2026-09-01"));
    expect(habitDay(data.habits[0]!, "2026-09-01", "2026-09-01").status).toBe("partial");
    expect(habitDay(data.habits[0]!, "2026-09-01", "2026-09-02").status).toBe("failed");
    data = setHabitEntryStatus(data, id, "2026-09-01", "skipped", "Travel", at("2026-09-02"));
    expect(habitDay(data.habits[0]!, "2026-09-01", "2026-09-02").status).toBe("skipped");
    data = setHabitEntryStatus(data, id, "2026-09-01", "failed", "Chose to stop", at("2026-09-02"));
    expect(habitDay(data.habits[0]!, "2026-09-01", "2026-09-02").status).toBe("failed");
  });

  it("requires explicit confirmation for QUIT and LIMIT success", () => {
    let quit = make({ type: "quit", measurement: { kind: "count", unit: "times" }, target: 0 });
    expect(habitDay(quit.habits[0]!, "2026-09-01", "2026-09-01").status).toBe("due");
    quit = logHabitValue(quit, id, "2026-09-01", 0, {}, at("2026-09-01"));
    expect(habitDay(quit.habits[0]!, "2026-09-01", "2026-09-01").status).toBe("complete");
    quit = logHabitValue(quit, id, "2026-09-01", 1, {}, at("2026-09-01"));
    expect(habitDay(quit.habits[0]!, "2026-09-01", "2026-09-01").status).toBe("failed");

    let limit = make({ type: "limit", measurement: { kind: "quantity", unit: "minutes" }, target: 30 });
    limit = logHabitValue(limit, id, "2026-09-01", 20, {}, at("2026-09-01"));
    expect(habitDay(limit.habits[0]!, "2026-09-01", "2026-09-01").status).toBe("complete");
  });

  it("stops scheduling after an end date or completion count without auto-archiving", () => {
    const dated = make({ endCondition: { kind: "date", date: "2026-09-03" } });
    expect(habitDay(dated.habits[0]!, "2026-09-04", "2026-09-04").status).toBe("not-scheduled");

    let counted = make({ endCondition: { kind: "completions", count: 2 } });
    counted = logHabitValue(counted, id, "2026-09-01", 1, {}, at("2026-09-01"));
    counted = logHabitValue(counted, id, "2026-09-02", 1, {}, at("2026-09-02"));
    expect(habitDay(counted.habits[0]!, "2026-09-03", "2026-09-03").status).toBe("not-scheduled");
    expect(counted.habits[0]!.rules.at(-1)!.state).toBe("active");
  });

  it("allows post-end edits and state history to round-trip", () => {
    let data = make({ endCondition: { kind: "date", date: "2026-09-03" } });
    data = setHabitState(data, id, "paused", at("2026-09-04"));
    data = setHabitState(data, id, "archived", at("2026-09-05"));
    data = editHabit(data, id, { ...base, title: "Read again", endCondition: { kind: "date", date: "2026-09-03" } }, at("2026-09-06"));

    expect(data.habits[0]!.rules.map((rule) => [rule.from, rule.state])).toEqual([
      ["2026-09-01", "active"], ["2026-09-04", "paused"], ["2026-09-05", "archived"], ["2026-09-06", "archived"],
    ]);
    expect(habitDataSchema.parse(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it("anchors a newly selected interval today and preserves an existing interval anchor", () => {
    let changed = make({}, "2026-09-01");
    changed = editHabit(changed, id, { ...base, schedule: { kind: "interval", every: 3, anchor: "2026-09-01" } }, at("2026-09-02"));
    expect(changed.habits[0]!.rules.at(-1)!.schedule).toEqual({ kind: "interval", every: 3, anchor: "2026-09-02" });
    expect(habitDay(changed.habits[0]!, "2026-09-02", "2026-09-02")).toMatchObject({ status: "due", scheduled: true });

    let interval = make({ schedule: { kind: "interval", every: 3, anchor: "2026-09-01" } }, "2026-09-01");
    interval = editHabit(interval, id, { ...base, schedule: { kind: "interval", every: 4, anchor: "2026-09-02" } }, at("2026-09-02"));
    expect(interval.habits[0]!.rules.at(-1)!.schedule).toEqual({ kind: "interval", every: 4, anchor: "2026-09-01" });
  });

  it("counts completed target periods for completion endings", () => {
    let frequency = make({ schedule: { kind: "frequency", times: 3, period: "week" }, endCondition: { kind: "completions", count: 1 } }, "2026-09-07");
    frequency = logHabitValue(frequency, id, "2026-09-07", 1, {}, at("2026-09-07"));
    expect(habitDay(frequency.habits[0]!, "2026-09-08", "2026-09-08")).toMatchObject({ status: "partial", scheduled: true });
    frequency = logHabitValue(frequency, id, "2026-09-09", 1, {}, at("2026-09-09"));
    frequency = logHabitValue(frequency, id, "2026-09-11", 1, {}, at("2026-09-11"));
    expect(habitDay(frequency.habits[0]!, "2026-09-12", "2026-09-12").status).toBe("not-scheduled");

    let duration = make({ measurement: { kind: "duration", unit: "minutes" }, target: 60, targetPeriod: "week", endCondition: { kind: "completions", count: 1 } }, "2026-09-07");
    duration = logHabitValue(duration, id, "2026-09-07", 20, {}, at("2026-09-07"));
    duration = logHabitValue(duration, id, "2026-09-09", 40, {}, at("2026-09-09"));
    expect(habitDay(duration.habits[0]!, "2026-09-10", "2026-09-10").status).toBe("not-scheduled");
  });

  it("keeps a paused and resumed natural period neutral and singular", () => {
    let data = make({ schedule: { kind: "frequency", times: 3, period: "week" } }, "2026-09-07");
    data = logHabitValue(data, id, "2026-09-07", 1, {}, at("2026-09-07"));
    data = setHabitState(data, id, "paused", at("2026-09-08"));
    data = setHabitState(data, id, "active", at("2026-09-09"));
    data = logHabitValue(data, id, "2026-09-09", 1, {}, at("2026-09-09"));
    data = logHabitValue(data, id, "2026-09-11", 1, {}, at("2026-09-11"));

    expect(habitStats(data.habits[0]!, "2026-09-13")).toMatchObject({ successCount: 1, failCount: 0, currentStreak: 1, weeklyScheduled: 1, weeklyCompleted: 1 });
  });

  it("keeps an edited natural period neutral instead of failing either rule segment", () => {
    let data = make({ schedule: { kind: "frequency", times: 3, period: "week" } }, "2026-09-07");
    data = logHabitValue(data, id, "2026-09-07", 1, {}, at("2026-09-07"));
    data = editHabit(data, id, { ...base, schedule: { kind: "frequency", times: 2, period: "week" } }, at("2026-09-09"));
    data = logHabitValue(data, id, "2026-09-09", 1, {}, at("2026-09-09"));
    data = logHabitValue(data, id, "2026-09-11", 1, {}, at("2026-09-11"));

    expect(habitStats(data.habits[0]!, "2026-09-13")).toMatchObject({ successCount: 0, failCount: 0, weeklyScheduled: 1, weeklyCompleted: 0 });
  });

  it("rejects an end date before the rule begins", () => {
    expect(() => make({ endCondition: { kind: "date", date: "2026-08-31" } }, "2026-09-01")).toThrow();
    const data = make({}, "2026-09-01");
    expect(() => editHabit(data, id, { ...base, endCondition: { kind: "date", date: "2026-09-03" } }, at("2026-09-04"))).toThrow();
  });
});

describe("period targets and meaningful statistics", () => {
  it("rejects frequency targets that cannot fit their calendar period", () => {
    for (const schedule of [
      { kind: "frequency", times: 8, period: "week" },
      { kind: "frequency", times: 29, period: "month" },
      { kind: "frequency", times: 366, period: "year" },
    ] as const) expect(() => make({ schedule })).toThrow();
    for (const schedule of [
      { kind: "frequency", times: 7, period: "week" },
      { kind: "frequency", times: 28, period: "month" },
      { kind: "frequency", times: 365, period: "year" },
    ] as const) expect(() => make({ schedule })).not.toThrow();
  });
  it("treats a three-times-weekly recurrence as one target period", () => {
    let data = make({ schedule: { kind: "frequency", times: 3, period: "week" } }, "2026-09-07");
    for (const date of ["2026-09-07", "2026-09-09", "2026-09-11"]) {
      data = logHabitValue(data, id, date, 1, {}, at(date));
    }
    const stats = habitStats(data.habits[0]!, "2026-09-13");
    expect(stats).toMatchObject({ currentStreak: 1, bestStreak: 1, streakUnit: "weeks", successCount: 1, failCount: 0, skipCount: 0, completionPercentage: 100 });
    expect(habitDay(data.habits[0]!, "2026-09-08", "2026-09-13").status).toBe("not-scheduled");
  });

  it("aggregates build values against weekly targets and reports outcome distribution", () => {
    let data = make({ measurement: { kind: "duration", unit: "minutes" }, target: 60, targetPeriod: "week" }, "2026-09-07");
    data = logHabitValue(data, id, "2026-09-07", 20, {}, at("2026-09-07"));
    data = logHabitValue(data, id, "2026-09-09", 40, {}, at("2026-09-09"));
    data = setHabitEntryStatus(data, id, "2026-09-10", "skipped", "Rest", at("2026-09-10"));
    expect(habitStats(data.habits[0]!, "2026-09-13")).toMatchObject({ successCount: 1, failCount: 0, skipCount: 1, completionPercentage: 100, streakUnit: "weeks" });
  });

  it("starts a new streak when the cadence unit changes", () => {
    let data = make({ schedule: { kind: "frequency", times: 2, period: "week" } }, "2026-09-07");
    data = logHabitValue(data, id, "2026-09-07", 1, {}, at("2026-09-07"));
    data = logHabitValue(data, id, "2026-09-09", 1, {}, at("2026-09-09"));
    data = editHabit(data, id, base, at("2026-09-14"));
    data = logHabitValue(data, id, "2026-09-14", 1, {}, at("2026-09-14"));

    expect(habitStats(data.habits[0]!, "2026-09-15")).toMatchObject({
      successCount: 2,
      failCount: 0,
      currentStreak: 1,
      bestStreak: 1,
      weeklyCompleted: 1,
      weeklyScheduled: 2,
      streakUnit: "days",
      streakBoard: { days: { current: 1, best: 1 }, weeks: { current: 1, best: 1 } },
    });
  });
});
