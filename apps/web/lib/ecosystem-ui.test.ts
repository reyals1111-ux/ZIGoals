import { expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExplorerLinks } from "../components/explorer-links";
import { StrategyTransparency } from "../components/strategy-transparency";
import { idleStrategy } from "@zigoals/strategy-types";

test("transaction verification links have trusted origins and cannot redirect", () => {
  const valid = renderToStaticMarkup(
    createElement(ExplorerLinks, {
      chainId: "zig-test-2",
      kind: "transaction",
      identifier: "A".repeat(64),
    }),
  );
  expect(valid).toContain("https://testnet.zigscan.org/tx/");
  expect(valid).toContain('rel="noopener noreferrer"');
  expect(valid).not.toContain("Verify with Range");
  const wrong = renderToStaticMarkup(
    createElement(ExplorerLinks, {
      chainId: "zigchain-1",
      kind: "transaction",
      identifier: "A".repeat(64),
    }),
  );
  expect(wrong).not.toContain("href=");
  const injected = renderToStaticMarkup(
    createElement(ExplorerLinks, {
      chainId: "zig-test-2",
      kind: "transaction",
      identifier: "javascript:alert(1)",
    }),
  );
  expect(injected).not.toContain("href=");
});

test("transparency escapes provider text and omits unconfirmed attribution", () => {
  const strategy = {
    ...idleStrategy("azig"),
    provenance: [
      {
        role: "CURATOR" as const,
        providerId: "x",
        name: "<img src=x onerror=alert(1)>",
        status: "DOCUMENTED" as const,
        sourceUrl: "https://example.org/product",
        verifiedAt: "2026-09-13",
      },
      {
        role: "CUSTODIAN" as const,
        providerId: "y",
        name: "Invented relationship",
        status: "UNCONFIRMED" as const,
      },
    ],
  };
  const html = renderToStaticMarkup(
    createElement(StrategyTransparency, { strategy }),
  );
  expect(html).toContain("&lt;img");
  expect(html).not.toContain("<img");
  expect(html).not.toContain("Invented relationship");
  expect(html).toContain("Not audited");
});
