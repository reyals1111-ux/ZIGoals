import { readFileSync } from "node:fs";
import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import { expect, test } from "vitest";
import nextConfig from "../next.config";

// Session U Part 6 (FIX_PLAN D1, D2): static security headers. Additive checks in their own file; lib/public-safety.test.ts
// is unchanged.
const staticHeaders = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
function staticRule(pattern: string): string[] {
  const blocks = staticHeaders.split(/\n\s*\n/).map(block => block.split("\n").filter(line => line.trim() && !line.trim().startsWith("#")));
  const block = blocks.find(lines => lines[0] === pattern);
  expect(block, pattern).toBeDefined();
  return block!.slice(1).map(line => line.trim());
}

test("D1: every app response and every static file is sent with Cross-Origin-Opener-Policy: same-origin", async () => {
  const all = (await nextConfig.headers!()).find(rule => rule.source === "/(.*)");
  expect(all?.headers).toContainEqual({ key: "Cross-Origin-Opener-Policy", value: "same-origin" });
  expect(staticRule("/*")).toContain("Cross-Origin-Opener-Policy: same-origin");
});

const SVG_POLICY = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";
test("D2: SVG files get a policy that runs no script and loads nothing from elsewhere, the same from Next and Cloudflare", async () => {
  expect(staticRule("/*.svg")).toEqual([`Content-Security-Policy: ${SVG_POLICY}`]);
  expect(staticRule("/_next/static/*")).toEqual(["Cache-Control: public, max-age=31536000, immutable"]);
  const svg = (await nextConfig.headers!()).filter(rule => rule.headers.some(h => h.key === "Content-Security-Policy"));
  expect(svg).toEqual([{ source: "/:file(.*\\.svg)", headers: [{ key: "Content-Security-Policy", value: SVG_POLICY }] }]);
  // Next's own matcher: whole SVG paths only, and every one of them still gets the shared headers (COOP among them).
  const answer = async (path: string) => (await unstable_getResponseFromNextConfig({ url: `https://alpha.zigoals.app${path}`, nextConfig })).headers;
  for (const path of ["/icon.svg", "/social-card.svg", "/_next/static/media/a.svg"]) {
    const headers = await answer(path);
    expect(headers.get("content-security-policy"), path).toBe(SVG_POLICY);
    expect(headers.get("cross-origin-opener-policy"), path).toBe("same-origin");
  }
  for (const path of ["/icon.svg/app", "/iconXsvg", "/app", "/icon.svgz", "/app/health"]) expect((await answer(path)).get("content-security-policy"), path).toBeNull();
});
