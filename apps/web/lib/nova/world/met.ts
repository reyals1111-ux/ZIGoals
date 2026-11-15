import {MAX_DAYS, MAX_HOURS, MAX_SYMBOL, markAsked, placeOf, readingOf, readingSchema, round2, setReading, worldOn, type NovaWorld, type WorldPlace, type WorldReading} from './record';

/**
 * Session AM (ADR-038 D12–D15, A2): the MET Norway client behind NOVA's opt-in weather. One host, two products
 * (Locationforecast 2.0 and Sunrise 3.0), no key, no cookie, no custom header. Pure and testable: nothing here reads
 * storage or the page; the caller decides with `shouldFetch`, calls `fetchWeather` and stores the record it returns.
 *
 * The service's terms, as they bind this file (https://api.met.no/doc/TermsOfService, read 11 Nov 2026):
 * - a website may call the API directly only with *simple* cross-origin requests, identified by the Origin header the
 *   browser sends by itself; requests with custom headers and CORS preflights are "explicitly not supported" (an
 *   OPTIONS preflight is answered without Access-Control-Allow-Origin, so the browser refuses the request);
 * - coordinates at four decimals at most (two are sent, about 1 km); never repeat a request before its `Expires` time,
 *   then revalidate with If-Modified-Since; no HEAD before a GET; a 429 means stop;
 * - credit "Data from MET Norway" with the licence (CC BY 4.0); the name and logo of their consumer service are theirs
 *   and are never used here.
 */
export const MET_HOST = 'https://api.met.no';
export const MET_CREDIT = 'Data from MET Norway';
export const MET_CREDIT_NL = 'Gegevens van MET Norway';
export const MET_LICENCE_URL = 'https://creativecommons.org/licenses/by/4.0/';
export const MET_SITE_URL = 'https://www.met.no/en';
/**
 * The policy each weather request carries itself (A2). The app's documents are sent with `Referrer-Policy: no-referrer`
 * (next.config.ts, public/_headers), under which a cross-origin fetch still sends Origin but no Referer; this value on
 * the request adds the app's origin, and only its origin, as the Referer.
 */
export const MET_REFERRER_POLICY = 'strict-origin-when-cross-origin' as const;
/** At most one ask per 10 minutes per place, also after an error (D15). */
export const MIN_ASK_GAP_MS = 10 * 60_000;
/** Without a usable `Expires` header a reading is kept for 30 minutes; never under 10 minutes, never over a day. */
export const DEFAULT_KEEP_MS = 30 * 60_000, MAX_KEEP_MS = 24 * 60 * 60_000;
export const MET_SILENT = 'MET Norway did not answer just now.';
export const MET_REFUSED = 'MET Norway refused the request for this place.';
export const MET_UNREADABLE = 'MET Norway sent an answer that could not be read.';
export const MET_NO_CURRENT = 'MET Norway sent no forecast for this moment.';
export const MET_STOPPED = 'The weather request was stopped.';
export const WEATHER_OFF = 'Weather is off. Turn on "Weather (outside data)" first.';
export const WEATHER_NO_PLACE = 'Choose a place for the weather first.';
const LAST_STAYS = ' The last reading stays.';
const HOUR = 3_600_000;

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | undefined => typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Rec : undefined;
const numIn = (v: unknown, min: number, max: number): number | undefined => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
/** The object without its undefined fields: what is unknown is left out, never stored as 0 or null. */
function known<T extends Rec>(o: T): T { const out: Rec = {}; for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v; return out as T; }

// ── Addresses ───────────────────────────────────────────────────────────────────────────────────────────────────────
type Position = Pick<WorldPlace, 'lat' | 'lon'>;
/** A coordinate as it is sent: exactly two decimals ("4.35", "-74.01", "50.00"). */
export const coordinate = (n: number): string => (round2(n) + 0).toFixed(2);
function position(place: Position): string {
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon) || Math.abs(place.lat) > 90 || Math.abs(place.lon) > 180) throw Error('Use a latitude between -90 and 90 and a longitude between -180 and 180.');
  return `lat=${coordinate(place.lat)}&lon=${coordinate(place.lon)}`;
}
/** Locationforecast 2.0, the complete forecast of one place. */
export const forecastUrl = (place: Position): string => `${MET_HOST}/weatherapi/locationforecast/2.0/complete?${position(place)}`;
/** Minutes east of UTC as the service's `offset`: 60 → "+01:00", -330 → "-05:30". */
export function offsetText(minutes: number): string {
  const m = Number.isFinite(minutes) ? Math.max(-14 * 60, Math.min(14 * 60, Math.round(minutes))) : 0, abs = Math.abs(m);
  return `${m < 0 ? '-' : '+'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}
/**
 * Sunrise 3.0, the sun of one day at one place: `date` is YYYY-MM-DD, `offset` the minutes east of UTC that day's
 * times are given in. The plus sign travels as %2B (a bare "+" in a query can be read as a space; the service answers
 * both the same, checked 11 Nov 2026).
 */
export function sunUrl(place: Position, date: string, offset: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw Error('Use a date as YYYY-MM-DD.');
  return `${MET_HOST}/weatherapi/sunrise/3.0/sun?${position(place)}&date=${date}&offset=${offsetText(offset).replace('+', '%2B')}`;
}

// ── The clock of a time zone ────────────────────────────────────────────────────────────────────────────────────────
/** The device's own time zone ("Europe/Brussels"); UTC when the browser will not say. */
export function deviceZone(): string { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } }
const clocks = new Map<string, Intl.DateTimeFormat>();
function clockOf(timeZone: string): Intl.DateTimeFormat {
  let clock = clocks.get(timeZone);
  if (!clock) {
    const options = {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'} as const;
    try { clock = new Intl.DateTimeFormat('en-CA', {...options, timeZone}); } catch { clock = new Intl.DateTimeFormat('en-CA', {...options, timeZone: 'UTC'}); }
    clocks.set(timeZone, clock);
  }
  return clock;
}
/** A moment on the clock of a time zone: its day (YYYY-MM-DD), the minutes since that day's midnight, the minutes east of UTC. */
export function localTime(ms: number, timeZone: string): {date: string; minutes: number; offset: number} {
  const p: Record<string, number> = {};
  for (const part of clockOf(timeZone).formatToParts(new Date(ms))) if (part.type !== 'literal') p[part.type] = Number(part.value);
  const wall = Date.UTC(p.year ?? 1970, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0, p.second ?? 0);
  const pad = (n: number | undefined, size = 2) => String(n ?? 0).padStart(size, '0');
  return {date: `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`, minutes: (p.hour ?? 0) * 60 + (p.minute ?? 0), offset: Math.round((wall - Math.floor(ms / 1000) * 1000) / 60_000)};
}

// ── Reading an answer ───────────────────────────────────────────────────────────────────────────────────────────────
/** The parts of a reading that come from the forecast itself (the rest: when it was fetched, until when it is kept, the sun). */
export type ForecastParts = Pick<WorldReading, 'lat' | 'lon' | 'updatedAt' | 'now' | 'hours' | 'days'>;
const partsSchema = readingSchema.pick({lat: true, lon: true, updatedAt: true, now: true, hours: true, days: true});
type Step = {ms: number; t: number; details: Rec; h1?: Rec; h6?: Rec; h12?: Rec};
const symbolOf = (period: Rec | undefined): string | undefined => { const s = rec(period?.summary)?.symbol_code; return typeof s === 'string' && s.length > 0 && s.length <= MAX_SYMBOL && /^[a-z_]+$/.test(s) ? s : undefined; };
const precipOf = (period: Rec | undefined, max: number): number | undefined => numIn(rec(period?.details)?.precipitation_amount, 0, max);
const isoOf = (v: unknown): string | undefined => { if (typeof v !== 'string') return undefined; const ms = Date.parse(v); return Number.isNaN(ms) ? undefined : new Date(ms).toISOString(); };
const round1 = (n: number): number => Math.round(n * 10) / 10;
function stepsOf(json: unknown): Step[] {
  const series = rec(rec(json)?.properties)?.timeseries;
  if (!Array.isArray(series)) return [];
  const steps: Step[] = [];
  for (const entry of series) {
    const item = rec(entry), data = rec(item?.data), details = rec(rec(data?.instant)?.details);
    const ms = typeof item?.time === 'string' ? Date.parse(item.time) : Number.NaN, t = numIn(details?.air_temperature, -90, 70);
    // A step without a time or a temperature says nothing we show.
    if (Number.isNaN(ms) || t === undefined || !details) continue;
    steps.push(known({ms, t, details, h1: rec(data?.next_1_hours), h6: rec(data?.next_6_hours), h12: rec(data?.next_12_hours)}));
  }
  return steps.sort((a, b) => a.ms - b.ms).filter((step, i, all) => i === 0 || step.ms !== all[i - 1]!.ms);
}
/**
 * A Locationforecast answer as the forecast parts of a reading. Tolerant: a value that is missing, of the wrong type or
 * out of range is left out (never 0); a step without a time or a temperature is skipped.
 * - `now`: the newest step at or before `now` (the service's steps start on the hour), with the symbol of its next hour;
 * - `hours`: the steps after it, up to 24 hours ahead, at most 24;
 * - `days`: at most 6 days of `timeZone` (the device's by default), today first: the lowest and highest temperature
 *   among that day's steps from now on, the symbol nearest to midday (its six-hour summary when there is one) and the
 *   precipitation of its steps added up, each period counted once.
 * Throws in plain words when there is no usable step for this moment.
 */
export function parseForecast(json: unknown, place: Position, now: Date, timeZone: string = deviceZone()): ForecastParts {
  const steps = stepsOf(json), nowMs = now.getTime();
  let at = -1;
  for (let i = 0; i < steps.length && steps[i]!.ms <= nowMs; i++) at = i;
  if (at === -1 && steps[0] && steps[0].ms - nowMs <= HOUR) at = 0;
  const current = steps[at];
  if (!current || nowMs - current.ms > 6 * HOUR) throw Error(MET_NO_CURRENT);
  const symbol = (step: Step) => symbolOf(step.h1) ?? symbolOf(step.h6) ?? symbolOf(step.h12) ?? '';
  const d = current.details;
  const nowPart = known({
    at: new Date(current.ms).toISOString(), t: current.t, symbol: symbol(current),
    wind: numIn(d.wind_speed, 0, 150), humidity: numIn(d.relative_humidity, 0, 100), uv: numIn(d.ultraviolet_index_clear_sky, 0, 20),
    precip: precipOf(current.h1, 500), cloud: numIn(d.cloud_area_fraction, 0, 100),
  });
  const hours = steps.slice(at + 1).filter(step => step.ms <= current.ms + 24 * HOUR).slice(0, MAX_HOURS)
    .map(step => known({at: new Date(step.ms).toISOString(), t: step.t, symbol: symbol(step), precip: precipOf(step.h1, 500)}));
  const today = localTime(nowMs, timeZone).date;
  const days = new Map<string, {min: number; max: number; precip?: number; noon?: {far: number; symbol: string}}>();
  let covered = Number.NEGATIVE_INFINITY;
  for (const step of steps.slice(at)) {
    const {date, minutes} = localTime(step.ms, timeZone);
    if (date < today) continue;
    let day = days.get(date);
    if (!day) { if (days.size === MAX_DAYS) break; day = {min: step.t, max: step.t}; days.set(date, day); }
    day.min = Math.min(day.min, step.t); day.max = Math.max(day.max, step.t);
    // Precipitation: an hour's amount where the step has one, else its six hours'; a period already counted is not counted twice.
    const hour = precipOf(step.h1, 500), six = precipOf(step.h6, 2000);
    if (step.ms >= covered && (hour !== undefined || six !== undefined)) { day.precip = (day.precip ?? 0) + (hour ?? six ?? 0); covered = step.ms + (hour !== undefined ? HOUR : 6 * HOUR); }
    const dayLong = symbolOf(step.h6) ?? symbolOf(step.h1) ?? symbolOf(step.h12), far = Math.abs(minutes - 12 * 60);
    if (dayLong && (!day.noon || far < day.noon.far)) day.noon = {far, symbol: dayLong};
  }
  const dayParts = [...days].map(([date, day]) => known({date, min: day.min, max: day.max, symbol: day.noon?.symbol ?? '', precip: day.precip !== undefined && day.precip <= 2000 ? round1(day.precip) : undefined}));
  const checked = partsSchema.safeParse(known({lat: round2(place.lat) + 0, lon: round2(place.lon) + 0, updatedAt: isoOf(rec(rec(rec(json)?.properties)?.meta)?.updated_at), now: nowPart, hours, days: dayParts}));
  if (!checked.success) throw Error(MET_UNREADABLE);
  return checked.data;
}
/** A Sunrise answer as the sun's rise and set (UTC ISO strings). In the polar night and under the midnight sun the service sends null: left out. */
export function parseSun(json: unknown): {rise?: string; set?: string} {
  const properties = rec(rec(json)?.properties);
  return known({rise: isoOf(rec(properties?.sunrise)?.time), set: isoOf(rec(properties?.sunset)?.time)});
}

// ── Symbols in words ────────────────────────────────────────────────────────────────────────────────────────────────
export type ConditionKind = 'clear' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'sleet' | 'snow' | 'thunder';
export type Condition = {kind: ConditionKind; night: boolean; words: string; wordsNl: string};
export const UNKNOWN_CONDITION: Condition = {kind: 'cloud', night: false, words: 'Weather', wordsNl: 'Weer'};
const SKY: Readonly<Record<string, readonly [ConditionKind, string, string]>> = {
  clearsky: ['clear', 'Clear sky', 'Helder'], fair: ['partly', 'Fair', 'Licht bewolkt'], partlycloudy: ['partly', 'Partly cloudy', 'Half bewolkt'],
  cloudy: ['cloud', 'Cloudy', 'Bewolkt'], fog: ['fog', 'Fog', 'Mist'],
};
// The service's own spellings include "lightssnowshowersandthunder" and "lightssleetshowersandthunder".
const WET = /^(lights?|heavy)?(rain|sleet|snow)(showers)?(andthunder)?$/;
const WET_NL: Readonly<Record<string, readonly [plain: string, showers: string]>> = {rain: ['regen', 'regenbuien'], sleet: ['natte sneeuw', 'buien met natte sneeuw'], snow: ['sneeuw', 'sneeuwbuien']};
const sentenceCase = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
/**
 * A MET Norway `symbol_code` ("partlycloudy_night", "lightrainshowers_day", "heavysnow") as a kind to draw, whether it
 * is the night variant, and plain words in English and Dutch (the English is the service's own legend). Every code of
 * the service's list maps; anything else is "Weather".
 */
export function condition(symbol: string): Condition {
  const m = /^([a-z]+)(?:_(day|night|polartwilight))?$/.exec(typeof symbol === 'string' ? symbol : '');
  if (!m) return {...UNKNOWN_CONDITION};
  const base = m[1]!, night = m[2] === 'night', sky = SKY[base];
  if (sky) return {kind: sky[0], night, words: sky[1], wordsNl: sky[2]};
  const wet = WET.exec(base);
  if (!wet) return {...UNKNOWN_CONDITION};
  const strength = wet[1]?.startsWith('light') ? 'light' : wet[1] === 'heavy' ? 'heavy' : '', what = wet[2]!, showers = Boolean(wet[3]), thunder = Boolean(wet[4]);
  const words = `${strength ? `${strength} ` : ''}${what}${showers ? ' showers' : ''}${thunder ? ' and thunder' : ''}`;
  const wordsNl = `${strength === 'light' ? 'lichte ' : strength === 'heavy' ? 'zware ' : ''}${WET_NL[what]![showers ? 1 : 0]}${thunder ? ' en onweer' : ''}`;
  const kind: ConditionKind = thunder ? 'thunder' : what === 'rain' ? (strength === 'light' ? 'drizzle' : 'rain') : what === 'sleet' ? 'sleet' : 'snow';
  return {kind, night, words: sentenceCase(words), wordsNl: sentenceCase(wordsNl)};
}

// ── Manners ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * May the service be asked now (D13, D15)? No while the switch is off, without a place, while the page is hidden, while
 * nothing wants weather (no weather widget on the stage and no weather question), while the reading kept for this place
 * has not reached its `Expires` time, and within 10 minutes of the last ask for this place (also one that failed).
 */
export function shouldFetch({world, now, hidden, wanted}: {world: NovaWorld; now: Date; hidden: boolean; wanted: boolean}): boolean {
  if (!worldOn(world) || !placeOf(world) || hidden || !wanted) return false;
  const t = now.getTime(), reading = readingOf(world);
  if (reading && Date.parse(reading.expires) > t) return false;
  const asked = world.askedAt ? Date.parse(world.askedAt) : Number.NaN;
  return Number.isNaN(asked) || Math.abs(t - asked) >= MIN_ASK_GAP_MS;
}

/** A weather request that did not give a reading. `world` is the record to store all the same: the ask is counted. */
export class WeatherError extends Error {
  readonly world: NovaWorld;
  constructor(message: string, world: NovaWorld) { super(message); this.name = 'WeatherError'; this.world = world; }
}
/**
 * How the forecast is revalidated after its `Expires` time (A2: with If-Modified-Since).
 * - `'browser'` (the default, for the app): the request carries no header of ours and `cache: 'no-cache'`, so the
 *   browser's own HTTP cache sends If-Modified-Since and, on a 304, hands back its copy. This is the only way a page
 *   can do it: a header set by the page makes the request non-simple, the browser asks permission with an OPTIONS
 *   preflight first, and the service answers that without CORS headers (see the terms above), so the request fails.
 * - `'header'` (a server-side caller such as the caching proxy ADR-038 carries, and the tests): `If-Modified-Since`
 *   is set from the kept reading's `lastModified`, with `cache: 'no-store'`; a 304 keeps the reading.
 */
export type Revalidate = 'browser' | 'header';
export type FetchWeatherOptions = {world: NovaWorld; now: Date; fetchImpl?: typeof fetch; signal?: AbortSignal; timeZone?: string; revalidate?: Revalidate};
function keepUntil(header: string | null, now: Date): string {
  const t = now.getTime(), said = header ? Date.parse(header) : Number.NaN;
  return new Date(Math.min(t + MAX_KEEP_MS, Math.max(t + MIN_ASK_GAP_MS, Number.isNaN(said) ? t + DEFAULT_KEEP_MS : said))).toISOString();
}
const plainHeader = (v: string | null): string | undefined => v && v.length <= 64 && !/[\u0000-\u001f\u007f]/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
const answered = (status: number): boolean => status === 200 || status === 203;
/**
 * Asks MET Norway for the chosen place and returns the record to store (the caller checks `shouldFetch` first).
 * One plain GET for the forecast; then, only when the kept reading has no sun times for today, one GET for the sun,
 * whose failure never fails the reading. Requests carry no cookie (`credentials: 'omit'`) and the app's origin as the
 * Referer. 200: a new reading, kept until the answer's `Expires`. 304: the kept reading with the new `Expires`.
 * 429, a server error or no answer: a `WeatherError` in plain words whose `world` has the ask counted, so the
 * 10-minute rule holds after an error too.
 */
/** Security review AM-S10: an answer larger than this is not read (a full forecast is about 150 kB). */
export const MAX_ANSWER_CHARS = 1_500_000;
async function boundedJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > MAX_ANSWER_CHARS) throw Error('too large');
  const body = await response.text();
  if (body.length > MAX_ANSWER_CHARS) throw Error('too large');
  return JSON.parse(body);
}
export async function fetchWeather({world, now, fetchImpl = fetch, signal, timeZone = deviceZone(), revalidate = 'browser'}: FetchWeatherOptions): Promise<NovaWorld> {
  if (!worldOn(world)) throw new WeatherError(WEATHER_OFF, world);
  const place = placeOf(world);
  if (!place) throw new WeatherError(WEATHER_NO_PLACE, world);
  const kept = readingOf(world), asked = markAsked(world, now);
  const fail = (words: string) => new WeatherError(`${words}${kept ? LAST_STAYS : ''}`, asked);
  const init = (headers?: Record<string, string>): RequestInit => ({
    // Security review AM-S10: a redirect is an error (the answer comes from api.met.no or not at all).
    method: 'GET', credentials: 'omit', redirect: 'error', cache: revalidate === 'header' ? 'no-store' : 'no-cache', referrerPolicy: MET_REFERRER_POLICY,
    ...(headers ? {headers} : {}), ...(signal ? {signal} : {}),
  });
  let response: Response;
  try { response = await fetchImpl(forecastUrl(place), init(revalidate === 'header' && kept?.lastModified ? {'If-Modified-Since': kept.lastModified} : undefined)); }
  catch { throw fail(signal?.aborted ? MET_STOPPED : MET_SILENT); }
  const expires = keepUntil(response.headers.get('expires'), now);
  let reading: WorldReading;
  if (response.status === 304 && kept) reading = {...kept, expires};
  else if (answered(response.status)) {
    let json: unknown;
    try { json = await boundedJson(response); } catch { throw fail(signal?.aborted ? MET_STOPPED : MET_UNREADABLE); }
    let parts: ForecastParts;
    try { parts = parseForecast(json, place, now, timeZone); } catch (error) { throw fail(error instanceof Error && error.message === MET_NO_CURRENT ? MET_NO_CURRENT : MET_UNREADABLE); }
    reading = known({...parts, fetchedAt: now.toISOString(), expires, lastModified: plainHeader(response.headers.get('last-modified'))});
  } else throw fail(response.status === 429 || response.status >= 500 ? MET_SILENT : response.status === 304 ? MET_UNREADABLE : MET_REFUSED);

  // The sun of today, on the device's clock. Its times hold all day: asked once a day per place, best effort.
  const today = localTime(now.getTime(), timeZone);
  const sunDay = (sun: {rise?: string; set?: string} | undefined): string | undefined => { const time = sun?.rise ?? sun?.set; return time ? localTime(Date.parse(time), timeZone).date : undefined; };
  let sun: {rise?: string; set?: string} | undefined = sunDay(kept?.sun) === today.date ? known({rise: kept?.sun?.rise, set: kept?.sun?.set}) : undefined;
  if (!sun) {
    try {
      const answer = await fetchImpl(sunUrl(place, today.date, today.offset), init());
      if (answered(answer.status)) sun = parseSun(await boundedJson(answer));
    } catch { /* The reading stands without the sun. */ }
  }
  const next: WorldReading = {...reading};
  if (sun && (sun.rise || sun.set)) next.sun = sun; else delete next.sun;
  const checked = readingSchema.safeParse(next);
  if (!checked.success) throw fail(MET_UNREADABLE);
  return setReading(world, checked.data, now);
}
