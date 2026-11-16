import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import forecast from './fixtures/forecast-brussels.json';
import sunBrussels from './fixtures/sun-brussels.json';
import sunPolarNight from './fixtures/sun-polar-night.json';
import symbols from './fixtures/symbol-codes.json';
import {
  DEFAULT_KEEP_MS, MAX_KEEP_MS, MET_CREDIT, MET_HOST, MET_LICENCE_URL, MET_NO_CURRENT, MET_REFERRER_POLICY, MET_REFUSED, MET_SILENT, MET_SITE_URL, MET_STOPPED,
  MET_UNREADABLE, MIN_ASK_GAP_MS, WEATHER_NO_PLACE, WEATHER_OFF, WeatherError, condition, coordinate, fetchWeather, forecastUrl, localTime, offsetText, parseForecast,
  parseSun, shouldFetch, sunUrl, type ConditionKind,
} from './met';
import {MAX_DAYS, MAX_HOURS, emptyWorld, markAsked, novaWorldSchema, readingOf, readingSchema, setPlace, setReading, setWorldOn, type NovaWorld, type WorldReading} from './record';

// Session AM (ADR-038 D12–D15, A2): the MET Norway client. The forecast and sun fixtures are real answers of the service
// (11 Nov 2026, Brussels), trimmed; nothing in this file reaches the network.
const BRUSSELS = {name: 'Brussels', lat: 50.85, lon: 4.35};
const ZONE = 'Europe/Brussels';
const NOW = new Date('2026-11-11T04:35:00Z');
const HOUR = 3_600_000, MINUTE = 60_000;
const later = (ms: number) => new Date(NOW.getTime() + ms);
const chosen = (): NovaWorld => setPlace(setWorldOn(emptyWorld(), true), BRUSSELS);
/** A whole reading for Brussels, as fetchWeather stores one. */
const readingAt = (fetchedAt: Date, extra: Partial<WorldReading> = {}): WorldReading => readingSchema.parse({
  ...parseForecast(forecast, BRUSSELS, fetchedAt, ZONE), fetchedAt: fetchedAt.toISOString(), expires: new Date(fetchedAt.getTime() + 30 * MINUTE).toISOString(), ...extra,
});
const withReading = (extra: Partial<WorldReading> = {}): NovaWorld => setReading(chosen(), readingAt(NOW, extra), NOW);

describe('the addresses', () => {
  test('the constants: one host, the credit, the licence, the institute; the service\'s consumer brand is not among them', () => {
    expect(MET_HOST).toBe('https://api.met.no');
    expect(MET_CREDIT).toBe('Data from MET Norway');
    expect(MET_LICENCE_URL).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(MET_SITE_URL).toBe('https://www.met.no/en');
    expect(MIN_ASK_GAP_MS).toBe(10 * MINUTE);
  });
  test('the forecast: Locationforecast 2.0 complete, latitude and longitude at exactly two decimals', () => {
    expect(forecastUrl(BRUSSELS)).toBe('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=50.85&lon=4.35');
    expect(forecastUrl({lat: 50.8503396, lon: 4.3517103})).toBe('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=50.85&lon=4.35');
    expect(forecastUrl({lat: 40.7, lon: -74})).toBe('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=40.70&lon=-74.00');
    expect(forecastUrl({lat: -33.8688, lon: 151.2093})).toBe('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=-33.87&lon=151.21');
    expect(forecastUrl({lat: -0.001, lon: 0})).toBe('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=0.00&lon=0.00');
    for (const n of [0, 4.35, -74.006, 89.999, -179.995, 12.345678, 1e-7]) expect(coordinate(n), String(n)).toMatch(/^-?\d{1,3}\.\d{2}$/);
  });
  test('a position off the globe is refused in plain words, never sent', () => {
    for (const place of [{lat: 91, lon: 0}, {lat: 0, lon: 181}, {lat: Number.NaN, lon: 0}, {lat: 0, lon: Number.POSITIVE_INFINITY}]) {
      expect(() => forecastUrl(place)).toThrow('Use a latitude between -90 and 90 and a longitude between -180 and 180.');
      expect(() => sunUrl(place, '2026-11-11', 60)).toThrow(/latitude/);
    }
  });
  test('the sun: Sunrise 3.0, the day and the offset as +HH:MM (the plus sign sent as %2B)', () => {
    const url = sunUrl(BRUSSELS, '2026-11-11', 60);
    expect(url).toBe('https://api.met.no/weatherapi/sunrise/3.0/sun?lat=50.85&lon=4.35&date=2026-11-11&offset=%2B01:00');
    expect(new URL(url).searchParams.get('offset')).toBe('+01:00');
    expect(new URL(sunUrl({lat: 40.71, lon: -74.01}, '2026-07-04', -240)).searchParams.get('offset')).toBe('-04:00');
    expect([0, 60, -300, 330, 345, -570, 840].map(offsetText)).toEqual(['+00:00', '+01:00', '-05:00', '+05:30', '+05:45', '-09:30', '+14:00']);
    for (const date of ['11-11-2026', '2026-13-45', 'today', '2026-11-11T00:00']) expect(() => sunUrl(BRUSSELS, date, 0), date).toThrow('Use a date as YYYY-MM-DD.');
  });
  test('the clock of a zone: the day, the minutes since midnight and the offset, daylight saving included', () => {
    expect(localTime(NOW.getTime(), ZONE)).toEqual({date: '2026-11-11', minutes: 5 * 60 + 35, offset: 60});
    expect(localTime(Date.parse('2026-07-11T23:30:00Z'), ZONE)).toEqual({date: '2026-07-12', minutes: 90, offset: 120});
    expect(localTime(Date.parse('2026-07-11T02:30:00Z'), 'America/New_York')).toEqual({date: '2026-07-10', minutes: 22 * 60 + 30, offset: -240});
    expect(localTime(Date.parse('2026-01-01T00:00:00Z'), 'Asia/Kolkata').offset).toBe(330);
    // A zone the browser does not know reads as UTC, never a throw.
    expect(localTime(NOW.getTime(), 'Nowhere/Nothing')).toEqual({date: '2026-11-11', minutes: 4 * 60 + 35, offset: 0});
  });
});

describe('reading a forecast', () => {
  test('a real answer: now, the hours ahead and the days, valid for the record', () => {
    const parts = parseForecast(forecast, BRUSSELS, NOW, ZONE);
    expect(parts.lat).toBe(50.85); expect(parts.lon).toBe(4.35);
    expect(parts.updatedAt).toBe('2026-11-11T01:19:09.000Z');
    expect(parts.now).toEqual({at: '2026-11-11T04:00:00.000Z', t: 7.1, symbol: 'cloudy', wind: 2.1, humidity: 98.2, uv: 0, precip: 0, cloud: 100});
    // The fixture keeps the first eight hours and the 12:00 step: eight steps after the current one within 24 hours.
    expect(parts.hours.map(h => h.at)).toEqual(['05', '06', '07', '08', '09', '10', '11', '12'].map(h => `2026-11-11T${h}:00:00.000Z`));
    expect(parts.hours[3]).toEqual({at: '2026-11-11T08:00:00.000Z', t: 6.8, symbol: 'lightrain', precip: 0.2});
    expect(parts.days.map(d => d.date)).toEqual(['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']);
    // Today: the lowest and highest of its steps, the six-hour symbol of 12:00 on Brussels' clock (11:00 UTC), the hours' amounts added up.
    expect(parts.days[0]).toEqual({date: '2026-11-11', min: 6.8, max: 7.7, symbol: 'lightrain', precip: 1.9});
    expect(parts.days[1]).toEqual({date: '2026-11-12', min: 8.8, max: 8.8, symbol: 'fair_day', precip: 0});
    expect(readingSchema.safeParse({...parts, fetchedAt: NOW.toISOString(), expires: later(30 * MINUTE).toISOString()}).success).toBe(true);
  });
  const step = (time: string, details: Record<string, unknown>, periods: Record<string, unknown> = {}) => ({time, data: {instant: {details}, ...periods}});
  const period = (symbol_code: unknown, precipitation_amount?: unknown) => ({summary: {symbol_code}, details: precipitation_amount === undefined ? {} : {precipitation_amount}});
  const answer = (timeseries: unknown) => ({type: 'Feature', properties: {meta: {updated_at: 'not a time'}, timeseries}});
  test('what is missing, of the wrong type or out of range is left out, never read as 0', () => {
    const parts = parseForecast(answer([
      step('2026-11-11T04:00:00Z', {air_temperature: 3.4, wind_speed: '2.1', relative_humidity: 140, ultraviolet_index_clear_sky: null, cloud_area_fraction: -1}, {next_1_hours: period(42, 'none')}),
      step('2026-11-11T05:00:00Z', {air_temperature: '4'}, {next_1_hours: period('rain', 1)}),
      step('not a time', {air_temperature: 4}),
      {time: '2026-11-11T06:00:00Z'}, null, 'step', 7,
      step('2026-11-11T07:00:00Z', {air_temperature: 5.5}, {next_1_hours: period('RAIN; DROP', -3), next_6_hours: period('lightrain', 9999)}),
    ]), BRUSSELS, NOW, ZONE);
    expect(parts.now).toEqual({at: '2026-11-11T04:00:00.000Z', t: 3.4, symbol: ''});
    expect(parts.hours).toEqual([{at: '2026-11-11T07:00:00.000Z', t: 5.5, symbol: 'lightrain'}]);
    expect(parts.days).toEqual([{date: '2026-11-11', min: 3.4, max: 5.5, symbol: 'lightrain'}]);
    expect(parts).not.toHaveProperty('updatedAt');
    for (const part of [parts.now, ...parts.hours, ...parts.days]) for (const key of ['wind', 'humidity', 'uv', 'precip', 'cloud']) expect(part).not.toHaveProperty(key);
  });
  test('an answer without a usable step for this moment throws in plain words', () => {
    for (const bad of [null, undefined, 7, 'text', [], {}, {properties: {}}, {properties: {timeseries: 'none'}}, answer([]), answer([step('2026-11-11T04:00:00Z', {wind_speed: 2})]),
      // Every step is in the past by more than six hours, or lies more than an hour ahead.
      answer([step('2026-11-10T20:00:00Z', {air_temperature: 5})]), answer([step('2026-11-11T07:00:00Z', {air_temperature: 5})])])
      expect(() => parseForecast(bad, BRUSSELS, NOW, ZONE), JSON.stringify(bad)).toThrow(MET_NO_CURRENT);
    // A first step up to an hour ahead is this moment's (an answer fetched just before the hour).
    expect(parseForecast(answer([step('2026-11-11T05:00:00Z', {air_temperature: 5})]), BRUSSELS, NOW, ZONE).now.at).toBe('2026-11-11T05:00:00.000Z');
    // A temperature outside what the record holds is not a reading.
    expect(() => parseForecast(answer([step('2026-11-11T04:00:00Z', {air_temperature: 900})]), BRUSSELS, NOW, ZONE)).toThrow(MET_NO_CURRENT);
  });
  test('at most 24 hours and 6 days, however long the answer is; a day is a day on the given clock', () => {
    const start = Date.parse('2026-11-11T04:00:00Z');
    const hourly = Array.from({length: 72}, (_, i) => step(new Date(start + i * HOUR).toISOString(), {air_temperature: 10 + (i % 24) / 2}, {next_1_hours: period(i % 24 < 12 ? 'cloudy' : 'clearsky_night', 0.1)}));
    const sixHourly = Array.from({length: 40}, (_, i) => step(new Date(start + 72 * HOUR + i * 6 * HOUR).toISOString(), {air_temperature: 8}, {next_6_hours: period('rain', 1.5)}));
    const parts = parseForecast(answer([...hourly, ...sixHourly]), BRUSSELS, NOW, ZONE);
    expect(parts.hours).toHaveLength(MAX_HOURS);
    expect(parts.hours[0]!.at).toBe('2026-11-11T05:00:00.000Z'); expect(parts.hours.at(-1)!.at).toBe('2026-11-12T04:00:00.000Z');
    expect(parts.days).toHaveLength(MAX_DAYS);
    expect(parts.days.map(d => d.date)).toEqual(['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']);
    // 12 Nov on Brussels' clock is 23:00 UTC on the 11th to 22:00 UTC on the 12th: 24 hourly steps of 0.1 mm.
    expect(parts.days[1]!.precip).toBe(2.4);
    // A day of six-hour steps: four periods of 1.5 mm, each counted once.
    expect(parts.days[4]).toEqual({date: '2026-11-15', min: 8, max: 8, symbol: 'rain', precip: 6});
    // The same answer on another clock groups other days.
    expect(parseForecast(answer([...hourly, ...sixHourly]), BRUSSELS, NOW, 'Pacific/Auckland').days[0]!.date).toBe('2026-11-11');
    expect(parseForecast(answer([...hourly, ...sixHourly]), BRUSSELS, NOW, 'America/Los_Angeles').days[0]!.date).toBe('2026-11-10');
  });
  test('precipitation is counted once: an hour\'s amount where there is one, else the six hours\'; no amount at all is no figure', () => {
    const parts = parseForecast(answer([
      step('2026-11-11T04:00:00Z', {air_temperature: 5}, {next_1_hours: period('rain', 1), next_6_hours: period('rain', 6)}),
      step('2026-11-11T05:00:00Z', {air_temperature: 5}, {next_6_hours: period('rain', 5)}),
      // Inside the six hours the step before it already counted.
      step('2026-11-11T08:00:00Z', {air_temperature: 5}, {next_6_hours: period('rain', 4)}),
      step('2026-11-11T11:00:00Z', {air_temperature: 5}, {next_1_hours: period('rain', 0.25)}),
      step('2026-11-12T11:00:00Z', {air_temperature: 6}),
    ]), BRUSSELS, NOW, ZONE);
    expect(parts.days).toEqual([{date: '2026-11-11', min: 5, max: 5, symbol: 'rain', precip: 6.3}, {date: '2026-11-12', min: 6, max: 6, symbol: ''}]);
    expect(parts.now.precip).toBe(1);
    // An hour's figure is only an hour's: a step with six-hour amounts alone has none.
    expect(parts.hours[0]).toEqual({at: '2026-11-11T05:00:00.000Z', t: 5, symbol: 'rain'});
  });
  test('the sun: rise and set as UTC times; in the polar night nothing, and nothing from anything else', () => {
    expect(parseSun(sunBrussels)).toEqual({rise: '2026-11-11T06:51:00.000Z', set: '2026-11-11T16:01:00.000Z'});
    expect(parseSun(sunPolarNight)).toEqual({});
    for (const bad of [null, 7, 'sun', [], {}, {properties: {sunrise: {time: 7}, sunset: {time: 'later'}}}, {properties: {sunrise: 'early'}}]) expect(parseSun(bad)).toEqual({});
    expect(parseSun({properties: {sunrise: {time: null}, sunset: {time: '2026-06-21T23:58+02:00'}}})).toEqual({set: '2026-06-21T21:58:00.000Z'});
  });
});

describe('symbols in words', () => {
  const KINDS: ConditionKind[] = ['clear', 'partly', 'cloud', 'fog', 'drizzle', 'rain', 'sleet', 'snow', 'thunder'];
  const base = (code: string) => code.replace(/_(day|night|polartwilight)$/, '');
  test('the service\'s list is whole: 83 codes over the 41 symbols of its legend', () => {
    expect(symbols.codes).toHaveLength(83); expect(new Set(symbols.codes).size).toBe(83);
    expect(Object.keys(symbols.legend)).toHaveLength(41);
    expect([...new Set(symbols.codes.map(base))].sort()).toEqual(Object.keys(symbols.legend).sort());
  });
  test('every code of the service\'s list maps to a kind and to the legend\'s own English words, and to Dutch', () => {
    const legend: Record<string, {english: string; variants: boolean}> = symbols.legend;
    for (const code of symbols.codes) {
      const c = condition(code), entry = legend[base(code)]!;
      expect(KINDS, code).toContain(c.kind);
      expect(c.words, code).toBe(entry.english);
      expect(c.words, code).toMatch(/^[A-Z][a-z]+( [a-z]+)*$/);
      expect(c.wordsNl, code).toMatch(/^[A-Z][a-z]+( [a-z]+)*$/);
      expect(c.wordsNl, code).not.toBe('Weer');
      expect(c.night, code).toBe(code.endsWith('_night'));
      expect(c.kind === 'thunder', code).toBe(code.includes('thunder'));
      // A symbol with variants is sent with one; a symbol without never is.
      expect(/_(day|night|polartwilight)$/.test(code), code).toBe(entry.variants);
    }
    // Each symbol has Dutch words of its own.
    expect(new Set(Object.keys(legend).map(id => condition(id).wordsNl)).size).toBe(41);
  });
  test('examples', () => {
    expect(condition('clearsky_day')).toEqual({kind: 'clear', night: false, words: 'Clear sky', wordsNl: 'Helder'});
    expect(condition('partlycloudy_night')).toEqual({kind: 'partly', night: true, words: 'Partly cloudy', wordsNl: 'Half bewolkt'});
    expect(condition('lightrainshowers_day')).toEqual({kind: 'drizzle', night: false, words: 'Light rain showers', wordsNl: 'Lichte regenbuien'});
    expect(condition('heavysnow')).toEqual({kind: 'snow', night: false, words: 'Heavy snow', wordsNl: 'Zware sneeuw'});
    expect(condition('fog')).toEqual({kind: 'fog', night: false, words: 'Fog', wordsNl: 'Mist'});
    expect(condition('rainandthunder')).toEqual({kind: 'thunder', night: false, words: 'Rain and thunder', wordsNl: 'Regen en onweer'});
    expect(condition('cloudy').kind).toBe('cloud'); expect(condition('rain').kind).toBe('rain'); expect(condition('heavyrainshowers_night').kind).toBe('rain');
    expect(condition('sleet')).toEqual({kind: 'sleet', night: false, words: 'Sleet', wordsNl: 'Natte sneeuw'});
    expect(condition('heavysleetshowersandthunder_polartwilight')).toEqual({kind: 'thunder', night: false, words: 'Heavy sleet showers and thunder', wordsNl: 'Zware buien met natte sneeuw en onweer'});
    // The service's own spelling and the regular one read the same.
    expect(condition('lightssnowshowersandthunder_day')).toEqual(condition('lightsnowshowersandthunder_day'));
    expect(condition('lightssleetshowersandthunder_night').words).toBe('Light sleet showers and thunder');
  });
  test('an unknown code is "Weather", never a guess', () => {
    for (const code of ['', 'hail', 'tornado_day', 'clearsky_dusk', 'CLEARSKY_DAY', 'rain showers', '_night', 'verylightrain', 'rain_day_night', 42 as unknown as string, null as unknown as string])
      expect(condition(code), String(code)).toEqual({kind: 'cloud', night: false, words: 'Weather', wordsNl: 'Weer'});
  });
});

describe('the manners', () => {
  const ask = (world: NovaWorld, now = NOW, hidden = false, wanted = true) => shouldFetch({world, now, hidden, wanted});
  test('never while the switch is off', () => {
    expect(ask(setPlace(emptyWorld(), BRUSSELS))).toBe(false);
    expect(ask(setWorldOn(chosen(), false))).toBe(false);
  });
  test('never without a place', () => { expect(ask(setWorldOn(emptyWorld(), true))).toBe(false); });
  test('never while the page is hidden', () => { expect(ask(chosen(), NOW, true)).toBe(false); });
  test('never when nothing wants weather', () => { expect(ask(chosen(), NOW, false, false)).toBe(false); });
  test('on, a place, visible, wanted and nothing kept: yes', () => { expect(ask(chosen())).toBe(true); });
  test('not before the kept reading\'s Expires time; a reading of another place does not count', () => {
    const world = withReading();
    expect(readingOf(world)!.expires).toBe(later(30 * MINUTE).toISOString());
    expect(ask(world, later(29 * MINUTE))).toBe(false);
    expect(ask(world, later(30 * MINUTE))).toBe(true);
    // The person chose another place: the reading and the last ask are Brussels', not this place's.
    const moved = novaWorldSchema.parse({...world, place: {name: 'Ghent', lat: 51.05, lon: 3.72}, askedAt: undefined});
    expect(readingOf(moved)).toBeNull();
    expect(ask(moved, later(MINUTE))).toBe(true);
  });
  test('not within 10 minutes of the last ask, also one that gave nothing', () => {
    const asked = markAsked(chosen(), NOW);
    expect(asked.reading).toBeUndefined();
    expect(ask(asked, later(9 * MINUTE + 59_000))).toBe(false);
    expect(ask(asked, later(10 * MINUTE))).toBe(true);
    // An expired reading and a fresh ask: still no.
    const stale = markAsked(withReading(), later(45 * MINUTE));
    expect(ask(stale, later(50 * MINUTE))).toBe(false);
    expect(ask(stale, later(55 * MINUTE))).toBe(true);
    // A clock set back does not ask early; an ask recorded far in the future does not block for ever.
    expect(ask(asked, later(-5 * MINUTE))).toBe(false);
    expect(ask(markAsked(chosen(), later(3 * 24 * HOUR)))).toBe(true);
  });
});

describe('asking the service', () => {
  type Call = {url: string; init: RequestInit | undefined};
  type Answer = Response | Error;
  function service(...answers: Answer[]) {
    const calls: Call[] = [];
    const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({url: String(input), init});
      const next = answers.shift();
      if (!next) throw Error('A request nobody expected.');
      if (next instanceof Error) throw next;
      return next;
    }) as typeof fetch;
    return {calls, impl};
  }
  const EXPIRES = 'Wed, 11 Nov 2026 05:03:53 GMT', MODIFIED = 'Wed, 11 Nov 2026 04:33:38 GMT';
  const ok = (body: unknown, headers: Record<string, string> = {expires: EXPIRES, 'last-modified': MODIFIED}) => new Response(JSON.stringify(body), {status: 200, headers});
  const status = (code: number, headers: Record<string, string> = {}) => new Response(code === 304 ? null : 'no', {status: code, headers});
  const FORECAST_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=50.85&lon=4.35';
  const SUN_URL = 'https://api.met.no/weatherapi/sunrise/3.0/sun?lat=50.85&lon=4.35&date=2026-11-11&offset=%2B01:00';
  // Session AM (AM-S10, deliberate): every request now also says `redirect: 'error'` (was: these four options and no
  // other). Still exactly these options and no header of ours, compared whole below.
  const PLAIN = {method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-cache', referrerPolicy: 'strict-origin-when-cross-origin'};
  const failure = async (run: Promise<unknown>): Promise<WeatherError> => { const error = await run.then(() => null, (e: unknown) => e); expect(error).toBeInstanceOf(WeatherError); return error as WeatherError; };

  test('a first ask: one plain GET for the forecast, then one for today\'s sun, with no header of ours; the record to store', async () => {
    const {calls, impl} = service(ok(forecast), ok(sunBrussels, {}));
    const next = await fetchWeather({world: chosen(), now: NOW, fetchImpl: impl, timeZone: ZONE});
    expect(calls.map(c => c.url)).toEqual([FORECAST_URL, SUN_URL]);
    // Exactly these options: no headers at all (a simple request, so no preflight), no cookie, the origin as the Referer.
    for (const call of calls) expect(call.init).toEqual(PLAIN);
    expect(MET_REFERRER_POLICY).toBe('strict-origin-when-cross-origin');
    const reading = readingOf(next)!;
    expect(reading).toMatchObject({lat: 50.85, lon: 4.35, fetchedAt: NOW.toISOString(), expires: '2026-11-11T05:03:53.000Z', lastModified: MODIFIED, updatedAt: '2026-11-11T01:19:09.000Z'});
    expect(reading.now.t).toBe(7.1); expect(reading.hours).toHaveLength(8); expect(reading.days).toHaveLength(6);
    expect(reading.sun).toEqual({rise: '2026-11-11T06:51:00.000Z', set: '2026-11-11T16:01:00.000Z'});
    expect(next.askedAt).toBe(NOW.toISOString()); expect(next.on).toBe(true); expect(next.place).toEqual(BRUSSELS);
    expect(novaWorldSchema.parse(JSON.parse(JSON.stringify(next)))).toEqual(next);
    // The manners hold on what came back: nothing more is asked before the service's Expires time.
    expect(shouldFetch({world: next, now: later(20 * MINUTE), hidden: false, wanted: true})).toBe(false);
    expect(shouldFetch({world: next, now: new Date('2026-11-11T05:03:53Z'), hidden: false, wanted: true})).toBe(true);
  });
  test('in the app (the default) a kept reading adds no header: the browser\'s own cache revalidates, a page\'s header would be refused', async () => {
    const world = withReading({lastModified: MODIFIED, sun: {rise: '2026-11-11T06:51:00.000Z', set: '2026-11-11T16:01:00.000Z'}});
    const {calls, impl} = service(ok(forecast, {expires: 'Wed, 11 Nov 2026 06:10:00 GMT', 'last-modified': 'Wed, 11 Nov 2026 05:31:00 GMT'}));
    const next = await fetchWeather({world, now: later(HOUR), fetchImpl: impl, timeZone: ZONE});
    // One request: the sun of today is already kept.
    expect(calls).toEqual([{url: FORECAST_URL, init: PLAIN}]);
    expect(calls[0]!.init).not.toHaveProperty('headers');
    expect(readingOf(next)).toMatchObject({fetchedAt: later(HOUR).toISOString(), expires: '2026-11-11T06:10:00.000Z', lastModified: 'Wed, 11 Nov 2026 05:31:00 GMT', sun: {rise: '2026-11-11T06:51:00.000Z'}});
    expect(readingOf(next)!.now.at).toBe('2026-11-11T05:00:00.000Z');
  });
  test('a server-side caller revalidates with If-Modified-Since, its only header; a 304 keeps the reading with the new Expires', async () => {
    const world = withReading({lastModified: MODIFIED, sun: {rise: '2026-11-11T06:51:00.000Z', set: '2026-11-11T16:01:00.000Z'}});
    const {calls, impl} = service(status(304, {expires: 'Wed, 11 Nov 2026 05:40:00 GMT', 'last-modified': MODIFIED}));
    const next = await fetchWeather({world, now: later(31 * MINUTE), fetchImpl: impl, timeZone: ZONE, revalidate: 'header'});
    // Session AM (AM-S10, deliberate): `redirect: 'error'` here too; the header is still the only one.
    expect(calls).toEqual([{url: FORECAST_URL, init: {method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'strict-origin-when-cross-origin', headers: {'If-Modified-Since': MODIFIED}}}]);
    expect(readingOf(next)).toEqual({...readingOf(world)!, expires: '2026-11-11T05:40:00.000Z'});
    expect(next.askedAt).toBe(later(31 * MINUTE).toISOString());
    expect(shouldFetch({world: next, now: later(60 * MINUTE), hidden: false, wanted: true})).toBe(false);
  });
  test('If-Modified-Since only for a kept reading of this place that has a Last-Modified', async () => {
    const without = service(ok(forecast), ok(sunBrussels, {}));
    await fetchWeather({world: withReading(), now: later(HOUR), fetchImpl: without.impl, timeZone: ZONE, revalidate: 'header'});
    expect(without.calls[0]!.init).toEqual({...PLAIN, cache: 'no-store'});
    // Brussels' reading under another place: not this place's, so nothing of it is sent.
    const moved = novaWorldSchema.parse({...withReading({lastModified: MODIFIED}), place: {name: 'Ghent', lat: 51.05, lon: 3.72}});
    const other = service(ok(forecast), ok(sunBrussels, {}));
    const next = await fetchWeather({world: moved, now: later(HOUR), fetchImpl: other.impl, timeZone: ZONE, revalidate: 'header'});
    expect(other.calls.map(c => c.url)).toEqual(['https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=51.05&lon=3.72', 'https://api.met.no/weatherapi/sunrise/3.0/sun?lat=51.05&lon=3.72&date=2026-11-11&offset=%2B01:00']);
    for (const call of other.calls) expect(call.init).not.toHaveProperty('headers');
    expect(readingOf(next)).toMatchObject({lat: 51.05, lon: 3.72});
    // A 304 with nothing kept is not a reading.
    const nothing = await failure(fetchWeather({world: chosen(), now: NOW, fetchImpl: service(status(304)).impl, timeZone: ZONE, revalidate: 'header'}));
    expect(nothing.message).toBe(MET_UNREADABLE);
  });
  test('kept until the service\'s Expires: 30 minutes without one, never under 10 minutes, never over a day', async () => {
    const until = async (headers: Record<string, string>) => readingOf(await fetchWeather({world: chosen(), now: NOW, fetchImpl: service(ok(forecast, headers), ok(sunBrussels, {})).impl, timeZone: ZONE}))!.expires;
    expect(await until({})).toBe(later(DEFAULT_KEEP_MS).toISOString());
    expect(await until({expires: 'soon'})).toBe(later(30 * MINUTE).toISOString());
    expect(await until({expires: 'Wed, 11 Nov 2026 04:36:00 GMT'})).toBe(later(10 * MINUTE).toISOString());
    expect(await until({expires: 'Wed, 11 Nov 2026 03:00:00 GMT'})).toBe(later(10 * MINUTE).toISOString());
    expect(await until({expires: 'Wed, 11 Nov 2026 04:50:00 GMT'})).toBe('2026-11-11T04:50:00.000Z');
    expect(await until({expires: 'Fri, 01 Jan 2100 00:00:00 GMT'})).toBe(later(MAX_KEEP_MS).toISOString());
    // A Last-Modified that is not a date is not kept (and so never sent back).
    const odd = readingOf(await fetchWeather({world: chosen(), now: NOW, fetchImpl: service(ok(forecast, {'last-modified': 'yesterday-ish'}), ok(sunBrussels, {})).impl, timeZone: ZONE}))!;
    expect(odd).not.toHaveProperty('lastModified');
  });
  test('429, a server error or no answer: plain words, the last reading stays, and the ask still counts for 10 minutes', async () => {
    for (const answer of [status(429), status(500), status(503), new TypeError('Failed to fetch')]) {
      const world = withReading(), at = later(40 * MINUTE), {calls, impl} = service(answer);
      const error = await failure(fetchWeather({world, now: at, fetchImpl: impl, timeZone: ZONE}));
      expect(error.message).toBe('MET Norway did not answer just now. The last reading stays.');
      // One request, no retry, no sun.
      expect(calls).toHaveLength(1);
      expect(readingOf(error.world)).toEqual(readingOf(world));
      expect(error.world.askedAt).toBe(at.toISOString());
      expect(shouldFetch({world: error.world, now: later(49 * MINUTE), hidden: false, wanted: true})).toBe(false);
      expect(shouldFetch({world: error.world, now: later(50 * MINUTE), hidden: false, wanted: true})).toBe(true);
    }
    // With nothing kept there is no last reading to speak of.
    const first = await failure(fetchWeather({world: chosen(), now: NOW, fetchImpl: service(status(503)).impl, timeZone: ZONE}));
    expect(first.message).toBe(MET_SILENT); expect(first.message).toBe('MET Norway did not answer just now.');
    expect(first.world.askedAt).toBe(NOW.toISOString()); expect(first.world.reading).toBeUndefined();
  });
  test('a refusal, an answer that cannot be read and a stopped request are said as what they are', async () => {
    const said = async (answer: Answer, signal?: AbortSignal) => (await failure(fetchWeather({world: chosen(), now: NOW, fetchImpl: service(answer).impl, timeZone: ZONE, signal}))).message;
    expect(await said(status(403))).toBe(MET_REFUSED); expect(await said(status(400))).toBe(MET_REFUSED); expect(await said(status(422))).toBe(MET_REFUSED);
    expect(await said(new Response('<html>', {status: 200}))).toBe(MET_UNREADABLE);
    expect(await said(ok({properties: {timeseries: []}}))).toBe(MET_NO_CURRENT);
    const stopped = new AbortController(); stopped.abort();
    expect(await said(new DOMException('Aborted', 'AbortError'), stopped.signal)).toBe(MET_STOPPED);
    // The signal travels with each request.
    const live = new AbortController(), {calls, impl} = service(ok(forecast), ok(sunBrussels, {}));
    await fetchWeather({world: chosen(), now: NOW, fetchImpl: impl, timeZone: ZONE, signal: live.signal});
    for (const call of calls) expect(call.init).toEqual({...PLAIN, signal: live.signal});
  });
  test('the sun is best effort: its failure, or a polar night, leaves a reading without sun times', async () => {
    for (const sun of [status(500), status(429), new TypeError('Failed to fetch'), new Response('not json', {status: 200}), ok(sunPolarNight, {})]) {
      const {calls, impl} = service(ok(forecast), sun);
      const next = await fetchWeather({world: chosen(), now: NOW, fetchImpl: impl, timeZone: ZONE});
      expect(calls).toHaveLength(2);
      expect(readingOf(next)).not.toBeNull(); expect(readingOf(next)).not.toHaveProperty('sun');
    }
    // Yesterday's sun times are not today's: asked again, and dropped when that fails.
    const world = withReading({sun: {rise: '2026-11-10T06:49:00.000Z', set: '2026-11-10T16:02:00.000Z'}});
    const again = service(ok(forecast), status(503));
    expect(readingOf(await fetchWeather({world, now: later(HOUR), fetchImpl: again.impl, timeZone: ZONE}))).not.toHaveProperty('sun');
    expect(again.calls.map(c => c.url)).toEqual([FORECAST_URL, SUN_URL]);
  });
  test('off, or without a place: nothing is asked at all', async () => {
    const {calls, impl} = service();
    const off = await failure(fetchWeather({world: setPlace(emptyWorld(), BRUSSELS), now: NOW, fetchImpl: impl, timeZone: ZONE}));
    expect(off.message).toBe(WEATHER_OFF); expect(off.world.askedAt).toBeUndefined();
    const nowhere = await failure(fetchWeather({world: setWorldOn(emptyWorld(), true), now: NOW, fetchImpl: impl, timeZone: ZONE}));
    expect(nowhere.message).toBe(WEATHER_NO_PLACE);
    expect(calls).toEqual([]);
  });
  test('every request is a GET to the one host with coordinates at two decimals, whatever the record holds', async () => {
    const places = [BRUSSELS, {name: 'New York', lat: 40.71, lon: -74.01}, {name: 'Sydney', lat: -33.87, lon: 151.21}, {name: 'Null Island', lat: 0, lon: 0}, {name: 'Whole', lat: 52, lon: 5}];
    // A record written by hand with more decimals than the app ever stores.
    const precise = novaWorldSchema.parse({version: 1, on: true, place: {name: 'Precise', lat: 50.8503396, lon: 4.3517103}});
    for (const world of [...places.map(place => setPlace(setWorldOn(emptyWorld(), true), place)), precise]) {
      const {calls, impl} = service(ok(forecast), ok(sunBrussels, {}));
      await fetchWeather({world, now: NOW, fetchImpl: impl, timeZone: ZONE});
      expect(calls).toHaveLength(2);
      for (const {url, init} of calls) {
        expect(init?.method, url).toBe('GET');
        expect(new URL(url).origin, url).toBe(MET_HOST);
        expect(url, url).toMatch(/\?lat=-?\d{1,2}\.\d{2}&lon=-?\d{1,3}\.\d{2}(&date=\d{4}-\d{2}-\d{2}&offset=(%2B|-)\d{2}:\d{2})?$/);
        expect(init, url).not.toHaveProperty('headers'); expect(init, url).not.toHaveProperty('body');
      }
    }
  });
});

test('the service\'s consumer brand name appears nowhere in this folder, in any spelling', () => {
  const DIR = __dirname, files: string[] = [];
  const walk = (dir: string) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else files.push(path); } };
  walk(DIR);
  expect(files.length).toBeGreaterThanOrEqual(8);
  for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toMatch(/\byr\b/i);
});
