'use client';
import {getAppStorage} from '../../lib/showcase-storage';
import {readZigiLook} from '../../lib/ai/zigi-look';
import {readAiSettings} from '../../lib/ai/settings';
import {AI_SETTINGS_EVENT} from '../../lib/ai/launcher-record';
import {ZIGI_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {isSensitiveScreen} from '../ai/use-sensitive-screen';
import {zigiEvents, zigiFrames, zigiIdleVariant, zigiSignals, zigiState, type ZigiFrame, type ZigiFrames, type ZigiSignal} from './bus';
import {startZigiMachine} from './events';
import {FOLLOW_UPS, isSemanticEvent, REACTION_EVENTS, ZigiController, type Decision, type SemanticEventType} from './semantic';
import {idlePool, nextGapMs, pickIdle, variantFrame, type IdleHistory, type IdleVariant} from './idle';
import {filesFor, reactionArtOf, skinOf, ZIGI_STATES, type Skin, type StateFiles} from './manifest';
import {BASE, pickVariant, poolForState, variantPools, type VariantPool} from './variants';
import {motionAllowed, supportsAnimatedWebp, watchMotion, zigiAnimation} from './motion';

/**
 * ZIGi alive (Session X-Local Parts 1, 3 and 4; ADR-017 S7): the small chunk the launcher loads lazily on every app page
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
/**
 * Session X-Local Part 4: the one companion controller of this page (semantic.ts). It takes every signal (the chat's,
 * the app's validated facts, the AI's hint), applies the rules and emits the machine event it allows; the knock asks
 * it before it counts a nudge. The last decision is kept for tests and Meet ZIGi.
 */
export const zigiController = new ZigiController();
let lastDecision: Decision | null = null;
export const lastZigiDecision = () => lastDecision;
/** Whether the alive chunk runs on this page (the controller then hears every signal); before that a knock counts its own nudge. */
export const zigiAliveRunning = () => started !== null;
/**
 * Session AK Part 12 (Studio-4 preparation): a clip shown in place of a state's own for one play, a variant (variants.ts)
 * or a reaction (semantic.ts). It ends when the state changes or, for a reaction, when its clip has played. With no
 * Studio-4 art there is never one, so the frames published are exactly today's.
 */
let override: {state: string; frame: ZigiFrame; timer: number | null} | null = null;
let republish: () => void = () => undefined;
function setOverride(next: {state: string; frame: ZigiFrame; ms: number} | null): void {
  if (override?.timer) window.clearTimeout(override.timer);
  if (!next && !override) return;
  override = next ? {state: next.state, frame: next.frame, timer: next.ms > 0 ? window.setTimeout(() => { override = null; republish(); }, next.ms) : null} : null;
  republish();
}
const overrideFrame = (files: StateFiles, apng: boolean, skin: Skin): ZigiFrame => ({...variantFrame({id: '', files, accent: false, durationMs: 0, weight: 0}, apng, {x1: skin.sizes['1x'].file, x2: skin.sizes['2x'].file}), override: true});
/** The reaction events whose Studio-4 clip has landed for this skin (none today). */
const reactionArt = (skin: Skin): SemanticEventType[] => reactionArtOf(skin).map(r => r.event).filter((e): e is SemanticEventType => isSemanticEvent(e) && REACTION_EVENTS.has(e));
function connectController(skin: () => Skin = () => skinOf(null), apng: () => boolean = () => false): () => void {
  const decide = (type: SemanticEventType, validated: boolean) => {
    zigiController.setPreferences({motion: motionAllowed() ? 'full' : 'reduced', sensitive: isSensitiveScreen()});
    zigiController.sync(zigiState.get());
    const decision = validated ? zigiController.dispatchValidated({type}) : zigiController.dispatch({type});
    lastDecision = decision;
    if (decision.event) zigiEvents.emit(decision.event);
    // A reaction the controller allowed plays its clip over the current state (only once its art has landed).
    if (decision.reaction && decision.mode === 'animated') {
      const found = reactionArtOf(skin()).find(r => r.event === decision.reaction);
      if (found) setOverride({state: zigiState.get(), frame: overrideFrame(found.clip.files, apng(), skin()), ms: found.clip.durationMs > 0 ? found.clip.durationMs : 2000});
    }
  };
  const handle = (signal: ZigiSignal) => {
    if (!isSemanticEvent(signal.type)) return;
    decide(signal.type, signal.validated);
    // Session AK Part 12: the reaction that follows a signal the chat already sends (an unsure reply, records read).
    const follow = FOLLOW_UPS[signal.type];
    if (follow) decide(follow, false);
  };
  const off = zigiSignals.on(handle);
  const offState = zigiState.subscribe(() => zigiController.sync(zigiState.get()));
  return () => { off(); offState(); };
}
const isTextField = (target: EventTarget | null) => target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
function framesFor(skin: Skin, apng: boolean): ZigiFrames {
  const table = baseFrames(skin, apng);
  if (override && table[override.state]) table[override.state] = override.frame;
  return table;
}
function baseFrames(skin: Skin, apng: boolean): ZigiFrames {
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
  // Phase 2 (P2.5, found by the simulated-day spec): only keys that write count as typing; Escape, Tab, arrows and
  // modifiers do not (Escape closing the panel was making ZIGi "listen" with the panel shut).
  const WRITES = /^(?:Backspace|Delete|Enter)$/;
  const onKey = (event: KeyboardEvent) => {
    if (!isTextField(event.target) || (event.key.length !== 1 && !WRITES.test(event.key)) || event.metaKey || event.ctrlKey) return;
    const wasTyping = Date.now() < typingUntil;
    typingUntil = Date.now() + TYPING_GUARD_MS;
    if (!wasTyping) zigiSignals.emit('user_typing_started');
    if (zigiIdleVariant.get() || gap) clear();
    if (typingTimer) window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => { typingTimer = null; zigiSignals.emit('user_typing_stopped'); schedule(); }, TYPING_GUARD_MS);
  };
  const onVisibility = () => schedule();
  const offState = zigiState.subscribe(schedule), offMotion = watchMotion(schedule);
  document.addEventListener('keydown', onKey, true); document.addEventListener('visibilitychange', onVisibility);
  schedule();
  return () => { clear(); if (typingTimer) window.clearTimeout(typingTimer); offState(); offMotion(); document.removeEventListener('keydown', onKey, true); document.removeEventListener('visibilitychange', onVisibility); };
}
/**
 * Session AK Part 12: the variant rotation (variants.ts) as each play of a pooled state starts: speaking, listening,
 * thinking and the small celebration play their own clip, or now and then a Studio-4 variant, only under Full animation
 * with motion allowed. A pool without landed variants plays its own clip: today, every pool.
 */
function startVariants(skin: () => Skin, apng: () => boolean, random: () => number = Math.random): () => void {
  const history: Partial<Record<VariantPool, string>> = {};
  let previous = zigiState.get();
  const onState = () => {
    const state = zigiState.get(); if (state === previous) return; previous = state;
    if (override && override.state !== state) setOverride(null);
    const pool = poolForState(state); if (!pool) return;
    const variants = variantPools(skin())[pool]; if (!variants.length) return;
    if (zigiAnimation() !== 'full' || !motionAllowed()) return;
    const pick = pickVariant(variants, history[pool] ?? null, random());
    history[pool] = pick ? pick.id : BASE;
    if (pick) setOverride({state, frame: overrideFrame(pick.files, apng(), skin()), ms: 0});
  };
  const off = zigiState.subscribe(onState);
  return () => { off(); setOverride(null); };
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
  const publish = () => { const now = skin(); zigiController.setReactionArt(reactionArt(now)); zigiFrames.set(framesFor(now, apng)); };
  republish = publish;
  const stopMachine = startZigiMachine(), stopController = connectController(skin, () => apng);
  const stopMotion = watchMotion(publish);
  const onStore = (event: Event) => { if (!(event instanceof CustomEvent) || !event.detail || event.detail === ZIGI_KEY) publish(); };
  const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === ZIGI_KEY) publish(); };
  window.addEventListener(ZIGI_STORE_EVENT, onStore); window.addEventListener('storage', onStorage);
  // Phase 2 (P2.5): ZIGi on but not set up yet (no provider or model chosen) asks for attention at rest; set up, it rests.
  let askedForSetup = false;
  const watchSetup = () => {
    let needs = false;
    try { const {data} = readAiSettings(getAppStorage()); needs = data.enabled && (!data.provider || !data.model); } catch { needs = false; }
    if (needs && !askedForSetup) { askedForSetup = true; zigiEvents.emit('attention'); }
    else if (!needs && askedForSetup) { askedForSetup = false; zigiEvents.emit('connected'); }
  };
  watchSetup();
  window.addEventListener(AI_SETTINGS_EVENT, watchSetup); window.addEventListener('storage', watchSetup);
  publish();
  void supportsAnimatedWebp().then(ok => { apng = !ok; publish(); });
  const stopRotation = startRotation(skin, () => apng, options.random), stopVariants = startVariants(skin, () => apng, options.random);
  started = () => { stopVariants(); republish = () => undefined; stopRotation(); stopController(); stopMachine(); stopMotion(); window.removeEventListener(ZIGI_STORE_EVENT, onStore); window.removeEventListener('storage', onStorage); window.removeEventListener(AI_SETTINGS_EVENT, watchSetup); window.removeEventListener('storage', watchSetup); zigiFrames.set(null); started = null; };
  return started;
}
