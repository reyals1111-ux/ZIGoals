import { describe, expect, it } from "vitest";
import { createHabit, emptyHabitData, habitDataSchema, logHabitValue, setHabitEntryStatus, type HabitData, type HabitInput } from "./habits";

// Session G, Part 2: a check-in parses only the changed habit again, not the whole module. The result must equal a
// full parse, and module rules (unique identifiers, stack references) must still refuse bad data.
const input = (title: string): HabitInput => ({ title, category: "Personal", description: "", notes: "", schedule: { kind: "daily" }, measurement: { kind: "count", unit: "times" }, target: 2 });
const at = new Date("2026-09-20T10:00:00.000Z"), a = "59a35604-3696-4a78-b455-400000000001", b = "59a35604-3696-4a78-b455-400000000002";
const base = createHabit(createHabit(emptyHabitData(), input("Read"), at, a), input("Walk"), at, b);

describe("check-ins validate the changed habit and the module rules", () => {
  it("give exactly what a full parse gives", () => {
    const logged = logHabitValue(base, b, "2026-09-20", 1, { note: "  kept as typed  " }, at);
    expect(logged).toEqual(habitDataSchema.parse(JSON.parse(JSON.stringify(logged))));
    expect(setHabitEntryStatus(logged, a, "2026-09-20", "skipped", "", at).habits[0]!.entries[0]!.disposition).toBe("skipped");
  });
  it("still refuse an invalid change to the habit itself", () => {
    expect(() => logHabitValue(base, a, "2026-09-20", 1.5, {}, at)).toThrow("Count values must be whole numbers.");
    expect(() => logHabitValue(base, a, "2026-09-19", 1, {}, at)).toThrow();
  });
  it("still refuse a module that breaks a set rule", () => {
    const broken = { ...base, habits: base.habits.map((habit) => habit.id === a ? { ...habit, stackAfterId: "59a35604-3696-4a78-b455-400000000009" } : habit) } as HabitData;
    expect(() => logHabitValue(broken, b, "2026-09-20", 1, {}, at)).toThrow("A stacked habit must reference an available habit.");
    const duplicate = { ...base, habits: [base.habits[0]!, { ...base.habits[1]!, id: a }] } as HabitData;
    expect(() => logHabitValue(duplicate, a, "2026-09-20", 1, {}, at)).toThrow("Habit identifiers must be unique.");
  });
});
