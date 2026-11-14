import {expect, test} from '@playwright/test';
import {emptyPlatform} from '../lib/positions';
import {goal} from './run9-1-fixture';
import {openSettings} from './settings-open';

/**
 * Session AF (L5a, Part 10.10): "Next step", "What matters today" and the goal cards no longer repeat one goal. The focus
 * tile shows the top goal's next step (not its progress), "What matters today" the most urgent other goal, each card its
 * own progress; every card is still there. With one goal, the tile and the panel still say different things.
 */
const read = (page: import('@playwright/test').Page) => page.evaluate(() => {
  const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const tile = document.querySelector('[aria-label="Focus: next goal step"]'), panel = document.querySelector('.today-intelligence');
  return {focusGoal: text(tile?.querySelector('strong')), focusStep: text(tile?.querySelector('p')), stepKind: tile?.querySelector('p')?.getAttribute('data-step') ?? null,
    panelGoal: text(panel?.querySelector('.intelligence-heading h2')), panel: text(panel), cards: [...document.querySelectorAll('.today-goals-grid .goal-card, .today-goals-grid > article')].map(c => text(c)), newCard: !!document.querySelector('.today-goals-grid .new-destination-card')};
});

test('the Showcase: the top goal’s next step, the most urgent other goal, each card its progress — every card kept', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await openSettings(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('article', {name: 'Focus: next goal step'})).toBeVisible();
  await expect(page.locator('.today-intelligence .intelligence-heading h2')).toBeVisible();
  await expect(page.locator('.today-goals-grid')).toBeVisible();
  const r = await read(page);
  expect(r.focusGoal).toBe('Emergency fund'); // the top goal (pinned, first in the Goals page's order)
  // Session AO (RR-17, D-134; owner decision 13 Nov, deliberate): a goal's name appears once on Today, so the focus goal has
  // no card in the grid (was: its card came first); the tile keeps its progress beside the step (equally strict: the %).
  expect(r.cards.some(c => c.includes('Emergency fund'))).toBe(false);
  await expect(page.getByRole('article', {name: 'Focus: next goal step'}).locator('.focus-progress')).toHaveText(/\d+ ?% of /);
  expect(r.cards[0]).toMatch(/\d+ ?%/);
  expect(r.focusStep).not.toMatch(/%/); // the step line is the step; the progress has its own line
  expect(r.focusStep).toMatch(/^(Next contribution|Contribution .*due since|Next milestone|Next: )/);
  expect(r.panelGoal).not.toBe(r.focusGoal); // "What matters today": another goal
  expect(['Reward income reserve', 'Japan adventure', 'First home deposit']).toContain(r.panelGoal);
  expect(new Set([r.focusStep, r.panel, r.cards[0]]).size).toBe(3);
  // Session AK RB (RELEASE_REVIEW_2 R2-9, deliberate): a goal shows once on Today, so the goal "What matters today" shows
  // has no second card; the other active goals keep theirs, and "Create a new goal" stays. Session AO (RR-17, deliberate):
  // the focus goal has none either (4 → 3).
  expect(r.cards).toHaveLength(3);
  expect(r.cards.some(c => c.includes(r.panelGoal))).toBe(false);
  expect(r.newCard).toBe(true);
});

test('one goal: the tile’s next step and the panel’s funding facts are different things', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/settings'); /* Session AP: a seed only writes storage here; no group needs opening */
  const data = emptyPlatform(); data.goals = [goal()];
  await page.evaluate(d => localStorage.setItem('zigoals:platform:v1', JSON.stringify(d)), data);
  await page.goto('/app');
  await expect(page.getByRole('article', {name: 'Focus: next goal step'})).toBeVisible();
  // Session AO (RR-17, owner decision 13 Nov, deliberate): the tile names the one goal; the panel's heading does not repeat
  // it ("Your top goal", its link still named after the goal), and the goal has no card in the grid.
  await expect(page.locator('.today-intelligence .intelligence-heading h2')).toHaveText('Your top goal');
  await expect(page.locator('.today-intelligence .intelligence-heading h2').getByRole('link', {name: 'iPhone DUO'})).toBeAttached();
  const r = await read(page);
  expect(r.focusGoal).toBe('iPhone DUO');
  // Recent activity is a log of what happened (the goal's creation is one event), not a second place the goal is shown.
  const lines = await page.locator('main').evaluate(main => { const copy = main.cloneNode(true) as HTMLElement; copy.querySelectorAll('.recent-panel').forEach(n => n.remove()); document.body.append(copy); const text = copy.innerText; copy.remove(); return text.split('\n').filter(l => l.includes('iPhone DUO')); });
  expect(lines, 'visible lines naming the goal').toEqual(['iPhone DUO']);
  expect(r.stepKind).toBe('plan');
  expect(r.focusStep).toBe('Next: set a contribution plan');
  expect(r.panel).not.toContain(r.focusStep);
  expect(r.cards).toHaveLength(0);
});
