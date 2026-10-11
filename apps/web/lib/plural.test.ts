import { describe, expect, it } from "vitest";
import { plural, unitFor } from "./plural";

describe("plural (QA-28)", () => {
  it("uses the singular for exactly one, the plural otherwise", () => {
    expect([0, 1, 2, 1.5].map((n) => `${n} ${plural(n, "asset")}`)).toEqual(["0 assets", "1 asset", "2 assets", "1.5 assets"]);
    expect(`1 ${plural(1, "entry", "entries")}`).toBe("1 entry");
    expect(`3 ${plural(3, "activity", "activities")}`).toBe("3 activities");
  });
  it("makes the app's own units singular after 1 and leaves any other unit exactly as typed", () => {
    expect(`1 ${unitFor(1, "times")} per day`).toBe("1 time per day");
    expect(`2 ${unitFor(2, "times")} per day`).toBe("2 times per day");
    expect(unitFor(1, "minutes")).toBe("minute");
    expect(unitFor(1, "days")).toBe("day");
    for (const unit of ["km", "L", "USD", "Times", "push-ups", ""]) expect(unitFor(1, unit)).toBe(unit);
  });
});
