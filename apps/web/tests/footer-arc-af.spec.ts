import {expect, test} from '@playwright/test';

/**
 * Session AF (L5a, Part 10.8): the footer finale's line from Health into "= Wealth" is one organic, tapered ribbon —
 * magenta, pink, then the gold of "= Wealth", with a soft glow — at every width from 320 to 1920 px; phones get it too
 * (beneath the stacked steps, up the right edge, into the word). It lies inside the banner's stage, ends at the word's
 * right end, and is at rest (nothing moving) once the finale is done; with Motion Off it is simply there.
 */
const WIDTHS = [[320, 700], [390, 844], [768, 1024], [1024, 800], [1440, 900], [1920, 1080]] as const;

test.describe('the footer ribbon at every width', () => {
  test.beforeEach(async ({browserName}, info) => { test.skip(info.project.name !== 'desktop' || browserName !== 'chromium', 'Widths are set per test (one project is enough)'); });
  for (const [width, height] of WIDTHS) {
    test(`${width} px: a tapered magenta-to-gold ribbon with a glow, inside the stage, from Health into "= Wealth"`, async ({page}) => {
      await page.setViewportSize({width, height});
      await page.addInitScript(() => localStorage.setItem('zigoals:motion:v1', 'off'));
      await page.goto('/app');
      const footer = page.locator('footer.site-footer');
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toHaveAttribute('data-intro', 'done', {timeout: 15_000});
      await expect(footer.locator('.site-footer-arc')).toHaveCount(2);
      const read = await footer.evaluate(f => {
        const stage = f.querySelector('.site-footer-stage')!.getBoundingClientRect(), word = f.querySelector('[data-footer-wealth]')!.getBoundingClientRect();
        const health = f.querySelectorAll('[data-footer-node]')[2]!.getBoundingClientRect();
        const pieces = [...f.querySelectorAll<HTMLElement>('.site-footer-arc')].map(arc => {
          const paths = [...arc.querySelectorAll('path.site-footer-ribbon')], shape = paths.find(p => !p.getAttribute('filter'))!, glow = paths.find(p => p.getAttribute('filter'));
          const box = shape.getBoundingClientRect(), stops = [...arc.querySelectorAll('linearGradient stop')].map(s => s.getAttribute('stop-color'));
          return {part: arc.dataset.part, d: shape.getAttribute('d') ?? '', fill: shape.getAttribute('fill') ?? '', glow: !!glow, stroke: getComputedStyle(shape).stroke, box: {l: box.left, r: box.right, t: box.top, b: box.bottom}, stops, transform: getComputedStyle(arc).transform, running: arc.getAnimations({subtree: true}).length};
        });
        const end = f.querySelector('.site-footer-arc[data-part=return] circle')!.getBoundingClientRect();
        const steps = f.querySelector('.site-footer-steps')!.getBoundingClientRect();
        return {steps: {b: steps.bottom}, stage: {l: stage.left, r: stage.right, t: stage.top, b: stage.bottom}, word: {r: word.right, t: word.top, b: word.bottom}, health: {cx: health.left + health.width / 2, cy: health.top + health.height / 2, r: health.right}, end: {x: end.left + end.width / 2, y: end.top + end.height / 2}, pieces, stacked: !!f.querySelector('.site-footer-reveal[data-stacked]')};
      });
      expect(read.stacked).toBe(width < 768);
      for (const p of read.pieces) {
        // A filled shape (the ribbon), not a stroked line, closed, in the gradient; a blurred copy beneath (the glow).
        expect(p.d).toMatch(/^M[\d. L-]+ Z$/);
        expect(p.fill).toMatch(/^url\(#/);
        expect(p.stroke).toBe('none');
        expect(p.glow).toBe(true);
        expect(p.stops).toEqual(['#f06dff', '#ff8fd0', '#ffd27a', '#ffd27a']);
        // Inside the banner's stage at this width.
        expect(p.box.l).toBeGreaterThanOrEqual(read.stage.l - 0.5);
        expect(p.box.r).toBeLessThanOrEqual(read.stage.r + 0.5);
        // At rest: in place and still.
        expect(p.transform).toBe('none');
        expect(p.running).toBe(0);
      }
      // It ends at the right end of "= Wealth", at the word's height.
      expect(Math.abs(read.end.x - read.word.r)).toBeLessThanOrEqual(10);
      expect(read.end.y).toBeGreaterThan(read.word.t);
      expect(read.end.y).toBeLessThan(read.word.b);
      const [rise, back] = read.pieces;
      if (read.stacked) {
        // Phones: beneath the stacked steps (the foot of the line under Health), then up the right edge.
        expect(Math.abs(rise!.box.l - read.health.cx)).toBeLessThanOrEqual(4); // from the foot of the line under Health
        expect(rise!.box.b).toBeGreaterThan(read.steps.b); // beneath the stacked steps
        expect(back!.box.r).toBeGreaterThan(read.stage.r - 24); // up the right edge
      } else {
        // Wider screens: from Health's node, on past it to the right, back over and into the word.
        expect(Math.abs(rise!.box.l - read.health.cx)).toBeLessThanOrEqual(4);
        expect(rise!.box.r).toBeGreaterThan(read.health.r + 20);
        expect(back!.box.t).toBeLessThan(read.word.t + 10);
      }
    });
  }
});
