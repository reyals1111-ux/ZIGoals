/**
 * The weather proxy's fixed limits, in their own module: workerd reads every export of the main module as an entrypoint,
 * so plain values live here and worker.mjs exports only its handler and its Durable Object class (the push-device pattern).
 * MET Norway's terms (https://api.met.no/doc/TermsOfService): identify the app with a contact, cache each answer until its
 * Expires, revalidate with If-Modified-Since, and send at most 4 decimals of coordinates (this Worker sends 2).
 */
export const WEATHER_LIMITS=Object.freeze({
 /** Forecast requests per client group (an IPv4 address or an IPv6 /48) per clock minute. */ perMinute:60,
 /** Security delta (Medium): MET calls across ALL clients per clock minute (5 a second, well inside MET's per-app guidance);
  *  past it, a kept answer is served stale or the request gets 503, so many clients cannot spend the app's MET identity. */ upstreamPerMinute:300,
 /** How long one MET call may take before it counts as a failure. */ timeoutMs:8000,
 /** The largest MET answer read; a compact forecast is about 30 to 60 kB. */ bodyBytes:1_000_000,
 /** How long past its Expires a kept answer may still be served, marked stale, while MET is unavailable. */ staleMs:2*3_600_000,
 /** MET's Expires, clamped: kept at least 1 minute (a past or missing Expires never sends every request upstream), at most 1 day. */ minFreshMs:60_000,maxFreshMs:86_400_000,
});
/** The only upstream address: MET Norway's Locationforecast 2.0, compact form. */
export const MET_FORECAST='https://api.met.no/weatherapi/locationforecast/2.0/compact';
/** The default identity (wrangler.local.jsonc sets it as MET_USER_AGENT). Anything not starting with ZIGoals/ fails closed. */
export const USER_AGENT=/^ZIGoals\/[\x20-\x7e]{1,200}$/;
/** A coordinate as the app sends it: plain decimal, no exponent, no sign other than a leading minus. */
export const COORDINATE=/^-?\d{1,3}(?:\.\d{1,12})?$/;
/** An HTTP date as MET sends it in Last-Modified (IMF-fixdate), the only form echoed back in If-Modified-Since. */
export const HTTP_DATE=/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;
/** The synthetic cache path, on the Worker's own host (never a route: the Worker answers it 404). Bump v1 when the entry format changes. */
export const CACHE_PATH='/__weather-cache/v1/';
