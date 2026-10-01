// Every expectation uses settled time-zone rules: historical transitions, or the EU,
// US and Australian rules for 2026, as shipped in Node 24.19.0's ICU (tz 2026b).
import { afterEach, describe, expect, test } from "vitest";
import { addDays } from "./calendar-date";
import { isTimeZone, offsetMinutes, planDays, startOfZonedDay, zonedDate, zonedDateTime, zonedDayBounds, zonedTimeToInstant } from "./zoned-day";

const at = (iso: string) => Date.parse(iso);
const hostZone = process.env.TZ;
afterEach(() => {
  if (hostZone === undefined) delete process.env.TZ;
  else process.env.TZ = hostZone;
});
function random(seed: number) { // mulberry32: deterministic
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

describe("extreme and fractional offsets", () => {
  test("UTC+14 and UTC-12 put one instant on three calendar days", () => {
    const now = at("2026-10-01T11:00:00Z");
    expect(zonedDate(now, "Pacific/Kiritimati")).toBe("2026-10-02");
    expect(zonedDate(now, "Etc/GMT-14")).toBe("2026-10-02");
    expect(zonedDate(now, "UTC")).toBe("2026-10-01");
    expect(zonedDate(now, "Etc/GMT+12")).toBe("2026-09-30");
    expect(zonedDate(now, "Pacific/Pago_Pago")).toBe("2026-10-01");
    expect(zonedDateTime(now, "Pacific/Kiritimati")).toEqual({ date: "2026-10-02", time: "01:00:00", offsetMinutes: 840 });
    expect(zonedDateTime(now, "Etc/GMT+12")).toEqual({ date: "2026-09-30", time: "23:00:00", offsetMinutes: -720 });
  });
  test("Kiritimati and Pago Pago share a wall clock a day apart", () => {
    const now = at("2026-10-01T10:00:00Z");
    expect(zonedDateTime(now, "Pacific/Kiritimati")).toMatchObject({ date: "2026-10-02", time: "00:00:00" });
    expect(zonedDateTime(now, "Pacific/Pago_Pago")).toMatchObject({ date: "2026-09-30", time: "23:00:00" });
  });
  test("half-hour and 45-minute offsets, with and without daylight saving", () => {
    const january = at("2026-01-15T12:00:00Z"), july = at("2026-07-15T12:00:00Z");
    expect(offsetMinutes(july, "Asia/Kolkata")).toBe(330);
    expect(offsetMinutes(july, "Asia/Kathmandu")).toBe(345);
    expect([offsetMinutes(january, "Pacific/Chatham"), offsetMinutes(july, "Pacific/Chatham")]).toEqual([825, 765]);
    expect([offsetMinutes(january, "America/St_Johns"), offsetMinutes(july, "America/St_Johns")]).toEqual([-210, -150]);
    expect([offsetMinutes(january, "Australia/Adelaide"), offsetMinutes(july, "Australia/Adelaide")]).toEqual([630, 570]);
    expect([offsetMinutes(january, "Australia/Lord_Howe"), offsetMinutes(july, "Australia/Lord_Howe")]).toEqual([660, 630]);
    expect(offsetMinutes(july, "UTC")).toBe(0);
  });
});

describe("day boundaries", () => {
  test("local midnight belongs to the new day and the millisecond before to the old one", () => {
    const cases: [string, string, string][] = [
      ["Asia/Kolkata", "2026-10-01T18:30:00Z", "2026-10-02"],
      ["Asia/Kathmandu", "2026-10-01T18:15:00Z", "2026-10-02"],
      ["America/St_Johns", "2026-10-02T02:30:00Z", "2026-10-02"],
      ["Pacific/Chatham", "2026-10-01T10:15:00Z", "2026-10-02"], // +13:45 since 27 September
      ["Pacific/Kiritimati", "2026-12-31T10:00:00Z", "2027-01-01"],
      ["America/New_York", "2027-01-01T05:00:00Z", "2027-01-01"],
      ["Etc/GMT+12", "2027-01-01T12:00:00Z", "2027-01-01"],
    ];
    for (const [zone, midnight, day] of cases) {
      expect(zonedDate(at(midnight), zone), zone).toBe(day);
      expect(zonedDate(at(midnight) - 1, zone), zone).toBe(addDays(day, -1));
      expect(startOfZonedDay(day, zone), zone).toBe(at(midnight));
    }
  });
  test("a leap day is a normal day, and the same instant can be 29 February or 1 March", () => {
    const late = at("2028-02-29T23:30:00Z");
    expect(zonedDate(late, "Asia/Kolkata")).toBe("2028-03-01");
    expect(zonedDate(late, "America/New_York")).toBe("2028-02-29");
    expect(zonedDate(at("2028-02-28T19:00:00Z"), "Pacific/Kiritimati")).toBe("2028-02-29");
    expect(zonedDayBounds("2028-02-29", "Europe/Brussels")).toEqual({ start: at("2028-02-28T23:00:00Z"), end: at("2028-02-29T23:00:00Z"), hours: 24 });
  });
});

describe("daylight-saving gaps", () => {
  test("Brussels 29 March 2026: 02:00-03:00 does not exist and the day has 23 hours", () => {
    expect(zonedTimeToInstant("2026-03-29", "02:30", "Europe/Brussels")).toBe(at("2026-03-29T01:30:00Z"));
    expect(zonedTimeToInstant("2026-03-29", "02:30", "Europe/Brussels", "later")).toBe(at("2026-03-29T01:30:00Z"));
    expect(zonedTimeToInstant("2026-03-29", "02:30", "Europe/Brussels", "earlier")).toBe(at("2026-03-29T00:30:00Z"));
    expect(() => zonedTimeToInstant("2026-03-29", "02:30", "Europe/Brussels", "reject")).toThrow(/does not exist/);
    expect(zonedDateTime(at("2026-03-29T01:30:00Z"), "Europe/Brussels")).toEqual({ date: "2026-03-29", time: "03:30:00", offsetMinutes: 120 });
    expect(zonedDayBounds("2026-03-29", "Europe/Brussels")).toEqual({ start: at("2026-03-28T23:00:00Z"), end: at("2026-03-29T22:00:00Z"), hours: 23 });
  });
  test("New York 8 March 2026 and St John's half-hour zone", () => {
    expect(zonedTimeToInstant("2026-03-08", "02:30", "America/New_York")).toBe(at("2026-03-08T07:30:00Z"));
    expect(zonedTimeToInstant("2026-03-08", "02:30", "America/New_York", "earlier")).toBe(at("2026-03-08T06:30:00Z"));
    expect(zonedDayBounds("2026-03-08", "America/New_York").hours).toBe(23);
    expect(zonedTimeToInstant("2026-03-08", "02:30", "America/St_Johns")).toBe(at("2026-03-08T06:00:00Z"));
    expect(zonedTimeToInstant("2026-03-08", "02:30", "America/St_Johns", "earlier")).toBe(at("2026-03-08T05:00:00Z"));
    expect(zonedDayBounds("2026-03-08", "America/St_Johns").hours).toBe(23);
  });
  test("Lord Howe's 30-minute change makes a 23.5-hour day", () => {
    expect(zonedTimeToInstant("2026-10-04", "02:15", "Australia/Lord_Howe")).toBe(at("2026-10-03T15:45:00Z"));
    expect(zonedTimeToInstant("2026-10-04", "02:15", "Australia/Lord_Howe", "earlier")).toBe(at("2026-10-03T15:15:00Z"));
    expect(zonedDayBounds("2026-10-04", "Australia/Lord_Howe").hours).toBe(23.5);
  });
  test("São Paulo 4 November 2018: midnight was skipped, so the day starts at 01:00", () => {
    const start = startOfZonedDay("2018-11-04", "America/Sao_Paulo");
    expect(start).toBe(at("2018-11-04T03:00:00Z"));
    expect(zonedDateTime(start, "America/Sao_Paulo")).toEqual({ date: "2018-11-04", time: "01:00:00", offsetMinutes: -120 });
    expect(zonedDate(start - 1, "America/Sao_Paulo")).toBe("2018-11-03");
    expect(() => zonedTimeToInstant("2018-11-04", "00:00", "America/Sao_Paulo", "reject")).toThrow(/does not exist/);
    expect(zonedDayBounds("2018-11-04", "America/Sao_Paulo").hours).toBe(23);
  });
  test("Apia skipped 30 December 2011 entirely", () => {
    expect(zonedDate(at("2011-12-30T09:59:59.999Z"), "Pacific/Apia")).toBe("2011-12-29");
    expect(zonedDate(at("2011-12-30T10:00:00Z"), "Pacific/Apia")).toBe("2011-12-31");
    for (let t = at("2011-12-28T00:00:00Z"); t <= at("2012-01-02T00:00:00Z"); t += 900_000) expect(zonedDate(t, "Pacific/Apia")).not.toBe("2011-12-30");
    expect(zonedDayBounds("2011-12-30", "Pacific/Apia")).toEqual({ start: at("2011-12-30T10:00:00Z"), end: at("2011-12-30T10:00:00Z"), hours: 0 });
    expect(zonedDayBounds("2011-12-29", "Pacific/Apia").hours).toBe(24);
    expect(zonedDayBounds("2011-12-31", "Pacific/Apia").hours).toBe(24);
    expect(() => zonedTimeToInstant("2011-12-30", "12:00", "Pacific/Apia", "reject")).toThrow(/does not exist/);
  });
});

describe("daylight-saving overlaps", () => {
  test("Brussels 25 October 2026: 02:00-03:00 happens twice and the day has 25 hours", () => {
    expect(zonedTimeToInstant("2026-10-25", "02:30", "Europe/Brussels")).toBe(at("2026-10-25T00:30:00Z"));
    expect(zonedTimeToInstant("2026-10-25", "02:30", "Europe/Brussels", "earlier")).toBe(at("2026-10-25T00:30:00Z"));
    expect(zonedTimeToInstant("2026-10-25", "02:30", "Europe/Brussels", "later")).toBe(at("2026-10-25T01:30:00Z"));
    expect(() => zonedTimeToInstant("2026-10-25", "02:30", "Europe/Brussels", "reject")).toThrow(/occurs twice/);
    expect(zonedDateTime(at("2026-10-25T00:30:00Z"), "Europe/Brussels")).toEqual({ date: "2026-10-25", time: "02:30:00", offsetMinutes: 120 });
    expect(zonedDateTime(at("2026-10-25T01:30:00Z"), "Europe/Brussels")).toEqual({ date: "2026-10-25", time: "02:30:00", offsetMinutes: 60 });
    expect(zonedDayBounds("2026-10-25", "Europe/Brussels")).toEqual({ start: at("2026-10-24T22:00:00Z"), end: at("2026-10-25T23:00:00Z"), hours: 25 });
  });
  test("New York 1 November 2026 and Lord Howe's 24.5-hour day", () => {
    expect(zonedTimeToInstant("2026-11-01", "01:30", "America/New_York", "earlier")).toBe(at("2026-11-01T05:30:00Z"));
    expect(zonedTimeToInstant("2026-11-01", "01:30", "America/New_York", "later")).toBe(at("2026-11-01T06:30:00Z"));
    expect(zonedDayBounds("2026-11-01", "America/New_York").hours).toBe(25);
    expect(zonedTimeToInstant("2026-04-05", "01:45", "Australia/Lord_Howe", "earlier")).toBe(at("2026-04-04T14:45:00Z"));
    expect(zonedTimeToInstant("2026-04-05", "01:45", "Australia/Lord_Howe", "later")).toBe(at("2026-04-04T15:15:00Z"));
    expect(zonedDayBounds("2026-04-05", "Australia/Lord_Howe").hours).toBe(24.5);
  });
});

describe("plan days (the QA-04 path)", () => {
  test("in UTC, planDays equals today's funding and plan-revision expressions exactly", () => {
    // Copied verbatim from main fc906e8: goal-intelligence.ts:59 (`timestamp` is
    // `new Date(now).toISOString()`, :9) and plan-revisions.ts:5-6.
    const fundingToday = (now: number) => new Date(now).toISOString().slice(0, 10);
    const fundingTomorrow = (now: number) => new Date(now + 86400000).toISOString().slice(0, 10);
    const shift = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
    const next = random(2026), instants: number[] = [];
    for (const day of ["2026-03-29", "2026-10-25", "2028-02-29", "2026-12-31", "2000-02-29"]) for (const delta of [-1, 0, 1]) instants.push(at(`${day}T00:00:00Z`) + delta, at(`${day}T23:59:59.999Z`) + delta);
    for (let i = 0; i < 10_000; i++) instants.push(Math.floor(at("1970-01-01T00:00:00Z") + next() * (at("2100-01-01T00:00:00Z") - at("1970-01-01T00:00:00Z"))));
    for (const now of instants) {
      expect(planDays(now)).toEqual({ today: fundingToday(now), tomorrow: fundingTomorrow(now) });
      const n = Math.floor(next() * 801) - 400;
      expect(addDays(planDays(now).today, n)).toBe(shift(fundingToday(now), n));
    }
  });
  test("QA-04: New York at 21:30 on the due day is still the due day in the plan's own zone", () => {
    const evening = at("2026-10-16T01:30:00Z"); // 2026-10-15 21:30 in New York
    expect(planDays(evening)).toEqual({ today: "2026-10-16", tomorrow: "2026-10-17" });
    expect(planDays(evening, "America/New_York")).toEqual({ today: "2026-10-15", tomorrow: "2026-10-16" });
    const brussels = at("2026-10-01T22:30:00Z"); // 2026-10-02 00:30 in Brussels
    expect(planDays(brussels).today).toBe("2026-10-01");
    expect(planDays(brussels, "Europe/Brussels").today).toBe("2026-10-02");
  });
  test("tomorrow is the next calendar day even across a 23- or 25-hour day", () => {
    expect(planDays(at("2026-03-28T23:30:00Z"), "Europe/Brussels")).toEqual({ today: "2026-03-29", tomorrow: "2026-03-30" });
    expect(planDays(at("2026-10-25T22:59:59Z"), "Europe/Brussels")).toEqual({ today: "2026-10-25", tomorrow: "2026-10-26" });
  });
});

describe("properties", () => {
  const zones = ["UTC", "Europe/Brussels", "America/New_York", "America/Sao_Paulo", "Pacific/Apia", "Australia/Lord_Howe", "Pacific/Chatham", "Asia/Kathmandu", "America/St_Johns", "Pacific/Kiritimati", "Etc/GMT+12", "Asia/Kolkata", "Australia/Adelaide"];
  test("every instant lies inside its own day, and every local time round-trips", () => {
    const next = random(42);
    for (const zone of zones) {
      for (let i = 0; i < 250; i++) {
        const t = Math.floor((at("2000-01-01T00:00:00Z") + next() * (at("2040-01-01T00:00:00Z") - at("2000-01-01T00:00:00Z"))) / 1000) * 1000;
        const local = zonedDateTime(t, zone), { start, end } = zonedDayBounds(local.date, zone);
        expect(start <= t && t < end, `${zone} ${new Date(t).toISOString()}`).toBe(true);
        expect(zonedDate(start, zone)).toBe(local.date);
        const earlier = zonedTimeToInstant(local.date, local.time, zone, "earlier"), later = zonedTimeToInstant(local.date, local.time, zone, "later");
        expect([earlier, later], `${zone} ${new Date(t).toISOString()}`).toContain(t);
      }
    }
  });
});

describe("inputs", () => {
  test("only zones Intl knows are accepted", () => {
    for (const zone of ["UTC", "Europe/Brussels", "Pacific/Kiritimati", "Etc/GMT+12", "Asia/Kathmandu"]) expect(isTimeZone(zone), zone).toBe(true);
    // A fixed offset is a valid Intl zone with no daylight saving (see the design doc).
    expect(isTimeZone("+05:30")).toBe(true);
    for (const zone of ["Mars/Olympus", "", "Europe/Brussels ", "x".repeat(101), 42, null, undefined]) expect(isTimeZone(zone), String(zone)).toBe(false);
  });
  test("bad instants, zones, dates, times and options throw RangeError", () => {
    expect(() => zonedDate(Number.NaN, "UTC")).toThrow(RangeError);
    expect(() => zonedDate(Number.POSITIVE_INFINITY, "UTC")).toThrow(RangeError);
    expect(() => zonedDate(8.64e15 + 1, "UTC")).toThrow(RangeError);
    expect(() => zonedDate(0, "Mars/Olympus")).toThrow(RangeError);
    expect(() => zonedTimeToInstant("2026-02-29", "12:00", "UTC")).toThrow(RangeError);
    for (const time of ["24:00", "7:00", "12:60", "12:00:60", "12", ""]) expect(() => zonedTimeToInstant("2026-10-01", time, "UTC"), time).toThrow(RangeError);
    expect(() => zonedTimeToInstant("2026-10-01", "12:00", "UTC", "nearest" as "later")).toThrow(RangeError);
    expect(() => zonedDayBounds("2026-10-01", "Mars/Olympus")).toThrow(RangeError);
  });
});

test("results do not depend on the host time zone", () => {
  const sample = () => [
    zonedDate(at("2026-10-01T22:30:00Z"), "Europe/Brussels"),
    zonedDateTime(at("2026-10-25T01:30:00Z"), "Europe/Brussels"),
    zonedTimeToInstant("2026-03-08", "02:30", "America/New_York"),
    zonedDayBounds("2026-04-05", "Australia/Lord_Howe"),
    planDays(at("2026-10-16T01:30:00Z"), "America/New_York"),
    planDays(at("2026-10-16T01:30:00Z")),
  ];
  process.env.TZ = "UTC";
  const reference = sample();
  for (const zone of ["Pacific/Kiritimati", "Etc/GMT+12", "America/Los_Angeles", "Asia/Kolkata", "Europe/Brussels", "Australia/Lord_Howe"]) {
    process.env.TZ = zone;
    expect(sample(), zone).toEqual(reference);
  }
});
