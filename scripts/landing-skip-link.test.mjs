import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Session AK F0 (ADR-034 E3, the "no test for the new pages' link" row): every landing page — the home page and MO4's
// Privacy and Terms — starts with a working skip link: the first thing in <body> (so the first Tab reaches it), pointing
// at the one <main id="main">, in base.css's style that keeps it off screen until it has focus and then shows it in
// full contrast. The browser specs (landing-v5-*, a11y) cover the home page's keyboard run.
const read = file => readFileSync(new URL(`../landing/${file}`, import.meta.url), "utf8");
const css = read("styles/base.css");

for (const page of ["index.html", "privacy.html", "terms.html"]) {
  test(`${page}: the skip link is the first element of the body and leads to the page's one main`, () => {
    const html = read(page);
    const body = html.slice(html.indexOf("<body"));
    const first = body.replace(/^<body[^>]*>\s*/, "").match(/^<([a-z]+)[^>]*>([^<]*)/);
    expect(first[0]).toBe('<a class="skip-link" href="#main">Skip to content');
    expect(html.match(/<main\b[^>]*>/g)).toHaveLength(1);
    expect(html).toMatch(/<main id="main"[\s>]/);
    expect(html.match(/\bid="main"/g)).toHaveLength(1);
    expect(html.match(/class="skip-link"/g)).toHaveLength(1);
    // The stylesheet that styles it is on the page.
    expect(html).toMatch(/<link rel="stylesheet" href="styles\/base\.css[?"]/);
  });
}

test("base.css hides the skip link off screen until focus, then shows it, dark on light", () => {
  const rule = css.match(/\.skip-link\{([^}]*)\}/)[1];
  expect(rule).toContain("position:fixed");
  expect(rule).toContain("transform:translateY(-200%)");
  expect(rule).toContain("background:#fff");
  expect(rule).toContain("color:#000");
  expect(rule).toMatch(/padding:12px 18px/); // at least 44 px tall with the 18 px text
  expect(css).toContain(".skip-link:focus{transform:none}");
  // Never removed from the keyboard order.
  expect(rule).not.toMatch(/display:none|visibility:hidden/);
});
