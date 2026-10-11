import { describe, expect, it } from "vitest";
import { idleStrategy, documentedProvenance } from "./index";
describe("evidence-backed strategy transparency", () => {
  it("never fills external relationships for idle", () => {
    const idle = idleStrategy("azig");
    expect(documentedProvenance(idle)).toEqual([]);
    expect(idle.verification).toBe("EXPERIMENTAL");
    expect(idle.baseAsset).toBe("azig");
    expect(idle.audit.status).toBe("NOT_AUDITED");
  });
  it("omits unknown and unsafe relationship references", () => {
    const idle = idleStrategy("azig");
    const base = {
      role: "CURATOR" as const,
      providerId: "example",
      name: "Example",
      status: "DOCUMENTED" as const,
      sourceUrl: "https://example.org/product",
      verifiedAt: "2026-09-13",
    };
    expect(documentedProvenance({ ...idle, provenance: [base] })).toEqual([
      base,
    ]);
    expect(
      documentedProvenance({
        ...idle,
        provenance: [
          { ...base, status: "UNCONFIRMED" },
          { ...base, sourceUrl: "javascript:alert(1)" },
          { ...base, verifiedAt: "2026-02-31" },
        ],
      }),
    ).toEqual([]);
  });
});
