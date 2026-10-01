import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_DISPLAY_LOCALE, displayGroupsWithDot, displayLocale, formatDate, formatDateTime, formatExactNumber, formatNumber, formatPlainDecimal, formatTime, resolveDisplayLocale, setDisplayLocale, wordLocale } from "./visual-format";

// Session G, Part 3 (QA-06, QA-29): numbers and money follow the browser's locale, en-US looks exactly as before, and
// any date with words in it is written in English for the user's region.
const at = new Date(Date.UTC(2026, 9, 1, 14, 5, 9));
const utc = { timeZone: "UTC" } as const;
const NNBSP = String.fromCharCode(0x202f), NBSP = String.fromCharCode(0xa0);
afterEach(() => setDisplayLocale(DEFAULT_DISPLAY_LOCALE));

describe("display locale", () => {
  it("is en-US until the browser's locale is applied (the server render and hydration)", () => {
    expect(displayLocale()).toBe("en-US");
  });
  it("takes the first browser language this runtime supports; a bare English counts as en-US", () => {
    expect(resolveDisplayLocale(["nl-BE", "en"])).toBe("nl-BE");
    expect(resolveDisplayLocale(["en"])).toBe("en-US");
    expect(resolveDisplayLocale(["!!", "de"])).toBe("de");
    expect(resolveDisplayLocale(["zz-ZZ"])).toBe("en-US");
    expect(resolveDisplayLocale([])).toBe("en-US");
    expect(resolveDisplayLocale(undefined)).toBe("en-US");
  });
});

describe("en-US is unchanged", () => {
  it("numbers and money read exactly as before", () => {
    expect(formatExactNumber("1234567.891")).toBe("1,234,567.891");
    expect(formatExactNumber("-47900.5", undefined, "USD")).toBe("-$47,900.5");
    expect(formatExactNumber("1234567.5", undefined, "EUR")).toBe("€1,234,567.5");
    expect(formatExactNumber("12e3")).toBe("Unavailable");
    for (const [value, options] of [[1234.5, undefined], [0.125, { style: "percent" }], [1234567.891, { maximumFractionDigits: 2 }], [12, { style: "currency", currency: "EUR" }]] as const) expect(formatNumber(value, options)).toBe(value.toLocaleString("en-US", options));
    for (const text of ["1234.5", "-0.00012345", "Unavailable", "1e-7"]) expect(formatPlainDecimal(text)).toBe(text);
  });
  it("dates and times are what Date#toLocale…String('en-US') wrote", () => {
    for (const options of [utc, { ...utc, month: "long", day: "numeric", year: "numeric" }, { ...utc, month: "short", day: "numeric" }, { ...utc, weekday: "short" }, { ...utc, dateStyle: "medium" }] as const) expect(formatDate(at, options)).toBe(at.toLocaleDateString("en-US", options));
    for (const options of [utc, { ...utc, hour: "2-digit", minute: "2-digit" }] as const) expect(formatTime(at, options)).toBe(at.toLocaleTimeString("en-US", options));
    for (const options of [utc, { ...utc, dateStyle: "medium", timeStyle: "short" }] as const) expect(formatDateTime(at, options)).toBe(at.toLocaleString("en-US", options));
    const invalid = new Date("not a date");
    expect([formatDate(invalid), formatTime(invalid), formatDateTime("2026-13-45", utc)]).toEqual([invalid.toLocaleDateString("en-US"), invalid.toLocaleTimeString("en-US"), invalid.toLocaleString("en-US", utc)]);
  });
});

describe("other locales", () => {
  const cases = [
    { locale: "en-GB", words: "en-GB", number: "1,234,567.891", euro: "€1,234,567.5", plain: "1234.5", date: "01/10/2026", time: "14:05:09" },
    { locale: "de-DE", words: "en-DE", number: "1.234.567,891", euro: `1.234.567,5${NBSP}€`, plain: "1234,5", date: "1.10.2026", time: "14:05:09" },
    { locale: "nl-BE", words: "en-BE", number: "1.234.567,891", euro: `€${NBSP}1.234.567,5`, plain: "1234,5", date: "1/10/2026", time: "14:05:09" },
    { locale: "fr-FR", words: "en-FR", number: `1${NNBSP}234${NNBSP}567,891`, euro: `1${NNBSP}234${NNBSP}567,5${NBSP}€`, plain: "1234,5", date: "01/10/2026", time: "14:05:09" },
    { locale: "ja-JP", words: "en-JP", number: "1,234,567.891", euro: "€1,234,567.5", plain: "1234.5", date: "2026/10/1", time: "14:05:09" },
    { locale: "hi-IN", words: "en-IN", number: "12,34,567.891", euro: "€12,34,567.5", plain: "1234.5", date: "1/10/2026", time: "2:05:09 pm" },
  ];
  for (const c of cases) it(`${c.locale}: grouping and decimal sign of the locale, every digit kept, currency as its own code`, () => {
    setDisplayLocale(c.locale);
    expect(formatExactNumber("1234567.891")).toBe(c.number);
    expect(formatExactNumber("1234567.5", undefined, "EUR")).toBe(c.euro);
    expect(formatExactNumber("0.000000000000000001")).toMatch(/^0[.,]000000000000000001$/);
    expect(formatNumber(1234.5)).toBe((1234.5).toLocaleString(c.locale));
    expect(formatPlainDecimal("1234.5")).toBe(c.plain);
    expect(formatDate(at, utc)).toBe(c.date);
    expect(formatTime(at, utc)).toBe(c.time);
    expect(wordLocale()).toBe(c.words);
  });
  it("month and weekday names are English everywhere, in the region's order", () => {
    for (const locale of ["de-DE", "nl-BE", "fr-FR", "en-GB", "hi-IN"]) {
      setDisplayLocale(locale);
      expect(formatDate(at, { ...utc, month: "long", day: "numeric", year: "numeric" }), locale).toBe("1 October 2026");
      expect(formatDate(at, { ...utc, weekday: "long" }), locale).toBe("Thursday");
      expect(formatDate(at, { ...utc, month: "short", day: "numeric" }), locale).toBe("1 Oct");
    }
    setDisplayLocale("ja-JP");
    expect(formatDate(at, { ...utc, month: "long", day: "numeric", year: "numeric" })).toBe("October 1, 2026");
    expect(formatDate(at, { ...utc, weekday: "short" })).toBe("Thu");
  });
  it("knows which locales group thousands with a dot", () => {
    expect(displayGroupsWithDot()).toBe(false);
    for (const [locale, dot] of [["de-DE", true], ["nl-BE", true], ["fr-FR", false], ["ja-JP", false]] as const) { setDisplayLocale(locale); expect(displayGroupsWithDot(), locale).toBe(dot); }
  });
});
