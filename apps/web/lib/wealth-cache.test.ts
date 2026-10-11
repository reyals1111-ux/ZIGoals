import { describe, expect, it } from "vitest";
import { buildShowcase } from "./showcase-data";
import { PLATFORM_KEY, platformSchema, type Platform } from "./positions";
import { positionTrackedAt, wealthHistory, wealthOverview } from "./wealth";

// Session G, Part 2: Wealth summaries are reused for the same records, and give exactly what a fresh computation gives.
const platform = (): Platform => platformSchema.parse(JSON.parse(buildShowcase("2026-10-01").records[PLATFORM_KEY]!));
const now = Date.parse("2026-10-01T12:00:00.000Z");

describe("wealth summaries are cached per record set", () => {
  it("reuse the result for the same records and equal a fresh computation", () => {
    const s = platform(), quotes: [] = [];
    const first = wealthOverview(s, now, quotes);
    expect(wealthOverview(s, now, quotes)).toBe(first);
    expect(first).toEqual(wealthOverview(structuredClone(s), now, quotes));
    expect(wealthHistory(s)).toBe(wealthHistory(s));
    expect(wealthHistory(s)).toEqual(wealthHistory(structuredClone(s)));
    expect(wealthHistory(s).length).toBeGreaterThan(0);
  });
  it("recompute when an array they read is replaced, even on the same object", () => {
    const s = platform(), quotes: [] = [];
    const before = wealthOverview(s, now, quotes);
    s.positions = s.positions.slice(1);
    const after = wealthOverview(s, now, quotes);
    expect(after).not.toBe(before);
    expect(after.rows).toHaveLength(before.rows.length - 1);
    const history = wealthHistory(s);
    s.valuationSnapshots = [];
    expect(wealthHistory(s)).not.toBe(history);
    expect(wealthHistory(s)).toEqual([]);
  });
  it("read a position's lifecycle from its own events", () => {
    const s = platform(), position = s.positions[0]!;
    const added = s.assetEvents.filter((event) => event.positionId === position.id && event.kind === "added").map((event) => Date.parse(event.at));
    if (added.length) expect(positionTrackedAt(s, position, new Date(Math.min(...added) - 1).toISOString())).toBe(false);
    expect(positionTrackedAt(s, position, "2026-10-01T12:00:00.000Z")).toBe(!position.archivedAt);
  });
});
