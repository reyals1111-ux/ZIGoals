import { afterEach, describe, expect, test } from "vitest";
import { addDays, daysBetween, daysInMonth, epochDay, fromEpochDay, isCalendarDate, isoWeekday, startOfIsoWeek } from "./calendar-date";

const hostZone = process.env.TZ;
afterEach(() => {
  if (hostZone === undefined) delete process.env.TZ;
  else process.env.TZ = hostZone;
});

describe("isCalendarDate", () => {
  test("accepts real Gregorian dates, leap days included", () => {
    for (const date of ["2026-10-01", "2028-02-29", "2000-02-29", "2400-02-29", "1900-01-01", "9999-12-31", "2026-04-30", "2026-12-31"]) {
      expect(isCalendarDate(date), date).toBe(true);
    }
  });
  test("refuses impossible days, century non-leap years and loose formats", () => {
    for (const date of ["2026-02-29", "1900-02-29", "2100-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-10-00", "2026-1-01", "26-01-01", "2026-01-01T00:00", " 2026-01-01", "2026/01/01", "1899-12-31", "10000-01-01", "２０２６-01-01", ""]) {
      expect(isCalendarDate(date), date).toBe(false);
    }
    for (const value of [null, undefined, 20260101, new Date(0)]) expect(isCalendarDate(value)).toBe(false);
  });
  test("knows each month's length", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => daysInMonth(2028, m))).toEqual([31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
  });
});

describe("day arithmetic", () => {
  test("crosses leap days, month ends and year ends", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2028-01-01", 366)).toBe("2029-01-01");
    expect(addDays("2026-10-01", 0)).toBe("2026-10-01");
  });
  test("ignores daylight saving: a DST weekend is two plain days", () => {
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });
  test("counts days between dates in either direction", () => {
    expect(daysBetween("2028-02-01", "2028-03-01")).toBe(29);
    expect(daysBetween("2026-02-01", "2026-03-01")).toBe(28);
    expect(daysBetween("2026-12-31", "2026-01-01")).toBe(-364);
    expect(daysBetween("1970-01-01", "1970-01-01")).toBe(0);
    expect(epochDay("1970-01-01")).toBe(0);
    expect(epochDay("1969-12-31")).toBe(-1);
    expect(fromEpochDay(-25567)).toBe("1900-01-01");
  });
  test("addDays and daysBetween are inverse over the whole supported range", () => {
    let seed = 7; // mulberry32: deterministic
    const next = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
    };
    const first = epochDay("1900-01-01"), last = epochDay("9999-12-31");
    for (let i = 0; i < 2000; i++) {
      const a = fromEpochDay(first + Math.floor(next() * (last - first))), b = fromEpochDay(first + Math.floor(next() * (last - first)));
      expect(addDays(a, daysBetween(a, b))).toBe(b);
      expect(isCalendarDate(a) && isCalendarDate(b)).toBe(true);
    }
  });
  test("refuses invalid dates, fractional counts and results outside 1900-9999", () => {
    expect(() => addDays("2026-02-29", 1)).toThrow(RangeError);
    expect(() => addDays("2026-10-01", 1.5)).toThrow(RangeError);
    expect(() => addDays("2026-10-01", Number.NaN)).toThrow(RangeError);
    expect(() => addDays("9999-12-31", 1)).toThrow(RangeError);
    expect(() => addDays("1900-01-01", -1)).toThrow(RangeError);
    expect(() => daysBetween("2026-10-01", "2026-10-32")).toThrow(RangeError);
  });
});

describe("weeks", () => {
  test("ISO weekdays run Monday 1 to Sunday 7", () => {
    expect(isoWeekday("2026-10-05")).toBe(1);
    expect(isoWeekday("2026-10-01")).toBe(4);
    expect(isoWeekday("2026-10-04")).toBe(7);
    expect(isoWeekday("1970-01-01")).toBe(4);
    expect(isoWeekday("1900-01-01")).toBe(1);
    expect(isoWeekday("2028-02-29")).toBe(2);
  });
  test("the ISO week starts on Monday, across a DST change and a year end", () => {
    expect(startOfIsoWeek("2026-10-25")).toBe("2026-10-19");
    expect(startOfIsoWeek("2026-10-26")).toBe("2026-10-26");
    expect(startOfIsoWeek("2027-01-01")).toBe("2026-12-28");
    expect(startOfIsoWeek("2028-03-05")).toBe("2028-02-28");
  });
});

test("results do not depend on the host time zone", () => {
  const sample = () => [addDays("2026-03-28", 1), addDays("2026-10-24", 2), daysBetween("2026-03-01", "2026-04-01"), isoWeekday("2026-10-25"), startOfIsoWeek("2026-11-01"), epochDay("2028-02-29")];
  process.env.TZ = "UTC";
  const reference = sample();
  for (const zone of ["Pacific/Kiritimati", "Etc/GMT+12", "America/New_York", "Europe/Brussels", "Asia/Kathmandu", "Australia/Lord_Howe"]) {
    process.env.TZ = zone;
    expect(sample(), zone).toEqual(reference);
  }
});
