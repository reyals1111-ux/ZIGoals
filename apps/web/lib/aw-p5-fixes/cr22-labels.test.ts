import {describe, expect, test} from 'vitest';
import {px, rulesFor} from './css';

/**
 * Session AW (p5-fixes, CR-22; AO D17's minor): notice and chip text was 12–13 px. ADR-046's rule is labels ≥ 14 px, so
 * every rule below now says 14 px. Left as they were, each for its own cause (registry-p5-fixes.md): the phone notice's
 * label and its "On this device" fact (owner decision T-069: the whole label beside the whole fact at 335 px fits only at
 * 12–13 px), the footer's tagline (the footer finale) and the Checklist orbit's tags (the orbit path), both protected.
 */
// Session AW (integration): `.alpha-notice strong` is checked rule by rule in the last test below (14 px on a computer,
// T-069's phone and 320 px sizes in their media queries); every rule of each selector here is at least 14 px.
const RAISED: [file: string, selector: string][] = [
  ['components/shell/shell-ab.css', '.showcase-chip-button'],
  ['components/shell/shell-ab.css', '.showcase-chip-panel strong'],
  ['components/shell/shell-ab.css', '.status-row .showcase-chip-button'],
  ['components/add-money/add-money.css', '.add-money-badge'],
  ['app/globals.css', '.unavailable-pill'],
  ['components/habits/auto-rules.css', '.auto-rules-badge'],
  ['components/health/workouts/workouts.css', '.workouts-superset-tag'],
  ['components/health/photo-compare.css', '.photo-compare-tag'],
  ['components/onboarding/onboarding.css', '.onboarding-game-pill'],
  ['components/ai/chat-polish.css', '.ai-chat-via .ai-chat-premium-badge'],
  ['components/goals/what-if.css', '.what-if-label'],
  ['components/ai/knock-offer.css', '.ai-knock-offer-body .ai-knock-offer-label'],
  ['components/zigi/knock.css', '.zigi-knock-copy .zigi-knock-label'],
];

describe('CR-22: notice and chip labels are at least 14 px', () => {
  for (const [file, selector] of RAISED) test(`${selector} (${file})`, () => {
    const sizes = rulesFor(file, selector).flatMap(r => r.decls['font-size'] ? [px(r.decls['font-size'])] : []);
    expect(sizes.length, `${selector} sets a size`).toBeGreaterThan(0);
    for (const size of sizes) expect(size, selector).toBeGreaterThanOrEqual(14);
  });
  test('the computer notice and the Showcase chip on every width say 14 px; only the phone notice keeps T-069\'s sizes', () => {
    const notice = rulesFor('components/shell/shell-ab.css', '.alpha-notice strong');
    expect(notice.find(r => r.media === '')?.decls['font-size']).toBe('14px');
    // The phone and the 320 px rules (owner decision T-069) are the only ones under 14 px, each inside its media query.
    expect(notice.filter(r => px(r.decls['font-size']) < 14).map(r => r.media)).toEqual(['@media (max-width: 767.98px)', '@media (max-width: 359.98px)']);
    expect(rulesFor('components/shell/shell-ab.css', '.status-row .showcase-chip-button').map(r => [r.media, r.decls['font-size']])).toEqual([['@media (max-width: 767.98px)', '14px']]);
  });
});
