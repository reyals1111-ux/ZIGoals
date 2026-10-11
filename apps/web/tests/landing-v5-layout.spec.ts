import { expect, test, type Page } from "@playwright/test";
import { startLandingServer, type LandingServer } from "./landing-server";

// Landing V5 (Session N): the page fits every width from 320 to 1920 px, its text is readable (labels at least 14 px,
// body copy at least 15 px) and its touch targets are at least 44 px (owner decision N9), and nothing that pins is
// inside a box that would stop it from pinning.

let server: LandingServer;
test.beforeAll(async () => { server = await startLandingServer(); });
test.afterAll(async () => { await server.close(); });

const WIDTHS = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920];

async function open(page: Page, width: number, reducedMotion: "reduce" | "no-preference") {
  await page.emulateMedia({ reducedMotion });
  await page.setViewportSize({ width, height: width < 700 ? 800 : 900 });
  await page.goto(server.url);
  await page.waitForLoadState("load");
}

/** Scrolls through the whole page and returns the widest horizontal overflow seen, in px (0 means none). */
async function widestOverflow(page: Page) {
  return page.evaluate(async () => {
    const root = document.documentElement;
    root.style.scrollBehavior = "auto";
    let worst = 0;
    for (let y = 0; y <= root.scrollHeight; y += Math.round(innerHeight * 0.8)) {
      scrollTo(0, y);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      worst = Math.max(worst, root.scrollWidth - root.clientWidth, document.body.scrollWidth - root.clientWidth);
    }
    scrollTo(0, 0);
    return worst;
  });
}

for (const width of WIDTHS) {
  test(`no horizontal overflow at ${width} px, moving and static`, async ({ page }, info) => {
    test.skip(info.project.name !== (width < 700 ? "mobile" : "desktop"), `${width} px runs in the ${width < 700 ? "mobile" : "desktop"} project`);
    for (const motion of ["no-preference", "reduce"] as const) {
      await open(page, width, motion);
      expect(await widestOverflow(page), `${motion} at ${width} px`).toBe(0);
    }
  });
}

/** Visible text smaller than its minimum, and visible targets smaller than 44 px, at one width. */
async function smallParts(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && Number(style.opacity) > 0;
    };
    const hidden = (element: Element) => element.closest(".sr-only, [hidden], dialog:not([open]), template, noscript, svg");
    const name = (element: Element) => `${element.tagName.toLowerCase()}${element.className && typeof element.className === "string" ? "." + element.className.trim().split(/\s+/).join(".") : ""} "${(element.textContent ?? "").trim().slice(0, 40)}"`;
    const text: string[] = [], targets: string[] = [];
    for (const element of document.querySelectorAll("body *")) {
      if (hidden(element) || !visible(element)) continue;
      const own = [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent!.trim());
      if (own) {
        const size = parseFloat(getComputedStyle(element).fontSize);
        // Body copy: paragraphs, list items and FAQ answers. Everything else with its own text is a label.
        const body = element.matches("p, li, dd, details > div p") && !element.matches(".eyebrow, .availability, .install-device, figcaption, .quiet-note");
        if (size < (body ? 15 : 14)) text.push(`${name(element)} ${size}px`);
      }
      if (element.matches("a[href], button, summary, select, input, [role=button], [tabindex]:not([tabindex='-1'])")) {
        // A link inside a sentence is exempt, as in WCAG 2.5.8; the address links next to the invite carry their own padding.
        const inline = getComputedStyle(element).display === "inline" && element.parentElement?.matches("p, li, dd, span") && (element.parentElement.textContent ?? "").trim() !== (element.textContent ?? "").trim();
        const box = element.getBoundingClientRect();
        if (!inline && (box.height < 44 || box.width < 44)) targets.push(`${name(element)} ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
    }
    return { text, targets };
  });
}

for (const width of [320, 390, 1024, 1440]) {
  test(`text is at least 14 px (15 px for body copy) and targets at least 44 px at ${width} px`, async ({ page }, info) => {
    test.skip(info.project.name !== (width < 700 ? "mobile" : "desktop"), `${width} px runs in the ${width < 700 ? "mobile" : "desktop"} project`);
    // Static state: every section is laid out at once, nothing waits behind a reveal.
    await open(page, width, "reduce");
    const { text, targets } = await smallParts(page);
    expect(text, "text below its minimum size").toEqual([]);
    expect(targets, "targets below 44 px").toEqual([]);
  });
}

test("nothing that pins sits inside a box that clips or scrolls", async ({ page }) => {
  await page.goto(server.url);
  await page.waitForLoadState("load");
  const trapped = await page.evaluate(() => {
    const out: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>("body *")) {
      if (getComputedStyle(element).position !== "sticky") continue;
      for (let up = element.parentElement; up && up !== document.body; up = up.parentElement) {
        const style = getComputedStyle(up);
        if ([style.overflowX, style.overflowY].some(value => value === "hidden" || value === "auto" || value === "scroll"))
          out.push(`${element.className} inside ${up.tagName.toLowerCase()}.${up.className} (${style.overflowX}/${style.overflowY})`);
      }
    }
    return out;
  });
  const sticky = await page.evaluate(() => [...document.querySelectorAll("body *")].filter(element => getComputedStyle(element).position === "sticky").length);
  expect(sticky, "the equation stage and six fold stages pin").toBeGreaterThanOrEqual(7);
  expect(trapped).toEqual([]);
});
