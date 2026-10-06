import raw from './manifest.json';

/**
 * ZIGi's figure manifest (ADR-012; version 2 since Session V Part 12): the states ZIGi can be in, each with its code, a
 * kind (a loop holds until the next event; a one-shot plays once for its duration, then ZIGi rests), and a fallback
 * state; and the skins, each with its base frame in three sizes, an optical offset (how far the figure's visual centre
 * sits from its box centre, as fractions of the box) and per-state files where a skin has them. A state a skin has no
 * file for shows its fallback's file, down to the skin's base frame: today the placeholder is the base frame for every
 * state, and the states differ by a small CSS motion each (zigi.css). A static manifest (a build-time import, nothing
 * fetched); never imported by the launcher shell, which carries one constant frame (zigi-figure.tsx). A version 1
 * manifest (Session T: base sizes and eleven states, no skins) still reads, as the original skin.
 */
export type ZigiState = keyof typeof raw.states;
export type StateKind = 'loop' | 'one-shot';
export type SizeName = '1x' | '2x' | 'large';
export type Frame = {file: string; width: number; height: number};
export type StateFiles = Partial<Record<SizeName, string>> & {animated?: string | null};
export type Skin = {label: string; placeholder: boolean; opticalOffset: {x: number; y: number}; sizes: Record<SizeName, Frame>; states: Partial<Record<string, StateFiles>>};
export type StateSpec = {code: string; label: string; kind: StateKind; durationMs: number; fallback: string | null};
export type Manifest = {version: 2; name: string; alt: string; defaultSkin: string; skins: Record<string, Skin>; comingSoon: number; budgetBytes: Record<SizeName | 'animated', number>; states: Record<string, StateSpec>};

/** Session T's states, which a version 1 manifest names without a kind: these hold, the others play once. */
const V1_LOOPS = new Set(['idle', 'listening', 'speaking', 'attention', 'sleepy', 'thinking']);
const V1_DURATIONS: Record<string, number> = {celebrate: 2500, greeting: 2500, error: 4000, insight: 3000, presenting: 3000};
type V1 = {version: 1; name: string; alt: string; sizes: Record<SizeName, Frame>; budgetBytes: Record<SizeName | 'animated', number>; states: Record<string, {code: string; label: string; animated: string | null}>};
/** Any manifest version this build knows, as version 2. */
export function readManifest(input: unknown): Manifest {
  const m = input as {version?: unknown};
  if (m?.version === 2) return input as Manifest;
  if (m?.version !== 1) throw new Error('Unknown ZIGi manifest version');
  const v1 = input as V1;
  const states: Record<string, StateSpec> = {};
  for (const [name, s] of Object.entries(v1.states)) states[name] = {code: s.code, label: s.label, kind: V1_LOOPS.has(name) ? 'loop' : 'one-shot', durationMs: V1_DURATIONS[name] ?? 3000, fallback: name === 'idle' ? null : 'idle'};
  const files: Record<string, StateFiles> = {};
  for (const [name, s] of Object.entries(v1.states)) if (s.animated) files[name] = {animated: s.animated};
  return {version: 2, name: v1.name, alt: v1.alt, defaultSkin: 'origami-nebula', skins: {'origami-nebula': {label: 'Original', placeholder: true, opticalOffset: {x: 0, y: 0}, sizes: v1.sizes, states: files}}, comingSoon: 0, budgetBytes: v1.budgetBytes, states};
}
export const ZIGI_MANIFEST = readManifest(raw);
export const ZIGI_STATES = Object.keys(raw.states) as ZigiState[];
export const isZigiState = (value: unknown): value is ZigiState => typeof value === 'string' && Object.hasOwn(raw.states, value);
/** A skin by name; an unknown name (a skin from a later build) shows the default skin. */
export function skinOf(name: string | null | undefined, manifest: Manifest = ZIGI_MANIFEST): Skin {
  return (name && manifest.skins[name]) || manifest.skins[manifest.defaultSkin]!;
}
/** The files that show a state in a skin: the state's own, else its fallback's, down to the skin's base frame. */
export function filesFor(skin: Skin, state: string, manifest: Manifest = ZIGI_MANIFEST): {files: StateFiles | null; from: string | null} {
  const seen = new Set<string>();
  for (let at: string | null = state; at && !seen.has(at); at = manifest.states[at]?.fallback ?? null) {
    seen.add(at);
    const files = skin.states[at];
    if (files) return {files, from: at};
  }
  return {files: null, from: null};
}
/** How long a one-shot state plays before ZIGi rests; a loop holds (0). */
export function oneShotMs(state: string, manifest: Manifest = ZIGI_MANIFEST): number {
  const spec = manifest.states[state];
  return spec?.kind === 'one-shot' ? spec.durationMs : 0;
}
