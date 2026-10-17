import { afterEach, describe, expect, it } from "vitest";
import { activityTimeLabel } from "./activity-time";
import { DEFAULT_DISPLAY_LOCALE, calendarDay, formatClock, formatDate, formatDateTime, formatMonth, formatRelativeDay, formatTime, formatWeekday, setDisplayLocale } from "./visual-format";

// Session AD item 8 (ADR-026): one date format on every page, from the browser's locale.
afterEach(() => setDisplayLocale(DEFAULT_DISPLAY_LOCALE));
const evening = Date.UTC(2026, 9, 17, 21, 5), morning = Date.UTC(2026, 9, 17, 9, 5), utc = { timeZone: "UTC" } as const;

describe("the medium date", () => {
  it("orders day, short month and year as the region writes them", () => {
    expect(formatDate("2026-10-17")).toBe("Oct 17, 2026");
    expect(formatDate(evening, utc)).toBe("Oct 17, 2026");
    setDisplayLocale("en-GB");
    expect(formatDate("2026-10-17")).toBe("17 Oct 2026");
    expect(formatDate(evening, utc)).toBe("17 Oct 2026");
    expect(formatDate("2026-10-17", { weekday: true })).toBe("Sat, 17 Oct 2026");
    expect(formatDate("2026-10-17", { year: false })).toBe("17 Oct");
    expect(formatMonth("2026-10")).toBe("Oct 2026");
    expect(formatWeekday("2026-10-17")).toBe("Sat");
  });
  it("keeps a calendar day on its day in every zone", () => {
    for (const timeZone of ["Pacific/Honolulu", "Pacific/Kiritimati", "UTC"]) {
      expect(formatDate("2026-10-17", { timeZone }), timeZone).toBe("Oct 17, 2026");
      expect(calendarDay("2026-10-17", timeZone), timeZone).toBe("2026-10-17");
    }
    expect(calendarDay(evening, "Pacific/Kiritimati")).toBe("2026-10-18");
    expect(calendarDay(evening, "Pacific/Honolulu")).toBe("2026-10-17");
  });
});

describe("times follow the locale's hour cycle", () => {
  it("en-GB writes 24 hours, en-US 12 hours with AM and PM", () => {
    expect([formatTime(morning, utc), formatTime(evening, utc)]).toEqual(["9:05 AM", "9:05 PM"]);
    expect(formatDateTime(evening, utc)).toBe("Oct 17, 2026, 9:05 PM");
    setDisplayLocale("en-GB");
    expect([formatTime(morning, utc), formatTime(evening, utc)]).toEqual(["09:05", "21:05"]);
    expect(formatDateTime(evening, utc)).toBe("17 Oct 2026, 21:05");
    setDisplayLocale("de-DE");
    expect(formatTime(evening, utc)).toBe("21:05");
    expect(formatDateTime(evening, utc)).toBe("17 Oct 2026, 21:05");
  });
  it("a wall-clock time kept as HH:MM (a bedtime, quiet hours) reads the same way; anything else is left as it is", () => {
    expect([formatClock("06:30"), formatClock("22:30"), formatClock("00:00")]).toEqual(["6:30 AM", "10:30 PM", "12:00 AM"]);
    setDisplayLocale("en-GB");
    expect([formatClock("06:30"), formatClock("22:30"), formatClock("00:00")]).toEqual(["06:30", "22:30", "00:00"]);
    expect([formatClock("24:00"), formatClock("7:5"), formatClock("")]).toEqual(["24:00", "7:5", ""]);
  });
});

describe("today and yesterday", () => {
  it("turn over at the reader's midnight, not at UTC's", () => {
    const now = Date.UTC(2026, 9, 16, 22, 30), timeZone = "Europe/Brussels"; // 00:30 on 17 October in Brussels
    const beforeMidnight = Date.UTC(2026, 9, 16, 21, 50), afterMidnight = Date.UTC(2026, 9, 16, 22, 10);
    expect(formatRelativeDay(beforeMidnight, now, { timeZone })).toBe("Yesterday");
    expect(formatRelativeDay(afterMidnight, now, { timeZone })).toBe("Today");
    expect(formatRelativeDay(beforeMidnight, now, utc)).toBe("Today");
    expect(formatRelativeDay(afterMidnight, now, utc)).toBe("Today");
    expect(formatRelativeDay(Date.UTC(2026, 9, 17, 23), now, { timeZone })).toBe("Tomorrow");
  });
  it("write any other day as the medium date, weekday kept when asked", () => {
    expect(formatRelativeDay("2026-10-16", "2026-10-17")).toBe("Yesterday");
    expect(formatRelativeDay("2026-10-17", "2026-10-17")).toBe("Today");
    expect(formatRelativeDay("2026-10-14", "2026-10-17")).toBe("Oct 14, 2026");
    expect(formatRelativeDay("2026-10-14", "2026-10-17", { weekday: true })).toBe("Wed, Oct 14, 2026");
    setDisplayLocale("en-GB");
    expect(formatRelativeDay("2026-10-14", "2026-10-17", { weekday: true })).toBe("Wed, 14 Oct 2026");
  });
});

describe("date-only and timed records", () => {
  it("a date-only record shows its date and no time; a timed one shows both", () => {
    const dateOnly = "2026-10-17T00:00:00.000Z", timed = "2026-10-17T18:42:00.000Z";
    expect(activityTimeLabel(dateOnly, "UTC")).toBeNull();
    expect(formatDate(dateOnly, utc)).toBe("Oct 17, 2026");
    expect(activityTimeLabel(timed, "UTC")).toBe("6:42 PM");
    setDisplayLocale("en-GB");
    expect(activityTimeLabel(timed, "UTC")).toBe("18:42");
    expect(formatDateTime(timed, utc)).toBe("17 Oct 2026, 18:42");
  });
});
