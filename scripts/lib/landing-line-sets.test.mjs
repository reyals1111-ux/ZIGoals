import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { LANDING_LINE_SETS } from "./hosted-alpha-stages.mjs";

// Session AJ (item 3): stage 7 no longer accepts the pre-#50 "Financial execution disabled" lines, and the landing in this
// repository shows one of the sets it accepts, in full.
test("stage 7's line sets: never the pre-#50 set; the repository's landing shows one set in full", () => {
  expect(LANDING_LINE_SETS.length).toBeGreaterThanOrEqual(1);
  for (const set of LANDING_LINE_SETS) for (const line of Object.values(set)) expect(line).not.toMatch(/Financial execution disabled|Financial signing and broadcasting are disabled/);
  const html = readFileSync(new URL("../../landing/index.html", import.meta.url), "utf8").replace(/\s+/g, " ");
  expect(LANDING_LINE_SETS.filter(set => Object.values(set).every(line => html.includes(line.replace("Public Alpha / ", "Public Alpha"))) || Object.values(set).slice(1).every(line => html.includes(line)))).toHaveLength(1);
});
