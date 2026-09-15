import { describe, expect, it } from "vitest";
import { createHabit, editHabit, setHabitState, logHabitCount, habitDay, habitStats, habitDataSchema, emptyHabitData, getHabitActivities, goalLinkMatches, type HabitInput } from "./habits";

const id = "59a35604-3696-4a78-b455-4015acb66885";
const input: HabitInput = { title: "Walk outside", category: "Movement", description: "A little daylight", notes: "", schedule: { kind: "daily" }, target: 1 };
const at = (date: string) => new Date(`${date}T12:00:00`);
const make = (patch: Partial<HabitInput> = {}, date = "2026-09-07") => createHabit(emptyHabitData(), { ...input, ...patch }, at(date), id);

describe("habit lifecycle and private schema", () => {
  it("creates a standalone habit with stable identity and round-trips exact data", () => {
    const data = make();
    expect(data.habits[0]!).toMatchObject({ id, title: "Walk outside", startDate: "2026-09-07" });
    expect(habitDataSchema.parse(JSON.parse(JSON.stringify(data)))).toEqual(data);
    expect(emptyHabitData().habits).toEqual([]);
  });
  it("edits descriptive fields without dropping completion history", () => {
    const logged = logHabitCount(make(), id, "2026-09-07", 1, "Felt good", at("2026-09-07"));
    const edited = editHabit(logged, id, { ...input, title: "Morning walk" }, at("2026-09-08"));
    expect(edited.habits[0]!.id).toBe(id);
    expect(edited.habits[0]!.entries).toEqual(logged.habits[0]!.entries);
    expect(edited.habits[0]!.title).toBe("Morning walk");
    expect(logged.habits[0]!.title).toBe("Walk outside");
  });
  it("rejects malformed, future-version, unknown-field, duplicate and invalid-date imports", () => {
    const data = make();
    for (const raw of [null, { ...data, schemaVersion: 2 }, { ...data, kind: "zigoals-health" }, { ...data, secret: "unexpected" }, { ...data, habits: [...data.habits, ...data.habits] }, { ...data, habits: [{ ...data.habits[0]!, startDate: "2026-02-30" }] }]) {
      expect(habitDataSchema.safeParse(raw).success).toBe(false);
    }
  });
  it("validates titles, counts, schedules and complete Goal scope", () => {
    for (const patch of [{ title: " " }, { target: 0 }, { target: 1.5 }, { schedule: { kind: "weekdays", days: [] } }, { schedule: { kind: "weekdays", days: [1, 1] } }, { goalLink: { goalId: "1" } }]) {
      expect(() => make(patch as Partial<HabitInput>)).toThrow();
    }
    const data = make({ goalLink: { goalId: "1", owner: "alice", chainId: "local" } });
    expect(goalLinkMatches(data.habits[0]!.goalLink, { goalId: "1", owner: "alice", chainId: "local" })).toBe(true);
    expect(goalLinkMatches(data.habits[0]!.goalLink, { goalId: "1", owner: "bob", chainId: "local" })).toBe(false);
    expect(goalLinkMatches(data.habits[0]!.goalLink, { goalId: "1", owner: "alice", chainId: "testnet" })).toBe(false);
  });
  it("keeps archive and pause transitions in date history and resumes cleanly", () => {
    let data = make();
    data = setHabitState(data, id, "paused", at("2026-09-08"));
    data = setHabitState(data, id, "active", at("2026-09-10"));
    data = setHabitState(data, id, "archived", at("2026-09-11"));
    expect(habitDay(data.habits[0]!, "2026-09-07", "2026-09-12").status).toBe("missed");
    expect(habitDay(data.habits[0]!, "2026-09-09", "2026-09-12").status).toBe("paused");
    expect(habitDay(data.habits[0]!, "2026-09-10", "2026-09-12").status).toBe("missed");
    expect(habitDay(data.habits[0]!, "2026-09-12", "2026-09-12").status).toBe("archived");
    data = setHabitState(data, id, "active", at("2026-09-13"));
    expect(habitDay(data.habits[0]!, "2026-09-12", "2026-09-13").status).toBe("archived");
    expect(habitDay(data.habits[0]!, "2026-09-13", "2026-09-13").status).toBe("due");
  });
  it("preserves historical schedules and count targets across edits", () => {
    let data = logHabitCount(make(), id, "2026-09-07", 1, "", at("2026-09-07"));
    data = editHabit(data, id, { ...input, schedule: { kind: "weekdays", days: [2, 4] }, target: 3 }, at("2026-09-08"));
    expect(habitDay(data.habits[0]!, "2026-09-07", "2026-09-10")).toMatchObject({ status: "complete", target: 1 });
    expect(habitDay(data.habits[0]!, "2026-09-08", "2026-09-10")).toMatchObject({ status: "missed", target: 3 });
    expect(habitDay(data.habits[0]!, "2026-09-09", "2026-09-10").status).toBe("not-scheduled");
  });
});

describe("calendar completion and cadence", () => {
  it("counts completion at target, supports undo, and retains an optional day note", () => {
    let data = logHabitCount(make({ target: 3 }), id, "2026-09-07", 2, "Two loops", at("2026-09-07"));
    expect(habitDay(data.habits[0]!, "2026-09-07", "2026-09-07")).toMatchObject({ count: 2, target: 3, status: "due" });
    data = logHabitCount(data, id, "2026-09-07", 3, "Three loops", at("2026-09-07"));
    expect(habitDay(data.habits[0]!, "2026-09-07", "2026-09-07").status).toBe("complete");
    data = logHabitCount(data, id, "2026-09-07", 0, "Try again", at("2026-09-07"));
    expect(data.habits[0]!.entries).toHaveLength(1);
    expect(data.habits[0]!.entries[0]).toMatchObject({ count: 0, note: "Try again" });
    expect(habitDay(data.habits[0]!, "2026-09-07", "2026-09-08").status).toBe("missed");
  });
  it("rejects future, pre-start, off-schedule and paused completions", () => {
    const data = setHabitState(make({ schedule: { kind: "weekdays", days: [1, 2] } }), id, "paused", at("2026-09-14"));
    for (const date of ["2026-09-06", "2026-09-09", "2026-09-14", "2026-09-22"]) {
      expect(() => logHabitCount(data, id, date, 1, "", at("2026-09-15"))).toThrow();
    }
    expect(() => logHabitCount(data, id, "2026-09-07", -1, "", at("2026-09-15"))).toThrow();
    expect(() => logHabitCount(data, id, "2026-09-07", 0.5, "", at("2026-09-15"))).toThrow();
  });
  it("gives today grace, breaks on a missed day and remembers the best streak", () => {
    let data = make();
    for (const date of ["2026-09-07", "2026-09-08", "2026-09-09"]) data = logHabitCount(data, id, date, 1, "", at("2026-09-09"));
    expect(habitStats(data.habits[0]!, "2026-09-10")).toMatchObject({ currentStreak: 3, bestStreak: 3, weeklyCompleted: 3, weeklyScheduled: 4, weeklyConsistency: 75 });
    expect(habitStats(data.habits[0]!, "2026-09-11")).toMatchObject({ currentStreak: 0, bestStreak: 3 });
    data = logHabitCount(data, id, "2026-09-11", 1, "", at("2026-09-11"));
    expect(habitStats(data.habits[0]!, "2026-09-11")).toMatchObject({ currentStreak: 1, bestStreak: 3 });
  });
  it("skips weekends and pauses without inventing completions", () => {
    let data = make({ schedule: { kind: "weekdays", days: [1, 2, 3, 4, 5] } }, "2026-09-11");
    data = logHabitCount(data, id, "2026-09-11", 1, "", at("2026-09-11"));
    data = setHabitState(data, id, "paused", at("2026-09-14"));
    data = setHabitState(data, id, "active", at("2026-09-16"));
    data = logHabitCount(data, id, "2026-09-16", 1, "", at("2026-09-16"));
    expect(habitStats(data.habits[0]!, "2026-09-16")).toMatchObject({ currentStreak: 2, bestStreak: 2, weeklyCompleted: 1, weeklyScheduled: 1, weeklyConsistency: 100 });
    expect(habitDay(data.habits[0]!, "2026-09-12", "2026-09-16").status).toBe("not-scheduled");
  });
  it("uses calendar day arithmetic over spring and autumn daylight-saving boundaries", () => {
    for (const dates of [["2026-03-28", "2026-03-29", "2026-03-30"], ["2026-10-24", "2026-10-25", "2026-10-26"]]) {
      let data = make({}, dates[0]);
      for (const date of dates) data = logHabitCount(data, id, date, 1, "", at(dates[2]!));
      expect(habitStats(data.habits[0]!, dates[2]!).currentStreak).toBe(3);
    }
    const localMidnight = new Date(2026, 8, 7, 0, 1);
    expect(createHabit(emptyHabitData(), input, localMidnight, id).habits[0]!.startDate).toBe("2026-09-07");
  });
  it("rejects orphaned or duplicate day records and unordered rule histories", () => {
    const data = logHabitCount(make(), id, "2026-09-07", 1, "", at("2026-09-07"));
    const habit = data.habits[0]!;
    expect(habitDataSchema.safeParse({ ...data, habits: [{ ...habit, entries: [...habit.entries, ...habit.entries] }] }).success).toBe(false);
    expect(habitDataSchema.safeParse({ ...data, habits: [{ ...habit, entries: [{ ...habit.entries[0], date: "2026-09-06" }] }] }).success).toBe(false);
    expect(habitDataSchema.safeParse({ ...data, habits: [{ ...habit, rules: [...habit.rules, ...habit.rules] }] }).success).toBe(false);
  });
  it("projects real logged activity with no private values in the URL", () => {
    const data = logHabitCount(make(), id, "2026-09-07", 1, "Private sentinel", at("2026-09-07"));
    expect(getHabitActivities(data)).toEqual([{ id: `habit:${id}:2026-09-07`, category: "HABIT", title: "Walk outside", detail: "2026-09-07 · 1 / 1 completed", at: at("2026-09-07").toISOString(), href: "/app/habits" }]);
    expect(getHabitActivities(logHabitCount(data, id, "2026-09-07", 0, "", at("2026-09-07")))).toEqual([]);
  });
});
