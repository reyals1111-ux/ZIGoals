import {expect, test, type Page} from '@playwright/test';
import {isPhone, mainNav, navLink} from './phone-nav';

/**
 * Session AD (the owner's brief Part 1.1, ADR-026): the footer's three link columns are gone. Before they went, every one of
 * their twelve links was proven reachable within two taps from any page, through the sidebar (computer and tablet), the
 * phone's tab bar and More, Help and Settings. This walk is that proof, kept: each destination counts its taps from Today.
 */
async function today(page: Page) {
  await page.goto('/app');
  await expect(page.locator('main h1').first()).toBeAttached();
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
}
/** One tap on a navigation destination (a phone opens More first when it is not a tab: that is a tap too). */
async function tapNav(page: Page, name: string): Promise<number> {
  const visible = await mainNav(page).getByRole('link', {name, exact: true}).isVisible();
  const link = await navLink(page, name);
  await link.click();
  return visible ? 1 : 2;
}

test('the footer has no link columns any more', async ({page}) => {
  await today(page);
  const footer = page.locator('footer.site-footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.locator('nav, .site-footer-links, .site-footer-group')).toHaveCount(0);
  // What stays in the footer: the social row and Back to top.
  await expect(footer.getByRole('link', {name: 'Back to top'})).toBeVisible();
  await expect(footer.getByRole('link', {name: 'zigoals.app'})).toBeVisible();
});

for (const [name, path] of [['Today', '/app'], ['Goals', '/app/goals'], ['Habits', '/app/habits'], ['Health', '/app/health'], ['Wealth', '/app/wealth'], ['Help', '/app/help']] as const) {
  test(`"${name}" (the Product column / Help) is one or two taps away`, async ({page}) => {
    await page.goto(name === 'Today' ? '/app/settings' : '/app');
    await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
    const taps = await tapNav(page, name);
    await page.waitForURL(url => url.pathname === path);
    expect(taps).toBeLessThanOrEqual(2);
  });
}

test('"What’s new" and "Send feedback" are Help topics: two taps (Help, then the topic)', async ({page}) => {
  for (const [label, hash] of [['What\'s new', '#whats-new-alpha'], ['Send feedback', '#feedback']] as const) {
    await today(page);
    const taps = await tapNav(page, 'Help');
    await page.waitForURL('**/app/help');
    const topics = page.getByRole('navigation', {name: 'Help topics'}), topic = topics.getByRole('link', {name: label, exact: true});
    // Session AF Gate C (design critique; deliberate, as strict): a phone lists the first six topics with "All topics" for
    // the rest, so the link is checked once they show. The tap count is unchanged: the section is on the page already.
    if (await isPhone(page)) { await expect(page.locator('html[data-app-hydrated]')).toBeAttached(); await topics.getByRole('button', {name: 'All topics', exact: true}).click(); }
    await expect(topic).toHaveAttribute('href', hash);
    // On a phone Help sits in More (two taps), so the topic is already on the page that opens: no third tap needed.
    if (await isPhone(page)) await expect(page.locator(hash)).toBeAttached(); else { await topic.click(); await expect(page.locator(hash)).toBeInViewport(); }
    expect(taps + (await isPhone(page) ? 0 : 1)).toBeLessThanOrEqual(2);
  }
});

test('"Private security contact" is in Help’s feedback section, by name, with the private address', async ({page}) => {
  await today(page);
  expect(await tapNav(page, 'Help')).toBeLessThanOrEqual(2);
  await page.waitForURL('**/app/help');
  const contact = page.locator('#feedback').getByRole('link', {name: 'Private security contact: hello@zigoals.app', exact: true});
  await expect(contact).toHaveAttribute('href', 'mailto:hello@zigoals.app');
  await expect(contact).toContainText('Private security contact');
});

test('"Make a backup", "Storage & sync settings" and "Your data" are in Settings, one or two taps away', async ({page}) => {
  await today(page);
  expect(await tapNav(page, 'Settings')).toBeLessThanOrEqual(2);
  await page.waitForURL('**/app/settings');
  // The backup is Settings' first group (Session W Part 24: on a phone's first screen).
  await expect(page.locator('#privacy')).toContainText('Keep a copy of your progress.');
  await expect(page.locator('#encrypted-sync')).toBeAttached();
  await expect(page.getByRole('main').getByRole('link', {name: /^Your data/})).toHaveAttribute('href', '/app/settings/data');
});
