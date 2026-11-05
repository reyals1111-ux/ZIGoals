import { describe, expect, it } from "vitest";
import { durationCountText } from "./habit-number";
import { timerAmountText } from "./habit-timer-actions";

// Session AL (CI7, P-NB-29): the Saved timer box and Timer history say a part-minute as the habit's card does.
describe("a saved timer's amount uses the card's duration words", () => {
  it("says 1.5 minutes as 1 min 30 s, the card's words, never 1.5 minutes", () => {
    expect(timerAmountText(1.5, "minutes")).toBe("1 min 30 s");
    expect(timerAmountText(1.5, "minutes")).toBe(durationCountText(1.5, "minutes"));
    expect(timerAmountText(0.81, "minutes")).toBe("49 s");
    expect(timerAmountText(1.25, "hours")).toBe("1 h 15 min");
  });
  it("keeps a whole amount's number and unit, through the display locale's digits", () => {
    expect(timerAmountText(2, "minutes")).toBe("2 minutes");
    expect(timerAmountText(0, "minutes")).toBe("0 minutes");
    expect(timerAmountText(3, "hours", text => text.replace("3", "٣"))).toBe("٣ hours");
  });
});
