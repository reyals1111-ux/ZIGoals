import { describe, expect, it } from "vitest";
import { formNumberText, normalizeDecimalInput, readFormNumber } from "./decimal-input";

describe("normalizeDecimalInput: Health's unambiguous-comma rule, shared", () => {
  it("reads an unambiguous decimal comma and ignores surrounding whitespace", () => {
    expect(normalizeDecimalInput("1,5")).toBe("1.5");
    expect(normalizeDecimalInput("72,25")).toBe("72.25");
    expect(normalizeDecimalInput("0,125")).toBe("0.125");
    expect(normalizeDecimalInput("1200,50")).toBe("1200.50");
    expect(normalizeDecimalInput("0,00012345")).toBe("0.00012345");
    expect(normalizeDecimalInput(" 1000 ")).toBe("1000");
    expect(normalizeDecimalInput("\u00a01,5\t")).toBe("1.5");
  });
  it("refuses a comma that could be a thousands separator, with a reason", () => {
    expect(() => normalizeDecimalInput("1,234")).toThrow("“1,234” could mean 1234 or 1.234. Type it without a thousands separator.");
    expect(() => normalizeDecimalInput(" 12,500 ")).toThrow("could mean 12500 or 12.500");
  });
  it("leaves grouped, mixed and other text as typed, for the caller's pattern to refuse", () => {
    for (const value of ["1,234,567", "1.234,5", "1,", ",5", "a,5", "1.5", "1e3"]) expect(normalizeDecimalInput(value)).toBe(value);
  });
});

describe("readFormNumber", () => {
  it("reads plain and comma decimals within the range", () => {
    expect(readFormNumber("1,5", { max: 10 })).toBe(1.5);
    expect(readFormNumber(" 7 ", { min: 1, max: 365, whole: true })).toBe(7);
    expect(readFormNumber("0", { max: 10 })).toBe(0);
  });
  it("refuses empty, signs, exponents, grouping, decimals for whole fields and values outside the range", () => {
    const whole = { min: 1, max: 365, whole: true };
    for (const value of ["", "  ", "-1", "+1", "1e3", "1,234,567", "1.5", "0", "366"]) expect(() => readFormNumber(value, whole), value).toThrow("Enter a whole number from 1 to 365.");
    expect(() => readFormNumber("0", { max: 1_000_000_000, positive: true })).toThrow("Enter a number greater than 0 and at most 1,000,000,000.");
    expect(() => readFormNumber("1,234", { max: 10_000 })).toThrow("could mean 1234 or 1.234");
  });
});

describe("formNumberText", () => {
  it("never writes exponent notation or grouping into a field", () => {
    expect(formNumberText(1e-7)).toBe("0.0000001");
    expect(formNumberText(1_000_000)).toBe("1000000");
    expect(formNumberText(1.5)).toBe("1.5");
    expect(formNumberText(0)).toBe("0");
  });
});
