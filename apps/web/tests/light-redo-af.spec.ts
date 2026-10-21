import {expect, test, type Page} from '@playwright/test';
import {openDevice, openIn, type Theme} from './parity/session';
import {colours, deeperSameHue, skeleton} from './parity/classify';

/**
 * Session AF (L5a, Parts 10.2–10.6 and 10.12, ADR-028 D9, H13, H75): Light is Nebula by day, Dark keeps everything but
 * its sky. By day the page's ground is white with a light mist, words are ink, and every coloured fill keeps Nebula's
 * exact colour; Habits' 28-day blocks keep each card's own colour; gradient headings keep the nebula's flow in deeper shades of
 * the same hues (the owner's decision of 19 Oct, H130); small
 * coloured words take a deeper shade of their own hue; the reward-reserve card follows the theme; a theme switch moves no
 * box. By night the star-system background is black with a very subtle colour mist.
 */
const lum = (rgb: string) => { const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
const styleOf = (page: Page, selector: string, props: string[]) => page.locator(selector).first().evaluate((el, ps) => Object.fromEntries(ps.map(p => [p, getComputedStyle(el).getPropertyValue(p)])), props);

test.beforeEach(async ({browserName}, info) => { test.skip(info.project.name !== 'desktop' || browserName !== 'chromium', 'Computed colours: one layout is enough (the parity spec covers phones)'); });

test('Habits’ 28-day blocks keep each card’s own colour by day (they were all purple)', async ({page}) => {
  test.setTimeout(90_000);
  await openDevice(page);
  const dots = async (theme: Theme) => { await openIn(page, '/app/habits', theme); return page.locator('.habit-cadence').evaluateAll(grids => grids.map(g => ({tone: g.closest('[data-tone]')?.getAttribute('data-tone') ?? '', fill: getComputedStyle(g.querySelector('.habit-day-complete')!).backgroundImage}))); };
  const nebula = await dots('nebula'), light = await dots('light'), dark = await dots('dark');
  expect(new Set(nebula.map(d => d.tone)).size, 'cards of different tones').toBeGreaterThanOrEqual(2);
  expect(light).toEqual(nebula);
  expect(dark).toEqual(nebula);
  const byTone = new Map(light.map(d => [d.tone, d.fill]));
  expect(new Set(byTone.values()).size, 'each tone its own colour').toBe(byTone.size);
  for (const d of light) expect(d.fill).toMatch(/^linear-gradient\(135deg, rgb/);
});

test('by day: a white ground with a light mist, ink words, and the nebula’s fills, chips and gradients exactly as by night', async ({page}) => {
  test.setTimeout(90_000);
  await openDevice(page);
  const read = () => page.evaluate(() => {
    const cs = (sel: string) => { const el = document.querySelector(sel); return el ? getComputedStyle(el) : null; };
    // A gradient heading on the day's ground, and one inside the night island of Today's hero.
    const flows = [...document.querySelectorAll('main .nebula-flow:not(.is-figure)')], styleOf = (el?: Element) => el ? getComputedStyle(el) : null;
    const day = styleOf(flows.find(el => !el.closest('.today-hero, .site-footer, .sidebar-destination'))), night = styleOf(flows.find(el => el.closest('.today-hero')));
    const sky = getComputedStyle(document.querySelector('.app-content')!, '::before');
    return {body: getComputedStyle(document.body).backgroundColor, sky: sky.backgroundImage, h1: cs('.today-focus h2')!.color, quick: cs('.today-hero .primary, .hero-actions .primary')?.backgroundImage ?? '', heading: day?.backgroundImage ?? '', headingColor: day?.color ?? '', hero: night?.backgroundImage ?? '', heroColor: night?.color ?? '',
      focus: (document.querySelector('.today-focus') as HTMLElement).getBoundingClientRect().top + scrollY, copy: (document.querySelector('.today-hero-copy') as HTMLElement).getBoundingClientRect().top + scrollY};
  });
  await openIn(page, '/app', 'nebula'); const nebula = await read();
  await openIn(page, '/app', 'light'); const light = await read();
  // The ground: Light's near-white with the four-cloud mist (as Session AE drew it).
  expect(light.body).toBe('rgb(247, 247, 251)');
  for (const cloud of ['rgb(238, 234, 253)', 'rgb(230, 243, 253)', 'rgb(251, 237, 245)', 'rgb(234, 247, 248)']) expect(light.sky).toContain(cloud);
  // Words are ink; the nebula's own colours are the same.
  expect(lum(light.h1)).toBeLessThan(0.06);
  expect(light.quick).not.toBe('');
  expect(light.quick).toBe(nebula.quick);
  // A gradient heading keeps the nebula's flow: its own word colour (the white part by night) is ink by day and, by the
  // owner's decision of 19 Oct (H130), every coloured stop is a deeper shade of the same hue at 4.5:1 or more on white.
  expect(nebula.heading).toContain(nebula.headingColor);
  const word = (v: string, c: string) => v.replaceAll(c, 'WORD'), n = colours(word(nebula.heading, nebula.headingColor)), l = colours(word(light.heading, light.headingColor));
  expect(skeleton(word(light.heading, light.headingColor))).toBe(skeleton(word(nebula.heading, nebula.headingColor)));
  expect(n.length).toBeGreaterThanOrEqual(3);
  expect(l).toHaveLength(n.length);
  n.forEach((c, i) => expect(deeperSameHue(c, l[i]!), `${c} → ${l[i]}`).toBe(true));
  // Inside a night island (Today's hero) the heading keeps Nebula's own flow.
  expect(nebula.hero).not.toBe('');
  expect(light.hero.replaceAll(light.heroColor, 'WORD')).toBe(nebula.hero.replaceAll(nebula.heroColor, 'WORD'));
  // A theme switch moves no box: the hero copy and "What is due now" stay where they are by night.
  expect(Math.abs(light.copy - nebula.copy)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(light.focus - nebula.focus)).toBeLessThanOrEqual(0.5);
});

test('small coloured words take a deeper shade of their own hue by day (≥ 4.5:1 on their card); fills never do', async ({page}) => {
  test.setTimeout(90_000);
  await openDevice(page);
  await openIn(page, '/app', 'light');
  const labels = await page.locator('.life-ring-pillar').evaluateAll(els => els.map(el => { const card = el.closest('.panel, section') ?? document.body; return {pillar: el.closest('[data-pillar]')?.getAttribute('data-pillar'), color: getComputedStyle(el).color, ground: getComputedStyle(card).backgroundColor}; }));
  expect(labels.length).toBe(4);
  const nebulaInk = await page.evaluate(() => ['goals', 'habits', 'health', 'wealth'].map(p => { const probe = document.createElement('span'); probe.style.color = `var(--pillar-${p}-ink)`; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }));
  for (const ink of nebulaInk) expect(ratio(ink, 'rgb(240, 243, 249)'), ink).toBeGreaterThanOrEqual(4.5);
  // The pillar labels (a colour set at run time): a deeper shade that reads on the day's card (a color-mix() or relative
  // colour is read back as sRGB through a canvas).
  for (const l of labels) expect(ratio(!l.color.startsWith('rgb') ? await page.evaluate(c => { const d = document.createElement('div'); d.style.color = c; document.body.append(d); const ctx = document.createElement('canvas').getContext('2d')!; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data; d.remove(); return `rgb(${r}, ${g}, ${b})`; }, l.color) : l.color, 'rgb(240, 243, 249)'), `${l.pillar} ${l.color}`).toBeGreaterThanOrEqual(4.5);
  // The rings' paint is the pillar colour itself (a fill: never deepened).
  const ringPaint = await page.locator('.life-ring svg *').evaluateAll(cs => cs.flatMap(c => [getComputedStyle(c).stroke, getComputedStyle(c).getPropertyValue('stop-color')]));
  expect(ringPaint.some(s => s === 'rgb(146, 115, 255)')).toBe(true);
  expect(ringPaint.some(s => s === 'rgb(35, 234, 255)')).toBe(true);
});

test('the reward-reserve card follows the theme by day; by night it is as it was', async ({page}) => {
  test.setTimeout(90_000);
  await openDevice(page);
  const card = async (theme: Theme) => { await openIn(page, '/app', theme); return styleOf(page, '.staking-card', ['color', 'background-image', 'color-scheme']); };
  const nebula = await card('nebula'), light = await card('light'), dark = await card('dark');
  expect(lum(nebula.color!)).toBeGreaterThan(0.5);
  expect(lum(light.color!), 'ink words by day').toBeLessThan(0.06);
  // Its ground by day is a light tint (its first stop near white), still over the horizon art.
  const first = light['background-image']!.match(/rgba?\([^)]*\)/)![0];
  expect(lum(first)).toBeGreaterThan(0.6);
  expect(light['background-image']).toMatch(/url\(/);
  expect(light['color-scheme']).not.toBe('dark');
  expect(dark.color).toBe(nebula.color);
});

test('by night (Dark): a black ground with four faint colour mists and the stars; Nebula’s fills kept', async ({page}) => {
  test.setTimeout(90_000);
  await openDevice(page);
  await openIn(page, '/app', 'nebula');
  const quickNebula = await styleOf(page, '.hero-actions .primary, .today-hero .primary', ['background-image']);
  await openIn(page, '/app', 'dark');
  const sky = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('.app-content')!, '::before'); return {image: s.backgroundImage, opacity: s.opacity, body: getComputedStyle(document.body).backgroundColor}; });
  expect(sky.body).toBe('rgb(0, 0, 0)');
  expect(sky.image.match(/radial-gradient/g)?.length).toBe(4);
  for (const mist of ['rgba(26, 21, 63, 0.8)', 'rgba(15, 34, 56, 0.8)', 'rgba(42, 18, 48, 0.8)', 'rgba(14, 42, 42, 0.8)']) expect(sky.image).toContain(mist);
  expect(sky.image).toMatch(/starfield/);
  expect((await styleOf(page, '.hero-actions .primary, .today-hero .primary', ['background-image']))['background-image']).toBe(quickNebula['background-image']);
});
