import {weatherProxyUrl} from '../../csp-compose.mjs';
import {round2, type WorldPlace} from './record';

/**
 * Session AM-2 (owner's step 4a, decision of 15 Nov): the weather proxy, when this build is configured with one.
 * `workers/weather-proxy` (PR #102; the owner deploys it, docs/run11/WEATHER_PROXY_ACTIVATION.md) answers one route,
 * `GET /v1/forecast?lat=<n>&lon=<n>`, with MET Norway's Locationforecast 2.0 *compact* answer byte for byte and
 * `Cache-Control: public, max-age=<seconds until MET Norway's Expires>`; only the app's own origin gets an answer.
 *
 * Its address comes from build configuration and nowhere else: `NEXT_PUBLIC_WEATHER_PROXY_URL`, inlined when the app is
 * built and accepted only as exactly `https://<dns name>/v1/forecast` (lib/csp-compose.mjs `weatherProxyUrl`, the same
 * reader that adds its origin to connect-src). Never from storage, a record, the address bar, a model or a restore.
 * Without it (every build so far) `WEATHER_PROXY_URL` is null and the client asks MET Norway directly, under the A2 rules.
 *
 * With it the browser asks the proxy and never `api.met.no`: the proxy sees the network address and the place rounded to
 * two decimals; MET Norway sees the proxy's address, the proxy's own User-Agent and that rounded place. If the proxy does
 * not answer, the last reading stays: the client does not quietly fall back to asking MET Norway directly, because the
 * words at the switch said MET Norway would not see the address. The proxy has no route for sunrise and sunset, so those
 * are worked out on the device (lib/nova/world/sun-calc.ts) and nothing is asked for them.
 */
/**
 * Security review (finding 10a): a local build (the development server, or a LOCAL_DEMO build) may also name a proxy on
 * this machine, `http://127.0.0.1:<port>/v1/forecast` (`wrangler dev`); no other build accepts that form.
 */
export const LOCAL_BUILD: boolean = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_APP_ENVIRONMENT === 'LOCAL_DEMO';
export const WEATHER_PROXY_URL: string | null = weatherProxyUrl(process.env.NEXT_PUBLIC_WEATHER_PROXY_URL, {local: LOCAL_BUILD});
export const weatherViaProxy = (proxy: string | null = WEATHER_PROXY_URL): boolean => proxy !== null;
/** The proxy's one request: the same two decimals the direct request sends, and nothing else. */
export function proxyForecastUrl(proxy: string, place: Pick<WorldPlace, 'lat' | 'lon'>): string {
  const base = weatherProxyUrl(proxy, {local: LOCAL_BUILD});
  if (!base) throw Error('The weather proxy address is not one this build accepts.');
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon) || Math.abs(place.lat) > 90 || Math.abs(place.lon) > 180) throw Error('Use a latitude between -90 and 90 and a longitude between -180 and 180.');
  const two = (n: number): string => (round2(n) + 0).toFixed(2);
  return `${base}?lat=${two(place.lat)}&lon=${two(place.lon)}`;
}
/** The proxy says how long its answer holds as `Cache-Control: … max-age=<seconds>` (it sends no Expires): that moment as an HTTP date, or null. */
export function proxyExpires(cacheControl: string | null, now: Date): string | null {
  const m = /(?:^|[\s,])max-age=(\d{1,8})(?:$|[\s,])/i.exec(cacheControl ?? '');
  return m ? new Date(now.getTime() + Number(m[1]) * 1000).toUTCString() : null;
}

// ── Who sees what, in the words the person reads before turning weather on ──────────────────────────────────────────
type Lang = 'en' | 'nl';
/** The note under the "Weather (outside data)" switch (components/nova/panels/weather-choice.tsx). */
export const SWITCH_NOTE_DIRECT = 'Off unless you turn it on. On: when a weather widget is on the stage, this device asks MET Norway for the weather at your place. MET Norway then sees your network address and that place, rounded to about 1 km, and keeps both in its logs. No account, no key, nothing else.';
export const SWITCH_NOTE_PROXY = 'Off unless you turn it on. On: when a weather widget is on the stage, this device asks ZIGoals’ weather proxy for the weather at your place, and the proxy asks MET Norway. The proxy sees your network address and that place, rounded to about 1 km; it uses the address only to count requests and keeps no log of either. MET Norway sees the proxy’s address and that rounded place, never yours. No account, no key, nothing else.';
export const switchNote = (proxy: string | null = WEATHER_PROXY_URL): string => weatherViaProxy(proxy) ? SWITCH_NOTE_PROXY : SWITCH_NOTE_DIRECT;
/** The line said when a place is chosen. */
export const placeChosenWords = (name: string, proxy: string | null = WEATHER_PROXY_URL): string => weatherViaProxy(proxy)
  ? `Your place for the weather is ${name}. ZIGoals’ weather proxy asks MET Norway for that place, rounded to about 1 km.`
  : `Your place for the weather is ${name}. MET Norway is asked for that place, rounded to about 1 km.`;
export const switchedWords = (on: boolean, proxy: string | null = WEATHER_PROXY_URL): string => on ? 'Weather is on. Choose your place below.' : weatherViaProxy(proxy) ? 'Weather is off. Nothing is asked from the weather proxy or MET Norway.' : 'Weather is off. Nothing is asked from MET Norway.';
/** What NOVA says on a phone while weather is off (lib/nova/world/ask.ts), with a proxy configured. */
export const WEATHER_OFF_WORDS_PROXY: Readonly<Record<Lang, string>> = {
  en: 'Weather is off. Turn on “Weather (outside data)” in NOVA → Permissions and choose your place; then I ask ZIGoals’ weather proxy, which sees your network address and that place, rounded to about 1 km, and asks MET Norway for you (MET Norway sees the proxy’s address, not yours). Until then I don’t guess the weather.',
  nl: 'Het weer staat uit. Zet “Weather (outside data)” aan in NOVA → Permissions en kies je plaats; dan vraag ik het aan de weerproxy van ZIGoals, die je netwerkadres en die plaats (afgerond op ongeveer 1 km) ziet en het voor jou aan MET Norway vraagt (MET Norway ziet het adres van de proxy, niet het jouwe). Tot dan gok ik niet naar het weer.',
};
/** The words of a request that gave no reading, through the proxy (the direct ones are in met.ts). */
export const PROXY_SILENT = 'The weather proxy did not answer just now.';
export const PROXY_REFUSED = 'The weather proxy refused the request for this place.';
export const PROXY_BUSY = 'The weather proxy is busy. It is asked again in ten minutes.';
