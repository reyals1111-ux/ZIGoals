import { describe, expect, test } from "vitest";
import { captureName, intendedDifference, matrix, ONBOARDING_KEY, PAGES, SIZES, snapshotDiff, STATES, validateBase } from "./desktop-freeze-check.mjs";

describe("desktop freeze check", () => {
  test("covers every main page at the four frozen sizes, in Showcase and empty", () => {
    const names = new Set(matrix().map(item => item.name));
    const pages = ["today", "goals", "goal-detail", "habits", "health", "wealth", "markets", "positions", "ecosystem", "activity", "settings"];
    for (const size of ["1440x900", "1280x800", "1024x768", "820x1180"]) for (const page of pages) {
      expect(names.has(captureName(size, "showcase", page))).toBe(true);
      // An empty profile has no Goal to open, so Goal detail is Showcase-only.
      expect(names.has(captureName(size, "empty", page))).toBe(page !== "goal-detail");
    }
  });
  test("never includes a phone size: every size is at least 768 wide and taller than 500", () => {
    for (const size of SIZES) { expect(size.width).toBeGreaterThanOrEqual(768); expect(size.height).toBeGreaterThan(500); }
    expect(SIZES.filter(size => size.touch).map(size => size.name)).toEqual(["820x1180-touch", "1180x820-touch"]);
  });
  test("opens the sheet-like dialogs only at the sizes that prove the phone sheet styles stay out", () => {
    const dialogs = matrix().filter(item => item.page.dialog).map(item => item.name);
    expect(dialogs).toEqual([
      "1024x768__showcase__dialog-quick-add", "1024x768__showcase__dialog-add-asset",
      "820x1180-touch__showcase__dialog-quick-add", "820x1180-touch__showcase__dialog-add-asset",
    ]);
    expect(matrix().length).toBe(SIZES.length * (PAGES.filter(p => !p.dialog).length * STATES.length - 1) + dialogs.length);
  });
  test("accepts only loopback HTTP origins", () => {
    expect(validateBase("http://127.0.0.1:3102")).toBe("http://127.0.0.1:3102");
    for (const bad of ["https://alpha.zigoals.app", "http://127.0.0.1:3102/app", "http://user:pw@127.0.0.1:3102", "not a url"]) expect(() => validateBase(bad)).toThrow();
  });
  test("reports the differing accessibility snapshot lines", () => {
    expect(snapshotDiff("a\nb", "a\nb")).toEqual([]);
    expect(snapshotDiff("a\nb", "a\nc\nd")).toEqual(["line 2: - b | + c", "line 3: - (none) | + d"]);
  });
  test("seeds the same onboarding key the app reads", () => expect(ONBOARDING_KEY).toBe("zigoals:onboarding:v1"));
  test("accepts only the owner-authorized QA-01 change: Health amount fields from spinbutton to textbox, same name and value", () => {
    const before = '- main:\n  - spinbutton "Water amount"\n  - spinbutton "Servings": "1"', after = '- main:\n  - textbox "Water amount"\n  - textbox "Servings": "1"';
    expect(intendedDifference("health", before, after)).toBe("QA-01");
    // Not on another page, not with a changed name or value, not with any other change alongside, and not without a change.
    expect(intendedDifference("habits", before, after)).toBeNull();
    expect(intendedDifference("health", before, after.replace('"Servings": "1"', '"Servings": "2"'))).toBeNull();
    expect(intendedDifference("health", before, after.replace("Water amount", "Water"))).toBeNull();
    expect(intendedDifference("health", `${before}\n  - heading "Health"`, `${after}\n  - heading "Wealth"`)).toBeNull();
    expect(intendedDifference("health", before, `${after}\n  - button "New"`)).toBeNull();
    expect(intendedDifference("health", before, before)).toBeNull();
  });
});
