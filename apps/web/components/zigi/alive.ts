'use client';
import {getAppStorage} from '../../lib/showcase-storage';
import {readZigiLook} from '../../lib/ai/zigi-look';
import {ZIGI_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {zigiFrames, type ZigiFrame, type ZigiFrames} from './bus';
import {startZigiMachine} from './events';
import {filesFor, skinOf, ZIGI_STATES} from './manifest';
import {motionAllowed, supportsAnimatedWebp, watchMotion} from './motion';

/**
 * ZIGi alive (Session X-Local Part 1; ADR-017 S7): the small chunk the launcher loads lazily on every app page once it
 * is visible and the browser is idle, never as part of the shell. It runs the state machine on every page (so ZIGi
 * reacts outside the chat), and publishes to the bus which files show each state: the poster from the manifest for the
 * chosen skin and, while motion is allowed, the animated clip this browser can play (animated WebP, or the APNG
 * fallback). It re-publishes when the look, the motion setting or the Showcase changes. Nothing is fetched here: the
 * figure fetches a clip only when its state shows. Started once per page; the stop function is for tests.
 */
let started: (() => void) | null = null;
function framesFor(apng: boolean): ZigiFrames {
  const look = readZigiLook(getAppStorage()), skin = skinOf(look.skin), motion = motionAllowed();
  const table: ZigiFrames = {};
  for (const state of ZIGI_STATES) {
    const {files} = filesFor(skin, state);
    const poster = {x1: files?.['1x'] ?? skin.sizes['1x'].file, x2: files?.['2x'] ?? skin.sizes['2x'].file};
    const animated = motion ? (apng ? files?.animatedFallback : files?.animated) ?? null : null;
    table[state] = {poster, animated, own: !files?.wears} satisfies ZigiFrame;
  }
  return table;
}
export function startZigiAlive(): () => void {
  if (started) return started;
  let apng = false;
  const publish = () => zigiFrames.set(framesFor(apng));
  const stopMachine = startZigiMachine();
  const stopMotion = watchMotion(publish);
  const onStore = (event: Event) => { if (!(event instanceof CustomEvent) || !event.detail || event.detail === ZIGI_KEY) publish(); };
  const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === ZIGI_KEY) publish(); };
  window.addEventListener(ZIGI_STORE_EVENT, onStore); window.addEventListener('storage', onStorage);
  publish();
  void supportsAnimatedWebp().then(ok => { apng = !ok; publish(); });
  started = () => { stopMachine(); stopMotion(); window.removeEventListener(ZIGI_STORE_EVENT, onStore); window.removeEventListener('storage', onStorage); zigiFrames.set(null); started = null; };
  return started;
}
