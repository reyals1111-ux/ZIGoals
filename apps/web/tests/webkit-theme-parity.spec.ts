import {test} from '@playwright/test';
import {parity, type State} from './parity/run';

/**
 * Session AF (L5a, Part 10.13, ADR-028 H75): theme parity in WebKit at 390 × 844 (evidence label: WebKit, never "Safari on
 * an iPhone"), the phone subset of theme-parity-af.spec.ts: Today, Habits, Wealth, Earn and the Checklist in the Showcase,
 * and the More sheet. The seed waits for its page's network to settle before the next navigation (ADR-027 G23).
 */
test.use({viewport: {width: 390, height: 844}});
test.describe.configure({timeout: 240_000});
const SUBSET: [string, State][] = [['/app', 'showcase'], ['/app/habits', 'showcase'], ['/app/wealth', 'showcase'], ['/app/earn', 'showcase'], ['/app/checklist', 'showcase'], ['/app', 'more']];
for (const [route, state] of SUBSET) {
  test(`WebKit ${route} · ${state}: only a theme's own differences`, async ({page, browserName}, info) => {
    test.skip(browserName !== 'webkit', 'The WebKit job; Chrome covers every route in theme-parity-af.spec.ts.');
    test.skip(info.project.name !== 'mobile', 'A phone: the iPhone project only.');
    await parity(page, info, route, state);
  });
}
