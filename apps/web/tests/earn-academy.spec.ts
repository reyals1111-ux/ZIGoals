import {expect, test} from '@playwright/test';
import {ACADEMY_LESSONS} from '../lib/earn/academy';
import {earnRoutes, seedShowcase} from './earn-fixtures';

/**
 * Session AF chunk 2 (P1.27): the Earn Academy as a mini path. Eight lessons; pressing a dot opens the lesson and its
 * three questions; a wrong answer is shown with why and the quiz can be taken again; three right passes the lesson once
 * (the dot lights, the count moves, the record keeps it on this device).
 */
test('a lesson opens under its dot; two right is not a pass; three right passes, once, and stays after a reload', async ({page}) => {
  await seedShowcase(page);
  await earnRoutes(page);
  await page.goto('/app/earn#academy');
  const section = page.locator('#academy');
  const stage = section.getByRole('group', {name: 'Earn Academy: eight lessons'});
  await expect(stage.locator('button.path-dot')).toHaveCount(8);
  await expect(section.locator('.earn-start-progress')).toContainText('0 of 8 lessons passed');
  const lesson = ACADEMY_LESSONS[0]!;
  await stage.locator('button.path-dot').first().click();
  const panel = section.getByRole('region', {name: `Lesson: ${lesson.title}`});
  await expect(panel).toContainText(lesson.body[0]!);
  // Two right, one wrong.
  for (const [i, q] of lesson.quiz.entries()) {
    const pick = i === 2 ? (q.answer + 1) % 3 : q.answer;
    await panel.locator(`[data-question="${i}"]`).getByLabel(q.options[pick]!, {exact: true}).check();
  }
  await panel.getByRole('button', {name: 'Check my answers'}).click();
  await expect(panel.locator('.earn-quiz-score')).toHaveAttribute('data-score', '2');
  await expect(panel.locator('[data-question="2"]')).toHaveAttribute('data-wrong', '');
  await expect(panel.locator('[data-question="2"]')).toContainText(lesson.quiz[2]!.why);
  await expect(section.locator('.earn-start-progress')).toContainText('0 of 8 lessons passed');
  // Three right.
  await panel.locator('[data-question="2"]').getByLabel(lesson.quiz[2]!.options[lesson.quiz[2]!.answer]!, {exact: true}).check();
  await panel.getByRole('button', {name: 'Check my answers'}).click();
  await expect(panel.locator('.earn-quiz-score')).toContainText('3 of 3 right. Lesson passed.');
  await expect(section.locator('.earn-start-progress')).toContainText('1 of 8 lessons passed');
  await expect(stage.locator('button.path-dot').first()).toHaveAttribute('aria-pressed', 'true');
  const record = JSON.parse((await page.evaluate(() => localStorage.getItem('zigoals:earn-academy:v1')))!);
  expect(record).toMatchObject({version: 1, lessons: {staking: {read: true, score: 3, attempts: 2}}});
  expect(record.lessons.staking.passedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  await page.reload();
  await expect(section.locator('.earn-start-progress')).toContainText('1 of 8 lessons passed');
  await expect(stage.locator('button.path-dot').first()).toHaveAttribute('aria-label', `${lesson.title}: Passed: done`);
});
