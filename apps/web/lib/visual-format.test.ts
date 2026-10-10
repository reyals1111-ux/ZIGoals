import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_DISPLAY_LOCALE, currencyDigits, displayGroupsWithDot, displayLocale, formatDate, formatDateTime, formatExactNumber, formatMoney, formatNumber, formatPlainDecimal, formatPrice, formatTime, isMoneyCurrency, resolveDisplayLocale, setDisplayLocale, wordLocale } from "./visual-format";

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

// Session I, Part 5: money always shows its currency's minor digits through one formatter; prices keep sub-cent digits.
describe("money", () => {
  it("knows each currency's minor digits and what is not money", () => {
    expect(["USD", "EUR", "JPY", "KWD", "GBP"].map(currencyDigits)).toEqual([2, 2, 0, 3, 2]);
    for (const code of ["ZIG", "BTC", "XAU", "milestones", "usd"]) { expect(isMoneyCurrency(code)).toBe(false); expect(currencyDigits(code)).toBeNull(); }
  });
  it("writes the minor digits in en-US, nl-BE, de-DE and ja-JP, cutting extra digits and never rounding up", () => {
    const cases = [
      ["en-US", "9000", "USD", "$9,000.00"], ["en-US", "1234.567", "EUR", "€1,234.56"], ["en-US", "-47900.5", "USD", "-$47,900.50"], ["en-US", "9000.9", "JPY", "¥9,000"],
      ["nl-BE", "1234567.8", "EUR", `€${NBSP}1.234.567,80`], ["nl-BE", "0.999", "USD", `US$${NBSP}0,99`],
      ["de-DE", "1234567.8", "EUR", `1.234.567,80${NBSP}€`], ["de-DE", "12", "USD", `12,00${NBSP}$`],
      ["ja-JP", "1234567.89", "JPY", "￥1,234,567"], ["ja-JP", "1234.5", "USD", "$1,234.50"],
    ] as const;
    for (const [locale, value, currency, expected] of cases) expect(formatMoney(value, currency, locale), `${locale} ${value} ${currency}`).toBe(expected);
    expect(formatMoney("1.2345", "KWD", "en-US")).toBe(`KWD${NBSP}1.234`);
  });
  it("writes the code instead of the symbol when asked, and never shows -0", () => {
    expect(formatMoney("1500", "GBP", "en-US", { display: "code" })).toBe("1,500.00 GBP");
    // Session M (QA2-03, owner decision M3): a loss is cut away from zero, so -0.004 is a loss of at least one cent
    // ("$0.00" before). A zero with a minus sign still shows no sign.
    expect(formatMoney("-0.004", "USD", "en-US")).toBe("-$0.01");
    for (const zero of ["-0", "-0.000", "-0.00"]) expect(formatMoney(zero, "USD", "en-US")).toBe("$0.00");
    expect(formatMoney("-0", "JPY", "en-US", { display: "code" })).toBe("0 JPY");
  });
  it("QA2-03: never reads a loss smaller than it is, in en-US, nl-BE, de-DE and ja-JP; gains are still cut toward zero", () => {
    const cases = [
      ["en-US", "-12.349", "USD", "-$12.35"], ["en-US", "12.349", "USD", "$12.34"], ["en-US", "-47900.5", "USD", "-$47,900.50"],
      ["nl-BE", "-1234.561", "EUR", `€${NBSP}-1.234,57`], ["nl-BE", "1234.569", "EUR", `€${NBSP}1.234,56`],
      ["de-DE", "-0.001", "EUR", `-0,01${NBSP}€`], ["de-DE", "0.009", "EUR", `0,00${NBSP}€`],
      ["ja-JP", "-1234.5", "JPY", "-￥1,235"], ["ja-JP", "1234.5", "JPY", "￥1,234"], ["ja-JP", "-1.001", "USD", "-$1.01"],
      ["en-US", "-1.2341", "KWD", `-KWD${NBSP}1.235`],
    ] as const;
    for (const [locale, value, currency, expected] of cases) expect(formatMoney(value, currency, locale), `${locale} ${value} ${currency}`).toBe(expected);
  });
  it("is unavailable for anything that is not an amount of money", () => {
    for (const [value, currency] of [["12e3", "USD"], ["", "USD"], ["abc", "EUR"], ["100", "ZIG"], ["100", "BTC"]] as const) expect(formatMoney(value, currency, "en-US")).toBe("Unavailable");
  });
  it("prices keep sub-cent digits below one unit, up to four significant digits and eight decimals", () => {
    const cases = [["0.0043", "$0.0043"], ["0.00431299", "$0.004312"], ["0.000000123456", "$0.00000012"], ["0.5", "$0.50"], ["0.12345", "$0.1234"], ["63412.5789", "$63,412.57"], ["1", "$1.00"], ["0", "$0.00"]] as const;
    for (const [value, expected] of cases) expect(formatPrice(value, "USD", "en-US"), value).toBe(expected);
    expect(formatPrice("0.0043", "EUR", "de-DE")).toBe(`0,0043${NBSP}€`);
    expect(formatPrice("0.0043", "ZIG", "en-US")).toBe("Unavailable");
  });
});

describe("Session M (QA2-08): what depends only on the locale and the currency is worked out once", () => {
  // The same text as Intl writes it from scratch, for every locale, currency and sign, in any order of calls.
  const fresh = (value: string, locale: string, currency?: string) => {
    const negative = value.startsWith("-"), [integer, fraction] = value.replace(/^-/, "").split(".");
    const plain = (options: Intl.NumberFormatOptions = {}) => new Intl.NumberFormat(locale, options);
    const decimal = plain().formatToParts(1.1).find(p => p.type === "decimal")?.value ?? ".";
    const digits = Array.from({length: 10}, (_, n) => plain({useGrouping: false}).format(n));
    const number = plain({maximumFractionDigits: 0}).format(BigInt(integer!)) + (fraction ? decimal + fraction.replace(/\d/g, d => digits[Number(d)]!) : "");
    return plain({...(currency ? {style: "currency" as const, currency} : {}), minimumFractionDigits: 0, maximumFractionDigits: 0}).formatToParts(negative ? -1 : 1).map(p => p.type === "integer" ? number : p.value).join("");
  };
  it("formatExactNumber and currencyDigits give the same results, call after call", () => {
    const values = ["0", "-0.5", "12.34", "-1234567.891", "9000", "-42"], locales = ["en-US", "nl-BE", "de-DE", "ja-JP", "ar-EG", "en-IN"];
    for (let round = 0; round < 2; round++)
      for (const locale of round ? [...locales].reverse() : locales)
        for (const currency of [undefined, "USD", "EUR", "JPY", "KWD", "GBP"])
          for (const value of round ? [...values].reverse() : values)
            expect(formatExactNumber(value, locale, currency), `${locale} ${currency} ${value}`).toBe(fresh(value, locale, currency));
    for (const code of ["USD", "JPY", "KWD", "BHD", "CLF", "XAU", "ZIG", "usd", "US", "USDT"])
      for (let round = 0; round < 2; round++)
        expect(currencyDigits(code), code).toBe(/^[A-Z]{3}$/.test(code) && !code.startsWith("X") && Intl.supportedValuesOf("currency").includes(code) ? new Intl.NumberFormat("en-US", {style: "currency", currency: code}).resolvedOptions().maximumFractionDigits ?? 2 : null);
  });
});

// Session Y Part 9 (QA2-08's leftover): a date written many times is kept, never changed.
describe("repeated dates", () => {
  it("read the same each time, past the kept limit and across a locale change", () => {
    const options = { ...utc, month: "short", day: "numeric", year: "numeric" } as const;
    const days = Array.from({ length: 2600 }, (_, i) => new Date(at.getTime() + i * 86_400_000));
    const first = days.map(day => formatDate(day, options));
    expect(first).toEqual(days.map(day => day.toLocaleDateString("en-US", options)));
    expect(days.map(day => formatDate(day, options))).toEqual(first);
    setDisplayLocale("de-DE");
    expect(formatDate(at, utc)).toBe("1.10.2026");
    setDisplayLocale(DEFAULT_DISPLAY_LOCALE);
    expect(formatDate(at, utc)).toBe(at.toLocaleDateString("en-US", utc));
    expect(formatDate(days[0]!, options)).toBe(first[0]);
  });
});
