import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Session AL (P-MO-84, MO-046): the landing privacy page says "no trackers" and also names Cloudflare's network error
// reports (NEL), as docs/PRIVACY.md does, so the claim is not read as "nothing at all is reported".
const text = readFileSync(new URL("../landing/privacy.html", import.meta.url), "utf8").replace(/<[^>]+>/g, " ").replace(/&rsquo;/g, "’").replace(/\s+/g, " ");

test("P-MO-84: the privacy page names Cloudflare's network error reports next to the no-trackers line", () => {
  expect(text).toContain("no ads, no trackers and no app analytics");
  expect(text).toContain("your browser may also send Cloudflare a short network error report (NEL");
  expect(text).toContain("not ZIGoals app analytics");
});
