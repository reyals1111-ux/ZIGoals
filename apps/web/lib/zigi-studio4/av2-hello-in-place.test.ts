// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

vi.mock('../first-idle', () => ({firstIdle: () => Promise.resolve()}));
import {HELLO_SETTLE_MS, TEST_HELLO_KEY, ZIGI_HELLO_DAY_KEY, helloClip, helloDue, readHelloDay, startHelloInPlace, writeHelloDay, type HelloConditions} from '../../components/zigi/hello-in-place';
import {skinOf} from '../../components/zigi/manifest';
import {zigiState} from '../../components/zigi/bus';
import {MOVE_TEXT} from '../../components/zigi/state-gallery';

/**
 * Session AV lane 2 (roadmap, PK-6; owner decision, follow-up 3): ZIGi's delivered "Hello, in place" (X001) plays once a
 * day, on the first open of the day while ZIGi rests on screen; never with reduced motion, Motion Off or ZIGi's
 * animation Off; never on the very first open of all; the look is unchanged (only the manifest's own clip plays).
 */
const base: HelloConditions = {lastDay: '2026-11-21', today: '2026-11-22', motion: true, visible: true, resting: true, onScreen: true, sensitive: false, clip: true};
describe('when the hello plays (pure)', () => {
  test('a new day with everything allowed', () => expect(helloDue(base)).toBe(true));
  test.each([
    ['already played today', {lastDay: '2026-11-22'}],
    ['the very first open of all', {lastDay: null}],
    ['a kept day after today (a clock moved back)', {lastDay: '2026-11-23'}],
    ['reduced motion, Motion Off or animation Off', {motion: false}],
    ['a hidden tab', {visible: false}],
    ['ZIGi busy (not resting)', {resting: false}],
    ['ZIGi not on screen', {onScreen: false}],
    ['a sensitive screen', {sensitive: true}],
    ['a skin without the clip', {clip: false}],
  ] as const)('not when %s', (_why, change) => expect(helloDue({...base, ...change})).toBe(false));
  test('the clip is the delivered X001, one-shot, unchanged', () => {
    const clip = helloClip(skinOf(null))!;
    expect(clip.name).toBe('X001-greeting-in-place');
    expect(clip.kind).toBe('one-shot');
    expect(clip.files.animated).toBe('/brand/figures/zigi/origami-nebula/X001-greeting-in-place.anim.webp');
    expect(MOVE_TEXT.X001!.when).toMatch(/^Once a day, the first time you open the app/);
  });
  test('the kept day reads only a plain date', () => {
    const store = new Map<string, string>(), s = {getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }};
    expect(readHelloDay(s)).toBeNull();
    writeHelloDay(s, '2026-11-22');
    expect(store.get(ZIGI_HELLO_DAY_KEY)).toBe('2026-11-22');
    expect(readHelloDay(s)).toBe('2026-11-22');
    store.set(ZIGI_HELLO_DAY_KEY, 'tomorrow');
    expect(readHelloDay(s)).toBeNull();
    expect(readHelloDay({getItem: () => { throw new Error('blocked'); }})).toBeNull();
  });
});

describe('startHelloInPlace on the page', () => {
  const now = () => new Date(2026, 10, 22, 8, 30);
  let reduce = false;
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear(); sessionStorage.clear(); reduce = false;
    document.documentElement.removeAttribute('data-app-motion');
    document.body.innerHTML = '<div data-testid="ai-launcher"><span class="zigi zigi-idle zigi-figure" data-state="idle"></span></div>';
    const figure = document.querySelector('.zigi')!;
    figure.getBoundingClientRect = () => ({width: 48, height: 48, top: 600, left: 1200, bottom: 648, right: 1248, x: 1200, y: 600, toJSON: () => ''}) as DOMRect;
    Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1440}); Object.defineProperty(window, 'innerHeight', {configurable: true, value: 900});
    window.matchMedia = ((q: string) => ({matches: reduce && q.includes('reduce'), addEventListener() {}, removeEventListener() {}})) as unknown as typeof window.matchMedia;
    // The clip "loads" at once.
    vi.stubGlobal('Image', class { decoding = ''; onload: (() => void) | null = null; onerror: (() => void) | null = null; set src(_v: string) { queueMicrotask(() => this.onload?.()); } });
    zigiState.set('idle');
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  const run = async () => {
    const played: string[] = [];
    const stop = startHelloInPlace({skin: () => skinOf(null), apng: () => false, play: clip => played.push(clip.name), now});
    await vi.advanceTimersByTimeAsync(HELLO_SETTLE_MS + 50);
    stop();
    return played;
  };
  test('plays once on the first open of a new day and keeps the day; a second open that day does not', async () => {
    localStorage.setItem(ZIGI_HELLO_DAY_KEY, '2026-11-21');
    expect(await run()).toEqual(['X001-greeting-in-place']);
    expect(localStorage.getItem(ZIGI_HELLO_DAY_KEY)).toBe('2026-11-22');
    expect(await run()).toEqual([]);
  });
  test('the very first open of all keeps the day and plays nothing', async () => {
    expect(await run()).toEqual([]);
    expect(localStorage.getItem(ZIGI_HELLO_DAY_KEY)).toBe('2026-11-22');
  });
  test('never with Motion Off or reduced motion, and the day stays unplayed', async () => {
    localStorage.setItem(ZIGI_HELLO_DAY_KEY, '2026-11-21');
    document.documentElement.dataset.appMotion = 'off';
    expect(await run()).toEqual([]);
    document.documentElement.removeAttribute('data-app-motion'); reduce = true;
    expect(await run()).toEqual([]);
    document.documentElement.dataset.zigiMotion = 'off'; reduce = false;
    expect(await run()).toEqual([]);
    document.documentElement.removeAttribute('data-zigi-motion');
    expect(localStorage.getItem(ZIGI_HELLO_DAY_KEY)).toBe('2026-11-21');
  });
  test('not when ZIGi is busy or not on screen by the time the clip is ready', async () => {
    localStorage.setItem(ZIGI_HELLO_DAY_KEY, '2026-11-21');
    const stop = startHelloInPlace({skin: () => skinOf(null), apng: () => false, play: () => { throw new Error('played'); }, now});
    zigiState.set('listening');
    await vi.advanceTimersByTimeAsync(HELLO_SETTLE_MS + 50); stop();
    zigiState.set('idle'); document.body.innerHTML = '';
    expect(await run()).toEqual([]);
    expect(localStorage.getItem(ZIGI_HELLO_DAY_KEY)).toBe('2026-11-21');
  });
  test('an automated browser gets it only when the test asks', async () => {
    localStorage.setItem(ZIGI_HELLO_DAY_KEY, '2026-11-21');
    Object.defineProperty(navigator, 'webdriver', {configurable: true, get: () => true});
    try {
      expect(await run()).toEqual([]);
      sessionStorage.setItem(TEST_HELLO_KEY, '1');
      expect(await run()).toEqual(['X001-greeting-in-place']);
    } finally { Object.defineProperty(navigator, 'webdriver', {configurable: true, get: () => false}); }
  });
});
