import { describe, expect, it } from "vitest";
import { addCounter, exerciseData } from "./health-counters";
import { createEmptyHealth } from "./health";
import { manualSourcePosition } from "./manual-source";
import { hasVisibleText, INVISIBLE_NAME, isInvisibleName, visibleName } from "./visible-text";

const INVISIBLE = ["", " ", "\u200b", "\u200b\u200c\u200d", " \u2060\ufeff ", "\u200e\u200f", "\u00a0\u3000", "\t\n"];
const VISIBLE = ["Walk", "a", "7", "☕", "🏃", "·", "ウォーキング", " \u200bRead\u200b "];

describe("visible names (QA-32)", () => {
  it("refuse names made only of spaces, zero-width and format characters", () => {
    for (const name of INVISIBLE) expect(hasVisibleText(name), JSON.stringify(name)).toBe(false);
    for (const name of VISIBLE) expect(hasVisibleText(name), JSON.stringify(name)).toBe(true);
    expect(() => visibleName("\u200b")).toThrow(INVISIBLE_NAME);
    expect(visibleName("Walk")).toBe("Walk");
  });
  it("leave empty and whitespace-only names to each form's existing refusal", () => {
    for (const name of ["", "   ", "\u00a0\u3000", "\t\n"]) expect(isInvisibleName(name), JSON.stringify(name)).toBe(false);
    for (const name of ["\u200b", " \u2060\ufeff\u200b ", "\u200e\u200f"]) expect(isInvisibleName(name), JSON.stringify(name)).toBe(true);
    expect(visibleName("   ")).toBe("   ");
  });
  it("guard the write paths that take a name outside a component", () => {
    expect(() => manualSourcePosition({ category: "Cash", name: "\u200b", quantity: "1", currency: "EUR", symbol: "", metal: "", unit: "", value: "", notes: "" })).toThrow("Name the asset with at least one visible character.");
    expect(() => addCounter(createEmptyHealth(), "\u200b\u200d", "squat", "health_counter-a")).toThrow("Name the counter with at least one visible character.");
    expect(exerciseData(addCounter(createEmptyHealth(), "Squats", "squat", "health_counter-b")).counters.at(-1)?.name).toBe("Squats");
  });
});
