import raw from './manifest.json';

/**
 * ZIGi's figure manifest (ADR-012; version 2 since Session V Part 12; Studio-2 art and the Studio-4 slots since Session
 * X-Local Parts 1–2, ADR-017): the states ZIGi can be in, each with its code, a kind (a loop holds until the next event;
 * a one-shot plays once for its duration, then ZIGi rests), and a fallback state; and the skins, each with its base frame
 * in three sizes, an optical offset (how far the figure's visual centre sits from its box centre, as fractions of the
 * box) and per-state files. A state's files are its still frames (1×, 2×, large), its animated WebP and the APNG shown
 * where a browser cannot play animated WebP. A state without its own clip "wears" a delivered one (`wears` names it);
 * a state a skin lists no files for at all shows its fallback's, down to the skin's base frame. `extras` are the
 * Studio-4 slots (reactions R001–R013, idle variants, in-place transitions, a gaze set): data the importer fills, `null`
 * until the files land. A static manifest (a build-time import, nothing fetched); never imported by the launcher shell,
 * which carries one constant frame (zigi-figure.tsx) and reads the rest from the bus. A version 1 manifest (Session T)
 * still reads, as the original skin.
 */
export type ZigiState = keyof typeof raw.states;
export type StateKind = 'loop' | 'one-shot';
export type SizeName = '1x' | '2x' | 'large';
export type Frame = {file: string; width: number; height: number};
export type StateFiles = Partial<Record<SizeName, string>> & {animated?: string | null; animatedFallback?: string | null; wears?: string};
/** A Studio-4 slot: the clip's own files, plus the name the studio gave it; `null` while the files have not landed. */
export type ExtraClip = {name: string; files: StateFiles; kind: 'loop' | 'one-shot'; durationMs: number};
export type SkinExtras = {reactions: Record<string, ExtraClip | null>; idleVariants: Record<string, ExtraClip | null>; transitions: {greetingInPlace: ExtraClip | null; chain: ExtraClip[]}; gaze: {chatInput: ExtraClip | null; viewer: ExtraClip | null; target: ExtraClip | null}};
export type Skin = {label: string; placeholder: boolean; opticalOffset: {x: number; y: number}; sizes: Record<SizeName, Frame>; states: Partial<Record<string, StateFiles>>; extras?: SkinExtras};
export type StateSpec = {code: string; label: string; kind: StateKind; durationMs: number; fallback: string | null};
export type Manifest = {version: 2; name: string; alt: string; defaultSkin: string; skins: Record<string, Skin>; comingSoon: number; budgetBytes: Record<SizeName | 'animated', number>; reactionTriggers?: Record<string, string | null>; states: Record<string, StateSpec>};

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
/** The Studio-4 slots of a skin (Session X-Local Part 2): empty records when a skin has none. */
export function extrasOf(skin: Skin): SkinExtras {
  return skin.extras ?? {reactions: {}, idleVariants: {}, transitions: {greetingInPlace: null, chain: []}, gaze: {chatInput: null, viewer: null, target: null}};
}
/** The idle-variant clips that have landed, in slot order (Part 3's rotation adds them to its pool). */
export const idleVariantsOf = (skin: Skin): ExtraClip[] => Object.values(extrasOf(skin).idleVariants).filter((c): c is ExtraClip => c !== null);
/** A reaction clip by its code (R001…), or null while its files have not landed or no trigger names it. */
export function reactionOf(skin: Skin, code: string, manifest: Manifest = ZIGI_MANIFEST): {clip: ExtraClip; trigger: string} | null {
  const clip = extrasOf(skin).reactions[code] ?? null, trigger = manifest.reactionTriggers?.[code] ?? null;
  return clip && trigger ? {clip, trigger} : null;
}
