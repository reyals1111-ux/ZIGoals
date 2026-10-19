import {expect, test} from '@playwright/test';
import {emptyPlatform} from '../lib/positions';
import {goal} from './run9-1-fixture';

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
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('article', {name: 'Focus: next goal step'})).toBeVisible();
  await expect(page.locator('.today-intelligence .intelligence-heading h2')).toBeVisible();
  await expect(page.locator('.today-goals-grid')).toBeVisible();
  const r = await read(page);
  expect(r.focusGoal).toBe('Emergency fund'); // the top goal (pinned, first in the Goals page's order)
  expect(r.cards[0]).toContain('Emergency fund'); // its card comes first, with its progress
  expect(r.cards[0]).toMatch(/\d+ ?%/);
  expect(r.focusStep).not.toMatch(/%/); // the tile shows the step, not the progress again
  expect(r.focusStep).toMatch(/^(Next contribution|Contribution .*due since|Next milestone|Next: )/);
  expect(r.panelGoal).not.toBe(r.focusGoal); // "What matters today": another goal
  expect(['Reward income reserve', 'Japan adventure', 'First home deposit']).toContain(r.panelGoal);
  expect(new Set([r.focusStep, r.panel, r.cards[0]]).size).toBe(3);
  // Every card is still there: the five active goals and "Create a new goal".
  expect(r.cards).toHaveLength(5);
  expect(r.newCard).toBe(true);
});

test('one goal: the tile’s next step and the panel’s funding facts are different things', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/settings');
  const data = emptyPlatform(); data.goals = [goal()];
  await page.evaluate(d => localStorage.setItem('zigoals:platform:v1', JSON.stringify(d)), data);
  await page.goto('/app');
  await expect(page.getByRole('article', {name: 'Focus: next goal step'})).toBeVisible();
  await expect(page.locator('.today-intelligence .intelligence-heading h2')).toHaveText('iPhone DUO');
  const r = await read(page);
  expect(r.focusGoal).toBe('iPhone DUO');
  expect(r.stepKind).toBe('plan');
  expect(r.focusStep).toBe('Next: set a contribution plan');
  expect(r.panel).not.toContain(r.focusStep);
  expect(r.cards).toHaveLength(1);
});
