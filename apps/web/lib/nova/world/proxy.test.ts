import {afterEach, describe, expect, test, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import egress from '../../egress-policy.json';
import {WEATHER_PROXY_ENV, WEATHER_PROXY_PATH, composeCsp, connectSources, weatherProxyUrl, withWeatherProxy} from '../../csp-compose.mjs';
import forecast from './fixtures/forecast-brussels.json';
import sunBrussels from './fixtures/sun-brussels.json';
import {MAX_ANSWER_CHARS, MET_HOST, MET_NO_CURRENT, MET_SILENT, MET_STOPPED, MET_UNREADABLE, MIN_ASK_GAP_MS, WeatherError, fetchWeather, forecastUrl, shouldFetch} from './met';
import {PROXY_BUSY, PROXY_REFUSED, PROXY_SILENT, SWITCH_NOTE_DIRECT, SWITCH_NOTE_PROXY, WEATHER_OFF_WORDS_PROXY, WEATHER_PROXY_URL, placeChosenWords, proxyExpires, proxyForecastUrl, switchNote, switchedWords, weatherViaProxy} from './proxy';
import {WEATHER_OFF_WORDS, WEATHER_OFF_WORDS_DIRECT} from './ask';
import {emptyWorld, readingOf, setPlace, setWorldOn, type NovaWorld} from './record';

// Session AM-2 (owner's step 4a; TIER 3 (CSP/egress)): the weather proxy. Nothing in this file reaches the network.
const PROXY = 'https://weather.example.org/v1/forecast';
const BRUSSELS = {name: 'Brussels', lat: 50.85, lon: 4.35}, ZONE = 'Europe/Brussels', NOW = new Date('2026-11-11T04:35:00Z'), MINUTE = 60_000;
const chosen = (): NovaWorld => setPlace(setWorldOn(emptyWorld(), true), BRUSSELS);
type Call = {url: string; init: RequestInit};
const service = (...answers: (Response | Error)[]) => {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => { calls.push({url: String(input), init: init ?? {}}); const next = answers.shift(); if (!next) throw Error('no more answers'); if (next instanceof Error) throw next; return next; }) as typeof fetch;
  return {calls, impl};
};
const ok = (body: unknown, headers: Record<string, string> = {}, status = 200) => new Response(JSON.stringify(body), {status, headers});
const failure = async (p: Promise<unknown>): Promise<WeatherError> => { try { await p; } catch (e) { return e as WeatherError; } throw Error('expected a failure'); };
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('the proxy\'s address comes from build configuration, strictly read', () => {
  test('exactly https://<dns name>/v1/forecast (or the Worker\'s own local rule); anything else is no proxy', () => {
    expect([WEATHER_PROXY_ENV, WEATHER_PROXY_PATH]).toEqual(['NEXT_PUBLIC_WEATHER_PROXY_URL', '/v1/forecast']);
    for (const good of [PROXY, 'https://weather.zigoals.app/v1/forecast', 'https://w.example.co.uk:8443/v1/forecast']) { expect(weatherProxyUrl(good), good).toBe(good); expect(weatherProxyUrl(good, {local: true}), good).toBe(good); }
    // Security review (finding 10a, deliberate): the loopback http form is a proxy only for a local build (was: accepted by every build).
    const LOOP = 'http://127.0.0.1:8787/v1/forecast';
    expect(weatherProxyUrl(LOOP)).toBeNull(); expect(weatherProxyUrl(LOOP, {})).toBeNull(); expect(weatherProxyUrl(LOOP, {local: false})).toBeNull();
    expect(weatherProxyUrl(LOOP, {local: 'yes' as unknown as boolean})).toBeNull();
    expect(weatherProxyUrl(LOOP, {local: true})).toBe(LOOP);
    // A local build accepts nothing else that is not https: no other loopback name, no other port-less or private address.
    for (const bad of ['http://localhost:8787/v1/forecast', 'http://127.0.0.1/v1/forecast', 'http://127.0.0.2:8787/v1/forecast', 'http://0.0.0.0:8787/v1/forecast', 'http://192.168.1.10:8787/v1/forecast', 'http://weather.example.org/v1/forecast', 'http://127.0.0.1:8787/', 'http://127.0.0.1:8787/v1/forecast?x=1'])
      expect(weatherProxyUrl(bad, {local: true}), bad).toBeNull();
    for (const bad of [undefined, null, '', 0, {}, 'weather.example.org/v1/forecast', 'http://weather.example.org/v1/forecast', 'https://weather.example.org', 'https://weather.example.org/', 'https://weather.example.org/v1/forecast/',
      'https://weather.example.org/v1/forecast?lat=1', 'https://weather.example.org/v1/forecast#x', 'https://user:pw@weather.example.org/v1/forecast', 'https://user@weather.example.org/v1/forecast', 'https://WEATHER.example.org/v1/forecast',
      'https://weather.example.org:443/v1/forecast', 'https://weather.example.org/v1/../v1/forecast', 'https://weather.example.org/V1/forecast', 'https://*.example.org/v1/forecast', 'https://localhost/v1/forecast',
      'https://192.168.1.10/v1/forecast', 'https://[::1]/v1/forecast', 'https://10.0.0.1:8443/v1/forecast', 'http://localhost:8787/v1/forecast', 'http://127.0.0.1/v1/forecast', 'http://127.0.0.2:8787/v1/forecast', 'http://0.0.0.0:8787/v1/forecast',
      'https://api.met.no/weatherapi/locationforecast/2.0/complete', 'javascript:alert(1)', 'data:text/plain,x', '//weather.example.org/v1/forecast', ' https://weather.example.org/v1/forecast', 'https://weather.example.org/v1/forecast ',
      'https://weather.example.org/v1/forecast\n', `https://${'a'.repeat(300)}.example.org/v1/forecast`, 'https://xn--/v1/forecast', 'https://weather..example.org/v1/forecast', 'https://-weather.example.org/v1/forecast']) expect(weatherProxyUrl(bad), String(bad)).toBeNull();
    // An internationalised name is accepted only in the spelling the browser itself would send (punycode).
    expect(weatherProxyUrl('https://wéather.example.org/v1/forecast')).toBeNull();
    expect(weatherProxyUrl('https://xn--wather-bva.example.org/v1/forecast')).toBe('https://xn--wather-bva.example.org/v1/forecast');
  });
  test('this build has none: the client\'s constant is null and the words are Session AM\'s', () => {
    expect(process.env.NEXT_PUBLIC_WEATHER_PROXY_URL).toBeUndefined();
    expect(WEATHER_PROXY_URL).toBeNull();
    expect(weatherViaProxy()).toBe(false);
    expect(switchNote()).toBe(SWITCH_NOTE_DIRECT);
    expect(WEATHER_OFF_WORDS).toBe(WEATHER_OFF_WORDS_DIRECT);
    expect(placeChosenWords('Brussels')).toBe('Your place for the weather is Brussels. MET Norway is asked for that place, rounded to about 1 km.');
    expect(switchedWords(false)).toBe('Weather is off. Nothing is asked from MET Norway.');
    expect(switchedWords(true)).toBe('Weather is on. Choose your place below.');
  });
  test('the address is read from the build\'s environment only: no storage, address bar, record or model can set it', () => {
    const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');
    for (const file of ['./proxy.ts', './met.ts', './sun-calc.ts']) for (const banned of ['localStorage', 'sessionStorage', 'getAppStorage', 'location.', 'searchParams', 'document.', 'window.']) expect(read(file), `${file} ${banned}`).not.toContain(banned);
    // Security review (finding 10a, deliberate): the module now also reads which kind of build this is (was: the one variable
    // only). The address itself still comes from NEXT_PUBLIC_WEATHER_PROXY_URL alone; the other two only say whether the
    // loopback test form may be accepted.
    expect(read('./proxy.ts').match(/process\.env\.[A-Z_]+/g)).toEqual(['process.env.NODE_ENV', 'process.env.NEXT_PUBLIC_APP_ENVIRONMENT', 'process.env.NEXT_PUBLIC_WEATHER_PROXY_URL']);
    expect(read('./proxy.ts').match(/weatherProxyUrl\(process\.env\.[A-Z_]+/g)).toEqual(['weatherProxyUrl(process.env.NEXT_PUBLIC_WEATHER_PROXY_URL']);
    expect(read('./met.ts')).not.toContain('process.env');
    // A build configured with one: the same reader gives the client its address.
    vi.stubEnv('NEXT_PUBLIC_WEATHER_PROXY_URL', PROXY);
    return import('./proxy').then(async built => {
      expect(built.WEATHER_PROXY_URL).toBe(PROXY); expect(built.switchNote()).toBe(SWITCH_NOTE_PROXY);
      expect((await import('./ask')).WEATHER_OFF_WORDS).toEqual(WEATHER_OFF_WORDS_PROXY);
      vi.stubEnv('NEXT_PUBLIC_WEATHER_PROXY_URL', 'https://evil.example.org/steal?x=1'); vi.resetModules();
      expect((await import('./proxy')).WEATHER_PROXY_URL).toBeNull();
    });
  });
});

describe('connect-src: the proxy\'s origin only when configured (TIER 3 (CSP/egress))', () => {
  const options = {nonce: 'NONCE', development: false, https: true, pathname: '/app/nova'};
  test('not configured, or a value that is not accepted: the committed policy object itself, so every policy is byte for byte what it was', () => {
    for (const value of [undefined, '', 'https://evil.example.org/', 'http://weather.example.org/v1/forecast', 'https://weather.example.org/v1/forecast?x']) {
      expect(withWeatherProxy(egress, value), String(value)).toBe(egress);
      expect(composeCsp(withWeatherProxy(egress, value), options)).toBe(composeCsp(egress, options));
    }
    expect(JSON.stringify(egress)).not.toContain('weather.example');
  });
  test('configured: exactly one more source, the proxy\'s origin, on /app documents only, right after MET Norway\'s host; the committed policy is not changed', () => {
    const before = JSON.stringify(egress), built = withWeatherProxy(egress, PROXY);
    expect(JSON.stringify(egress)).toBe(before);
    const was = connectSources(egress, 'app'), now = connectSources(built, 'app');
    expect(now.filter(s => !was.includes(s))).toEqual(['https://weather.example.org']);
    expect(now.filter(s => s !== 'https://weather.example.org')).toEqual(was);
    expect(now[now.indexOf(MET_HOST) + 1]).toBe('https://weather.example.org');
    // The balance hosts stay the tail (lib/wallets/balances/hosts.test.ts).
    expect(now.at(-1)).toBe(was.at(-1));
    expect(connectSources(built, 'site')).toEqual(connectSources(egress, 'site'));
    // Every other directive of every document is unchanged, and so is the whole policy of a site document.
    expect(composeCsp(built, {...options, pathname: '/'})).toBe(composeCsp(egress, {...options, pathname: '/'}));
    const strip = (csp: string) => csp.replace(/connect-src [^;]*;/, '');
    expect(strip(composeCsp(built, options))).toBe(strip(composeCsp(egress, options)));
    expect(composeCsp(built, options)).toContain(' https://api.met.no https://weather.example.org https://cosmos-rest.publicnode.com');
    // Only an origin: never a path, a wildcard or a scheme-only source.
    expect(now.filter(s => s.includes('weather'))).toEqual([new URL(PROXY).origin]);
    // Configured twice, or with an origin the policy already allows: nothing is added twice.
    expect(withWeatherProxy(built, PROXY)).toBe(built);
    expect(withWeatherProxy(egress, 'http://127.0.0.1:8787/v1/forecast')).toBe(egress);
  });
  test('the app\'s own policy (middleware) follows the build: without the variable the committed policy; with it, the origin', async () => {
    const plain = await import('../../security-policy');
    expect(plain.BUILD_EGRESS).toBe((await import('../../egress-policy.json')).default);
    expect(plain.CONNECT_SOURCES).toEqual(connectSources(egress, 'app'));
    vi.stubEnv('NEXT_PUBLIC_WEATHER_PROXY_URL', PROXY); vi.resetModules();
    const built = await import('../../security-policy');
    expect(built.CONNECT_SOURCES).toEqual(connectSources(withWeatherProxy(egress, PROXY), 'app'));
    const {nonce, csp} = built.securityPolicy(false, true, '/app/nova');
    expect(csp.replace(nonce, 'NONCE')).toBe(composeCsp(withWeatherProxy(egress, PROXY), options));
    expect(built.securityPolicy(false, true, '/').csp).not.toContain('weather.example.org');
  });
});

describe('the weather client through the proxy', () => {
  test('the request: the proxy\'s one route with the same two decimals; a plain GET with no cookie, no Referer and no header of ours; a redirect is an error', () => {
    expect(proxyForecastUrl(PROXY, BRUSSELS)).toBe('https://weather.example.org/v1/forecast?lat=50.85&lon=4.35');
    expect(proxyForecastUrl(PROXY, {lat: 50.8503396, lon: 4.3517103})).toBe('https://weather.example.org/v1/forecast?lat=50.85&lon=4.35');
    expect(proxyForecastUrl(PROXY, {lat: 40.7, lon: -74})).toBe('https://weather.example.org/v1/forecast?lat=40.70&lon=-74.00');
    expect(new URL(proxyForecastUrl(PROXY, BRUSSELS)).search).toBe(new URL(forecastUrl(BRUSSELS)).search);
    for (const place of [{lat: 91, lon: 0}, {lat: 0, lon: 181}, {lat: Number.NaN, lon: 0}]) expect(() => proxyForecastUrl(PROXY, place)).toThrow(/latitude/);
    expect(() => proxyForecastUrl('https://evil.example.org/', BRUSSELS)).toThrow('The weather proxy address is not one this build accepts.');
  });
  test('one request, to the proxy and never to api.met.no; the sun is worked out on the device; the reading is kept until the proxy\'s max-age', async () => {
    const {calls, impl} = service(ok(forecast, {'cache-control': 'public, max-age=1500', 'x-weather-cache': 'hit', expires: 'Wed, 11 Nov 2099 00:00:00 GMT', 'last-modified': 'Wed, 11 Nov 2026 04:00:00 GMT'}));
    const next = await fetchWeather({world: chosen(), now: NOW, fetchImpl: impl, timeZone: ZONE, proxy: PROXY});
    expect(calls.map(c => c.url)).toEqual(['https://weather.example.org/v1/forecast?lat=50.85&lon=4.35']);
    expect(calls[0]!.init).toEqual({method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-cache', referrerPolicy: 'no-referrer'});
    const reading = readingOf(next)!;
    expect(reading.now.t).toBe(readingOf(await fetchWeather({world: chosen(), now: NOW, fetchImpl: service(ok(forecast), ok(sunBrussels)).impl, timeZone: ZONE, proxy: null}))!.now.t);
    expect(reading.expires).toBe(new Date(NOW.getTime() + 1500_000).toISOString());
    // The proxy's answer names no Last-Modified of MET Norway's that the browser could send back, and none is kept.
    expect(reading).not.toHaveProperty('lastModified');
    // MET Norway's own times for that day are 06:51 and 16:01 UTC (fixtures/sun-brussels.json).
    const met = {rise: Date.parse(sunBrussels.properties.sunrise.time), set: Date.parse(sunBrussels.properties.sunset.time)};
    expect(Math.abs(Date.parse(reading.sun!.rise!) - met.rise)).toBeLessThanOrEqual(3 * MINUTE);
    expect(Math.abs(Date.parse(reading.sun!.set!) - met.set)).toBeLessThanOrEqual(3 * MINUTE);
    expect(next.askedAt).toBe(NOW.toISOString());
  });
  test('the same manners: the ten-minute floor and the one-day ceiling on what the proxy says; a stale answer is asked again after ten minutes, not at once', async () => {
    const until = async (headers: Record<string, string>) => readingOf(await fetchWeather({world: chosen(), now: NOW, fetchImpl: service(ok(forecast, headers)).impl, timeZone: ZONE, proxy: PROXY}))!.expires;
    const after = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
    expect(await until({'cache-control': 'public, max-age=0', 'x-weather-stale': '1'})).toBe(after(MIN_ASK_GAP_MS));
    expect(await until({'cache-control': 'public, max-age=30'})).toBe(after(MIN_ASK_GAP_MS));
    expect(await until({'cache-control': 'public, max-age=99999999'})).toBe(after(24 * 60 * MINUTE));
    expect(await until({})).toBe(after(30 * MINUTE));
    expect(await until({'cache-control': 'no-store'})).toBe(after(30 * MINUTE));
    // MET Norway's own Expires header is not the proxy's word: only max-age counts.
    expect(await until({expires: 'Wed, 11 Nov 2026 09:00:00 GMT'})).toBe(after(30 * MINUTE));
    expect(proxyExpires('public, max-age=1500', NOW)).toBe(new Date(NOW.getTime() + 1500_000).toUTCString());
    for (const none of [null, '', 'public', 'max-age=abc', 's-maxage=60', 'max-age=-5', 'xmax-age=60']) expect(proxyExpires(none, NOW), String(none)).toBeNull();
    // The rule that decides whether to ask at all is the same one, whatever the route: hidden, off, not wanted, not expired, asked under ten minutes ago.
    const world = await fetchWeather({world: chosen(), now: NOW, fetchImpl: service(ok(forecast, {'cache-control': 'max-age=1800'})).impl, timeZone: ZONE, proxy: PROXY});
    expect(shouldFetch({world, now: new Date(NOW.getTime() + 29 * MINUTE), hidden: false, wanted: true})).toBe(false);
    expect(shouldFetch({world, now: new Date(NOW.getTime() + 31 * MINUTE), hidden: true, wanted: true})).toBe(false);
    expect(shouldFetch({world, now: new Date(NOW.getTime() + 31 * MINUTE), hidden: false, wanted: true})).toBe(true);
  });
  test('a proxy that does not answer never becomes a direct request to MET Norway: plain words, the ask counted, the last reading kept', async () => {
    const kept = await fetchWeather({world: chosen(), now: NOW, fetchImpl: service(ok(forecast, {'cache-control': 'max-age=600'})).impl, timeZone: ZONE, proxy: PROXY});
    const later = new Date(NOW.getTime() + 60 * MINUTE);
    const cases: [Response | Error, string][] = [
      [new Response('{"error":"TRY_LATER","retryAfter":30}', {status: 429}), PROXY_BUSY], [new Response('{"error":"UPSTREAM_UNAVAILABLE"}', {status: 503}), PROXY_SILENT],
      [new Response('{"error":"HOSTED_CONFIGURATION_REQUIRED"}', {status: 503}), PROXY_SILENT], [new Response('{"error":"ORIGIN_DENIED"}', {status: 403}), PROXY_REFUSED],
      [new Response('{"error":"INVALID_COORDINATES"}', {status: 400}), PROXY_REFUSED], [new Response('{"error":"NOT_FOUND"}', {status: 404}), PROXY_REFUSED],
      [new Response(null, {status: 304}), PROXY_REFUSED], [new TypeError('Failed to fetch'), PROXY_SILENT], [new Response('<html>', {status: 200}), MET_UNREADABLE], [new Response('{"properties":{}}', {status: 200}), MET_NO_CURRENT],
    ];
    for (const [answer, words] of cases) {
      const {calls, impl} = service(answer);
      const error = await failure(fetchWeather({world: kept, now: later, fetchImpl: impl, timeZone: ZONE, proxy: PROXY}));
      expect(error).toBeInstanceOf(WeatherError);
      expect(error.message, words).toBe(`${words} The last reading stays.`);
      expect(calls.map(c => new URL(c.url).origin), words).toEqual(['https://weather.example.org']);
      expect(error.world.askedAt).toBe(later.toISOString());
      expect(readingOf(error.world)).toEqual(readingOf(kept));
    }
    // Without a reading yet the words stand alone; a request that was stopped says so.
    expect((await failure(fetchWeather({world: chosen(), now: NOW, fetchImpl: service(new Response('{}', {status: 503})).impl, timeZone: ZONE, proxy: PROXY}))).message).toBe(PROXY_SILENT);
    const stop = new AbortController(); stop.abort();
    expect((await failure(fetchWeather({world: chosen(), now: NOW, fetchImpl: service(new DOMException('Aborted', 'AbortError')).impl, timeZone: ZONE, proxy: PROXY, signal: stop.signal}))).message).toBe(MET_STOPPED);
    expect(PROXY_SILENT).not.toBe(MET_SILENT);
  });
  test('the size cap holds on the proxy\'s answer too, and MET Norway\'s deprecation status (203) still reads', async () => {
    const big = await failure(fetchWeather({world: chosen(), now: NOW, fetchImpl: service(new Response('x', {status: 200, headers: {'content-length': String(MAX_ANSWER_CHARS + 1)}})).impl, timeZone: ZONE, proxy: PROXY}));
    expect(big.message).toBe(MET_UNREADABLE);
    const long = await failure(fetchWeather({world: chosen(), now: NOW, fetchImpl: service(new Response(`{"x":"${'y'.repeat(MAX_ANSWER_CHARS)}"}`, {status: 200})).impl, timeZone: ZONE, proxy: PROXY}));
    expect(long.message).toBe(MET_UNREADABLE);
    expect(readingOf(await fetchWeather({world: chosen(), now: NOW, fetchImpl: service(ok(forecast, {'x-weather-upstream-status': '203'}, 203)).impl, timeZone: ZONE, proxy: PROXY}))).toBeTruthy();
  });
  test('off, or without a place, nothing is asked from the proxy either', async () => {
    const {calls, impl} = service();
    await failure(fetchWeather({world: setPlace(emptyWorld(), BRUSSELS), now: NOW, fetchImpl: impl, timeZone: ZONE, proxy: PROXY}));
    await failure(fetchWeather({world: setWorldOn(emptyWorld(), true), now: NOW, fetchImpl: impl, timeZone: ZONE, proxy: PROXY}));
    expect(calls).toEqual([]);
  });
  test('without a proxy nothing changed: MET Norway directly, two requests, its own Referer policy', async () => {
    const {calls, impl} = service(ok(forecast, {expires: 'Wed, 11 Nov 2026 05:05:00 GMT'}), ok(sunBrussels));
    const next = await fetchWeather({world: chosen(), now: NOW, fetchImpl: impl, timeZone: ZONE});
    expect(calls.map(c => new URL(c.url).origin)).toEqual([MET_HOST, MET_HOST]);
    for (const c of calls) expect(c.init).toEqual({method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-cache', referrerPolicy: 'strict-origin-when-cross-origin'});
    expect(readingOf(next)!.expires).toBe('2026-11-11T05:05:00.000Z');
    expect(readingOf(next)!.sun).toEqual({rise: '2026-11-11T06:51:00.000Z', set: '2026-11-11T16:01:00.000Z'});
  });
});

describe('the words say who sees what in each case', () => {
  test('directly: MET Norway sees the address and the rounded place; through the proxy: the proxy does, and MET Norway sees the proxy\'s', () => {
    expect(SWITCH_NOTE_DIRECT).toContain('MET Norway then sees your network address and that place, rounded to about 1 km');
    expect(SWITCH_NOTE_DIRECT).not.toContain('proxy');
    for (const words of ['Off unless you turn it on.', 'ZIGoals’ weather proxy', 'The proxy sees your network address and that place, rounded to about 1 km', 'MET Norway sees the proxy’s address and that rounded place, never yours', 'No account, no key, nothing else.']) expect(SWITCH_NOTE_PROXY).toContain(words);
    expect(switchNote(PROXY)).toBe(SWITCH_NOTE_PROXY); expect(switchNote(null)).toBe(SWITCH_NOTE_DIRECT);
    expect(placeChosenWords('Brussels', PROXY)).toBe('Your place for the weather is Brussels. ZIGoals’ weather proxy asks MET Norway for that place, rounded to about 1 km.');
    expect(switchedWords(false, PROXY)).toBe('Weather is off. Nothing is asked from the weather proxy or MET Norway.');
    for (const lang of ['en', 'nl'] as const) { expect(WEATHER_OFF_WORDS_PROXY[lang]).toContain('MET Norway'); expect(WEATHER_OFF_WORDS_PROXY[lang]).toContain('proxy'); expect(WEATHER_OFF_WORDS_PROXY[lang]).toContain('1 km'); }
    // MET Norway's terms: the name of its consumer weather service is never used.
    for (const words of [SWITCH_NOTE_PROXY, SWITCH_NOTE_DIRECT, WEATHER_OFF_WORDS_PROXY.en, WEATHER_OFF_WORDS_PROXY.nl, PROXY_SILENT, PROXY_REFUSED, PROXY_BUSY]) expect(words.toLowerCase()).not.toMatch(/\byr\b/);
  });
  test('the switch and the weather words read from the one module (no second copy of the note in the component)', () => {
    const component = readFileSync(new URL('../../../components/nova/panels/weather-choice.tsx', import.meta.url), 'utf8');
    expect(component).toContain('note={switchNote()}');
    expect(component).not.toContain('MET Norway then sees');
  });
});

// Security review (AM-2), finding 10a: the loopback http form is a proxy only in a local build.
describe('finding 10a: http://127.0.0.1:<port> is a proxy only in a development or LOCAL_DEMO build', () => {
  const LOOP = 'http://127.0.0.1:8787/v1/forecast';
  test('a production build (the public Alpha, a deployed build, an invalid configuration) reads it as no proxy: MET Norway directly, no words about a proxy', async () => {
    for (const environment of ['PUBLIC_ALPHA_UNDEPLOYED', 'TESTNET_DEPLOYED', 'INVALID_CONFIGURATION', 'local_demo', '']) {
      vi.stubEnv('NEXT_PUBLIC_WEATHER_PROXY_URL', LOOP); vi.stubEnv('NEXT_PUBLIC_APP_ENVIRONMENT', environment); vi.stubEnv('NODE_ENV', 'production'); vi.resetModules();
      const built = await import('./proxy');
      expect(built.LOCAL_BUILD, environment).toBe(false); expect(built.WEATHER_PROXY_URL, environment).toBeNull(); expect(built.switchNote(), environment).toBe(SWITCH_NOTE_DIRECT);
      expect(() => built.proxyForecastUrl(LOOP, BRUSSELS), environment).toThrow('The weather proxy address is not one this build accepts.');
      // And the request such a build makes goes to MET Norway.
      const {calls, impl} = service(ok(forecast), ok(sunBrussels));
      await (await import('./met')).fetchWeather({world: chosen(), now: NOW, fetchImpl: impl, timeZone: ZONE});
      expect(calls.map(c => new URL(c.url).origin), environment).toEqual([MET_HOST, MET_HOST]);
      // An https proxy is still read in such a build.
      vi.stubEnv('NEXT_PUBLIC_WEATHER_PROXY_URL', PROXY); vi.resetModules();
      expect((await import('./proxy')).WEATHER_PROXY_URL, environment).toBe(PROXY);
    }
  });
  test('a LOCAL_DEMO build and the development server accept it, and the policy is not changed by it (connect-src allows 127.0.0.1 already)', async () => {
    for (const [environment, node] of [['LOCAL_DEMO', 'production'], ['PUBLIC_ALPHA_UNDEPLOYED', 'development']] as const) {
      vi.stubEnv('NEXT_PUBLIC_WEATHER_PROXY_URL', LOOP); vi.stubEnv('NEXT_PUBLIC_APP_ENVIRONMENT', environment); vi.stubEnv('NODE_ENV', node); vi.resetModules();
      const built = await import('./proxy');
      expect(built.LOCAL_BUILD).toBe(true); expect(built.WEATHER_PROXY_URL).toBe(LOOP);
      expect(built.proxyForecastUrl(LOOP, BRUSSELS)).toBe('http://127.0.0.1:8787/v1/forecast?lat=50.85&lon=4.35');
      expect((await import('../../security-policy')).BUILD_EGRESS).toBe((await import('../../egress-policy.json')).default);
    }
    expect(withWeatherProxy(egress, LOOP)).toBe(egress);
    expect(connectSources(egress, 'app')).toContain('http://127.0.0.1:*');
  });
  test('the setup guide\'s weather line follows the build too: Session AM\'s words without a proxy, who sees what with one', async () => {
    const plain = await import('../setup-guide');
    expect(plain.WEATHER_LINE).toBe('Weather is the only outside data, off until you turn it on in NOVA → Permissions; MET Norway then sees your network address and your place rounded to about 1 km.');
    vi.stubEnv('NEXT_PUBLIC_WEATHER_PROXY_URL', PROXY); vi.resetModules();
    const built = await import('../setup-guide');
    expect(built.WEATHER_LINE).toBe(built.WEATHER_LINE_PROXY);
    for (const words of ['off until you turn it on in NOVA → Permissions', 'ZIGoals’ weather proxy then sees your network address and your place rounded to about 1 km', 'MET Norway sees the proxy’s address and that rounded place, not yours']) expect(built.WEATHER_LINE).toContain(words);
  });
});
