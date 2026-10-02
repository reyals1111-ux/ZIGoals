import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { landingRoot, startLandingServer, type LandingServer } from "./landing-server";

// Landing V5 fold interludes (Session N): between chapters, the paper of the brand film refolds into the next figure
// as you scroll (Z → swan → lotus → butterfly → heart → bull → Z). These checks cover the pure maths, the frame
// files, the moving stage and every static state (reduced motion, ?motion=off, Save-Data, short screens, no script).

type Pose = { fold: number; figure: { opacity: number; scale: number; y: number; rotate: number }; slogan: { opacity: number; y: number } };
type FoldState = {
  PACE: Record<string, number[]>;
  PHONE: Record<string, number[]>;
  WIDE: number[];
  progress: (top: number, runway: number, viewport: number) => number;
  pose: (p: number) => Pose;
  filmPosition: (f: number, pace: number[]) => number;
  frames: (position: number, at: number[]) => { a: number; b: number; mix: number };
};
const loadState = () => import(pathToFileURL(resolve(landingRoot, "scripts/fold-state.mjs")).href) as Promise<FoldState>;
const NAMES = ["swan", "lotus", "butterfly", "heart", "bull", "z"];
const SLOGANS: Record<string, string> = { swan: "One life.", lotus: "Shape", butterfly: "& Fold", heart: "Your Own", bull: "Future" };

/** Width and height from a WebP file's header (lossy, lossless or extended). */
function webpSize(relative: string) {
  const bytes = readFileSync(resolve(landingRoot, relative));
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") throw new Error(`${relative} is not a WebP file`);
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8 ") return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") { const bits = bytes.readUInt32LE(21); return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
  if (chunk === "VP8X") return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  throw new Error(`${relative} has an unknown WebP chunk ${chunk}`);
}

test.describe("the fold maths and frame files", () => {
  test.beforeEach(({}, info) => { test.skip(info.project.name !== "desktop", "Pure checks run once, in the desktop project"); });

  test("progress and pose stay in range, only ever move forward and settle exactly", async () => {
    const { progress, pose } = await loadState();
    expect(progress(720, 1224, 720)).toBe(0);
    expect(progress(720 - 1224, 1224, 720)).toBe(1);
    expect(progress(5_000, 1224, 720)).toBe(0);
    expect(progress(-5_000, 1224, 720)).toBe(1);
    expect(progress(0, 0, 720)).toBe(1);
    expect(progress(0, Number.NaN, 720)).toBe(1);
    let last = pose(0);
    expect([last.fold, last.figure.opacity, last.slogan.opacity]).toEqual([0, 0, 0]);
    for (let i = 1; i <= 1_000; i++) {
      const next = pose(i / 1_000);
      for (const value of [next.fold, next.figure.opacity, next.slogan.opacity]) expect(value >= 0 && value <= 1).toBe(true);
      expect(next.fold).toBeGreaterThanOrEqual(last.fold);
      expect(next.figure.opacity).toBeGreaterThanOrEqual(last.figure.opacity);
      expect(next.slogan.opacity).toBeGreaterThanOrEqual(last.slogan.opacity);
      last = next;
    }
    // Settled, and held still, before the stage leaves the screen (the 170svh runway pins it from p ≈ 0.59 to 1).
    for (const p of [0.9, 0.95, 1]) {
      const settled = pose(p);
      expect([settled.fold, settled.figure.opacity, settled.figure.scale, settled.slogan.opacity]).toEqual([1, 1, 1, 1]);
      expect([Math.abs(settled.figure.y), Math.abs(settled.figure.rotate), Math.abs(settled.slogan.y)]).toEqual([0, 0, 0]);
    }
    // Still invisible while the stage is only just entering from below.
    expect(pose(0.2).figure.opacity).toBe(0);
  });

  test("the paced film position covers every frame in order and the paper moves early", async () => {
    const { PACE, filmPosition } = await loadState();
    expect(Object.keys(PACE).sort()).toEqual([...NAMES].sort());
    for (const name of NAMES) {
      const pace = PACE[name]!;
      expect(pace).toHaveLength(19);
      for (const change of pace) expect(Number.isInteger(change) && change >= 0).toBe(true);
      expect(filmPosition(0, pace)).toBe(0);
      expect(filmPosition(1, pace)).toBe(19);
      expect(filmPosition(-1, pace)).toBe(0);
      expect(filmPosition(2, pace)).toBe(19);
      let last = 0;
      for (let i = 1; i <= 1_000; i++) {
        const next = filmPosition(i / 1_000, pace);
        expect(next).toBeGreaterThanOrEqual(last);
        last = next;
      }
      // The frames where the film holds still take only a little of the scroll: by a fifth of the way the paper moves.
      const firstMoving = pace.findIndex(change => change > 1);
      expect(filmPosition(0.2, pace), name).toBeGreaterThan(firstMoving);
    }
  });

  test("frame blending picks neighbouring loaded frames and starts and ends on whole frames", async () => {
    const { PHONE, WIDE, frames } = await loadState();
    expect(WIDE).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(Object.keys(PHONE).sort()).toEqual([...NAMES].sort());
    for (const at of [WIDE, ...NAMES.map(name => PHONE[name]!)]) {
      expect(at[0]).toBe(0);
      expect(at.at(-1)).toBe(19);
      for (let i = 1; i < at.length; i++) expect(at[i]!).toBeGreaterThan(at[i - 1]!);
      expect(frames(0, at)).toEqual({ a: 0, b: 0, mix: 0 });
      expect(frames(19, at)).toEqual({ a: at.length - 1, b: at.length - 1, mix: 0 });
      for (let i = 0; i <= 1_900; i++) {
        const position = i / 100, { a, b, mix } = frames(position, at);
        expect(b === a || b === a + 1).toBe(true);
        expect(mix >= 0 && mix <= 1).toBe(true);
        expect(position).toBeGreaterThanOrEqual(at[a]!);
        expect(position).toBeLessThanOrEqual(at[b]!);
      }
      // On a loaded frame the picture is that frame alone, not a blend.
      for (let i = 1; i < at.length - 1; i++) expect(frames(at[i]!, at).mix === 0 || frames(at[i]!, at).mix === 1).toBe(true);
    }
    for (const name of NAMES) expect(PHONE[name], name).toHaveLength(12);
  });

  test("every frame a stage can ask for exists at the size of its still, and the sets hold nothing else", async () => {
    const { PHONE } = await loadState();
    const html = readFileSync(resolve(landingRoot, "index.html"), "utf8");
    expect([...html.matchAll(/data-fold="([a-z]+)"/g)].map(match => match[1])).toEqual(NAMES);
    for (const name of NAMES) {
      const dir = `assets/origami-scroll/${name}`;
      expect(webpSize(`${dir}.webp`)).toEqual({ width: 1024, height: 648 });
      const wide = Array.from({ length: 20 }, (_, i) => `${String(i).padStart(2, "0")}.webp`);
      expect(readdirSync(resolve(landingRoot, dir)).sort()).toEqual([...wide, "phone"].sort());
      for (const file of wide) expect(webpSize(`${dir}/${file}`), `${dir}/${file}`).toEqual({ width: 1024, height: 648 });
      const phone = PHONE[name]!.map(i => `${String(i).padStart(2, "0")}.webp`);
      expect(readdirSync(resolve(landingRoot, `${dir}/phone`)).sort()).toEqual(phone);
      // Same shape as the still (1024 × 648), so swapping the still for the drawn frame never jumps.
      for (const file of phone) expect(webpSize(`${dir}/phone/${file}`), `${dir}/phone/${file}`).toEqual({ width: 768, height: 486 });
    }
  });
});

let server: LandingServer;
test.beforeAll(async () => { server = await startLandingServer(); });
test.afterAll(async () => { await server.close(); });

const frameRequests = () => [...server.files].filter(file => /^assets\/origami-scroll\/[a-z]+\//.test(file));

/** Instantly scrolls so the named stage is at progress p of its runway. Returns the scroll position asked for. */
async function scrollStage(page: Page, name: string, p: number): Promise<number> {
  return page.evaluate(([fold, at]) => {
    const root = document.documentElement, el = document.querySelector<HTMLElement>(`[data-fold="${fold}"]`)!;
    const top = el.getBoundingClientRect().top + scrollY, y = Math.round(top - innerHeight + Number(at) * el.offsetHeight);
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    root.style.scrollBehavior = "";
    return y;
  }, [name, String(p)] as const);
}

const stageState = (page: Page, name: string) => page.evaluate(fold => {
  const el = document.querySelector<HTMLElement>(`[data-fold="${fold}"]`)!;
  const figure = el.querySelector<HTMLElement>(".fold-figure")!, slogan = el.querySelector<HTMLElement>(".fold-slogan");
  const canvas = el.querySelector("canvas")!, still = el.querySelector<HTMLImageElement>(".fold-still")!;
  return {
    ready: document.documentElement.classList.contains("fold-ready"),
    position: getComputedStyle(el.querySelector(".fold-stage")!).position,
    stageTop: Math.round(el.querySelector(".fold-stage")!.getBoundingClientRect().top),
    runway: el.offsetHeight / innerHeight,
    extraRunway: el.offsetHeight - el.querySelector<HTMLElement>(".fold-stage")!.offsetHeight,
    figureOpacity: Number(getComputedStyle(figure).opacity),
    sloganOpacity: slogan ? Number(getComputedStyle(slogan).opacity) : null,
    sloganText: slogan?.textContent ?? null,
    drawn: figure.classList.contains("is-drawn"),
    canvasWidth: canvas.width,
    stillVisible: getComputedStyle(still).visibility === "visible" && still.getBoundingClientRect().height > 0 && still.complete && still.naturalWidth > 0,
    progress: el.dataset.progress ?? null,
  };
}, name);

test("a stage pins, folds and settles as you scroll, from the right frame set, and never moves the page", async ({ page }, info) => {
  const phone = info.project.name === "mobile";
  await page.goto(server.url);
  await page.waitForLoadState("load");
  await page.waitForTimeout(500);
  expect(frameRequests(), "frames requested at the top of the page").toEqual([]);
  const scrollsTo = async (p: number) => {
    const y = await scrollStage(page, "lotus", p);
    await page.waitForTimeout(700);
    // The scripts only follow the page: it stays exactly where the visitor put it.
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(y);
  };
  await scrollsTo(0.2);
  let state = await stageState(page, "lotus");
  expect(state.ready).toBe(true);
  expect(state.position).toBe("sticky");
  expect(state.runway).toBeCloseTo(1.7, 1);
  expect(state.figureOpacity).toBe(0);
  expect(state.sloganOpacity).toBe(0);
  await scrollsTo(0.75);
  await expect.poll(async () => (await stageState(page, "lotus")).drawn).toBe(true);
  state = await stageState(page, "lotus");
  expect(state.stageTop, "pinned to the top of the screen").toBe(0);
  expect(state.figureOpacity).toBe(1);
  expect(state.canvasWidth).toBe(phone ? 768 : 1024);
  expect(Number(state.progress)).toBeGreaterThan(0.6);
  expect(Number(state.progress)).toBeLessThan(1);
  await scrollsTo(1);
  state = await stageState(page, "lotus");
  expect(state.progress).toBe("1.000");
  expect(state.sloganOpacity).toBe(1);
  expect(state.sloganText).toBe("Shape");
  const requested = frameRequests();
  expect(requested.length).toBeGreaterThan(0);
  for (const file of requested) expect(file, "phones load the phone set, wide screens the full set").toMatch(phone ? /^assets\/origami-scroll\/[a-z]+\/phone\/\d\d\.webp$/ : /^assets\/origami-scroll\/[a-z]+\/\d\d\.webp$/);
  expect(requested.filter(file => file.startsWith("assets/origami-scroll/lotus/"))).toHaveLength(phone ? 12 : 20);
});

test("a stage gives its frames back once it is far away", async ({ page }) => {
  await page.goto(server.url);
  await page.waitForLoadState("load");
  await scrollStage(page, "heart", 0.8);
  await expect.poll(async () => (await stageState(page, "heart")).drawn).toBe(true);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 0); });
  await expect.poll(async () => (await stageState(page, "heart")).canvasWidth).toBe(0);
  const state = await stageState(page, "heart");
  expect(state.drawn).toBe(false);
  expect(state.stillVisible).toBe(true);
});

/** The static final state: every stage shows its settled figure and slogan in place, nothing pinned, no frames. */
async function expectStatic(page: Page, scripted = true) {
  for (const name of NAMES) {
    const state = await stageState(page, name);
    expect(state.ready, name).toBe(false);
    expect(state.position, name).not.toBe("sticky");
    expect(state.extraRunway, `${name}: no scroll runway beyond the stage itself`).toBe(0);
    expect(state.figureOpacity, name).toBe(1);
    expect(state.sloganOpacity, name).toBe(SLOGANS[name] ? 1 : null);
    expect(state.sloganText, name).toBe(SLOGANS[name] ?? null);
    expect(state.drawn, name).toBe(false);
    if (scripted) expect(state.progress, name).toBeNull();
  }
  // A full scroll-through brings in the six settled stills and never a frame.
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = await page.evaluate(() => innerHeight);
  for (let y = 0; y <= height; y += step) {
    await page.evaluate(top => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, top); }, y);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(500);
  for (const name of NAMES) {
    await page.locator(`[data-fold="${name}"] .fold-still`).scrollIntoViewIfNeeded();
    await expect.poll(async () => (await stageState(page, name)).stillVisible, name).toBe(true);
  }
  expect(frameRequests(), "frames requested in a static state").toEqual([]);
}

test("reduced motion shows every settled figure and slogan in place, with nothing pinned or drawn", async ({ page }) => {
  server.files.clear();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(server.url);
  await page.waitForLoadState("load");
  await expectStatic(page);
});

test("?motion=off and Save-Data keep the stages static too", async ({ page }) => {
  server.files.clear();
  await page.goto(`${server.url}/?motion=off`);
  await page.waitForLoadState("load");
  await expectStatic(page);
  server.files.clear();
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } }));
  await page.goto(server.url);
  await page.waitForLoadState("load");
  await expectStatic(page);
});

test("a short screen (landscape phone, 200% zoom) keeps the stages static", async ({ page }, info) => {
  server.files.clear();
  await page.setViewportSize(info.project.name === "mobile" ? { width: 844, height: 390 } : { width: 1280, height: 540 });
  await page.goto(server.url);
  await page.waitForLoadState("load");
  await expectStatic(page);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("every settled figure and slogan is there, with nothing pinned", async ({ page }) => {
    server.files.clear();
    await page.goto(server.url);
    await page.waitForLoadState("load");
    await expectStatic(page, false);
  });
});

test("forced colours keep the slogans readable and drop the decoration", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto(server.url);
  await page.waitForLoadState("load");
  const styles = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".fold")].map(el => ({
    space: getComputedStyle(el.querySelector(".fold-space")!).display,
    canvas: getComputedStyle(el.querySelector("canvas")!).display,
    slogan: el.querySelector(".fold-slogan") ? getComputedStyle(el.querySelector(".fold-slogan")!).color : null,
  })));
  for (const style of styles) {
    expect(style.space).toBe("none");
    expect(style.canvas).toBe("none");
    if (style.slogan !== null) expect(style.slogan).not.toBe("rgba(0, 0, 0, 0)");
  }
});
