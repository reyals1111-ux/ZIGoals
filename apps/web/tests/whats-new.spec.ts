import {expect, test} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {EARLIER_LINKS, WHATS_NEW_LINKS} from '../components/for-you/whats-new-card';

// The one-time "What's new" card (Session P, owner addition 4): once per device, never during onboarding, links to Help.
// Session AC: the seeded records are the Showcase's for 2026-09-20, so the page's clock is that day too; with the real
// date the seeded quit habit reached a 30-day badge on 2026-10-16 and its celebration covered Today.
test.beforeEach(async ({page}) => { await page.clock.setFixedTime(new Date('2026-09-20T09:30:00.000Z')); await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
const seed = async (page: import('@playwright/test').Page) => {
  const {records} = buildShowcase('2026-09-20');
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true})});
};

/**
 * Session AA-Cloud Part 1: the card sits in Today's "Updates and summaries" at the end of the page; on a phone that
 * area's cards wait behind its one row, so open it first (nothing else about the card changes).
 */
const revealUpdates = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  const fold = page.getByRole('region', {name: 'Updates and summaries', exact: true}).getByRole('button', {name: /^Show more/});
  if (await fold.count()) await fold.click();
};

test('a brand-new device sees the welcome and no "What\'s new" card', async ({page}) => {
  await page.goto('/app');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'A few new things.'})).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), WHATS_NEW_KEY)).toBeNull();
});

test('after onboarding the card lists the Help entries, is dismissed once per device and writes nothing on view', async ({page}) => {
  await seed(page);
  await page.goto('/app');
  await revealUpdates(page);
  const card = page.getByRole('region', {name: 'A few new things.'});
  await expect(card).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), WHATS_NEW_KEY)).toBeNull();
  const links = card.getByRole('link');
  await expect(links).toHaveCount(WHATS_NEW_LINKS.length);
  for (const [index, link] of WHATS_NEW_LINKS.entries()) { await expect(links.nth(index)).toHaveText(link.label); await expect(links.nth(index)).toHaveAttribute('href', link.href); }
  const got = card.getByRole('button', {name: 'Got it', exact: true});
  expect((await got.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await got.click();
  await expect(card).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), WHATS_NEW_KEY)).toBe(JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}));
  await page.reload();
  await revealUpdates(page);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'A few new things.'})).toHaveCount(0);
});

test('a link opens its Help answer; the earlier release\'s links wait under "Earlier updates"', async ({page}) => {
  // Session AF Gate C (CI on 1a7624d6 and 14cf1987): every release moves links under "Earlier updates", and each one is
  // opened from a fresh Today; eleven visits now take about 45 s on CI's runners, the default budget. Its own budget is
  // 90 s; every check is unchanged. Session AJ (ADR-035): one more release, one more visit (twelve); 120 s, checks unchanged.
  test.setTimeout(120_000);
  await seed(page);
  await page.goto('/app');
  await revealUpdates(page);
  const card = page.getByRole('region', {name: 'A few new things.'});
  // Session W Part 24: no promise that everything stays on this device (Spotify and chess reach their own sites).
  await expect(card).toContainText('Each one is optional, and nothing changes until you use it.');
  await expect(card).not.toContainText('stays on this device');
  // Session AB-Design (ADR-024, deliberate; the second merger): this release's links are the card's own; AB-Cloud's,
  // AA-Local's, AA-Cloud's, Z-Local's, Z-Cloud's, Y's, X-Local's, W's and V's wait under "Earlier updates", AB-Cloud's first.
  // Session AC (ADR-025, deliberate): this release's links are the card's own; AB-Design's eight lead "Earlier updates".
  // Session AD (ADR-026, deliberate): this release's seven links are the card's own; AC's eight lead "Earlier updates".
  // Session AE (ADR-027, deliberate): this release's nine links are the card's own; AD's seven lead "Earlier updates",
  // so AD's banner link is no longer on the card itself and opens its answer from there (its own assertions, kept).
  // Session AF (ADR-028, deliberate): this release's eight links are the card's own; AE's nine lead "Earlier updates", so
  // AE's finale link is no longer on the card itself and opens its answer from there (its own assertions, kept).
  // Session AG (ADR-029, deliberate): this release's one link is the card's own; AF's eight lead "Earlier updates", so AF's
  // Earn link is no longer on the card itself and opens its answer from there (its own assertions, kept).
  // Session AG Polish (ADR-030, deliberate): this release's two links are the card's own; AG's one link leads "Earlier
  // updates", so it is no longer on the card itself and opens its answer from there (its own assertions, kept).
  // Session AG Polish 2 (ADR-031, deliberate): this release's four links are the card's own; AG Polish's two lead "Earlier
  // updates", so its Checklist link is no longer on the card itself and opens its answer from there (its own assertions, kept).
  // Session AJ (ADR-035, deliberate): this release's six links are the card's own; AG Polish 2's four lead "Earlier
  // updates", so its quick-add link opens its answer from there (its own assertions, kept, moved under "Earlier updates").
  await card.getByRole('link', {name: 'Price alerts on your device, and net worth by where it came from'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-aj-alerts$/);
  await expect(page.locator('#help-aj-alerts')).toHaveAttribute('open', '');
  await expect(page.locator('#help-aj-alerts')).toContainText('never buy, sell or move anything');
  await page.goto('/app');
  await revealUpdates(page);
  for (const [name, id] of [['Guided journeys, Focus Sessions and an optional Life Score', 'aj-guided'], ['Sleep balance, your best focus window and GPX or TCX workouts', 'aj-health'], ['Trader tools, and watching a Bitcoin wallet by its public key', 'aj-wealth'], ['Customize the app’s look, and erase everything on this device', 'aj-look'], ['Staking on ZIGChain v6: the review shows the network fee you sign', 'aj-v6']] as const) await expect(card.getByRole('link', {name}), id).toHaveAttribute('href', `/app/help#help-${id}`);
  await expect(card.getByRole('link', {name: 'Quick add: “+” puts a new habit on your Checklist in one step'})).toHaveCount(0);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'Quick add: “+” puts a new habit on your Checklist in one step'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-ag2-quick-add$/);
  await expect(page.locator('#help-ag2-quick-add')).toHaveAttribute('open', '');
  await expect(page.locator('#help-ag2-quick-add')).toContainText('Add to my orbit');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  for (const [name, id] of [['Each orbit’s planet lights up the moment you reach it', 'ag2-planets'], ['A progress bar made of your day’s own planets', 'ag2-progress'], ['Finish your day with a short film and your streak', 'ag2-celebration']] as const) await expect(card.getByRole('link', {name}), id).toHaveAttribute('href', `/app/help#help-${id}`);
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'The Checklist, finished: a planet for every orbit and a celebration every day'})).toHaveCount(0);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'The Checklist, finished: a planet for every orbit and a celebration every day'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-ag-polish$/);
  await expect(page.locator('#help-ag-polish')).toHaveAttribute('open', '');
  await expect(page.locator('#help-ag-polish')).toContainText('Replay today’s celebration');
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'The Checklist, redrawn: glowing planets on one flowing line'})).toHaveCount(0);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'The Checklist, redrawn: glowing planets on one flowing line'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-ag-orbit$/);
  await expect(page.locator('#help-ag-orbit')).toHaveAttribute('open', '');
  await expect(page.locator('#help-ag-orbit')).toContainText('the Checklist no longer adds XP');
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'Earn: every way to earn in the ZIG Finance ecosystem, with live numbers and risks'})).toHaveCount(0);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'Earn: every way to earn in the ZIG Finance ecosystem, with live numbers and risks'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-af-earn$/);
  await expect(page.locator('#help-af-earn')).toHaveAttribute('open', '');
  await expect(page.locator('#help-af-earn')).toContainText('ZIGoals never ranks them by rate, never holds your money and never signs for you.');
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'Each page ends in a finale: Goals → Habits → Health = Wealth'})).toHaveCount(0);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'Each page ends in a finale: Goals → Habits → Health = Wealth'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-ae-finale$/);
  await expect(page.locator('#help-ae-finale')).toHaveAttribute('open', '');
  await expect(page.locator('#help-ae-finale')).toContainText('It plays once per visit and then rests');
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'The footer banner, final, with every link still close'})).toHaveCount(0);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'The footer banner, final, with every link still close'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-ad-banner$/);
  await expect(page.locator('#help-ad-banner')).toHaveAttribute('open', '');
  await expect(page.locator('#help-ad-banner')).toContainText('Its link columns are gone, and every link is still close');
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'The page ends at the footer links; the Alpha’s facts live in Settings and Help'})).toHaveCount(0);
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'The footer banner: Goals, Habits & Health = Wealth'})).toHaveCount(0);
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'Restore from a backup: see what it holds, merge or replace, Undo'})).toHaveCount(0);
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'Habits by time of day, a one-tap timer finish, days since for a quit habit, skip with a reason, routines'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'A compound interest calculator'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'ZIGi can do every ordinary task in the app'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'Delete an archived habit for good'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'End a vacation early'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'ZIGi comes alive: the real art, idle, emotions'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'Sleep and sleep debt'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'Habits that tick themselves off from Health'})).toHaveCount(0);
  await card.getByText('Earlier updates', {exact: true}).click();
  const earlier = card.locator('.whats-new-earlier').getByRole('link');
  await expect(earlier).toHaveCount(EARLIER_LINKS.length);
  // Session AB-Design (ADR-024, deliberate): AB-Cloud's six links now lead, so every pinned position moves by six.
  // Session AC (ADR-025, deliberate): AB-Design's eight links now lead, so every pinned position moves by eight more.
  // Session AD (ADR-026, deliberate): AC's eight links now lead, so every pinned position moves by eight more again.
  // Session AE (ADR-027, deliberate): AD's seven links now lead, so every pinned position moves by seven.
  // Session AF (ADR-028, deliberate): AE's nine links now lead, so every pinned position moves by nine.
  // Session AG (ADR-029, deliberate): AF's eight links now lead, so every pinned position moves by eight.
  // Session AG Polish (ADR-030, deliberate): AG's one link leads now, so every pinned position moves by one more.
  // Session AG Polish 2 (ADR-031, deliberate): AG Polish's two links lead now, so every pinned position moves by two more.
  // Session AJ (ADR-035, deliberate): AG Polish 2's four links lead now, so every pinned position moves by four more.
  await expect(earlier.nth(0)).toHaveText('Quick add: “+” puts a new habit on your Checklist in one step');
  await expect(earlier.nth(3)).toHaveText('Finish your day with a short film and your streak');
  await expect(earlier.nth(4)).toHaveText('The Checklist, finished: a planet for every orbit and a celebration every day');
  await expect(earlier.nth(5)).toHaveText('On a phone: your Checklist one tap away in the header');
  await expect(earlier.nth(6)).toHaveText('The Checklist, redrawn: glowing planets on one flowing line');
  await expect(earlier.nth(7)).toHaveText('Earn: every way to earn in the ZIG Finance ecosystem, with live numbers and risks');
  await expect(earlier.nth(15)).toHaveText('Today’s welcome header: one scene, with no box or edge');
  await expect(earlier.nth(24)).toHaveText('Three looks: Light and Dark beside Nebula');
  await expect(earlier.nth(31)).toHaveText('Habit cards show their last 28 days under the counter');
  await expect(earlier.nth(39)).toHaveText('One calm look across Goals, Habits, Health and Wealth, and a Life overview on Today');
  await expect(earlier.nth(47)).toHaveText('Your goal plans, habit extras, routines and more now sync, encrypted');
  await expect(earlier.nth(53)).toHaveText('Habits by time of day, a one-tap timer finish, days since for a quit habit, skip with a reason, routines');
  await expect(earlier.nth(60)).toHaveText('Every page starts with what matters most');
  await expect(earlier.nth(68)).toHaveText('Say it the way you say it: numbers, times, “no wait, three”');
  await expect(earlier.nth(72)).toHaveText('ZIGi’s cleaner panel and your own suggestions');
  await expect(earlier.nth(79)).toHaveText('End a vacation early');
  await expect(earlier.nth(83)).toHaveText('ZIGi comes alive: the real art, idle, emotions');
  // AA-Local's release follows AB-Cloud's (its own assertions, kept): the habits answer.
  await earlier.nth(53).click();
  await expect(page).toHaveURL(/\/app\/help#help-aa-habits$/);
  await expect(page.locator('#help-aa-habits')).toHaveAttribute('open', '');
  await expect(page.locator('#help-aa-habits')).toContainText('the section the clock is in opens first');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  // AA-Cloud's release follows it (its own assertions, kept): the calculator answer, then Z-Local's ZIGi answer.
  await card.getByRole('link', {name: 'A compound interest calculator'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-aa-calculator$/);
  await expect(page.locator('#help-aa-calculator')).toHaveAttribute('open', '');
  await expect(page.locator('#help-aa-calculator')).toContainText('Every result is an estimate: returns are not guaranteed.');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'ZIGi can do every ordinary task in the app'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-your-ai-act$/);
  await expect(page.locator('#help-your-ai-act')).toHaveAttribute('open', '');
  await expect(page.locator('#help-your-ai-act')).toContainText('Every ordinary task in the app is a card now');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'End a vacation early'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-y-vacation$/);
  await expect(page.locator('#help-y-vacation')).toHaveAttribute('open', '');
  await expect(page.locator('#help-y-vacation')).toContainText('it removes those planned skips from today on');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'Sleep and sleep debt'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-w-sleep$/);
  await expect(page.locator('#help-w-sleep')).toHaveAttribute('open', '');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'Habits that tick themselves off from Health'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-auto-checkins$/);
  await expect(page.locator('#help-auto-checkins')).toHaveAttribute('open', '');
  await expect(page.locator('#help-auto-checkins')).toContainText('Tapping the habit yourself always wins');
});
