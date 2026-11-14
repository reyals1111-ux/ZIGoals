import {expect, test, type Page} from '@playwright/test';
import {openZigi, sendToZigi, zigiPanel} from '../../zigi-open';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../../../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../../../lib/ai/store/keys';
import {HABITS_KEY} from '../../../lib/habits';
import {TASKS_KEY} from '../../../lib/tasks/schema';
import {PLATFORM_KEY} from '../../../lib/positions';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../../../lib/af-checklist-keys';
import {denver, lisbon} from '../../../lib/ai/evals/l7-fourth-fixtures';
import {nova, sendInNova} from './helpers';
import {openSettings} from '../../settings-open';

/**
 * Session AL fourth pass (lane L7-4b): what a person sees for the replay's open answer rows (GROK53_REPLAY_L7_1, on
 * c521574f), in the bots' conditions: no model, Wed 4 Nov 2026 02:30 in Brussels, Lisbon's four habits on the Checklist
 * path and its tasks (L2), or Denver's goals (DV). Expected to FAIL on c521574f and PASS on the branch.
 */
const NIGHT = '2026-11-04T01:30:00.000Z';
const offline = (page: Page) => page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
const lastTurn = (page: Page) => zigiPanel(page).locator('.ai-turn-local').last();
async function seedProfile(page: Page, set: 'L2' | 'DV', {habitsShared = true, healthShared = false}: {habitsShared?: boolean; healthShared?: boolean} = {}) {
  const s = set === 'L2' ? lisbon('L2') : denver();
  const records: Record<string, string> = {
    [HABITS_KEY]: JSON.stringify(s.habits), [PLATFORM_KEY]: JSON.stringify(s.platform),
    ...(s.nova?.tasks ? {[TASKS_KEY]: JSON.stringify(s.nova.tasks)} : {}),
    ...(s.checklist ? {[CHECKLIST_KEY]: JSON.stringify(s.checklist.record), [CHECKLIST_DAYS_KEY]: JSON.stringify(s.checklist.days)} : {}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    [AI_OPTIONS_KEY]: JSON.stringify({version: 1, toolMode: 'attach'}),
    ...(habitsShared ? {} : {[AI_SETTINGS_KEY]: JSON.stringify({...defaultAiSettings(), pageShare: {...defaultAiSettings().pageShare, habits: false}})}),
    ...(healthShared ? {[AI_SETTINGS_KEY]: JSON.stringify({...defaultAiSettings(), includeHealth: true, pageShare: {...defaultAiSettings().pageShare, health: true}})} : {}),
  };
  await page.clock.install({time: NIGHT});
  await openSettings(page);
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, records);
  await page.waitForLoadState('networkidle');
}

test.describe('desktop (Lisbon, Denver: 1280)', () => {
  test.use({viewport: {width: 1280, height: 900}, timezoneId: 'Europe/Brussels', locale: 'en-GB'});

  test('#001/#002/LA-017: ZIGi and NOVA count the Checklist as "Show my checklist" does (1 of 4), never "0 of 0"', async ({page}) => {
    await offline(page); await seedProfile(page, 'L2'); await page.goto('/app/tasks');
    await openZigi(page);
    await sendToZigi(page, 'What\'s left on my checklist today?');
    await expect(lastTurn(page)).toContainText('Checklist today: 1 of 4 done.');
    await expect(lastTurn(page)).not.toContainText('0 of 0');
    await sendToZigi(page, 'Show my checklist');
    await expect(lastTurn(page)).toContainText('1 of 4 done');
    await page.goto('/app/nova');
    await sendInNova(page, 'How many checklist items have I done today?');
    await expect(nova(page).locator('.nova-turn-local').last()).toContainText('1 of 4 done');
  });

  test('#038/#240/LA-005: "How many habits are left today?" lists the three open habits in ZIGi, as in NOVA', async ({page}) => {
    await offline(page); await seedProfile(page, 'L2'); await page.goto('/app/habits');
    await openZigi(page);
    await sendToZigi(page, 'How many habits are left today?');
    await expect(lastTurn(page)).toContainText('3 habits left today');
    await expect(lastTurn(page)).toContainText('Stretch 5 min');
    await expect(lastTurn(page)).not.toContainText('0 times today');
  });

  test('#015/#006/LZ-009: "Plan my evening" makes no task card, and a check-off card gets no second Quick add offer', async ({page}) => {
    await offline(page); await seedProfile(page, 'L2'); await page.goto('/app/tasks');
    await openZigi(page);
    await sendToZigi(page, 'Plan my evening using my checklist');
    await expect(lastTurn(page)).toContainText('needs your own AI');
    await expect(lastTurn(page).getByRole('button', {name: /^Add/})).toHaveCount(0);
    await sendToZigi(page, 'Mark Stretch 5 min as done');
    await expect(lastTurn(page)).toContainText('Stretch 5 min');
    await expect(zigiPanel(page).locator('.ai-quick-add')).toHaveCount(0);
  });

  test('#280–289a/ZIGi-F9: "I walked 2 dogs" is not a 2-step walk', async ({page}) => {
    await offline(page); await seedProfile(page, 'L2'); await page.goto('/app/tasks');
    await openZigi(page);
    await sendToZigi(page, 'I walked 2 dogs');
    await expect(lastTurn(page)).toContainText('no distance, steps or time');
    await expect(zigiPanel(page).getByText(/Will save: Walk/)).toHaveCount(0);
  });

  test('Z-008/Z-009/DV-079: on Goals, "Log 50 dollars to Holiday" and a milestone make cards, never "Nothing proposed"', async ({page}) => {
    await offline(page); await seedProfile(page, 'DV'); await page.goto('/app/goals');
    await openZigi(page);
    await sendToZigi(page, 'Log 50 dollars to Holiday');
    await expect(lastTurn(page)).not.toContainText('not in this page\'s context');
    await expect(lastTurn(page).getByRole('button', {name: /Open the form|Add/}).first()).toBeVisible();
    await sendToZigi(page, 'Add a milestone "Book flights" to Holiday');
    await expect(lastTurn(page)).toContainText('Book flights');
    await expect(lastTurn(page)).not.toContainText('Nothing proposed');
  });

  test('N-028/N-029/N-038: the chess goal, the 52-week challenge and "A goal" are the goals of those names', async ({page}) => {
    await offline(page); await seedProfile(page, 'DV'); await page.goto('/app/goals');
    await openZigi(page);
    await sendToZigi(page, 'How far am I on my chess goal?');
    await expect(lastTurn(page)).toContainText('Reach a chess rating');
    await expect(lastTurn(page)).not.toContainText('No ratings yet');
    await sendToZigi(page, 'How far am I on my 52-week savings challenge goal?');
    await expect(lastTurn(page)).not.toContainText('No challenge running');
    await sendToZigi(page, 'How far am I on my A goal?');
    await expect(lastTurn(page)).toContainText('A goal:');
  });

  test('LA-004/Z060: with Habits page data off, ZIGi lists no habit and no streak', async ({page}) => {
    await offline(page); await seedProfile(page, 'L2', {habitsShared: false}); await page.goto('/app/tasks');
    await openZigi(page);
    await sendToZigi(page, 'How many habits are left today?');
    await expect(lastTurn(page)).toContainText('isn’t shared');
    await expect(lastTurn(page)).not.toContainText('Stretch 5 min');
    await sendToZigi(page, 'Longest streak?');
    await expect(lastTurn(page)).not.toContainText('No streak yet');
  });

  test('LA-030/ctx-a: on Tasks, "What is on this page?" names Tasks, never Help', async ({page}) => {
    await offline(page); await seedProfile(page, 'L2'); await page.goto('/app/tasks');
    await openZigi(page);
    await sendToZigi(page, 'What is on this page?');
    await expect(lastTurn(page)).not.toContainText('You are on Help');
  });

  test('LA-003/DV-062/MO-058: before a model is connected, "What NOVA can see" and its check say nothing is sent yet, never blame switches that are on', async ({page}) => {
    await offline(page); await seedProfile(page, 'L2'); await page.goto('/app/nova/setup');
    // Session AL (CI12, CI 1561): the setup page is the ten-step path; "What NOVA can see" and its check live in that step's
    // guide, which opens from its planet (as tests/nova-setup.spec.ts opens it). The spec never opened it (written, not run).
    await page.getByRole('button', {name: /^What NOVA can see:/}).first().click();
    await expect(page.locator('[data-setup-panel="scopes"]')).toBeVisible();
    const check = page.getByRole('button', {name: 'Check what NOVA sees'});
    await check.scrollIntoViewIfNeeded();
    // Session AL fifth pass (L7-5c; LA-003 CHANGED in GROK53_REPLAY_L7_2, deliberate): the preview no longer shows the empty
    // pack's "Not shared with NOVA: Today…; Goals…" for areas that are on; it says nothing is sent and what NOVA reads once a
    // model is connected, from the same state as the check. Equally strict: the note, the lines, and no "Not shared" for on areas.
    const sees = page.locator('[data-setup-panel="scopes"] .nova-sees');
    await expect(sees.getByText(/^No model is connected yet, so nothing is sent\. Once one is, this shows exactly/)).toBeVisible();
    await expect(sees.locator('.nova-guide-send-text')).toContainText('- Once one is, NOVA reads: Today, agenda, tasks, focus, music and chess; Goals and their pace; Habits and streaks; Wealth');
    await expect(sees.locator('.nova-guide-send-text')).toContainText('- Not shared with NOVA (NOVA → Permissions): Health');
    await expect(sees.locator('.nova-guide-send-text')).not.toContainText(/Not shared with NOVA[^\n]*(Today|Goals|Habits|Wealth)/);
    await check.click();
    // CI12: the check's result line starts with the check row's verdict ("Checked: it works.", components/nova/setup/check-row.tsx),
    // so the note is matched right after it (was: anchored at the line's start, which no result line ever is).
    await expect(page.getByText(/^Checked: it works\. No model is connected yet, so nothing is sent and the preview is empty\. Once one is, NOVA reads .*Habits.*Health: off\./)).toBeVisible(); // fifth pass: the note is whole (was cut at "Health:")
    await expect(page.getByText(/page switch under Settings .* is off/)).toHaveCount(0);
  });

  test('NP-30: /remember in NOVA is a note card with its category, not a trip to ZIGi', async ({page}) => {
    // Session AL (CI12, CI 1561): the bot's condition was the Showcase with Health shared ("Sc+H N", GROK53_REPLAY_L7_1). A
    // note about an allergy or a diet is health-like, and while Health is not shared NOVA keeps nothing about it (lib/ai/memory.ts
    // HEALTH_HELD, a privacy rule this spec must not bend), so Health is shared here as it was for the bot.
    await offline(page); await seedProfile(page, 'L2', {healthShared: true}); await page.goto('/app/nova');
    await sendInNova(page, '/remember I am vegetarian and allergic to peanuts');
    const turn = nova(page).locator('.nova-turn-local').last();
    await expect(turn).not.toContainText('opens a view in ZIGi’s panel');
    await expect(turn).toContainText('Remember this?');
  });
});
