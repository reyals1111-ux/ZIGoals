'use client';
import {getAppStorage} from '../../lib/showcase-storage';
import {readZigiLook} from '../../lib/ai/zigi-look';
import {ZIGI_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {zigiFrames, zigiIdleVariant, zigiState, type ZigiFrame, type ZigiFrames} from './bus';
import {startZigiMachine} from './events';
import {idlePool, nextGapMs, pickIdle, variantFrame, type IdleHistory, type IdleVariant} from './idle';
import {filesFor, skinOf, ZIGI_STATES, type Skin} from './manifest';
import {motionAllowed, supportsAnimatedWebp, watchMotion, zigiAnimation} from './motion';

/**
 * ZIGi alive (Session X-Local Parts 1 and 3; ADR-017 S7): the small chunk the launcher loads lazily on every app page
 * once it is visible and the browser is idle, never as part of the shell. It runs the state machine on every page (so
 * ZIGi reacts outside the chat), publishes to the bus which files show each state (the poster from the manifest for the
 * chosen skin and, while motion is allowed, the animated clip this browser can play: animated WebP, or the APNG
 * fallback), and runs the idle rotation (idle.ts): under the person's Full animation, while ZIGi rests in idle, a
 * variation now and then, only while the tab is visible and nobody is typing; Calm plays the base idle only. It
 * re-publishes when the look, the motion setting or the Showcase changes. Nothing is fetched here: the figure fetches a
 * clip only when its state shows. Started once per page; the stop function is for tests.
 */
let started: (() => void) | null = null;
/** How long after the last key in a text field the person still counts as typing. */
export const TYPING_GUARD_MS = 3000;
const isTextField = (target: EventTarget | null) => target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
function framesFor(skin: Skin, apng: boolean): ZigiFrames {
  const motion = motionAllowed(), table: ZigiFrames = {};
  for (const state of ZIGI_STATES) {
    const {files} = filesFor(skin, state);
    const poster = {x1: files?.['1x'] ?? skin.sizes['1x'].file, x2: files?.['2x'] ?? skin.sizes['2x'].file};
    const animated = motion ? (apng ? files?.animatedFallback : files?.animated) ?? null : null;
    table[state] = {poster, animated, own: !files?.wears} satisfies ZigiFrame;
  }
  return table;
}
/**
 * The rotation: a timer to the next variation, a timer for its length; both cleared whenever a condition stops being
 * true (not idle, Calm or Off, motion not allowed, the tab hidden, the person typing). Pure picks come from idle.ts.
 */
function startRotation(skinOf_: () => Skin, apngOf: () => boolean, random: () => number = Math.random): () => void {
  let gap: number | null = null, play: number | null = null, typingUntil = 0, typingTimer: number | null = null;
  const history: IdleHistory = {lastId: null, lastAccentAt: -Infinity};
  const clear = () => { if (gap) window.clearTimeout(gap); if (play) window.clearTimeout(play); gap = play = null; if (zigiIdleVariant.get()) zigiIdleVariant.set(null); };
  const allowed = () => zigiState.get() === 'idle' && zigiAnimation() === 'full' && motionAllowed() && document.visibilityState === 'visible' && Date.now() >= typingUntil;
  const schedule = () => {
    clear();
    if (!allowed()) return;
    gap = window.setTimeout(() => {
      gap = null;
      if (!allowed()) return;
      const skin = skinOf_(), pool = idlePool(skin), now = Date.now(), pick: IdleVariant | null = pickIdle(pool, history, now, random());
      if (!pick) { schedule(); return; }
      history.lastId = pick.id; if (pick.accent) history.lastAccentAt = now;
      zigiIdleVariant.set(variantFrame(pick, apngOf(), {x1: skin.sizes['1x'].file, x2: skin.sizes['2x'].file}));
      play = window.setTimeout(() => { play = null; zigiIdleVariant.set(null); schedule(); }, pick.durationMs);
    }, nextGapMs(random()));
  };
  const onKey = (event: KeyboardEvent) => {
    if (!isTextField(event.target)) return;
    typingUntil = Date.now() + TYPING_GUARD_MS;
    if (zigiIdleVariant.get() || gap) clear();
    if (typingTimer) window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => { typingTimer = null; schedule(); }, TYPING_GUARD_MS);
  };
  const onVisibility = () => schedule();
  const offState = zigiState.subscribe(schedule), offMotion = watchMotion(schedule);
  document.addEventListener('keydown', onKey, true); document.addEventListener('visibilitychange', onVisibility);
  schedule();
  return () => { clear(); if (typingTimer) window.clearTimeout(typingTimer); offState(); offMotion(); document.removeEventListener('keydown', onKey, true); document.removeEventListener('visibilitychange', onVisibility); };
}
/** Tests only: a fixed random number in the tab's session storage makes the rotation's picks and gaps exact. */
export const TEST_RANDOM_KEY = 'zigoals:zigi:test-random';
function randomSource(): (() => number) | undefined {
  try { const raw = window.sessionStorage.getItem(TEST_RANDOM_KEY), value = raw === null ? NaN : Number(raw); return Number.isFinite(value) && value >= 0 && value < 1 ? () => value : undefined; } catch { return undefined; }
}
export function startZigiAlive(options: {random?: () => number} = {}): () => void {
  if (started) return started;
  options = {random: options.random ?? randomSource()};
  let apng = false;
  const skin = () => skinOf(readZigiLook(getAppStorage()).skin);
  const publish = () => zigiFrames.set(framesFor(skin(), apng));
  const stopMachine = startZigiMachine();
  const stopMotion = watchMotion(publish);
  const onStore = (event: Event) => { if (!(event instanceof CustomEvent) || !event.detail || event.detail === ZIGI_KEY) publish(); };
  const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === ZIGI_KEY) publish(); };
  window.addEventListener(ZIGI_STORE_EVENT, onStore); window.addEventListener('storage', onStorage);
  publish();
  void supportsAnimatedWebp().then(ok => { apng = !ok; publish(); });
  const stopRotation = startRotation(skin, () => apng, options.random);
  started = () => { stopRotation(); stopMachine(); stopMotion(); window.removeEventListener(ZIGI_STORE_EVENT, onStore); window.removeEventListener('storage', onStorage); zigiFrames.set(null); started = null; };
  return started;
}
