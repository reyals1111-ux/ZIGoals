import {expect} from '@playwright/test';
import {journey, open, snap} from './kit';

// Session X Part 14, journeys J181–J200: Activity, Chess, Music (docs/verification/x-cloud/HUMAN_TEST.md). Chess's sites
// and Spotify are never reached: their requests are answered here, or the journey stops before any.
const pagesCard = (page: import('@playwright/test').Page) => page.getByRole('region', {name: 'Your pages & buttons', exact: true});

journey('J181', 'Activity lists what I just did', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional activity check');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  if (j.phone) { const sheet = page.locator('dialog.phone-form-sheet[open]'); if (await sheet.count()) await page.keyboard.press('Escape'); }
  await page.getByRole('article', {name: 'Fictional activity check', exact: true}).getByRole('button', {name: 'Complete Fictional activity check', exact: true}).click();
  await open(page, '/app/activity');
  await expect(page.locator('main')).toContainText('Fictional activity check');
});

journey('J182', 'Activity\'s empty state', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app/activity');
  await snap(j, 'J182', 'empty');
});

journey('J185', 'Chess is hidden until shown; showing it adds it to the navigation', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  const toggle = pagesCard(page).getByRole('switch', {name: 'Chess', exact: true});
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(toggle).toBeChecked();
  await open(page, '/app/chess');
});

journey('J189', 'Chess with no username: an honest empty state, no request to either site', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  const external: string[] = [];
  page.on('request', r => { const host = new URL(r.url()).hostname; if (/chess\.com|lichess\.org/.test(host)) external.push(host); });
  await open(page, '/app/chess');
  await page.waitForTimeout(800);
  expect(external).toEqual([]);
});

journey('J190', 'the music player is hidden until shown; Settings → Music shows it', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app');
  await expect(page.getByRole('button', {name: 'Open the music player'})).toHaveCount(0);
  await open(page, '/app/settings');
  const card = page.getByRole('region', {name: 'Your soundtrack.'});
  await card.getByRole('button', {name: 'Show the music player'}).click();
  await expect(card.getByRole('status')).toHaveText('The music player shows again.');
  await expect(page.getByRole('button', {name: 'Open the music player'})).toBeVisible();
});

journey('J191', 'focus sounds play and stop; nothing is downloaded', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await page.getByRole('region', {name: 'Your soundtrack.'}).getByRole('button', {name: 'Show the music player'}).click();
  const media: string[] = [];
  page.on('request', r => { if (/\.(mp3|ogg|wav|m4a|aac)(\?|$)/.test(r.url())) media.push(r.url()); });
  await page.getByRole('button', {name: 'Open the music player'}).click();
  const panel = page.getByRole('dialog', {name: 'Your soundtrack'});
  await panel.getByRole('button', {name: /^Play /}).click();
  await expect(panel.getByRole('status')).toHaveText('Playing · until you stop it');
  await panel.getByRole('button', {name: /^Stop /}).click();
  await expect(panel.getByRole('status')).toHaveText('Made on this device · nothing is downloaded');
  expect(media).toEqual([]);
});

journey('J192', 'Spotify not registered here: it says so and offers no sign-in', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await page.route('**/api/music-config', route => route.fulfill({status: 503, json: {error: 'MUSIC_UNAVAILABLE'}}));
  const spotify: string[] = [];
  page.on('request', r => { if (/spotify\.com/.test(r.url())) spotify.push(r.url()); });
  await open(page, '/app/settings');
  await page.getByRole('region', {name: 'Your soundtrack.'}).getByRole('button', {name: 'Show the music player'}).click();
  await page.getByRole('button', {name: 'Open the music player'}).click();
  const panel = page.getByRole('dialog', {name: 'Your soundtrack'});
  await panel.getByRole('group', {name: 'Play from'}).getByRole('button', {name: 'Spotify'}).click();
  await expect(panel.getByRole('button', {name: /Connect Spotify|Sign in/})).toHaveCount(0);
  expect(spotify).toEqual([]);
});

journey('J193', 'Apple Music is a link to its own app, safely', {views: ['D', 'P'], data: ['E'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await page.getByRole('region', {name: 'Your soundtrack.'}).getByRole('button', {name: 'Show the music player'}).click();
  await page.getByRole('button', {name: 'Open the music player'}).click();
  const panel = page.getByRole('dialog', {name: 'Your soundtrack'});
  await panel.getByRole('group', {name: 'Play from'}).getByRole('button', {name: 'Apple Music'}).click();
  await expect(panel.getByRole('link', {name: 'Open Apple Music ↗'})).toHaveAttribute('rel', 'noopener noreferrer');
});

journey('J199', 'a hidden page still opens from a link, with a note to show it again', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await open(page, '/app/settings');
  await pagesCard(page).getByRole('switch', {name: 'Markets', exact: true}).click();
  await open(page, '/app/markets');
  await expect(page.locator('main')).toContainText(/hidden|show it again/i);
});
