import {expect, test} from '@playwright/test';
import {TODAY, back, health, healthRecord, openHealth, stored} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {HEALTH_STORAGE_KEY} from '../lib/health';

/**
 * Session AV lane 2, round 6 (r6-body; Medito, LEDGER #411, #413, #415): Health → Meditation. With "My day ends at" 03:00
 * a 01:00 session today counts on yesterday, so "Your consistency" reads 3 of the 3 days (it would be 4 of 4 at
 * midnight); 30 and 90 days; "Several days" logs one session a day over past days, skips a day that already has one at
 * that time, and one Undo takes them away — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at
 * 320. Fictional sessions; /api offline.
 */
test.use({timezoneId: 'UTC'});
const session = (day: string, clock: string, i: number) => ({id: `health_med-r6-${String(i).padStart(4, '0')}`, startedAt: `${day}T${clock}:00.000Z`, seconds: 600, kind: 'manual', timeZone: 'UTC', source: 'manual', createdAt: `${day}T${clock}:00.000Z`, updatedAt: `${day}T${clock}:00.000Z`});
const sessions = [session(back(3), '08:00', 1), session(back(2), '08:00', 2), session(back(1), '08:00', 3), session(TODAY, '01:00', 4)];
for (const theme of THEMES) test(`${theme}: the meditation day, consistency and several days`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, {...healthRecord(health({meditation: {version: 1, sessions}} as never)), 'zigoals:day-ends:v1': {version: 1, endsAt: 180}}, '/app/health?view=meditation');
  const c = page.getByRole('group', {name: 'Your consistency'});
  await expect(c).toContainText('3 of the 3 days since your first session had a session.');
  await c.getByRole('button', {name: 'Last 90 days'}).click();
  await expect(c.getByRole('button', {name: 'Last 90 days'})).toHaveAttribute('aria-pressed', 'true');
  await c.getByText('How this is counted').click();
  await expect(c).toContainText('A day without a session is a rest day');
  await expect(c).not.toContainText(/streak|broke|lost|fall/i);

  const fold = page.locator('details.r6-range-fold');
  await fold.locator('summary').click();
  const form = page.getByRole('form', {name: 'Log several days'});
  await form.getByLabel('First day').fill(back(5));
  await form.getByLabel('Last day').fill(back(3));
  await form.getByLabel('Began (time)').fill('08:00');
  await form.getByLabel('Minutes').fill('15');
  await expect(form).toContainText('3 days');
  const findings = await axe(page, page.locator('.meditation-view'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Log 3 sessions'}).click();
  await expect(form.getByRole('status')).toContainText('2 sessions logged');
  await expect(form.getByRole('status')).toContainText('1 day was skipped');
  const count = async () => ((await stored<{meditation?: {sessions: unknown[]}}>(page, HEALTH_STORAGE_KEY))?.meditation?.sessions ?? []).length;
  await expect.poll(count).toBe(6);
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(count).toBe(4);

  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
