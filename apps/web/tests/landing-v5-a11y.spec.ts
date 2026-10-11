import { expect, test, type Page } from "@playwright/test";
import { startLandingServer, type LandingServer } from "./landing-server";

// Landing V5 (Session N): the heading outline, keyboard order and focus, what screen readers get from the equation and
// the fold stages, and the contrast of the new copy, also under prefers-contrast: more.

let server: LandingServer;
test.beforeAll(async () => { server = await startLandingServer(); });
test.afterAll(async () => { await server.close(); });

async function open(page: Page) {
  await page.goto(server.url);
  await page.waitForLoadState("load");
}

test("one h1, and every h3 follows an h2 in reading order", async ({ page }) => {
  await open(page);
  const outline = await page.evaluate(() => [...document.querySelectorAll("h1, h2, h3, h4")]
    .filter(heading => !heading.closest("[aria-hidden='true'], [hidden], dialog:not([open])"))
    .map(heading => ({ level: Number(heading.tagName[1]), text: (heading.textContent ?? "").replace(/\s+/g, " ").trim() })));
  expect(outline.filter(heading => heading.level === 1)).toHaveLength(1);
  expect(outline[0]!.level).toBe(1);
  let deepest = 1;
  for (const heading of outline) {
    expect(heading.level, `"${heading.text}" skips a level`).toBeLessThanOrEqual(deepest + 1);
    deepest = heading.level;
  }
  // The new sections are in the outline, in page order.
  const h2 = outline.filter(heading => heading.level === 2).map(heading => heading.text);
  const at = (text: string) => h2.findIndex(item => item.startsWith(text));
  expect(at("Your plans")).toBeGreaterThan(-1);
  expect(at("Install it")).toBeGreaterThan(at("Your plans"));
  expect(at("Planned,")).toBeGreaterThan(at("Install it"));
});

test("Tab reaches the invite first after the header, and every focused control shows a visible focus ring", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Keyboard order runs on the desktop layout; phones open the menu instead");
  await open(page);
  const seen: { text: string; href: string | null; ring: boolean; onScreen: boolean }[] = [];
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    // V4's `scroll-behavior: smooth` brings a focused control into view over a few frames: wait until scrolling stops.
    await page.evaluate(() => new Promise<void>(resolve => {
      let last = -1, still = 0;
      const tick = () => { if (scrollY === last) { if (++still >= 5) return resolve(); } else { still = 0; last = scrollY; } requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }));
    seen.push(await page.evaluate(() => {
      const element = document.activeElement as HTMLElement;
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      const ring = (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
      return { text: (element.textContent ?? "").replace(/\s+/g, " ").trim(), href: element.getAttribute("href"), ring, onScreen: box.bottom > 0 && box.top < innerHeight };
    }));
  }
  for (const stop of seen) {
    expect(stop.ring, `focus ring on "${stop.text}"`).toBe(true);
    expect(stop.onScreen, `"${stop.text}" is scrolled into view when focused`).toBe(true);
  }
  const hrefs = seen.map(stop => stop.href);
  const launch = hrefs.indexOf("https://alpha.zigoals.app/app"), invite = hrefs.indexOf("mailto:contact@zigoals.app?subject=Friends%20Alpha%20invite");
  expect(launch, "the header's Launch Alpha comes first").toBeGreaterThan(-1);
  expect(invite, "then the hero's invite").toBeGreaterThan(launch);
  expect(seen[invite]!.text).toBe("Request an invite to the friends Alpha");
  expect(seen[invite + 1]!.text).toContain("Try the public Alpha");
});

test("screen readers get the equation as text in order, and the fold stages stay out of the way", async ({ page }) => {
  await open(page);
  const tree = await page.locator("#equation").ariaSnapshot();
  const order = ["The ZIGoals equation: Goals, Habits & Health = Wealth", "Goals, shown with an origami lotus.", "Habits, shown with an origami butterfly.", "And Health, shown with an origami heart.", "Equals Wealth, shown with an origami bull."];
  let from = 0;
  for (const line of order) {
    const at = tree.indexOf(line, from);
    expect(at, `"${line}" in reading order`).toBeGreaterThan(-1);
    from = at;
  }
  // The six fold interludes are decoration: hidden from assistive technology, with no focusable part.
  const folds = await page.evaluate(() => [...document.querySelectorAll("[data-fold]")].map(fold => ({
    hidden: fold.getAttribute("aria-hidden"),
    focusable: fold.querySelectorAll("a, button, input, select, textarea, [tabindex]").length,
  })));
  expect(folds).toHaveLength(6);
  for (const fold of folds) expect(fold).toEqual({ hidden: "true", focusable: 0 });
});

/** Contrast of each element's text colour against the page background (#030916 sections), WCAG relative luminance. */
async function contrasts(page: Page, selectors: string[]) {
  return page.evaluate(selectors => {
    const channel = (value: number) => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const luminance = (rgb: number[]) => 0.2126 * channel(rgb[0]!) + 0.7152 * channel(rgb[1]!) + 0.0722 * channel(rgb[2]!);
    const parse = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const background = luminance([3, 9, 22]);
    return Object.fromEntries(selectors.map(selector => {
      const element = document.querySelector(selector);
      if (!element) return [selector, -1];
      const text = luminance(parse(getComputedStyle(element).color));
      const [light, dark] = text > background ? [text, background] : [background, text];
      return [selector, Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100];
    }));
  }, selectors);
}

const NEW_COPY = [".invite-note", ".privacy-rows .availability.upcoming", ".install-device", ".install-steps p", ".install-steps h3", ".coming-legal", ".availability.planned", ".coming-list p", ".coming-list h3"];

for (const contrast of ["no-preference", "more"] as const) {
  test(`the new copy is at least 4.5:1 against the navy${contrast === "more" ? " under prefers-contrast: more" : ""}`, async ({ page }) => {
    await page.emulateMedia({ contrast, reducedMotion: "reduce" });
    await open(page);
    const ratios = await contrasts(page, NEW_COPY);
    for (const selector of NEW_COPY) expect(ratios[selector], selector).toBeGreaterThanOrEqual(4.5);
  });
}
