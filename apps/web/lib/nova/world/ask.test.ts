import {describe, expect, it} from 'vitest';
import forecast from './fixtures/forecast-brussels.json';
import sun from './fixtures/sun-brussels.json';
import {weatherAnswer, WEATHER_OFF_WORDS, WEATHER_PLACE_WORDS} from './ask';
import {NOVA_WORLD_KEY} from './record';

/** Session AM (ADR-038 D13–D15, D19): the weather in words on a phone. */
const store = (value?: unknown) => { const m = new Map<string, string>(); if (value !== undefined) m.set(NOVA_WORLD_KEY, JSON.stringify(value)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, read: () => JSON.parse(m.get(NOVA_WORLD_KEY) ?? 'null')}; };
const never = (async () => { throw Error('must not be called'); }) as unknown as typeof fetch;
const ok = (calls: string[]) => (async (url: RequestInfo | URL) => { const u = String(url); calls.push(u); return new Response(JSON.stringify(u.includes('sunrise') ? sun : forecast), {status: 200, headers: {'content-type': 'application/json', expires: new Date(Date.parse('2026-11-11T13:40:00Z')).toUTCString()}}); }) as unknown as typeof fetch;
const now = new Date('2026-11-11T13:00:00Z'), place = {name: 'Brussels', lat: 50.85, lon: 4.35};
describe('weatherAnswer', () => {
  it('off: says how to turn it on, in the request’s language, and asks nothing', async () => {
    expect(await weatherAnswer(store(), now, 'en', never)).toBe(WEATHER_OFF_WORDS.en);
    expect(await weatherAnswer(store({version: 1, place}), now, 'nl', never)).toBe(WEATHER_OFF_WORDS.nl);
    expect(WEATHER_OFF_WORDS.en).toMatch(/MET Norway/); expect(WEATHER_OFF_WORDS.en).toMatch(/network address/); expect(WEATHER_OFF_WORDS.en).not.toMatch(/\d°/);
  });
  it('on without a place: asks nothing', async () => { expect(await weatherAnswer(store({version: 1, on: true}), now, 'en', never)).toBe(WEATHER_PLACE_WORDS.en); });
  it('on with a place: one forecast ask (and the sun), the reading is kept, the answer credits the service', async () => {
    const calls: string[] = [], s = store({version: 1, on: true, place});
    const words = await weatherAnswer(s, now, 'en', ok(calls));
    expect(calls.filter(u => u.includes('locationforecast')).length).toBe(1);
    expect(calls.every(u => u.startsWith('https://api.met.no/'))).toBe(true);
    expect(words).toMatch(/Brussels/); expect(words).toMatch(/MET Norway/); expect(words).not.toMatch(/\byr\b/i);
    expect(s.read().reading.lat).toBe(50.85);
    // Asked again a minute later: the reading on the device answers, nothing is fetched.
    expect(await weatherAnswer(s, new Date(now.getTime() + 60_000), 'en', never)).toMatch(/Brussels/);
  });
  it('the service does not answer: says so, keeps the ten-minute rule, never guesses', async () => {
    const s = store({version: 1, on: true, place}), down = (async () => new Response('', {status: 503})) as unknown as typeof fetch;
    const words = await weatherAnswer(s, now, 'en', down);
    expect(words).toMatch(/no reading for Brussels yet/); expect(words).not.toMatch(/\d+°/);
    expect(s.read().askedAt).toBe(now.toISOString());
    expect(await weatherAnswer(s, new Date(now.getTime() + 5 * 60_000), 'en', never)).toMatch(/no reading for Brussels yet/);
  });
});
