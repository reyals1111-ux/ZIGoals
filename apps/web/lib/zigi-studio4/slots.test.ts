import {expect, test} from 'vitest';
import raw from '../../components/zigi/manifest.json';
import {cheerOf, clipDurationMs, filesFor, reactionArtOf, readManifest, skinOf, variantsOf, ZIGI_MANIFEST, type Manifest, type Skin} from '../../components/zigi/manifest';
import {checklistCelebrationArt, studio4SlotProblems} from '../../components/zigi/studio4';
import {CELEBRATION_CLIP} from '../checklist/celebration-clip';

/**
 * Session AK Part 12 (Studio-4 preparation): the manifest's new slots exist, are optional and empty, and today's manifest
 * still reads; the Checklist's X030 cheer slot falls back to today's clip; per-clip durations and reaction triggers are
 * read only when the art states them.
 */
const skin = skinOf('origami-nebula');
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const FOURTEEN = {'reading-your-data': 'F010', 'writing-proposal': 'F011', success: 'F012', proud: 'F013', curious: 'F014', surprised: 'F015', confused: 'F016', empathetic: 'F017', encouraging: 'F018', 'wave-goodbye': 'F019', reminder: 'F020', offline: 'F021', peek: 'F022', 'loading-model': 'F023'};

test('the slots: the fourteen states, the cheer, the variants, the transitions chain and the reaction triggers, all empty today', () => {
  for (const [state, code] of Object.entries(FOURTEEN)) { expect(ZIGI_MANIFEST.states[state]?.code, state).toBe(code); expect(skin.states[state]?.wears, state).toBeTruthy(); expect(skin.states[state]?.durationMs, state).toBeUndefined(); }
  expect(skin.extras!.celebrations).toEqual({cheer: null});
  expect(skin.extras!.variants).toEqual({X050: null, X051: null, X052: null, X053: null, X054: null});
  expect(skin.extras!.transitions.chain).toEqual([]);
  expect(Object.values(raw.reactionTriggers).every(t => t === null)).toBe(true);
  expect(cheerOf(skin)).toBeNull(); expect(variantsOf(skin)).toEqual([]); expect(reactionArtOf(skin)).toEqual([]);
  expect(studio4SlotProblems(raw)).toEqual([]);
});
test('schema-tolerant: an older manifest without the new slots, or without extras at all, still reads; a broken slot is named', () => {
  const older = clone(raw) as unknown as {skins: Record<string, {extras?: Record<string, unknown>}>; reactionTriggers?: unknown};
  delete older.skins['origami-nebula']!.extras!.celebrations; delete older.skins['origami-nebula']!.extras!.variants;
  expect(studio4SlotProblems(older)).toEqual([]);
  const m = readManifest(older), s = skinOf('origami-nebula', m);
  expect(cheerOf(s)).toBeNull(); expect(variantsOf(s)).toEqual([]);
  const bare = clone(older); delete bare.skins['origami-nebula']!.extras; delete bare.reactionTriggers;
  expect(studio4SlotProblems(bare)).toEqual([]); expect(cheerOf(skinOf('origami-nebula', readManifest(bare)))).toBeNull(); expect(reactionArtOf(skinOf('origami-nebula', readManifest(bare)), readManifest(bare))).toEqual([]);
  const broken = clone(raw) as unknown as {skins: Record<string, {extras: Record<string, unknown>; states: Record<string, Record<string, unknown>>}>; reactionTriggers: Record<string, unknown>};
  const e = broken.skins['origami-nebula']!.extras;
  e.celebrations = {cheer: {name: 'X030-cheer', files: {animated: 'https://elsewhere.invalid/x.webp'}, kind: 'once', durationMs: -1}};
  e.variants = {X050: 'X050-speaking.anim.webp'};
  e.transitions = {greetingInPlace: null, chain: [null]};
  broken.skins['origami-nebula']!.states.success!.durationMs = 0;
  broken.reactionTriggers.R001 = 'Celebrate!';
  expect(studio4SlotProblems(broken)).toEqual([
    'reactionTriggers.R001: a reaction code with a semantic event name or null',
    'origami-nebula.states.success.durationMs: a positive number',
    'origami-nebula.extras.variants.X050: not a clip or null',
    'origami-nebula.extras.celebrations.cheer.kind: loop or one-shot',
    'origami-nebula.extras.celebrations.cheer.durationMs: a number of milliseconds (0 when unknown)',
    'origami-nebula.extras.celebrations.cheer.files.animated: not a ZIGi figure path',
    'origami-nebula.extras.transitions.chain.0: a clip',
  ]);
  expect(studio4SlotProblems(null)).toEqual(['manifest: no skins']);
});
test('the X030 cheer for the Checklist celebration: today\'s clip, the very same constant, until X030 lands with something to play', () => {
  const today = checklistCelebrationArt(skin);
  expect(today.source).toBe('today'); expect(today.clip).toBe(CELEBRATION_CLIP);
  const withCheer = (cheer: unknown): Skin => ({...skin, extras: {...skin.extras!, celebrations: {cheer: cheer as never}}});
  // A slot holding only a still has nothing to play: still today's clip.
  expect(checklistCelebrationArt(withCheer({name: 'X030-cheer', files: {'1x': '/brand/figures/zigi/origami-nebula/X030-cheer.webp'}, kind: 'one-shot', durationMs: 0})).source).toBe('today');
  const cheer = {name: 'X030-cheer', files: {animated: '/brand/figures/zigi/origami-nebula/X030-cheer.anim.webp', animatedFallback: '/brand/figures/zigi/origami-nebula/X030-cheer.anim.png'}, kind: 'one-shot' as const, durationMs: 2400};
  expect(checklistCelebrationArt(withCheer(cheer))).toEqual({source: 'studio4-x030', clip: cheer});
});
test('per-clip durations and reaction triggers count only when the art states them', () => {
  expect(clipDurationMs(skin, 'success')).toBe(ZIGI_MANIFEST.states.success!.durationMs);
  expect(clipDurationMs(skin, 'no-such-state')).toBe(0);
  const timed: Skin = {...skin, states: {...skin.states, success: {...skin.states.success!, durationMs: 2100}, proud: {...skin.states.proud!, durationMs: Number.NaN}}};
  expect(clipDurationMs(timed, 'success')).toBe(2100); expect(clipDurationMs(timed, 'proud')).toBe(ZIGI_MANIFEST.states.proud!.durationMs);
  // Durations never change which files a state shows.
  expect(filesFor(timed, 'success').files!.animated).toBe(filesFor(skin, 'success').files!.animated);
  const clip = {name: 'R004-reaction-4', files: {animated: '/brand/figures/zigi/origami-nebula/R004-reaction-4.anim.webp'}, kind: 'one-shot' as const, durationMs: 0};
  const reacting: Skin = {...skin, extras: {...skin.extras!, reactions: {...skin.extras!.reactions, R004: clip, R005: {...clip, name: 'R005-reaction-5'}}}};
  const named: Manifest = {...ZIGI_MANIFEST, reactionTriggers: {...ZIGI_MANIFEST.reactionTriggers, R004: 'checkin_milestone'}};
  expect(reactionArtOf(reacting, named)).toEqual([{event: 'checkin_milestone', code: 'R004', clip}]);
  // A landed clip with no trigger never plays (R005), and a trigger without a clip neither.
  expect(reactionArtOf(skin, named)).toEqual([]);
});
