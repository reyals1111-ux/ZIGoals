import {test} from '@playwright/test';
import {STATES, parity} from './parity/run';

/**
 * Session AF (L5a, Part 10.13, ADR-028 H75): theme parity. Switching Nebula → Light or Nebula → Dark changes only what a
 * light or dark mode normally changes — words' colours, neutral and night surface and line colours, the calm of the named
 * art layers, the page's own ground, the theme bar — and nothing else: every coloured fill, chart paint, ring, glow,
 * gradient and pillar colour is the same, and every box is in the same place within half a pixel. On every route in the
 * Showcase, a new device's Today and Goals, Today with Quick add open, the phone's More sheet and the folded hero; in
 * Chrome on the computer and phone layouts (WebKit's phone subset: webkit-theme-parity.spec.ts). Results:
 * test-results/theme-parity/*.json → node scripts/parity-report.mjs.
 */
test.describe.configure({timeout: 240_000});
for (const [route, state] of STATES) {
  test(`${route} · ${state}: only a theme's own differences`, async ({page, browserName}, info) => {
    test.skip(browserName !== 'chromium', 'Chrome; WebKit has its own phone subset');
    test.skip(state === 'more' && info.project.name !== 'mobile', 'The More sheet is the phone’s');
    await parity(page, info, route, state);
  });
}
