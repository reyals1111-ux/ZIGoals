import {expect, test, type Page, type Route} from '@playwright/test';

// Session W Part 20: "Your soundtrack". The music button (hidden until shown; the Showcase shows it), the panel in the
// NOVA look with Focus sounds, Spotify and Apple Music, the mini-bar, Settings → Music and the phone's More row. Spotify
// is MOCKED end to end (its authorize page, token endpoint, Web API and artwork host, and the owner's logo file), so
// nothing leaves the test; every Spotify request still has to pass the app's content policy to reach the mock.
const CLIENT = '0123456789abcdef0123456789abcdef', CORS = {'Access-Control-Allow-Origin': '*'};
const LOGO = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="24" viewBox="0 0 80 24"><rect width="80" height="24" rx="12" fill="#1ed760"/></svg>';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const TRACK = {device: {id: 'dev-1', name: 'Kitchen speaker', type: 'Speaker', is_active: true, volume_percent: 40, supports_volume: true}, is_playing: true, progress_ms: 61_000, shuffle_state: false, repeat_state: 'off',
  item: {name: 'Fictional Track', duration_ms: 200_000, artists: [{name: 'Fictional Artist'}], album: {name: 'Fictional Album', images: [{url: 'https://i.scdn.co/image/ab67616d00001e02fixture300', width: 300, height: 300}]}, external_urls: {spotify: 'https://open.spotify.com/track/fixture123'}}};

async function start(page: Page, {config = true, logo = true}: {config?: boolean; logo?: boolean} = {}) {
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  // The app's own /api only (Spotify's token endpoint is /api/token on its own host, answered by mockSpotify).
  await page.route(url => /^(127\.0\.0\.1|localhost)$/.test(url.hostname) && url.pathname.startsWith('/api/'), route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('**/api/music-config', route => config ? route.fulfill({json: {version: 1, spotify: {clientId: CLIENT}}}) : route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('**/brand/spotify/logo.svg', route => logo ? route.fulfill({contentType: 'image/svg+xml', body: LOGO}) : route.fulfill({status: 404, body: 'missing'}));
  await page.context().route('https://i.scdn.co/**', route => route.fulfill({contentType: 'image/png', body: PNG}));
}
/** A MOCK Spotify: authorize answers with our callback, the token endpoint with fake tokens, the player with TRACK. */
async function mockSpotify(page: Page, origin: string, {play = 204}: {play?: number} = {}) {
  const seen = {token: '' as string, api: [] as string[]};
  let playing = true;
  await page.context().route('https://accounts.spotify.com/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/authorize') return route.fulfill({status: 302, headers: {location: `${origin}/app/music/spotify?code=FAKE-CODE-1&state=${url.searchParams.get('state')}`}});
    if (url.pathname === '/api/token') { seen.token = route.request().postData() ?? ''; return route.fulfill({headers: CORS, json: {access_token: 'FAKE-ACCESS-1', token_type: 'Bearer', expires_in: 3600, refresh_token: 'FAKE-REFRESH-1', scope: 'user-read-playback-state user-read-currently-playing user-modify-playback-state'}}); }
    return route.abort();
  });
  await page.context().route('https://api.spotify.com/**', async (route: Route) => {
    const request = route.request(), url = new URL(request.url());
    seen.api.push(`${request.method()} ${url.pathname}${url.search} ${request.headers().authorization ?? ''}`);
    if (request.method() === 'GET' && url.pathname === '/v1/me/player') return route.fulfill({headers: CORS, json: {...TRACK, is_playing: playing}});
    if (url.pathname === '/v1/me/player/devices') return route.fulfill({headers: CORS, json: {devices: [TRACK.device, {id: 'dev-2', name: 'Fictional phone', type: 'Smartphone', is_active: false, volume_percent: 70}]}});
    if (url.pathname === '/v1/me/player/play') { if (play !== 204) return route.fulfill({status: play, headers: CORS, json: {error: {status: play, message: 'Player command failed: Premium required', reason: 'PREMIUM_REQUIRED'}}}); playing = true; }
    if (url.pathname === '/v1/me/player/pause') playing = false;
    return route.fulfill({status: 204, headers: CORS});
  });
  return seen;
}
const panel = (page: Page) => page.getByRole('dialog', {name: 'Your soundtrack'});
async function showPlayer(page: Page) {
  await page.goto('/app/settings');
  const card = page.getByRole('region', {name: 'Your soundtrack.'});
  await card.getByRole('button', {name: 'Show the music player'}).click();
  await expect(card.getByRole('status')).toHaveText('The music player shows again.');
  await expect(page.getByRole('button', {name: 'Open the music player'})).toBeVisible();
}

test('hidden until shown (the approved default): Settings → Music shows it; the button sits opposite ZIGi and never covers it', async ({page}) => {
  await start(page);
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.getByRole('button', {name: 'Open the music player'})).toHaveCount(0);
  await showPlayer(page);
  // On Today, where ZIGi's launcher shows too: the music button sits on the other side and the two never overlap.
  await page.goto('/app');
  const button = page.getByRole('button', {name: 'Open the music player'}), launcher = page.getByTestId('ai-launcher');
  await expect(button).toBeVisible(); await expect(launcher).toBeVisible();
  const box = (await button.boundingBox())!, zigi = (await launcher.boundingBox())!, viewport = page.viewportSize()!;
  expect(box.x + box.width / 2).toBeLessThan(viewport.width / 2);
  expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width <= zigi.x || zigi.x + zigi.width <= box.x || box.y + box.height <= zigi.y || zigi.y + zigi.height <= box.y).toBe(true);
  // The switch under Your pages & buttons is the same one, and hides it everywhere again.
  await page.goto('/app/settings');
  // Saved like every page switch (a click, then the stored choice re-renders it), as pages-visibility.spec does.
  const toggle = page.getByRole('region', {name: 'Your pages & buttons'}).getByRole('switch', {name: 'Music player'});
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(button).toHaveCount(0);
});

test('focus sounds in the panel: the NOVA look, previous and next step through the sounds, Play and Stop, Escape returns to the button', async ({page}) => {
  await start(page);
  await showPlayer(page);
  await page.getByRole('button', {name: 'Open the music player'}).click();
  const p = panel(page);
  await expect(p).toBeVisible();
  await expect(p.locator('.music-eyebrow')).toHaveText('Your soundtrack');
  const sources = p.getByRole('group', {name: 'Play from'});
  await expect(sources.getByRole('button')).toHaveText(['Focus sounds', 'Spotify', 'Apple Music']);
  await expect(sources.getByRole('button', {name: 'Focus sounds'})).toHaveAttribute('aria-pressed', 'true');
  await expect(sources.getByRole('button', {name: 'Focus sounds'})).toBeFocused();
  await expect(p.getByRole('heading', {level: 2})).toHaveText('Brown noise');
  await p.getByRole('button', {name: 'Next sound: Rain-like'}).click();
  await expect(p.getByRole('heading', {level: 2})).toHaveText('Rain-like');
  await p.getByRole('button', {name: 'Previous sound: Brown noise'}).click();
  await p.getByRole('button', {name: 'Play Brown noise'}).click();
  await expect(p.getByRole('status')).toHaveText('Playing · until you stop it');
  await expect(page.locator('.music-launcher[data-playing]')).toHaveCount(1);
  await p.getByRole('button', {name: 'Stop Brown noise'}).click();
  await expect(p.getByRole('status')).toHaveText('Made on this device · nothing is downloaded');
  await expect(p.getByRole('link', {name: 'Breathe in Meditation'})).toHaveAttribute('href', '/app/health?view=meditation');
  // Apple Music is a link only; Spotify, not set up, says so.
  await sources.getByRole('button', {name: 'Apple Music'}).click();
  await expect(p.getByRole('link', {name: 'Open Apple Music ↗'})).toHaveAttribute('href', 'https://music.apple.com/');
  await expect(p.getByRole('link', {name: 'Open Apple Music ↗'})).toHaveAttribute('rel', 'noopener noreferrer');
  await page.keyboard.press('Escape');
  await expect(p).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Open the music player'})).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:music:v1') ?? 'null'))).toMatchObject({version: 1, source: 'apple', mini: false, ambient: {sound: 'brown'}});
});

test('Spotify not set up on this site: an honest line and Open Spotify, no Connect button and no Spotify request', async ({page}) => {
  await start(page, {config: false});
  const spotify: string[] = [];
  page.on('request', r => { if (/spotify|scdn/.test(new URL(r.url()).hostname)) spotify.push(r.url()); });
  await showPlayer(page);
  await page.getByRole('button', {name: 'Open the music player'}).click();
  await panel(page).getByRole('group', {name: 'Play from'}).getByRole('button', {name: 'Spotify'}).click();
  await expect(panel(page)).toContainText('Spotify isn’t set up on this site yet');
  await expect(panel(page).getByRole('button', {name: 'Connect Spotify'})).toHaveCount(0);
  await expect(panel(page).getByRole('link', {name: 'Open Spotify ↗'})).toHaveAttribute('href', 'https://open.spotify.com/');
  await expect(page.getByRole('region', {name: 'Your soundtrack.'}).locator('.music-settings-state')).toHaveText('Not set up on this site yet: its owner needs to register a Spotify app first.');
  expect(spotify).toEqual([]);
});

test('Spotify, MOCKED: connect with PKCE, the sign-in sealed (never in storage), what plays with its logo and artwork, controls, Disconnect', async ({page, baseURL}) => {
  await start(page);
  const seen = await mockSpotify(page, new URL(baseURL!).origin);
  await showPlayer(page);
  await page.goto('/app/habits');
  await page.getByRole('button', {name: 'Open the music player'}).click();
  await panel(page).getByRole('group', {name: 'Play from'}).getByRole('button', {name: 'Spotify'}).click();
  // Spotify's (mocked) consent page sends us back; the callback exchanges the code and returns to where we were.
  await Promise.all([page.waitForURL('**/app/music/spotify**'), panel(page).getByRole('button', {name: 'Connect Spotify'}).click()]);
  await page.waitForURL('**/app/habits');
  expect(Object.fromEntries(new URLSearchParams(seen.token))).toEqual({grant_type: 'authorization_code', code: 'FAKE-CODE-1', redirect_uri: `${new URL(baseURL!).origin}/app/music/spotify`, client_id: CLIENT, code_verifier: expect.stringMatching(/^[A-Za-z0-9_-]{64}$/)});
  const storages = await page.evaluate(() => JSON.stringify({...localStorage, ...sessionStorage}));
  expect(storages).not.toContain('FAKE-ACCESS-1'); expect(storages).not.toContain('FAKE-REFRESH-1'); expect(storages).not.toContain('FAKE-CODE-1');
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(d => d.name))).toContain('zigoals-link-tokens-v1');
  await page.getByRole('button', {name: 'Open the music player'}).click();
  const p = panel(page);
  await expect(p.getByRole('heading', {level: 2})).toHaveText('Fictional Track');
  await expect(p.getByRole('img', {name: 'Spotify'})).toBeVisible();
  await expect(p.locator('.music-sub')).toHaveText('Fictional Artist · on Kitchen speaker');
  await expect(p.locator('.music-disc-art')).toHaveAttribute('src', 'https://i.scdn.co/image/ab67616d00001e02fixture300');
  await expect(p.locator('.music-progress .sr-only')).toContainText('of 3:20');
  await expect(p.getByRole('link', {name: 'Open Spotify ↗'})).toHaveAttribute('href', 'https://open.spotify.com/track/fixture123');
  await p.getByRole('button', {name: 'Pause Spotify'}).click();
  await expect(p.getByRole('button', {name: 'Play on Spotify'})).toBeVisible();
  await p.getByRole('button', {name: 'Next track'}).click();
  await expect.poll(() => seen.api.filter(a => !a.startsWith('GET /v1/me/player '))).toEqual(['PUT /v1/me/player/pause Bearer FAKE-ACCESS-1', 'POST /v1/me/player/next Bearer FAKE-ACCESS-1']);
  await p.getByText('More controls').click();
  await expect(p.getByRole('group', {name: 'Play on'}).getByRole('button', {name: /Fictional phone/})).toBeVisible();
  await p.getByRole('group', {name: 'Play on'}).getByRole('button', {name: /Fictional phone/}).click();
  await expect.poll(() => seen.api.some(a => a === 'PUT /v1/me/player Bearer FAKE-ACCESS-1')).toBe(true);
  await p.getByRole('button', {name: 'Disconnect Spotify'}).click();
  await expect(p.getByRole('button', {name: 'Connect Spotify'})).toBeVisible();
});

test('Spotify, MOCKED: without the owner\'s logo file no track is shown; a refused play says Premium or the owner\'s list', async ({page, baseURL}) => {
  await start(page, {logo: false});
  await mockSpotify(page, new URL(baseURL!).origin, {play: 403});
  await showPlayer(page);
  await page.getByRole('button', {name: 'Open the music player'}).click();
  await panel(page).getByRole('group', {name: 'Play from'}).getByRole('button', {name: 'Spotify'}).click();
  await Promise.all([page.waitForURL('**/app/music/spotify**'), panel(page).getByRole('button', {name: 'Connect Spotify'}).click()]);
  await page.waitForURL('**/app/settings');
  await page.getByRole('button', {name: 'Open the music player'}).click();
  await expect(panel(page)).toContainText('this site lacks Spotify’s logo');
  await expect(panel(page)).not.toContainText('Fictional Track');
  // With the logo, a play Spotify refuses (403) says why, in words.
  await page.unroute('**/brand/spotify/logo.svg');
  await page.route('**/brand/spotify/logo.svg', route => route.fulfill({contentType: 'image/svg+xml', body: LOGO}));
  await page.reload();
  await page.getByRole('button', {name: 'Open the music player'}).click();
  await expect(panel(page).getByRole('heading', {level: 2})).toHaveText('Fictional Track');
  await panel(page).getByRole('button', {name: 'Pause Spotify'}).click();
  await panel(page).getByRole('button', {name: 'Play on Spotify'}).click();
  await expect(panel(page).getByRole('alert')).toHaveText('Spotify refused this. Controlling playback needs Spotify Premium, and while ZIGoals is in Spotify’s development mode only accounts the owner listed can use it.');
});

test('the mini-bar takes the button\'s place on this device; the phone\'s More sheet opens the player', async ({page, isMobile}) => {
  await start(page);
  await showPlayer(page);
  await page.getByRole('button', {name: 'Open the music player'}).click();
  await panel(page).getByRole('button', {name: 'Mini-bar'}).click();
  await expect(panel(page).getByRole('button', {name: 'Mini-bar'})).toHaveAttribute('aria-pressed', 'true');
  await panel(page).getByRole('button', {name: 'Close the music player'}).click();
  const mini = page.getByRole('group', {name: 'Music player'});
  await expect(mini.getByRole('button', {name: 'Focus sounds · Brown noise: open the music player'})).toBeFocused();
  await mini.getByRole('button', {name: 'Play the focus sound'}).click();
  await expect(mini.getByRole('button', {name: 'Brown noise: open the music player'})).toBeVisible();
  await mini.getByRole('button', {name: 'Stop the focus sound'}).click();
  if (isMobile) {
    await page.getByRole('button', {name: 'More', exact: true}).click();
    await page.getByRole('button', {name: 'Your soundtrack'}).click();
    await expect(panel(page)).toBeVisible();
    const sheet = (await panel(page).boundingBox())!, viewport = page.viewportSize()!;
    expect(sheet.x).toBeGreaterThanOrEqual(0); expect(sheet.x + sheet.width).toBeLessThanOrEqual(viewport.width);
  }
});

test('the Showcase shows the player and connects nothing: no Spotify request, no music configuration asked', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  // Counted from the moment the Showcase is loaded (the Settings visit before it is an ordinary Local Demo page).
  const asked: string[] = []; let showcase = false;
  page.on('request', r => { const url = new URL(r.url()); if (showcase && (/spotify|scdn/.test(url.hostname) || url.pathname === '/api/music-config')) asked.push(r.url()); });
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  showcase = true;
  await page.getByRole('button', {name: 'Open the music player'}).click();
  await panel(page).getByRole('group', {name: 'Play from'}).getByRole('button', {name: 'Spotify'}).click();
  await expect(panel(page)).toContainText('The Showcase connects nothing.');
  await expect(panel(page).getByRole('button', {name: 'Connect Spotify'})).toHaveCount(0);
  await page.goto('/app/settings');
  await expect(page.getByRole('region', {name: 'Your soundtrack.'}).locator('.music-settings-state')).toHaveText('The Showcase connects nothing.');
  expect(asked).toEqual([]);
});
