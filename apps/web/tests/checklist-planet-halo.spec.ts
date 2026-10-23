import {expect, test, type Page} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist} from '../lib/checklist/schema';
import {UI_PREFS_KEY} from '../lib/ab-design-keys';
import {PLANET_DESIGNS} from '../lib/path/planet-designs';
import {seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AG Polish 3 (ADR-032 L12; owner Part 2, reference 02 pointer 9 and reference 05): only the planet itself shows —
 * sphere, rings, moons, a soft round glow and mist — never a square, a box or a straight edge behind it. A lit planet is
 * photographed with everything else on the path hidden (the line, the tabs, ZIGi, the twinkles; Motion Off), and the
 * pixels around it are read: a straight edge is a long run of pixels, in one column or one row, where the brightness
 * steps the same way. The planet's own box (its art) and the banner's words are left out; the rest — the glow, the mist
 * and the sky — must change smoothly. Phone and computer, lit, in Nebula, Light and Dark. And every planet file — the
 * spheres, the phones' small spheres and the moons — is clear (alpha 0) all round its edge, so no file brings a box.
 */
const PATH = [['Fictional sunrise', 'morning'], ['Fictional dawn', 'morning'], ['Fictional noon', 'afternoon']] as const;
async function open(page: Page, theme: 'nebula' | 'light' | 'dark') {
  let r = emptyChecklist(), n = 0;
  for (const [label, section] of PATH) r = addCustom(r, {label, colour: 'cyan', section}, {id: `ck_halo-${++n}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, n))});
  await seedChecklist(page, {path: r, extra: {[UI_PREFS_KEY]: JSON.stringify({version: 1, motion: 'off', ...(theme === 'nebula' ? {} : {theme})})}});
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('.path-stage[data-settled]')).toHaveCount(1, {timeout: 15_000});
  // (The day's first planet lights with the first tick in its orbit.)
  await page.getByRole('button', {name: 'Fictional sunrise: not done yet', exact: true}).click();
  await expect(page.locator('.orbit-planet[data-lit]').first()).toBeVisible();
  await page.addStyleTag({content: '.orbit-flow, .orbit-tab, .path-zigi, .path-next-tag, .ambient-sky, .checklist-toast, [role=status] { visibility: hidden !important; }'});
  await page.locator('.orbit-planet[data-lit]').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
}
/** The longest runs of a same-way brightness step along one column or one row, outside the planet's art and the banner's words. */
async function straightEdges(page: Page) {
  const box = await page.locator('.orbit-planet[data-lit]').first().evaluate(el => {
    // (The banner's words, with the tint band behind them that fades out after the count chip.)
    const banner = el.closest('.orbit-banner')!, r = el.getBoundingClientRect(), w = banner.querySelector('.habit-section-summary')!.getBoundingClientRect();
    const fade = parseFloat(getComputedStyle(banner).getPropertyValue('--banner-fade')) || 96;
    const head = document.querySelector('.checklist-topbar')!.getBoundingClientRect().bottom, d = document.querySelector('.checklist-dock')?.getBoundingClientRect();
    return {planet: {left: r.left, top: r.top, right: r.right, bottom: r.bottom}, words: {left: w.left, top: w.top, right: w.right + fade, bottom: w.bottom}, vw: innerWidth, vh: d && d.height > 0 ? Math.min(innerHeight, d.top) : innerHeight, head};
  });
  // (The sky around the planet, below the top bar and above the timers.)
  const pad = 90, clip = {x: Math.max(0, Math.floor(box.planet.left - pad)), y: Math.max(Math.ceil(box.head) + 2, Math.floor(box.planet.top - pad))};
  const width = Math.min(box.vw, Math.ceil(box.planet.right + pad)) - clip.x, height = Math.min(box.vh, Math.ceil(box.planet.bottom + pad)) - clip.y;
  const png = (await page.screenshot({clip: {...clip, width, height}, scale: 'css'})).toString('base64');
  return page.evaluate(async ({png, clip, box}) => {
    const img = new Image(); img.src = `data:image/png;base64,${png}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
    const L = (x: number, y: number) => { const i = (y * W + x) * 4; return .2126 * d[i]! + .7152 * d[i + 1]! + .0722 * d[i + 2]!; };
    const skip = (x: number, y: number) => {
      const px = x + clip.x, py = y + clip.y, near = (b: {left: number; top: number; right: number; bottom: number}, m: number) => px >= b.left - m && px <= b.right + m && py >= b.top - m && py <= b.bottom + m;
      return near(box.planet, 3) || near(box.words, 6);
    };
    // (A straight edge is a sharp step: the brightness jumps between two neighbouring pixels much more than the slope just
    // beside them — a glow's or a mist's smooth fall-off never does — and does so the same way along a long straight run.)
    const T = 3, out: {axis: string; at: number; run: number}[] = [];
    const jump = (a: number, b: number, c: number, e: number, f: number) => (c - b) - ((b - a) + (f - e)) / 2;
    for (let x = 3; x < W - 3; x++) {
      let run = 0, sign = 0, best = 0;
      for (let y = 0; y < H; y++) {
        const s = skip(x, y) ? 0 : jump(L(x - 1, y), L(x, y), L(x + 1, y), L(x + 1, y), L(x + 2, y)), k = Math.abs(s) >= T ? Math.sign(s) : 0;
        if (k && k === sign) run++; else { run = k ? 1 : 0; sign = k; }
        best = Math.max(best, run);
      }
      if (best >= 24) out.push({axis: 'column', at: x + clip.x, run: best});
    }
    for (let y = 3; y < H - 3; y++) {
      let run = 0, sign = 0, best = 0;
      for (let x = 0; x < W; x++) {
        const s = skip(x, y) ? 0 : jump(L(x, y - 1), L(x, y), L(x, y + 1), L(x, y + 1), L(x, y + 2)), k = Math.abs(s) >= T ? Math.sign(s) : 0;
        if (k && k === sign) run++; else { run = k ? 1 : 0; sign = k; }
        best = Math.max(best, run);
      }
      if (best >= 24) out.push({axis: 'row', at: y + clip.y, run: best});
    }
    return out;
  }, {png, clip, box});
}

for (const theme of ['nebula', 'light', 'dark'] as const) test(`a lit planet shows no square, box or straight edge behind it (${theme})`, async ({page}, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize(info.project.name === 'mobile' ? {width: 390, height: 844} : {width: 1440, height: 900});
  await open(page, theme);
  expect(await straightEdges(page), `${info.project.name}, ${theme}: straight brightness steps around the planet`).toEqual([]);
});

test('every planet file is clear all round its edge: alpha 0 on its four borders (spheres, the phones\' small spheres, moons)', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'the files are the same for every device');
  const files = [...new Set(Object.values(PLANET_DESIGNS).flatMap(d => [d.sphere.src, d.sphere.srcSm, ...d.moons.map(m => m.src)]))];
  expect(files.length).toBeGreaterThanOrEqual(21 - 3);
  await page.goto('/');
  const found = await page.evaluate(async files => {
    const out: {file: string; w: number; h: number; opaque: number; most: number}[] = [];
    for (const file of files) {
      const bmp = await createImageBitmap(await (await fetch(file)).blob(), {premultiplyAlpha: 'none', colorSpaceConversion: 'none'});
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const g = c.getContext('2d')!; g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, H = c.height;
      let opaque = 0, most = 0;
      const at = (x: number, y: number) => { const a = d[(y * W + x) * 4 + 3]!; if (a > 0) { opaque++; most = Math.max(most, a); } };
      for (let x = 0; x < W; x++) { at(x, 0); at(x, H - 1); }
      for (let y = 1; y < H - 1; y++) { at(0, y); at(W - 1, y); }
      out.push({file, w: W, h: H, opaque, most});
    }
    return out;
  }, files);
  expect(found.map(f => f.file).sort()).toEqual([...files].sort());
  for (const f of found) expect(f.w * f.h, f.file).toBeGreaterThan(0);
  expect(found.filter(f => f.opaque > 0), 'files with a pixel that is not clear on their edge').toEqual([]);
});
