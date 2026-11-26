import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {buildPlan, type PlanInput} from './plan';
import {emptyNotifyPrefs, moodTimes, notifyPrefsSchema, NOTIFY_TYPES, setMoodTimes, setType, typeOn} from './prefs';
import {NOTIFY_LABELS} from './labels';
import {zonedInstant} from './zone';

/**
 * Session AV lane 2 (habits; LEDGER #180, Daylio's reminders to log): a mood check-in of its own (off by default) at its
 * time and an optional second one, opening the mood question; the first stays quiet once today's mood is answered; the
 * notification never says a mood. Older prefs read as before.
 */
const ZONE = 'Europe/Brussels', NOW = Date.UTC(2026, 9, 5, 5, 0); // Monday 07:00 in Brussels
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; data: {url: string}}}}).self.zigoalsCompose;
};
describe('the mood check-in notification', () => {
  it('a switch of its own, off by default; its times; older prefs unchanged', () => {
    expect(NOTIFY_TYPES).toContain('mood');
    expect(typeOn(emptyNotifyPrefs(), 'mood')).toBe(false);
    expect(NOTIFY_LABELS.mood.title).toBe('Mood check-in');
    expect(moodTimes(emptyNotifyPrefs())).toEqual(['20:00']);
    const two = setMoodTimes(emptyNotifyPrefs(), '09:15', '21:00');
    expect(moodTimes(two)).toEqual(['09:15', '21:00']);
    expect(moodTimes(setMoodTimes(two, '09:15', null))).toEqual(['09:15']);
    expect(() => setMoodTimes(two, '25:00', null)).toThrow();
    expect(notifyPrefsSchema.parse(JSON.parse(JSON.stringify(two)))).toEqual(two);
    expect(buildPlan(base()).snapshot.items.filter(i => i.kind === 'mood')).toEqual([]);
  });
  it('wakes at both times, opens the mood question, and the first stays quiet once today is answered', () => {
    const prefs = setMoodTimes(setType(emptyNotifyPrefs(), 'mood', true), '09:15', '21:00');
    const items = buildPlan(base({prefs, mood: {doneToday: false}})).snapshot.items.filter(i => i.kind === 'mood');
    expect(items.filter(i => i.at === at('2026-10-05', '09:15')).map(i => [i.id, i.href, i.label])).toEqual([['mood', '/app/health?mood=ask', undefined]]);
    expect(items.some(i => i.at === at('2026-10-05', '21:00') && i.id === 'mood-2')).toBe(true);
    const answered = buildPlan(base({prefs, mood: {doneToday: true}})).snapshot.items.filter(i => i.kind === 'mood');
    expect(answered.some(i => i.at === at('2026-10-05', '09:15'))).toBe(false);
    expect(answered.some(i => i.at === at('2026-10-06', '09:15'))).toBe(true); // tomorrow still asks
    expect(answered.some(i => i.at === at('2026-10-05', '21:00'))).toBe(true);
    // Inside quiet hours it is said on the card and wakes nothing.
    expect(buildPlan(base({prefs: setMoodTimes(prefs, '23:00', null)})).refused).toContainEqual({kind: 'mood', time: '23:00'});
  });
  it('the notification asks, never says a mood, and opens Health', () => {
    const when = at('2026-10-05', '09:15');
    const out = composer()({v: 1, labels: true, items: [{at: when, kind: 'mood', id: 'mood', href: '/app/health?mood=ask', actionable: false}], summary: null}, when);
    expect(out.body).toBe('How does today feel? One tap answers it.');
    expect(out.data.url).toBe('/app/health?mood=ask');
  });
});
