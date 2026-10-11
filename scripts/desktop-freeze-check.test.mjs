import { describe, expect, test } from "vitest";
import { AI_LAUNCHER_HIDDEN, AI_SETTINGS_KEY, captureName, intendedDifference, matrix, ONBOARDING_KEY, PAGES, SIZES, snapshotDiff, STATES, validateBase, ZIGI_KEY, ZIGI_NO_EDGE_TAB } from "./desktop-freeze-check.mjs";
import { AI_SETTINGS_KEY as APP_AI_SETTINGS_KEY, aiSettingsSchema } from "../apps/web/lib/ai/settings.ts";
import { ZIGI_KEY as APP_ZIGI_KEY } from "../apps/web/lib/ai/store/keys.ts";
import { zigiPrefs, zigiSchema } from "../apps/web/lib/ai/store/records.ts";

describe("desktop freeze check", () => {
  test("covers every main page at the four frozen sizes, in Showcase and empty", () => {
    const names = new Set(matrix().map(item => item.name));
    const pages = ["today", "goals", "goal-detail", "habits", "health", "wealth", "markets", "staking", "portfolio", "ecosystem", "activity", "settings", "help"];
    for (const size of ["1440x900", "1280x800", "1024x768", "820x1180"]) for (const page of pages) {
      expect(names.has(captureName(size, "showcase", page))).toBe(true);
      // An empty profile has no Goal to open, so Goal detail is Showcase-only.
      expect(names.has(captureName(size, "empty", page))).toBe(page !== "goal-detail");
    }
  });
  test("captures Staking at its own address, Portfolio and Help, never the redirecting Stake / Positions address", () => {
    const paths = PAGES.map(page => page.path);
    expect(paths).toContain("/app/staking");
    expect(paths).toContain("/app/portfolio");
    expect(paths).toContain("/app/help");
    expect(paths).not.toContain("/app/goals/positions");
    // 6 sizes x (13 pages x 2 states - the Showcase-only Goal detail) + 4 dialog captures + the ZIGi launcher capture.
    expect(matrix().length).toBe(155);
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
    expect(matrix().length).toBe(SIZES.length * (PAGES.filter(p => !p.dialog && !p.launcher).length * STATES.length - 1) + dialogs.length + 1);
  });
  test("hides the ZIGi launcher through a valid device record during the matrix and shows it in exactly one capture", () => {
    expect(AI_SETTINGS_KEY).toBe(APP_AI_SETTINGS_KEY);
    expect(aiSettingsSchema.parse(AI_LAUNCHER_HIDDEN).launcherHidden).toBe(true);
    expect(matrix().filter(item => item.page.launcher).map(item => item.name)).toEqual(["1280x800__showcase__zigi-launcher"]);
  });
  test("turns ZIGi's edge tab off through a valid look record, so a hidden launcher leaves nothing on the page", () => {
    expect(ZIGI_KEY).toBe(APP_ZIGI_KEY);
    expect(zigiPrefs(zigiSchema.parse(ZIGI_NO_EDGE_TAB)).edgeTab).toBe(false);
    expect(zigiPrefs(zigiSchema.parse(ZIGI_NO_EDGE_TAB))).toMatchObject({ animation: "calm", side: "right", size: "m" });
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
