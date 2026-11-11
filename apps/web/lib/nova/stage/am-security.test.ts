import {afterEach, describe, expect, it, vi} from 'vitest';
import forecast from '../world/fixtures/forecast-brussels.json';
import sunBrussels from '../world/fixtures/sun-brussels.json';
import {ZIGI_STORE_EVENT} from '../../ai/store/keys';
import {DEVICE_PARTS, nextValue, planParts} from '../../restore/plan';
import {MAX_MODEL_COMMANDS, MAX_SUMMON, stageCalls} from '../summon/summon';
import {keptAskWords} from '../summon/words';
import {WIDGETS, widgetSpec, type WidgetGate} from '../widgets/catalog';
import {WEATHER_TIMEOUT_MS, weatherAnswer} from '../world/ask';
import {MAX_ANSWER_CHARS, MET_STOPPED, MET_UNREADABLE, WeatherError, fetchWeather, shouldFetch} from '../world/met';
import {NOVA_WORLD, NOVA_WORLD_KEY, NOVA_WORLD_RESTORE, applyFetched, emptyWorld, keepWorldSwitch, markAsked, novaWorldRestoreSchema, novaWorldSchema, placeOf, readingOf, readingSchema, setPlace, setWorldOn, type NovaWorld, type WorldReading} from '../world/record';
import {MADE_TTL_MS, NOVA_STAGE_KEY, asksOf, emptyStage, forgetAsksOfChats, forgetStageAsksOfChats, madeAt, novaStageSchema, recordAsk, setKeep, stageWidgets, type NovaStage} from './record';

/**
 * Session AM security review (docs/review/session-am/AM_SECURITY_REVIEW.md): one proof per fix that lives in lib/.
 * Fictional values only; nothing here reaches the network. Where a fix also has a proof beside its own tests, this file
 * names it: AM-S1 and AM-S7 in lib/ai/tools/nova-stage.test.ts, AM-S2 in lib/nova/widgets/widgets.test.ts, AM-S9 in
 * lib/am-device-keys.test.ts, AM-S10's request options in lib/nova/world/met.test.ts, AM-S11's sync section in
 * lib/vault/extras-nova.test.ts and scripts/run11/extras-nova-a6.test.mjs.
 */
const call = (action: string, widget: string, more: Record<string, unknown> = {}) => ({tool: 'stage_widget', args: {action, widget, ...more}});
const GATES: readonly WidgetGate[] = ['today', 'goals', 'habits', 'health', 'wealth', 'notes', 'journal'];
const allGates = (open: boolean): Record<WidgetGate, boolean> => ({today: open, goals: open, habits: open, health: open, wealth: open, notes: open, journal: open});
/**
 * The stage's rule for "is this widget's switch open right now", as the page hands it to the summon step
 * (components/nova/nova-dashboard.tsx `gateOpen`): no gate reads as open; gates not read yet read as closed. The page's
 * own callbacks live in React hooks (use-stage.ts `gateOpen`, the dashboard's bridge) and are not reachable as pure
 * functions, so the rule is proven here through `stageCalls`, which is where a model's pin is refused.
 */
const gateRule = (gates: Readonly<Record<WidgetGate, boolean>> | null) => (id: string): boolean => { const gate = widgetSpec(id)?.gate; return !gate || (!!gates && gates[gate]); };

describe('AM-S1: a model\'s pin never lifts a locked widget', () => {
  it('with the gate closed the pin is dropped; the widget may still be shown (it then reads as locked), hidden or closed', () => {
    const closed = {gateOpen: (id: string) => id !== 'weight'};
    expect(stageCalls([call('pin', 'weight')], closed)).toEqual({show: [], commands: []});
    expect(stageCalls([call('show', 'weight', {range: 'month'}), call('pin', 'weight')], closed)).toEqual({show: [{id: 'weight', params: {range: 'month'}}], commands: []});
    expect(stageCalls([call('hide', 'weight')], closed).commands).toEqual([{kind: 'hide', id: 'weight'}]);
    expect(stageCalls([call('close', 'weight')], closed).commands).toEqual([{kind: 'close', id: 'weight'}]);
    // A widget whose gate is open is pinned as before.
    expect(stageCalls([call('pin', 'sleep')], closed).commands).toEqual([{kind: 'pin', id: 'sleep'}]);
    // A refused pin is not the reply's one command: what follows it still runs.
    expect(stageCalls([call('pin', 'weight'), call('close', 'sleep')], closed).commands).toEqual([{kind: 'close', id: 'sleep'}]);
  });
  it('the gate rule, through stageCalls: every gated widget\'s pin follows its own switch; gates not read yet refuse every gated pin; a widget without a gate is not held back', () => {
    const pinned = (id: string, gates: Readonly<Record<WidgetGate, boolean>> | null) => stageCalls([call('pin', id)], {gateOpen: gateRule(gates)}).commands;
    const gated = WIDGETS.filter(w => w.gate), free = WIDGETS.filter(w => !w.gate);
    expect(gated.length).toBeGreaterThanOrEqual(27); expect(free.map(w => w.id)).toEqual(['now-playing', 'time', 'weather', 'sun', 'nova-sees', 'nova-brain', 'requests']);
    for (const w of gated) {
      expect(pinned(w.id, null), `${w.id}, gates not read`).toEqual([]);
      expect(pinned(w.id, allGates(false)), `${w.id}, all closed`).toEqual([]);
      expect(pinned(w.id, allGates(true)), `${w.id}, all open`).toEqual([{kind: 'pin', id: w.id}]);
      // Only its own switch decides: every other switch open and its own closed is still a refusal, and the reverse a pin.
      expect(pinned(w.id, {...allGates(true), [w.gate!]: false}), `${w.id}, own closed`).toEqual([]);
      expect(pinned(w.id, {...allGates(false), [w.gate!]: true}), `${w.id}, own open`).toEqual([{kind: 'pin', id: w.id}]);
    }
    for (const w of free) for (const gates of [null, allGates(false)]) expect(pinned(w.id, gates), w.id).toEqual([{kind: 'pin', id: w.id}]);
    // The review's own list: Health and Wealth figures behind a closed switch.
    for (const id of ['weight', 'health-hud', 'net-worth', 'wealth-hud', 'sleep']) expect(pinned(id, {...allGates(true), health: false, wealth: false}), id).toEqual([]);
  });
});

describe('AM-S2: Notes and the Journal read under their own gates', () => {
  it('seven gates; the Notes inbox under "notes", the Journal under "journal", neither under "today"', () => {
    expect(new Set(WIDGETS.map(w => w.gate).filter(Boolean))).toEqual(new Set(GATES));
    expect([widgetSpec('notes')!.gate, widgetSpec('journal')!.gate]).toEqual(['notes', 'journal']);
    expect(WIDGETS.filter(w => w.gate === 'today').map(w => w.id)).not.toEqual(expect.arrayContaining(['notes']));
    expect(WIDGETS.filter(w => w.gate === 'today').map(w => w.id)).not.toEqual(expect.arrayContaining(['journal']));
    // NOVA's defaults (Today on, Notes and Journal off): a model's pin of either is refused while Today's own widgets are not.
    const defaults = {gateOpen: gateRule({...allGates(true), notes: false, journal: false})};
    expect(stageCalls([call('pin', 'notes')], defaults).commands).toEqual([]);
    expect(stageCalls([call('pin', 'journal')], defaults).commands).toEqual([]);
    expect(stageCalls([call('pin', 'tasks')], defaults).commands).toEqual([{kind: 'pin', id: 'tasks'}]);
    // Today off, Journal on: the Journal is its own, Today's widgets are closed.
    const journalOnly = {gateOpen: gateRule({...allGates(false), journal: true})};
    expect(stageCalls([call('pin', 'journal')], journalOnly).commands).toEqual([{kind: 'pin', id: 'journal'}]);
    for (const id of ['tasks', 'agenda-clock', 'next', 'glance', 'orbit', 'focus', 'briefs', 'notes']) expect(stageCalls([call('pin', id)], journalOnly).commands, id).toEqual([]);
  });
});

const BRUSSELS = {name: 'Brussels', lat: 50.85, lon: 4.35}, GHENT = {name: 'Ghent', lat: 51.05, lon: 3.72};
const NOW = new Date('2026-11-11T13:00:00.000Z');
const on = (place = BRUSSELS): NovaWorld => setPlace(setWorldOn(emptyWorld(), true), place);
const reading = (place = BRUSSELS, t = 7): WorldReading => readingSchema.parse({lat: place.lat, lon: place.lon, fetchedAt: NOW.toISOString(), expires: new Date(NOW.getTime() + 30 * 60_000).toISOString(), now: {at: NOW.toISOString(), t, symbol: 'cloudy'}, hours: [], days: []});
/** What a finished request hands back: the record the request started with, plus the reading and the time of the ask. */
const fetched = (from: NovaWorld = on()): NovaWorld => novaWorldSchema.parse({...from, reading: reading(from.place as typeof BRUSSELS), askedAt: NOW.toISOString()});
const store = (value?: unknown) => {
  const m = new Map<string, string>(); if (value !== undefined) m.set(NOVA_WORLD_KEY, JSON.stringify(value));
  const writes: string[] = [];
  return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { writes.push(k); m.set(k, v); }, writes, put: (v: unknown) => { m.set(NOVA_WORLD_KEY, JSON.stringify(v)); }, read: () => JSON.parse(m.get(NOVA_WORLD_KEY) ?? 'null')};
};
const answer = (url: string) => new Response(JSON.stringify(url.includes('sunrise') ? sunBrussels : forecast), {status: 200, headers: {expires: new Date(NOW.getTime() + 40 * 60_000).toUTCString()}});

describe('AM-S3: a finished weather request writes only the reading and the time of the ask, into the record as it is now', () => {
  it('applyFetched: weather turned off meanwhile — the record stays exactly as the person left it', () => {
    const off = setPlace(emptyWorld(), BRUSSELS);
    expect(applyFetched(off, fetched())).toBe(off);
    expect(applyFetched(off, fetched())).toEqual({version: 1, place: BRUSSELS});
    // Off with a reading kept from before: not refreshed, not asked-marked, and never switched on by the answer's own `on`.
    const kept = novaWorldSchema.parse({version: 1, place: BRUSSELS, reading: reading(BRUSSELS, 3), askedAt: '2026-11-11T12:00:00.000Z'});
    expect(fetched().on).toBe(true);
    expect(applyFetched(kept, fetched())).toBe(kept);
    expect(applyFetched(emptyWorld(), fetched())).toEqual({version: 1});
  });
  it('applyFetched: the place removed meanwhile — no place, no reading and no ask come back', () => {
    const removed = setPlace(on(), null);
    expect(removed).toEqual({version: 1, on: true});
    expect(applyFetched(removed, fetched())).toBe(removed);
  });
  it('applyFetched: another place chosen meanwhile — the new place stays, the old place\'s reading and ask are dropped', () => {
    const moved = on(GHENT);
    expect(applyFetched(moved, fetched(on(BRUSSELS)))).toBe(moved);
    expect(applyFetched(moved, fetched(on(BRUSSELS)))).toEqual({version: 1, on: true, place: GHENT});
    // Only one of the two coordinates differs: still another place.
    for (const near of [{name: 'Near', lat: 50.85, lon: 4.36}, {name: 'Near', lat: 50.86, lon: 4.35}]) { const there = on(near); expect(applyFetched(there, fetched()), JSON.stringify(near)).toBe(there); }
    // A failed request's record (the ask counted, nothing read) is dropped the same way.
    expect(applyFetched(moved, markAsked(on(BRUSSELS), NOW))).toBe(moved);
  });
  it('applyFetched: still on with the same place — the reading and the ask are written, and nothing else of the answer', () => {
    const current = novaWorldSchema.parse({...on({name: 'Home', lat: 50.85, lon: 4.35}), laterField: {kept: true}});
    const next = applyFetched(current, novaWorldSchema.parse({...fetched(), laterField: 'from the stale copy', other: 1}));
    expect(next).toEqual({version: 1, on: true, place: {name: 'Home', lat: 50.85, lon: 4.35}, laterField: {kept: true}, reading: reading(), askedAt: NOW.toISOString()});
    expect(Object.keys(next).sort()).toEqual(['askedAt', 'laterField', 'on', 'place', 'reading', 'version']);
    // A request that failed counts the ask and leaves the reading this device holds.
    const held = applyFetched(on(), fetched());
    const failed = applyFetched(held, markAsked(on(), new Date(NOW.getTime() + 40 * 60_000)));
    expect(failed).toEqual({...held, askedAt: new Date(NOW.getTime() + 40 * 60_000).toISOString()});
    expect(readingOf(failed)).toEqual(reading());
    // Nothing fetched at all (neither a reading nor an ask): the same record's content.
    expect(applyFetched(on(), on())).toEqual(on());
  });
  it('weatherAnswer: the switch turned off while the request is open stays off, and nothing of the answer is stored', async () => {
    for (const tap of [{version: 1, place: BRUSSELS}, {version: 1}, {version: 1, on: true}, {version: 1, on: true, place: GHENT}]) {
      const s = store({version: 1, on: true, place: BRUSSELS}), urls: string[] = [];
      // The person's tap lands while the request is open: the storage changes before the answer arrives.
      const flip = (async (url: RequestInfo | URL) => { urls.push(String(url)); s.put(tap); return answer(String(url)); }) as unknown as typeof fetch;
      const words = await weatherAnswer(s, NOW, 'en', flip);
      expect(urls[0], JSON.stringify(tap)).toBe('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=50.85&lon=4.35');
      expect(s.read(), JSON.stringify(tap)).toEqual(tap);
      for (const field of ['reading', 'askedAt']) expect(s.read(), JSON.stringify(tap)).not.toHaveProperty(field);
      // And no figure is said from an answer that was dropped.
      expect(words, JSON.stringify(tap)).not.toMatch(/\d+\s?°/);
    }
  });
  it('weatherAnswer: the same when the service fails after the tap — the failed ask is not written into a record that is off', async () => {
    for (const fail of [async () => new Response('', {status: 503}), async () => { throw new TypeError('Failed to fetch'); }]) {
      const s = store({version: 1, on: true, place: BRUSSELS});
      const flip = (async () => { s.put({version: 1, place: BRUSSELS}); return fail(); }) as unknown as typeof fetch;
      await weatherAnswer(s, NOW, 'en', flip);
      expect(s.read()).toEqual({version: 1, place: BRUSSELS});
    }
    // Control: with no tap the same answers are stored (the reading; the failed ask), so the cases above prove the merge, not a write that never happens.
    const kept = store({version: 1, on: true, place: BRUSSELS});
    await weatherAnswer(kept, NOW, 'en', (async (url: RequestInfo | URL) => answer(String(url))) as unknown as typeof fetch);
    expect(kept.read()).toMatchObject({version: 1, on: true, place: BRUSSELS, askedAt: NOW.toISOString(), reading: {lat: 50.85, lon: 4.35}});
    const down = store({version: 1, on: true, place: BRUSSELS});
    await weatherAnswer(down, NOW, 'en', (async () => new Response('', {status: 503})) as unknown as typeof fetch);
    expect(down.read()).toEqual({version: 1, on: true, place: BRUSSELS, askedAt: NOW.toISOString()});
  });
  describe('the 15 second limit', () => {
    afterEach(() => { vi.useRealTimers(); });
    it('weatherAnswer gives up after WEATHER_TIMEOUT_MS: the request carries a signal that aborts then, and the timer does not outlive an answer', async () => {
      expect(WEATHER_TIMEOUT_MS).toBe(15_000);
      vi.useFakeTimers();
      const s = store({version: 1, on: true, place: BRUSSELS}), signals: AbortSignal[] = [];
      // A service that never answers: the request ends only when its signal aborts.
      const silent = ((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => { const signal = init!.signal!; signals.push(signal); signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))); })) as unknown as typeof fetch;
      let said: string | null = null;
      const pending = weatherAnswer(s, NOW, 'en', silent).then(words => { said = words; });
      await vi.advanceTimersByTimeAsync(WEATHER_TIMEOUT_MS - 1);
      expect(signals).toHaveLength(1); expect(signals[0]!.aborted).toBe(false); expect(said).toBeNull();
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(signals[0]!.aborted).toBe(true);
      expect(said).toContain(MET_STOPPED); expect(said).toMatch(/no reading for Brussels yet/);
      // The stopped ask still counts for the ten-minute rule, and no timer is left behind.
      expect(s.read()).toEqual({version: 1, on: true, place: BRUSSELS, askedAt: NOW.toISOString()});
      expect(vi.getTimerCount()).toBe(0);
      // An answer in time: the timer is cleared, the signal never aborts.
      const quick = store({version: 1, on: true, place: BRUSSELS}), seen: AbortSignal[] = [];
      await weatherAnswer(quick, NOW, 'en', (async (url: RequestInfo | URL, init?: RequestInit) => { seen.push(init!.signal!); return answer(String(url)); }) as unknown as typeof fetch);
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(WEATHER_TIMEOUT_MS * 2);
      expect(seen.length).toBe(2); for (const signal of seen) expect(signal.aborted).toBe(false);
    });
  });
});

describe('AM-S5: a request about Health is kept by its widgets\' names, never by the person\'s words', () => {
  const digits = (text: string) => text.match(/\d+/g) ?? [];
  it('"I weighed 82.4, show my weight" is kept as "Health: Weight"; no digit of the original survives', () => {
    const said = 'I weighed 82.4, show my weight';
    const kept = keptAskWords(said, [{id: 'weight'}]);
    expect(kept).toBe('Health: Weight');
    expect(kept).not.toMatch(/\d/);
    // With a range the widget's own range words are named; still nothing of what was typed.
    const ranged = keptAskWords(said, [{id: 'weight', params: {range: 'month'}}]);
    expect(ranged).toBe('Health: Weight · the last 30 days');
    for (const d of digits(said)) expect(digits(ranged), d).not.toContain(d);
    expect(ranged).not.toMatch(/weighed|82|\.4/);
    // Several widgets, one of them not Health's: the whole line is replaced, every widget named.
    expect(keptAskWords('I weighed 82.4 and slept 5 hours, also my net worth', [{id: 'weight'}, {id: 'sleep'}, {id: 'net-worth'}])).toBe('Health: Weight, Sleep balance and Tracked wealth'); // Session AM (design review AM-D13, deliberate): the widget's new title
  });
  it('a health-like sentence that makes no widget is kept as "A request about Health"', () => {
    for (const said of ['my blood pressure was 150 over 95', 'I took 2 pills of 400 mg after the doctor', 'My weight was 82.4 kg this morning', 'I ate 2400 kcal']) {
      const kept = keptAskWords(said, []);
      expect(kept, said).toBe('A request about Health');
      expect(kept, said).not.toMatch(/\d/);
    }
    // A health-like sentence with a widget that is not Health's: still the names only.
    expect(keptAskWords('my blood pressure was 150 over 95, show my habits', [{id: 'habit-week'}])).toBe('Health: Habits this week');
  });
  it('a widget that reads under the Health gate is enough, whatever the words say', () => {
    const health = WIDGETS.filter(w => w.gate === 'health');
    expect(health.map(w => w.id)).toEqual(['water', 'sleep', 'health-hud', 'weight', 'steps', 'workouts']);
    for (const w of health) {
      const kept = keptAskWords('Fictional words 12345 that name nothing', [{id: w.id}]);
      expect(kept, w.id).toBe(`Health: ${w.title}`);
      expect(kept, w.id).not.toMatch(/12345|Fictional/);
    }
  });
  it('a request that is not about Health is kept word for word', () => {
    for (const [said, widgets] of [['Show my net worth, it was 12,500 last month', [{id: 'net-worth'}]], ['Am I on track for Japan?', [{id: 'goal-focus', params: {ref: 'g-japan'}}]], ['What’s the weather?', [{id: 'weather'}]], ['hello NOVA', []]] as const)
      expect(keptAskWords(said, widgets), said).toBe(said);
  });
  it('what the stage record then holds: the names, never the words or the value', () => {
    const said = 'I weighed 82.4, show my weight';
    const r = recordAsk(emptyStage(), {id: 'a1', at: NOW, text: keptAskWords(said, [{id: 'weight'}]), widgets: [{id: 'weight'}], device: 'phone', by: 'device'});
    expect(asksOf(r)).toEqual([{id: 'a1', at: NOW.toISOString(), text: 'Health: Weight', device: 'phone', by: 'device', widgets: ['weight']}]);
    expect(JSON.stringify(r)).not.toMatch(/82|weighed/);
  });
});

describe('AM-S7: one stage command per reply', () => {
  it('three closes in one reply: the first runs, so its Undo is the one on screen', () => {
    expect(MAX_MODEL_COMMANDS).toBe(1);
    expect(stageCalls([call('close', 'weight'), call('close', 'sleep'), call('close', 'tasks')]).commands).toEqual([{kind: 'close', id: 'weight'}]);
    expect(stageCalls([call('hide', 'tasks'), call('close', 'sleep'), call('pin', 'weight')]).commands).toEqual([{kind: 'hide', id: 'tasks'}]);
    expect(stageCalls([call('pin', 'weight'), call('pin', 'weight'), call('close', 'weight')]).commands).toEqual([{kind: 'pin', id: 'weight'}]);
  });
  it('a call that is dropped is not the one command; shows keep their own limit of three', () => {
    expect(stageCalls([call('close', 'made-up-widget'), call('erase', 'weight'), {tool: 'weight', args: {action: 'close', widget: 'weight'}}, call('close', 'sleep'), call('close', 'tasks')]).commands).toEqual([{kind: 'close', id: 'sleep'}]);
    expect(stageCalls([call('close', 'weight'), call('close', 'sleep')], {available: (id: string) => id !== 'weight'}).commands).toEqual([{kind: 'close', id: 'sleep'}]);
    const mixed = stageCalls([call('show', 'weight'), call('close', 'tasks'), call('show', 'sleep'), call('close', 'glance'), call('show', 'steps'), call('show', 'water'), call('hide', 'next')]);
    expect(MAX_SUMMON).toBe(3);
    expect(mixed).toEqual({show: [{id: 'weight'}, {id: 'sleep'}, {id: 'steps'}], commands: [{kind: 'close', id: 'tasks'}]});
  });
});

describe('AM-S8: a conversation\'s requests are forgotten with it', () => {
  const CHAT_A = '3f2b6c1e-0a4d-4e8f-9b1a-000000000001', CHAT_B = '3f2b6c1e-0a4d-4e8f-9b1a-000000000002';
  const at = (minute: number) => new Date(NOW.getTime() + minute * 60_000);
  const record = (): NovaStage => {
    let r = recordAsk(emptyStage(), {id: 'a1', at: at(1), text: 'Fictional one', device: 'computer', by: 'device', chat: CHAT_A});
    r = recordAsk(r, {id: 'a2', at: at(2), text: 'Fictional two', widgets: [{id: 'net-worth'}], device: 'computer', by: 'model', chat: CHAT_B});
    r = recordAsk(r, {id: 'a3', at: at(3), text: 'Fictional three', device: 'phone', by: 'device'});
    return recordAsk(r, {id: 'a4', at: at(4), text: 'Fictional four', device: 'computer', by: 'device', chat: CHAT_A});
  };
  const fakeStorage = (value?: unknown) => {
    const m = new Map<string, string>(), sets: string[] = [];
    if (value !== undefined) m.set(NOVA_STAGE_KEY, typeof value === 'string' ? value : JSON.stringify(value));
    return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { sets.push(k); m.set(k, v); }, sets, raw: () => m.get(NOVA_STAGE_KEY) ?? null, read: () => JSON.parse(m.get(NOVA_STAGE_KEY) ?? 'null') as NovaStage};
  };
  afterEach(() => { vi.unstubAllGlobals(); });

  it('an ask carries the conversation it was asked in; an id that is not a plain id is not kept (the request still is)', () => {
    expect(asksOf(record()).map(a => [a.id, a.chat])).toEqual([['a4', CHAT_A], ['a3', undefined], ['a2', CHAT_B], ['a1', CHAT_A]]);
    expect(asksOf(record())[1]).not.toHaveProperty('chat');
    for (const bad of ['has space', 'semi;colon', 'x'.repeat(81), '']) {
      const r = recordAsk(emptyStage(), {id: 'b1', at: NOW, text: 'Fictional', device: 'computer', by: 'device', chat: bad});
      expect(asksOf(r), JSON.stringify(bad)).toEqual([{id: 'b1', at: NOW.toISOString(), text: 'Fictional', device: 'computer', by: 'device'}]);
    }
    // A stored value that is not a plain id (another build's, a tampered copy) reads as no conversation: such an ask is never forgotten by a chat.
    const odd = novaStageSchema.parse({version: 1, asks: [{id: 'c1', at: NOW.toISOString(), text: 'Fictional', device: 'computer', by: 'device', chat: 'not an id!'}]});
    expect(asksOf(odd)[0]!.chat).toBeUndefined();
    expect(forgetAsksOfChats(odd, ['not an id!'])).toBe(odd);
  });
  it('forgetAsksOfChats: exactly that conversation\'s requests go; the others, and every request without a conversation, stay in order', () => {
    const r = record();
    expect(asksOf(forgetAsksOfChats(r, [CHAT_A])).map(a => a.id)).toEqual(['a3', 'a2']);
    expect(asksOf(forgetAsksOfChats(r, [CHAT_B])).map(a => a.id)).toEqual(['a4', 'a3', 'a1']);
    expect(asksOf(forgetAsksOfChats(r, [CHAT_A, CHAT_B])).map(a => a.id)).toEqual(['a3']);
    // Nothing to forget: the same record, untouched.
    for (const none of [[], ['another-chat'], [''], ['undefined'], [CHAT_A.toUpperCase()]]) expect(forgetAsksOfChats(r, none), JSON.stringify(none)).toBe(r);
    expect(forgetAsksOfChats(emptyStage(), [CHAT_A])).toEqual({version: 1});
    // An ask without a conversation is never forgotten by this, whatever is passed.
    const loose = recordAsk(emptyStage(), {id: 'n1', at: NOW, text: 'Fictional, no chat', device: 'phone', by: 'device'});
    for (const chats of [[CHAT_A], [''], ['undefined', 'null'], [undefined as unknown as string]]) expect(forgetAsksOfChats(loose, chats)).toBe(loose);
    // Nothing else of the record changes.
    const full = novaStageSchema.parse({...r, made: [{id: 'weight', at: NOW.toISOString()}], hidden: ['steps'], params: {weight: {range: 'month'}}, keep: true, proactive: true, laterField: {a: 1}});
    const forgotten = forgetAsksOfChats(full, [CHAT_A]);
    expect(forgotten).toEqual({...full, asks: full.asks!.filter(a => a.id === 'a3' || a.id === 'a2')});
    expect(asksOf(forgotten).map(a => a.id)).toEqual(['a3', 'a2']);
    expect(Object.keys(forgotten).sort()).toEqual(['asks', 'hidden', 'keep', 'laterField', 'made', 'params', 'proactive', 'version']);
  });
  it('forgetStageAsksOfChats: one write of the device\'s record, announced once; nothing is written when there is nothing to forget', () => {
    const heard: unknown[] = [], target = new EventTarget();
    target.addEventListener(ZIGI_STORE_EVENT, e => heard.push((e as CustomEvent).detail));
    vi.stubGlobal('window', target);
    const s = fakeStorage({...record(), made: [{id: 'weight', at: NOW.toISOString()}], keep: true});
    forgetStageAsksOfChats(s, [CHAT_A]);
    expect(s.sets).toEqual([NOVA_STAGE_KEY]);
    expect(asksOf(s.read()).map(a => [a.id, a.chat])).toEqual([['a3', undefined], ['a2', CHAT_B]]);
    expect(s.read()).toMatchObject({version: 1, made: [{id: 'weight', at: NOW.toISOString()}], keep: true});
    expect(heard).toEqual([NOVA_STAGE_KEY]);
    // Again, another conversation that asked nothing, and an empty list: no write, no announcement.
    const before = s.raw();
    forgetStageAsksOfChats(s, [CHAT_A]); forgetStageAsksOfChats(s, ['another-chat']); forgetStageAsksOfChats(s, []);
    expect(s.sets).toEqual([NOVA_STAGE_KEY]); expect(s.raw()).toBe(before); expect(heard).toEqual([NOVA_STAGE_KEY]);
    // A request without a conversation is still there after every conversation is forgotten.
    forgetStageAsksOfChats(s, [CHAT_A, CHAT_B]);
    expect(asksOf(s.read()).map(a => a.id)).toEqual(['a3']);
  });
  it('forgetStageAsksOfChats: no record, a record that does not read and a storage that refuses the write change nothing and never throw', () => {
    const none = fakeStorage();
    forgetStageAsksOfChats(none, [CHAT_A]);
    expect(none.raw()).toBeNull(); expect(none.sets).toEqual([]);
    for (const bytes of ['not json', JSON.stringify({version: 2, asks: []}), JSON.stringify({version: 1, asks: 'nope'})]) {
      const s = fakeStorage(bytes);
      expect(() => forgetStageAsksOfChats(s, [CHAT_A])).not.toThrow();
      expect(s.raw()).toBe(bytes); expect(s.sets).toEqual([]);
    }
    const bytes = JSON.stringify(record()), full = {getItem: () => bytes, setItem: () => { throw new DOMException('Full', 'QuotaExceededError'); }};
    expect(() => forgetStageAsksOfChats(full, [CHAT_A])).not.toThrow();
    const unreadable = {getItem: () => { throw Error('Storage is closed.'); }, setItem: vi.fn()};
    expect(() => forgetStageAsksOfChats(unreadable, [CHAT_A])).not.toThrow();
    expect(unreadable.setItem).not.toHaveBeenCalled();
  });
});

describe('AM-S9 (second pass): a restore never changes this device\'s own weather switch', () => {
  const mine = {version: 1, on: true, place: BRUSSELS, reading: reading(), askedAt: NOW.toISOString()};
  it('the same place: the device keeps its switch, its reading and its last ask; what the restore brought beside them is kept', () => {
    expect(keepWorldSwitch(mine, {version: 1, place: {...BRUSSELS, name: 'Home'}, laterField: 1})).toEqual({version: 1, place: {...BRUSSELS, name: 'Home'}, laterField: 1, on: true, reading: mine.reading, askedAt: mine.askedAt});
  });
  it('another place, no place, a device that is off or a record that does not read: the restored value as it is, switched off', () => {
    const restored = {version: 1, place: GHENT};
    expect(keepWorldSwitch(mine, restored)).toBe(restored);
    expect(keepWorldSwitch(mine, {version: 1})).toEqual({version: 1});
    expect(keepWorldSwitch({version: 1, place: BRUSSELS}, {version: 1, place: BRUSSELS})).toEqual({version: 1, place: BRUSSELS});
    expect(keepWorldSwitch({version: 1, on: 'yes', place: BRUSSELS}, {version: 1, place: BRUSSELS})).toEqual({version: 1, place: BRUSSELS});
    expect(keepWorldSwitch('not a record', restored)).toBe(restored);
    // The restore's own reader can never turn the switch on: a backup that says "on" over a device that is off stays off.
    expect(keepWorldSwitch({version: 1, place: BRUSSELS}, novaWorldRestoreSchema.parse({version: 1, on: true, place: BRUSSELS}))).toEqual({version: 1, place: BRUSSELS});
  });
  it('the restore plan hands the weather part this rule, and no other part has one', () => {
    expect(DEVICE_PARTS.filter(p => p.local).map(p => [p.key, p.local])).toEqual([[NOVA_WORLD_KEY, keepWorldSwitch]]);
  });
});
describe('AM-S9: a restore brings the weather place, never the switch', () => {
  const full = {version: 1, on: true, place: BRUSSELS, reading: reading(), askedAt: NOW.toISOString(), laterField: {a: 1}};
  it('the restore reader drops the switch, the reading and the last ask, and keeps the place and what it does not know', () => {
    expect(novaWorldSchema.parse(full)).toEqual(full);
    expect(novaWorldRestoreSchema.parse(full)).toEqual({version: 1, place: BRUSSELS, laterField: {a: 1}});
    expect(novaWorldRestoreSchema.parse({version: 1, on: true})).toEqual({version: 1});
    expect(novaWorldRestoreSchema.parse({version: 1, on: false, place: GHENT})).toEqual({version: 1, place: GHENT});
    // The device's own reader is unchanged: this device's switch still reads as on.
    expect(NOVA_WORLD.schema).toBe(novaWorldSchema); expect(NOVA_WORLD_RESTORE.schema).toBe(novaWorldRestoreSchema); expect(NOVA_WORLD_RESTORE.key).toBe(NOVA_WORLD_KEY);
    // What it refuses, the device's reader refuses too (a restore is never looser).
    for (const bad of [{version: 2, place: BRUSSELS}, {version: 1, on: 'yes'}, {place: BRUSSELS}, null, 'on']) expect([novaWorldRestoreSchema.safeParse(bad).success, novaWorldSchema.safeParse(bad).success], JSON.stringify(bad)).toEqual([false, false]);
  });
  it('"Restore from a backup" (everything.json): the part is named for the place and plans a record that is off, on a fresh device and over a device that is off', () => {
    const [part] = planParts({device: {novaWorld: full}}).filter(p => p.key === NOVA_WORLD_KEY);
    expect([part!.id, part!.label, part!.group, part!.health, part!.problem]).toEqual(['device:novaWorld', 'NOVA weather place', 'Today and Life', false, undefined]);
    expect(part!.value).toEqual({version: 1, place: BRUSSELS, laterField: {a: 1}});
    expect(DEVICE_PARTS.filter(p => p.key === NOVA_WORLD_KEY)).toHaveLength(1);
    for (const mode of ['replace', 'merge'] as const) {
      expect(nextValue(part!, mode, undefined), mode).toEqual({value: {version: 1, place: BRUSSELS, laterField: {a: 1}}});
      for (const field of ['on', 'reading', 'askedAt']) expect((nextValue(part!, mode, undefined) as {value: object}).value, `${mode} ${field}`).not.toHaveProperty(field);
    }
    // Over a device that holds another place and no switch: Replace takes the file's place, Merge keeps this device's; neither is on.
    const mine = {version: 1, place: GHENT};
    expect(nextValue(part!, 'replace', mine)).toEqual({value: {version: 1, place: BRUSSELS, laterField: {a: 1}}});
    expect(nextValue(part!, 'merge', mine)).toEqual({value: {version: 1, place: GHENT, laterField: {a: 1}}});
    // A file whose weather record is only a switch plans nothing that is on.
    expect(planParts({device: {novaWorld: {version: 1, on: true}}}).find(p => p.key === NOVA_WORLD_KEY)!.value).toEqual({version: 1});
  });
});

describe('AM-S10: weather manners that hold in every case', () => {
  const ZONE = 'Europe/Brussels';
  type Call = {url: string; init: RequestInit | undefined};
  const service = (...answers: (Response | (() => Response))[]) => {
    const calls: Call[] = [];
    const impl = (async (input: RequestInfo | URL, init?: RequestInit) => { calls.push({url: String(input), init}); const next = answers.shift(); if (!next) throw Error('A request nobody expected.'); return typeof next === 'function' ? next() : next; }) as typeof fetch;
    return {calls, impl};
  };
  const ok = (body: string, headers: Record<string, string> = {}) => new Response(body, {status: 200, headers});
  const failure = async (run: Promise<unknown>): Promise<WeatherError> => { const error = await run.then(() => null, (e: unknown) => e); expect(error).toBeInstanceOf(WeatherError); return error as WeatherError; };
  /** A record written by hand (or restored) with more decimals than the app ever stores. */
  const precise = (): NovaWorld => novaWorldSchema.parse({version: 1, on: true, place: {name: 'Precise', lat: 50.853421, lon: 4.351776}});

  it('placeOf and readingOf round to two decimals, whatever the record holds', () => {
    expect(placeOf(precise())).toEqual({name: 'Precise', lat: 50.85, lon: 4.35});
    expect(precise().place).toEqual({name: 'Precise', lat: 50.853421, lon: 4.351776}); // the stored bytes are not rewritten by a read
    expect(placeOf(novaWorldSchema.parse({version: 1, place: {name: 'South', lat: -33.8688, lon: 151.2093}}))).toEqual({name: 'South', lat: -33.87, lon: 151.21});
    expect(placeOf(novaWorldSchema.parse({version: 1, place: {name: 'Edge', lat: 89.999, lon: -179.995}}))).toEqual({name: 'Edge', lat: 90, lon: -179.99});
    expect(placeOf(emptyWorld())).toBeNull();
    // A reading at two decimals is this place's reading although the place holds six; another place's is still not.
    const held = novaWorldSchema.parse({...precise(), reading: reading(BRUSSELS)});
    expect(readingOf(held)).toEqual(reading(BRUSSELS));
    expect(readingOf(novaWorldSchema.parse({...precise(), reading: reading(GHENT)}))).toBeNull();
    expect(readingOf(novaWorldSchema.parse({...precise(), reading: reading({name: 'Near', lat: 50.86, lon: 4.35})}))).toBeNull();
    // A finished request for such a place is applied (the place it asked is the place the record holds, rounded).
    expect(readingOf(applyFetched(precise(), fetched(on(BRUSSELS))))).toEqual(reading(BRUSSELS));
  });
  it('a place with more decimals keeps its reading until Expires (the review\'s case: it was asked again after ten minutes)', async () => {
    const at = new Date('2026-11-11T04:35:00Z'), {calls, impl} = service(ok(JSON.stringify(forecast), {expires: 'Wed, 11 Nov 2026 05:05:00 GMT'}), ok(JSON.stringify(sunBrussels)));
    const next = await fetchWeather({world: precise(), now: at, fetchImpl: impl, timeZone: ZONE});
    expect(calls.map(c => c.url)).toEqual(['https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=50.85&lon=4.35', 'https://api.met.no/weatherapi/sunrise/3.0/sun?lat=50.85&lon=4.35&date=2026-11-11&offset=%2B01:00']);
    expect(readingOf(next)).toMatchObject({lat: 50.85, lon: 4.35, expires: '2026-11-11T05:05:00.000Z'});
    expect(shouldFetch({world: next, now: new Date(at.getTime() + 11 * 60_000), hidden: false, wanted: true})).toBe(false);
    expect(shouldFetch({world: next, now: new Date('2026-11-11T05:04:59Z'), hidden: false, wanted: true})).toBe(false);
    expect(shouldFetch({world: next, now: new Date('2026-11-11T05:05:00Z'), hidden: false, wanted: true})).toBe(true);
  });
  it('every request says redirect: "error", the forecast and the sun, in both ways of revalidating', async () => {
    for (const revalidate of ['browser', 'header'] as const) {
      const {calls, impl} = service(ok(JSON.stringify(forecast)), ok(JSON.stringify(sunBrussels)));
      await fetchWeather({world: on(), now: NOW, fetchImpl: impl, timeZone: ZONE, revalidate});
      expect(calls).toHaveLength(2);
      for (const {url, init} of calls) expect(init?.redirect, `${revalidate} ${url}`).toBe('error');
    }
    // And when the request fails or is refused there is still exactly one, with the same rule.
    const refused = service(new Response('no', {status: 403}));
    await failure(fetchWeather({world: on(), now: NOW, fetchImpl: refused.impl, timeZone: ZONE}));
    expect(refused.calls.map(c => c.init?.redirect)).toEqual(['error']);
  });
  it('an answer larger than MAX_ANSWER_CHARS is not read: a declared length is refused before the body, a long body after it; the ask still counts', async () => {
    expect(MAX_ANSWER_CHARS).toBe(1_500_000);
    const body = JSON.stringify(forecast);
    // Declared too large: the body is never read.
    const text = vi.fn(async () => body), json = vi.fn(async () => forecast);
    const declared = {status: 200, headers: new Headers({'content-length': String(MAX_ANSWER_CHARS + 1)}), text, json} as unknown as Response;
    const first = await failure(fetchWeather({world: on(), now: NOW, fetchImpl: service(declared).impl, timeZone: ZONE}));
    expect(first.message).toBe(MET_UNREADABLE);
    expect(text).not.toHaveBeenCalled(); expect(json).not.toHaveBeenCalled();
    expect(first.world.askedAt).toBe(NOW.toISOString()); expect(first.world.reading).toBeUndefined();
    // No declared length, a body one character too long (valid JSON all the same): refused; nothing asked after it, no sun.
    const pad = (length: number) => body + ' '.repeat(length - body.length);
    const long = service(ok(pad(MAX_ANSWER_CHARS + 1)));
    const second = await failure(fetchWeather({world: on(), now: NOW, fetchImpl: long.impl, timeZone: ZONE}));
    expect(second.message).toBe(MET_UNREADABLE); expect(long.calls).toHaveLength(1);
    expect(shouldFetch({world: second.world, now: new Date(NOW.getTime() + 9 * 60_000), hidden: false, wanted: true})).toBe(false);
    // Exactly at the limit it is read.
    const edge = await fetchWeather({world: on(), now: NOW, fetchImpl: service(ok(pad(MAX_ANSWER_CHARS)), ok(JSON.stringify(sunBrussels))).impl, timeZone: ZONE});
    expect(readingOf(edge)).toMatchObject({lat: 50.85, lon: 4.35});
    // The answer is read as text, never through json(): a response without a length is bounded by what was read.
    const viaText = {status: 200, headers: new Headers(), text: vi.fn(async () => body), json: vi.fn(async () => { throw Error('json() must not be used'); })} as unknown as Response;
    expect(readingOf(await fetchWeather({world: on(), now: NOW, fetchImpl: service(viaText, ok(JSON.stringify(sunBrussels))).impl, timeZone: ZONE}))).not.toBeNull();
    expect(viaText.text).toHaveBeenCalledTimes(1); expect(viaText.json).not.toHaveBeenCalled();
    // The sun is bounded the same way and stays best effort: too large, the reading stands without it.
    const sun = JSON.stringify(sunBrussels);
    const noSun = await fetchWeather({world: on(), now: NOW, fetchImpl: service(ok(body), ok(sun + ' '.repeat(MAX_ANSWER_CHARS + 1 - sun.length))).impl, timeZone: ZONE});
    expect(readingOf(noSun)).not.toBeNull(); expect(readingOf(noSun)).not.toHaveProperty('sun');
    const withSun = await fetchWeather({world: on(), now: NOW, fetchImpl: service(ok(body), ok(sun)).impl, timeZone: ZONE});
    expect(readingOf(withSun)).toHaveProperty('sun');
  });
});

describe('AM-S11: a made widget dated in the future does not stay for ever', () => {
  const DAY = 86_400_000, now = NOW.getTime();
  const madeOn = (...times: [string, number][]): NovaStage => novaStageSchema.parse({version: 1, made: times.map(([id, t]) => ({id, at: new Date(t).toISOString()}))});
  it('more than a day ahead of this device\'s clock is dropped, with "keep until I close" on as well; within a day it shows (a clock a little ahead)', () => {
    const r = madeOn(['weight', Date.parse('9999-01-01T00:00:00.000Z')], ['sleep', now + 2 * DAY], ['steps', now + DAY], ['tasks', now + DAY - 1], ['water', now + 60_000], ['glance', now - 60_000]);
    expect(madeAt(r, now).map(w => w.id)).toEqual(['tasks', 'water', 'glance']);
    expect(madeAt(setKeep(r, true), now).map(w => w.id)).toEqual(['tasks', 'water', 'glance']);
    // The review's case: a widget dated 9999 is not on the stage in 2030, kept or not.
    const far = madeOn(['weight', Date.parse('9999-01-01T00:00:00.000Z')]);
    for (const record of [far, setKeep(far, true)]) {
      expect(madeAt(record, Date.parse('2030-01-01T00:00:00.000Z'))).toEqual([]);
      expect(stageWidgets(record, [], Date.parse('2030-01-01T00:00:00.000Z'), () => 'M')).toEqual({shown: [], docked: []});
    }
  });
  it('the rule before it is unchanged: twelve hours unless kept, and a kept widget from the past stays', () => {
    const r = madeOn(['weight', now]);
    expect(madeAt(r, now + MADE_TTL_MS - 1).map(w => w.id)).toEqual(['weight']);
    expect(madeAt(r, now + MADE_TTL_MS)).toEqual([]);
    expect(madeAt(setKeep(r, true), now + 400 * DAY).map(w => w.id)).toEqual(['weight']);
    // A widget from a clock ahead by less than a day leaves twelve hours after its own time, not later.
    const ahead = madeOn(['weight', now + 6 * 3_600_000]);
    expect(madeAt(ahead, now + 18 * 3_600_000 - 1).map(w => w.id)).toEqual(['weight']);
    expect(madeAt(ahead, now + 18 * 3_600_000)).toEqual([]);
  });
});
