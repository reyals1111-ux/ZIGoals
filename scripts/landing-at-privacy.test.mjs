import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Session AT (ADR-043 D11, trust pass 2(e)): the privacy page names every place the app sends something, checked against
// the app's egress (apps/web/lib/egress-policy.json, its server-only routes and Send feedback): the ZIGChain read relay,
// the exchange relay, recipe import by address, and what Send feedback adds.
const page = readFileSync(new URL("../landing/privacy.html", import.meta.url), "utf8");
const text = page.replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "’").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const egress = JSON.parse(readFileSync(new URL("../apps/web/lib/egress-policy.json", import.meta.url), "utf8"));

test("D11: every server-side route that carries something of the person's is named on the privacy page", () => {
  expect(text).toContain("A ZIGChain address you track is read through ZIGoals' read-only relay");
  expect(text).toContain("Exchanges you connect (Kraken, Coinbase or Binance, read-only):");
  expect(text).toContain("the relay sees the signed request (your key’s public id, never its secret)");
  expect(text).toContain("A recipe imported from a web address:");
  expect(text).toContain("asks Cloudflare’s public DNS about its host");
  // The relays the page names are the ones the app has.
  expect(egress.serverOnly.exchangeRelay).toMatch(/api\.kraken\.com.*api\.coinbase\.com.*api\.binance\.com/);
  expect(egress.serverOnly.recipeResolver).toMatch(/cloudflare-dns\.com/);
  expect(egress.serverOnly.chainRelay).toMatch(/\/api\/positions/);
});
test("D11: Send feedback is described as the app builds it: the person's mail app, the version, details only if ticked", () => {
  expect(text).toContain("Feedback you send is an email from your own mail app to ZIGoals: what you type, the app’s version and, only if you tick the box, device details");
  expect(text).not.toContain("with only what you type");
  const feedback = readFileSync(new URL("../apps/web/components/help/send-feedback.tsx", import.meta.url), "utf8");
  expect(feedback).toContain("Nothing is sent, stored or requested here.");
});
