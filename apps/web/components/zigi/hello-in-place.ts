'use client';
import {getAppStorage} from '../../lib/showcase-storage';
import {firstIdle} from '../../lib/first-idle';
import {localDate} from '../../lib/local-date';
import {isSensitiveScreen} from '../ai/use-sensitive-screen';
import {zigiState} from './bus';
import {extrasOf, type ExtraClip, type Skin} from './manifest';
import {motionAllowed} from './motion';
import {TEST_HELLO_KEY, readHelloDay, writeHelloDay} from '../../lib/zigi-hello-day';

/**
 * Session AV lane 2 (roadmap, PK-6; owner decision, follow-up 3): ZIGi's "Hello, in place" (Studio-4's X001, already
 * delivered) plays once a day, on the first open of the app that day while ZIGi is already on screen and resting. Never
 * under reduced motion, the app's Motion Off or ZIGi's animation Off (motion.ts `motionAllowed`), never on a sensitive
 * screen, never while the tab is hidden. Only the existing clip plays, over the resting state, for its own length; the
 * ZIGi look is unchanged. A day it played is kept on this device (lib/zigi-hello-day.ts, a plain "YYYY-MM-DD", the
 * person's local day), so a reload, another page or another tab that day does not play it again. A skin without the clip
 * plays nothing. The very first open of all (no day kept yet) only starts the record: a hello back begins the next day.
 * Started by the alive chunk (alive.ts); this file is part of that lazy chunk.
 */
export {ZIGI_HELLO_DAY_KEY, readHelloDay, writeHelloDay} from '../../lib/zigi-hello-day';
/** How long after the clip can play ZIGi must still be resting and on screen for the hello to start. */
export const HELLO_SETTLE_MS = 600;
export {TEST_HELLO_KEY};
/** An automated browser without the test's session key (lib/zigi-hello-day.ts TEST_HELLO_KEY) gets no hello. */
const automatedWithoutHello = () => { try { return navigator.webdriver === true && window.sessionStorage.getItem(TEST_HELLO_KEY) !== '1'; } catch { return true; } };
export type HelloConditions = {lastDay: string | null; today: string; motion: boolean; visible: boolean; resting: boolean; onScreen: boolean; sensitive: boolean; clip: boolean};
/** Pure: whether the hello plays now. Never on the very first open of all (no day kept yet): that day starts the record. */
export const helloDue = (c: HelloConditions) => c.clip && c.motion && c.visible && c.resting && c.onScreen && !c.sensitive && c.lastDay !== null && c.lastDay < c.today;
/** The clip, or null when this skin has none. */
export const helloClip = (skin: Skin): ExtraClip | null => extrasOf(skin).transitions.greetingInPlace ?? null;
/** The launcher's figure drawn on screen in the resting state. */
function figureOnScreen(): boolean {
  const el = document.querySelector<HTMLElement>('[data-testid="ai-launcher"] .zigi[data-state="idle"]');
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
}
/**
 * Waits for the page's first idle (so the clip never competes with the page's own first requests), fetches the clip,
 * checks again, then asks `play` to show it over the resting state for its length and keeps the day. Returns a stop.
 */
export function startHelloInPlace({skin, apng, play, now = () => new Date()}: {skin: () => Skin; apng: () => boolean; play: (clip: ExtraClip) => void; now?: () => Date}): () => void {
  if (automatedWithoutHello()) return () => undefined;
  let live = true, timer: number | null = null;
  const conditions = (): HelloConditions => {
    let lastDay: string | null = null; try { lastDay = readHelloDay(getAppStorage()); } catch { lastDay = null; }
    return {lastDay, today: localDate(now()), motion: motionAllowed(), visible: document.visibilityState === 'visible', resting: zigiState.get() === 'idle', onScreen: figureOnScreen(), sensitive: isSensitiveScreen(), clip: !!helloClip(skin())};
  };
  const first = conditions();
  // The first open of all is the welcome, not a hello back: the day is kept, nothing plays (and a fresh browser never plays it).
  if (first.lastDay === null) { try { writeHelloDay(getAppStorage(), first.today); } catch { /* nothing kept */ } return () => undefined; }
  if (!helloDue({...first, onScreen: true, resting: true})) return () => undefined; // the day already had it, or motion is off: nothing to wait for
  void firstIdle().then(() => new Promise<void>(resolve => {
    const clip = helloClip(skin()), src = clip ? (apng() ? clip.files.animatedFallback : clip.files.animated) : null;
    if (!live || !src) { resolve(); return; }
    const image = new Image(); image.decoding = 'async';
    image.onload = () => resolve(); image.onerror = () => resolve();
    image.src = src;
    if (typeof image.decode === 'function') image.decode().then(() => resolve(), () => undefined);
  })).then(() => {
    if (!live) return;
    timer = window.setTimeout(() => {
      timer = null;
      const clip = helloClip(skin());
      if (!live || !clip || !helloDue(conditions())) return;
      try { writeHelloDay(getAppStorage(), localDate(now())); } catch { return; }
      play(clip);
    }, HELLO_SETTLE_MS);
  });
  return () => { live = false; if (timer) window.clearTimeout(timer); };
}
