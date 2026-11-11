import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import nextConfig from '../../../next.config';
import {connectSources, globalStaticHeaders} from '../../csp-compose.mjs';
import egress from '../../egress-policy.json';
import forecast from './fixtures/forecast-brussels.json';
import sunBrussels from './fixtures/sun-brussels.json';
import {MET_HOST, MET_REFERRER_POLICY, fetchWeather, forecastUrl, sunUrl} from './met';
import {emptyWorld, setPlace, setWorldOn} from './record';

// Session AM (TIER 3 (egress), ADR-038 D12, A2): the weather's one host in the app's connect-src, and how a weather
// request names the app to MET Norway (their terms: a website identifies itself by its Origin, or its Referer).
describe('the weather host in the egress policy', () => {
  test('exactly https://api.met.no, on /app documents only, and it is the host the client asks', () => {
    expect(MET_HOST).toBe('https://api.met.no');
    expect(egress.csp.app.connect.filter(source => /met\.no/.test(source))).toEqual([MET_HOST]);
    expect(connectSources(egress, 'app').filter(source => source === MET_HOST)).toHaveLength(1);
    expect(connectSources(egress, 'site')).not.toContain(MET_HOST);
    expect(JSON.stringify([egress.chainOrigins, egress.aiProviderOrigins, egress.csp.site, egress.csp.app.img, egress.csp.app.frame])).not.toContain('met.no');
    for (const url of [forecastUrl({lat: 50.85, lon: 4.35}), sunUrl({lat: 50.85, lon: 4.35}, '2026-11-11', 60)]) expect(new URL(url).origin).toBe(MET_HOST);
    expect(egress.csp.note).toContain('https://api.met.no');
  });
});

describe('how a weather request names the app (A2)', () => {
  // What a cross-origin fetch from an https page to an https host sends as its Referer, per policy (W3C Referrer Policy §3).
  const REFERER: Record<string, 'none' | 'origin' | 'full'> = {
    'no-referrer': 'none', 'same-origin': 'none',
    origin: 'origin', 'strict-origin': 'origin', 'origin-when-cross-origin': 'origin', 'strict-origin-when-cross-origin': 'origin',
    'no-referrer-when-downgrade': 'full', 'unsafe-url': 'full',
  };
  test('the app\'s documents are sent with Referrer-Policy: no-referrer, which alone would send no Referer at all', async () => {
    const everyResponse = (await nextConfig.headers!()).find(rule => rule.source === '/(.*)')!.headers.find(h => h.key === 'Referrer-Policy');
    expect(everyResponse?.value).toBe('no-referrer');
    expect(new Map(globalStaticHeaders(egress)).get('Referrer-Policy')).toBe('no-referrer');
    expect(readFileSync(new URL('../../../public/_headers', import.meta.url), 'utf8')).toContain('  Referrer-Policy: no-referrer\n');
    expect(REFERER[everyResponse!.value]).toBe('none');
  });
  test('so each weather request carries its own policy, one that sends the origin and only the origin; the Origin header goes with every CORS request', async () => {
    expect(REFERER[MET_REFERRER_POLICY]).toBe('origin');
    const inits: RequestInit[] = [];
    const answers = [new Response(JSON.stringify(forecast), {status: 200}), new Response(JSON.stringify(sunBrussels), {status: 200})];
    const impl = (async (_input: RequestInfo | URL, init?: RequestInit) => { inits.push(init ?? {}); return answers.shift()!; }) as typeof fetch;
    await fetchWeather({world: setPlace(setWorldOn(emptyWorld(), true), {name: 'Brussels', lat: 50.85, lon: 4.35}), now: new Date('2026-11-11T04:35:00Z'), fetchImpl: impl, timeZone: 'Europe/Brussels'});
    expect(inits).toHaveLength(2);
    for (const init of inits) {
      expect(init.referrerPolicy).toBe(MET_REFERRER_POLICY);
      expect(REFERER[init.referrerPolicy!]).toBe('origin');
      // The Fetch standard adds Origin to every request in "cors" mode (the default for a cross-origin fetch), whatever
      // the referrer policy; "no-cors" would drop it on a GET, and a `referrer` of '' would drop the Referer.
      expect(init).not.toHaveProperty('mode'); expect(init).not.toHaveProperty('referrer');
      // A simple request: no header of ours, so no preflight, which the service does not answer.
      expect(init).not.toHaveProperty('headers'); expect(init.method).toBe('GET'); expect(init.credentials).toBe('omit');
    }
  });
});
