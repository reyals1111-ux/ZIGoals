import 'fake-indexeddb/auto';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {LINK_TOKENS_DATABASE, readTokens, sealTokens} from '../../links/token-store';
import {MUSIC_PENDING_KEY, SPOTIFY_SCOPES, beginSpotify, readSpotifyCallback, redirectUri, safeBack, validClientId} from './oauth';
import {SpotifyReconnect, exchangeCode, refreshTokens, tokensFresh} from './tokens';
import {SpotifyError, artworkAllowed, createSpotifyPlayer, readPlayback, spotifyLink} from './player';
import {spotifySession} from './session';

// Session W Part 20 (Music, [TIER 3] (egress + tokens)): Spotify's PKCE connection, token exchange and refresh, the
// player's answers and the sealed session, all against MOCK answers (no request leaves the test).
class Memory implements Storage { private m = new Map<string, string>(); get length() { return this.m.size; } clear() { this.m.clear(); } getItem(k: string) { return this.m.get(k) ?? null; } key(i: number) { return [...this.m.keys()][i] ?? null; } removeItem(k: string) { this.m.delete(k); } setItem(k: string, v: string) { this.m.set(k, v); } }
const CLIENT = '0123456789abcdef0123456789abcdef', ORIGIN = 'https://alpha.example.test', ACCOUNT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', NOW = Date.parse('2026-10-07T08:00:00Z');
afterEach(async () => { vi.unstubAllGlobals(); vi.useRealTimers(); await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(LINK_TOKENS_DATABASE); r.onsuccess = r.onerror = r.onblocked = () => resolve(); }); });
const sha256 = async (text: string) => { let s = ''; for (const b of new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };

describe('connecting (Authorization Code with PKCE)', () => {
  test('the visit to Spotify carries the public client id, the one redirect address, S256 of a 64-character verifier, a fresh state and the three scopes', async () => {
    const storage = new Memory(), url = new URL(await beginSpotify({clientId: CLIENT, origin: ORIGIN, scope: ACCOUNT, back: '/app/habits?view=week'}, storage, NOW));
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize');
    const pending = JSON.parse(storage.getItem(MUSIC_PENDING_KEY)!);
    expect(pending).toEqual({state: url.searchParams.get('state'), verifier: expect.stringMatching(/^[A-Za-z0-9_-]{64}$/), scope: ACCOUNT, back: '/app/habits?view=week', at: NOW});
    expect(Object.fromEntries(url.searchParams)).toEqual({client_id: CLIENT, response_type: 'code', redirect_uri: 'https://alpha.example.test/app/music/spotify', code_challenge_method: 'S256', code_challenge: await sha256(pending.verifier), state: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/), scope: 'user-read-playback-state user-read-currently-playing user-modify-playback-state'});
    expect(SPOTIFY_SCOPES).toHaveLength(3);
    // A second visit gets a new state and verifier.
    await beginSpotify({clientId: CLIENT, origin: ORIGIN, scope: ACCOUNT, back: '/app'}, storage, NOW);
    expect(JSON.parse(storage.getItem(MUSIC_PENDING_KEY)!).state).not.toBe(pending.state);
  });
  test('the answer is used once: matched to this tab\'s state, within 10 minutes, for the same account; refusals and declines keep nothing', async () => {
    const start = async (back = '/app/settings') => { const storage = new Memory(); const url = new URL(await beginSpotify({clientId: CLIENT, origin: ORIGIN, scope: ACCOUNT, back}, storage, NOW)); return {storage, state: url.searchParams.get('state')!, verifier: JSON.parse(storage.getItem(MUSIC_PENDING_KEY)!).verifier as string}; };
    let s = await start('/app/chess');
    expect(readSpotifyCallback('', ACCOUNT, s.storage, NOW)).toEqual({kind: 'none'});
    expect(readSpotifyCallback(`?code=CODE-1&state=${s.state}`, ACCOUNT, s.storage, NOW + 60_000)).toEqual({kind: 'code', code: 'CODE-1', verifier: s.verifier, back: '/app/chess'});
    expect(s.storage.getItem(MUSIC_PENDING_KEY)).toBeNull();
    expect(readSpotifyCallback(`?code=CODE-1&state=${s.state}`, ACCOUNT, s.storage, NOW + 61_000)).toMatchObject({kind: 'refused'});
    s = await start();
    expect(readSpotifyCallback(`?code=CODE-2&state=not-the-state`, ACCOUNT, s.storage, NOW)).toEqual({kind: 'refused', message: expect.stringMatching(/did not match a connection started in this tab/)});
    expect(s.storage.getItem(MUSIC_PENDING_KEY)).toBeNull();
    s = await start();
    expect(readSpotifyCallback(`?code=CODE-3&state=${s.state}`, ACCOUNT, s.storage, NOW + 10 * 60_000 + 1)).toEqual({kind: 'refused', message: expect.stringMatching(/longer than 10 minutes/)});
    s = await start();
    expect(readSpotifyCallback(`?code=CODE-4&state=${s.state}`, 'local', s.storage, NOW)).toEqual({kind: 'refused', message: expect.stringMatching(/account changed or locked/)});
    s = await start('/app/goals');
    expect(readSpotifyCallback(`?error=access_denied&state=${s.state}`, ACCOUNT, s.storage, NOW)).toEqual({kind: 'denied', back: '/app/goals'});
  });
  test('only an address inside the app is returned to; the callback itself and other sites become Settings', () => {
    for (const ok of ['/app', '/app/settings#music', '/app/health?view=sleep']) expect(safeBack(ok)).toBe(ok);
    for (const bad of ['//evil.example', 'https://evil.example/app', '/application', '/app/music/spotify?code=x', '/app/../x', '/app/./settings', '/app/x y', '/app\\evil', 'javascript:alert(1)']) expect(safeBack(bad), bad).toBe('/app/settings');
    expect(redirectUri('http://127.0.0.1:3100')).toBe('http://127.0.0.1:3100/app/music/spotify');
  });
  test('a client id is 32 hexadecimal characters, else Spotify is not set up', () => {
    expect(validClientId(CLIENT)).toBe(true);
    for (const bad of [undefined, null, '', 'x'.repeat(32), CLIENT.slice(1), `${CLIENT}0`, 42]) expect(validClientId(bad)).toBe(false);
  });
});

describe('tokens', () => {
  const answer = (status: number, json: unknown) => vi.fn(async () => Response.json(json, {status}));
  test('the code is exchanged with a form POST that has the verifier and no secret; the access token is kept as running out a minute early', async () => {
    const fetcher = answer(200, {access_token: 'FAKE-ACCESS-1', token_type: 'Bearer', expires_in: 3600, refresh_token: 'FAKE-REFRESH-1', scope: 'user-read-playback-state'});
    expect(await exchangeCode({clientId: CLIENT, origin: ORIGIN, code: 'CODE-1', verifier: 'v'.repeat(64)}, fetcher, NOW)).toEqual({accessToken: 'FAKE-ACCESS-1', refreshToken: 'FAKE-REFRESH-1', expiresAt: new Date(NOW + 3540_000).toISOString(), scope: 'user-read-playback-state'});
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://accounts.spotify.com/api/token');
    expect(init).toMatchObject({method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, credentials: 'omit', referrerPolicy: 'no-referrer'});
    expect(Object.fromEntries(new URLSearchParams(String(init.body)))).toEqual({grant_type: 'authorization_code', code: 'CODE-1', redirect_uri: 'https://alpha.example.test/app/music/spotify', client_id: CLIENT, code_verifier: 'v'.repeat(64)});
    expect(String(init.body)).not.toMatch(/secret/i);
  });
  test('a refresh keeps the refresh token when Spotify sends none and takes a rotated one; invalid_grant asks to connect again', async () => {
    const tokens = {accessToken: 'FAKE-OLD', refreshToken: 'FAKE-REFRESH-1', expiresAt: new Date(NOW - 1).toISOString()};
    expect(await refreshTokens({clientId: CLIENT, tokens}, answer(200, {access_token: 'FAKE-NEW', token_type: 'bearer', expires_in: 3600}), NOW)).toEqual({accessToken: 'FAKE-NEW', refreshToken: 'FAKE-REFRESH-1', expiresAt: new Date(NOW + 3540_000).toISOString()});
    const rotated = answer(200, {access_token: 'FAKE-NEWER', token_type: 'Bearer', expires_in: 3600, refresh_token: 'FAKE-REFRESH-2'});
    expect((await refreshTokens({clientId: CLIENT, tokens}, rotated, NOW)).refreshToken).toBe('FAKE-REFRESH-2');
    expect(Object.fromEntries(new URLSearchParams(String((rotated.mock.calls[0] as unknown as [string, RequestInit])[1].body)))).toEqual({grant_type: 'refresh_token', refresh_token: 'FAKE-REFRESH-1', client_id: CLIENT});
    await expect(refreshTokens({clientId: CLIENT, tokens}, answer(400, {error: 'invalid_grant', error_description: 'Refresh token revoked'}), NOW)).rejects.toBeInstanceOf(SpotifyReconnect);
    await expect(refreshTokens({clientId: CLIENT, tokens}, answer(500, {error: 'server_error'}), NOW)).rejects.toThrow('Spotify did not answer as expected. Nothing was changed.');
    await expect(refreshTokens({clientId: CLIENT, tokens}, answer(200, {access_token: 'X', token_type: 'mac', expires_in: 3600}), NOW)).rejects.toThrow('Spotify did not answer as expected');
    await expect(refreshTokens({clientId: CLIENT, tokens: {accessToken: 'FAKE-ONLY'}}, answer(200, {}), NOW)).rejects.toBeInstanceOf(SpotifyReconnect);
    expect(tokensFresh({accessToken: 'a', expiresAt: new Date(NOW + 1000).toISOString()}, NOW)).toBe(true);
    expect(tokensFresh({accessToken: 'a', expiresAt: new Date(NOW).toISOString()}, NOW)).toBe(false);
  });
});

describe('the player', () => {
  const track = {device: {id: 'dev-1', name: 'Kitchen speaker', type: 'Speaker', is_active: true, volume_percent: 40, supports_volume: true}, is_playing: true, progress_ms: 61_000, shuffle_state: false, repeat_state: 'context',
    item: {name: 'Fictional Track', duration_ms: 200_000, artists: [{name: 'Fictional Artist'}, {name: 'Second Fictional'}], album: {name: 'Fictional Album', images: [{url: 'https://i.scdn.co/image/ab67616d0000b273fixture640', width: 640, height: 640}, {url: 'https://i.scdn.co/image/ab67616d00001e02fixture300', width: 300, height: 300}, {url: 'https://evil.example/image/x', width: 300, height: 300}]}, external_urls: {spotify: 'https://open.spotify.com/track/fixture123'}}};
  test('what plays: the title, the artists, the nearest-to-300 px artwork from Spotify\'s image host only, a link back to open.spotify.com only', () => {
    expect(readPlayback(track)).toEqual({playing: true, progressMs: 61_000, durationMs: 200_000, title: 'Fictional Track', subtitle: 'Fictional Artist, Second Fictional', artwork: {url: 'https://i.scdn.co/image/ab67616d00001e02fixture300', size: 300}, link: 'https://open.spotify.com/track/fixture123', device: {id: 'dev-1', name: 'Kitchen speaker', type: 'Speaker', active: true, volume: 40}, shuffle: false, repeat: 'context'});
    expect(readPlayback(null)).toBeNull();
    expect(readPlayback({...track, item: null})).toBeNull();
    const elsewhere = readPlayback({...track, device: {...track.device, supports_volume: false}, item: {...track.item, album: {name: 'A', images: [{url: 'http://i.scdn.co/image/abc'}]}, external_urls: {spotify: 'https://evil.example/track'}}})!;
    expect(elsewhere.artwork).toBeNull(); expect(elsewhere.link).toBe('https://open.spotify.com/'); expect(elsewhere.device?.volume).toBeNull();
    expect(artworkAllowed('https://i.scdn.co/image/ab67616d0000b273abc')).toBe(true);
    for (const bad of ['https://i.scdn.co/image/../x', 'https://i.scdn.co.evil.example/image/abc', 'https://mosaic.scdn.co/640/abc']) expect(artworkAllowed(bad), bad).toBe(false);
    expect(spotifyLink('https://open.spotify.com/episode/abc_1-2')).toBe('https://open.spotify.com/episode/abc_1-2');
    expect(spotifyLink('javascript:alert(1)')).toBe('https://open.spotify.com/');
  });
  function player(responses: (Response | (() => Response))[], options: {clock?: () => number} = {}) {
    const calls: {url: string; init: RequestInit}[] = [], refresh = vi.fn(async () => 'FAKE-ACCESS-2');
    const fetcher = vi.fn(async (url: string, init: RequestInit) => { calls.push({url, init}); const next = responses.shift(); if (!next) throw Error('no more answers'); return typeof next === 'function' ? next() : next; }) as unknown as typeof fetch;
    return {calls, refresh, p: createSpotifyPlayer({token: async () => 'FAKE-ACCESS-1', refresh, fetcher, ...options})};
  }
  test('each control is the documented request with the bearer token, no cookies and no referrer', async () => {
    const {calls, p} = player(Array.from({length: 9}, () => new Response(null, {status: 204})));
    await p.play('dev 1'); await p.pause(); await p.next(); await p.previous(); await p.seek(61_234.6); await p.volume(140); await p.shuffle(true); await p.repeat('track'); await p.transfer('dev-2', true);
    expect(calls.map(c => `${c.init.method} ${c.url}`)).toEqual([
      'PUT https://api.spotify.com/v1/me/player/play?device_id=dev+1', 'PUT https://api.spotify.com/v1/me/player/pause', 'POST https://api.spotify.com/v1/me/player/next', 'POST https://api.spotify.com/v1/me/player/previous',
      'PUT https://api.spotify.com/v1/me/player/seek?position_ms=61235', 'PUT https://api.spotify.com/v1/me/player/volume?volume_percent=100', 'PUT https://api.spotify.com/v1/me/player/shuffle?state=true', 'PUT https://api.spotify.com/v1/me/player/repeat?state=track', 'PUT https://api.spotify.com/v1/me/player']);
    expect(calls.at(-1)!.init.body).toBe(JSON.stringify({device_ids: ['dev-2'], play: true}));
    for (const c of calls) expect(c.init).toMatchObject({headers: expect.objectContaining({Authorization: 'Bearer FAKE-ACCESS-1'}), credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store'});
  });
  test('204 from /me/player means nothing plays; a 401 refreshes once and retries; a second 401 asks to connect again', async () => {
    let t = player([new Response(null, {status: 204})]);
    expect(await t.p.playback()).toBeNull();
    t = player([new Response(null, {status: 401}), Response.json(track)]);
    expect((await t.p.playback())?.title).toBe('Fictional Track');
    expect(t.refresh).toHaveBeenCalledTimes(1);
    expect((t.calls[1]!.init.headers as Record<string, string>).Authorization).toBe('Bearer FAKE-ACCESS-2');
    t = player([new Response(null, {status: 401}), new Response(null, {status: 401})]);
    await expect(t.p.pause()).rejects.toBeInstanceOf(SpotifyReconnect);
  });
  test('403 says Premium or the owner\'s list, 404 says no device, a network failure says not answering', async () => {
    const kind = async (response: Response | (() => Response)) => { try { await player([response]).p.play(); return 'ok'; } catch (error) { return error instanceof SpotifyError ? `${error.kind}: ${error.message}` : String(error); } };
    expect(await kind(Response.json({error: {status: 403, message: 'Player command failed: Premium required', reason: 'PREMIUM_REQUIRED'}}, {status: 403}))).toBe('premium: Spotify refused this. Controlling playback needs Spotify Premium, and while ZIGoals is in Spotify’s development mode only accounts the owner listed can use it.');
    expect(await kind(Response.json({error: {status: 404, message: 'Player command failed: No active device found', reason: 'NO_ACTIVE_DEVICE'}}, {status: 404}))).toMatch(/^no-device: No Spotify device is playing\./);
    expect(await kind(() => { throw new TypeError('Failed to fetch'); })).toMatch(/^unavailable: Spotify is not answering/);
    expect(await kind(new Response('not json', {status: 200}))).toMatch(/^unavailable:/);
  });
  test('429: nothing more is sent until Retry-After has passed (30 s when the browser may not read it), and nothing retries by itself', async () => {
    let now = NOW;
    const t = player([new Response(null, {status: 429, headers: {'Retry-After': '7'}}), new Response(null, {status: 204}), new Response(null, {status: 429}), new Response(null, {status: 204})], {clock: () => now});
    await expect(t.p.next()).rejects.toMatchObject({kind: 'rate'});
    now += 6_000; await expect(t.p.next()).rejects.toMatchObject({kind: 'rate'});
    expect(t.calls).toHaveLength(1);
    now += 1_001; await t.p.next();
    await expect(t.p.next()).rejects.toMatchObject({kind: 'rate'});
    now += 29_000; await expect(t.p.next()).rejects.toMatchObject({kind: 'rate'});
    now += 1_001; await t.p.next();
    expect(t.calls).toHaveLength(4);
  });
  test('devices: only those with an id, volume null where the device has none', async () => {
    const {p} = player([Response.json({devices: [{id: 'a', name: 'Phone', type: 'Smartphone', is_active: false, volume_percent: 70}, {id: null, name: 'Restricted', type: 'Speaker', is_active: false, volume_percent: null}, {id: 'b', name: 'TV', type: 'TV', is_active: true, volume_percent: 10, supports_volume: false}]})]);
    expect(await p.devices()).toEqual([{id: 'a', name: 'Phone', type: 'Smartphone', active: false, volume: 70}, {id: 'b', name: 'TV', type: 'TV', active: true, volume: null}]);
  });
});

describe('the sealed session', () => {
  test('a fresh token is used as it is; a spent one is refreshed and the rotated refresh token sealed; invalid_grant forgets the sign-in', async () => {
    const session = spotifySession({clientId: CLIENT, scope: ACCOUNT});
    expect(await session.connected()).toBe(false);
    await expect(session.token()).rejects.toBeInstanceOf(SpotifyReconnect);
    await sealTokens(ACCOUNT, 'spotify', {accessToken: 'FAKE-FRESH', refreshToken: 'FAKE-REFRESH-1', expiresAt: new Date(Date.now() + 600_000).toISOString()});
    const fetcher = vi.fn(async () => Response.json({access_token: 'FAKE-ROTATED-ACCESS', token_type: 'Bearer', expires_in: 3600, refresh_token: 'FAKE-REFRESH-2'}));
    vi.stubGlobal('fetch', fetcher);
    expect(await session.token()).toBe('FAKE-FRESH');
    expect(fetcher).not.toHaveBeenCalled();
    await sealTokens(ACCOUNT, 'spotify', {accessToken: 'FAKE-SPENT', refreshToken: 'FAKE-REFRESH-1', expiresAt: new Date(Date.now() - 1).toISOString()});
    expect(await session.token()).toBe('FAKE-ROTATED-ACCESS');
    expect(await readTokens(ACCOUNT, 'spotify')).toMatchObject({accessToken: 'FAKE-ROTATED-ACCESS', refreshToken: 'FAKE-REFRESH-2'});
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({error: 'invalid_grant'}, {status: 400})));
    await expect(session.refresh()).rejects.toBeInstanceOf(SpotifyReconnect);
    expect(await readTokens(ACCOUNT, 'spotify')).toBeNull();
    expect(await session.connected()).toBe(false);
  });
  test('the Showcase never keeps a Spotify sign-in, and Disconnect removes it', async () => {
    await expect(sealTokens('showcase', 'spotify', {accessToken: 'FAKE'})).rejects.toThrow('Showcase does not link services.');
    await sealTokens('local', 'spotify', {accessToken: 'FAKE-LOCAL'});
    const session = spotifySession({clientId: CLIENT, scope: 'local'});
    expect(await session.connected()).toBe(true);
    await session.disconnect();
    expect(await session.connected()).toBe(false);
  });
});
