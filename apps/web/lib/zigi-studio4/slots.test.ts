import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
import raw from '../../components/zigi/manifest.json';
import {cheerOf, clipDurationMs, filesFor, reactionArtOf, readManifest, skinOf, variantsOf, ZIGI_MANIFEST, type Manifest, type Skin} from '../../components/zigi/manifest';
import {checklistCelebrationArt, studio4SlotProblems} from '../../components/zigi/studio4';
import {CELEBRATION_CLIP} from '../checklist/celebration-clip';

/**
 * Session AK Part 12 (Studio-4 preparation): the manifest's new slots exist, are optional and empty, and today's manifest
 * still reads; the Checklist's X030 cheer slot falls back to today's clip; per-clip durations and reaction triggers are
 * read only when the art states them.
 * Session AK Part 13 (the Studio-4 art arrived; restated at equal strength, the runbook's §4): the slots are filled — the
 * fourteen states carry their own files and lengths, the cheer is X030, the variants X050–X054 in order, the reactions
 * R001–R013 with reactions.json's triggers; the synthetic "nothing landed" cases keep their meaning on copies.
 */
const skin = skinOf('origami-nebula');
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const FOURTEEN = {'reading-your-data': 'F010', 'writing-proposal': 'F011', success: 'F012', proud: 'F013', curious: 'F014', surprised: 'F015', confused: 'F016', empathetic: 'F017', encouraging: 'F018', 'wave-goodbye': 'F019', reminder: 'F020', offline: 'F021', peek: 'F022', 'loading-model': 'F023'};

const DIR = '/brand/figures/zigi/origami-nebula/';
test('the slots, filled: the fourteen states, the cheer, the variants, the transitions chain and the reaction triggers', () => {
  for (const [state, code] of Object.entries(FOURTEEN)) {
    expect(ZIGI_MANIFEST.states[state]?.code, state).toBe(code); expect(skin.states[state]?.wears, state).toBeUndefined();
    expect(skin.states[state], state).toEqual({'1x': `${DIR}${code}-${state}.webp`, '2x': `${DIR}${code}-${state}-2x.webp`, large: `${DIR}${code}-${state}-large.webp`, animated: `${DIR}${code}-${state}.anim.webp`, animatedFallback: `${DIR}${code}-${state}.anim.png`, durationMs: ZIGI_MANIFEST.states[state]!.durationMs});
  }
  expect(cheerOf(skin)).toEqual({name: 'X030-cheer', kind: 'one-shot', durationMs: 2500, files: {'1x': `${DIR}X030-cheer.webp`, '2x': `${DIR}X030-cheer-2x.webp`, large: `${DIR}X030-cheer-large.webp`, animated: `${DIR}X030-cheer.anim.webp`, animatedFallback: `${DIR}X030-cheer.anim.png`}});
  expect(Object.keys(skin.extras!.variants!)).toEqual(['speakingB', 'speakingC', 'listeningB', 'thinkingB', 'celebrateSmall']);
  expect(variantsOf(skin).map(c => [c.name, c.kind, c.durationMs])).toEqual([['X050-speaking-b', 'loop', 1600], ['X051-speaking-c', 'loop', 5000], ['X052-listening-b', 'loop', 1600], ['X053-thinking-b', 'loop', 4000], ['X054-celebrate-small', 'one-shot', 2000]]);
  expect(skin.extras!.transitions.chain).toEqual([]);
  expect(raw.reactionTriggers).toEqual({R001: 'assistant_acknowledged', R002: 'assistant_unsure', R003: 'assistant_working', R004: 'insight_consistent', R005: 'checkin_low', R006: 'checkin_milestone', R007: 'action_undone', R008: 'wrapup_finished', R009: 'feedback_received', R010: 'journal_reflecting', R011: 'connection_lost', R012: 'connection_restored', R013: 'user_dismissed'});
  expect(reactionArtOf(skin).map(r => [r.code, r.event, r.clip.name])).toEqual(Object.entries(raw.reactionTriggers).map(([code, event]) => [code, event, skin.extras!.reactions[code]!.name]));
  expect(reactionArtOf(skin)).toHaveLength(13);
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
test('the X030 cheer for the Checklist: the landed clip, the very one the orbit cheer plays; today\'s clip, the very same constant, while a skin has none', () => {
  expect(checklistCelebrationArt(skin)).toEqual({source: 'studio4-x030', clip: skin.extras!.celebrations!.cheer});
  // Session AK Part 13 (owner decision, AF11): the path's orbit cheer names this clip and its large still, never the manifest itself.
  const read = (file: string) => readFileSync(join(__dirname, '..', '..', 'components', 'path', file), 'utf8');
  expect(/^const ORBIT_CHEER_CLIP = '([^']+)';$/m.exec(read('path.tsx'))?.[1]).toBe(cheerOf(skin)!.files.animated);
  expect(/^const ORBIT_CHEER_STILL = '([^']+)';$/m.exec(read('path-zigi.tsx'))?.[1]).toBe(cheerOf(skin)!.files.large);
  const today = checklistCelebrationArt({...skin, extras: {...skin.extras!, celebrations: {cheer: null}}});
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
  // Session AK Part 13: the base skin is a copy with no reaction landed, so the "nothing yet" lines below keep their meaning.
  const quiet: Manifest = {...ZIGI_MANIFEST, reactionTriggers: Object.fromEntries(Object.keys(ZIGI_MANIFEST.reactionTriggers!).map(code => [code, null]))};
  const timed: Skin = {...skin, states: {...skin.states, success: {...skin.states.success!, durationMs: 2100}, proud: {...skin.states.proud!, durationMs: Number.NaN}}};
  expect(clipDurationMs(timed, 'success')).toBe(2100); expect(clipDurationMs(timed, 'proud')).toBe(ZIGI_MANIFEST.states.proud!.durationMs);
  // Durations never change which files a state shows.
  expect(filesFor(timed, 'success').files!.animated).toBe(filesFor(skin, 'success').files!.animated);
  const clip = {name: 'R004-reaction-4', files: {animated: '/brand/figures/zigi/origami-nebula/R004-reaction-4.anim.webp'}, kind: 'one-shot' as const, durationMs: 0};
  const reacting: Skin = {...skin, extras: {...skin.extras!, reactions: {...skin.extras!.reactions, R004: clip, R005: {...clip, name: 'R005-reaction-5'}}}};
  const named: Manifest = {...quiet, reactionTriggers: {...quiet.reactionTriggers, R004: 'checkin_milestone'}};
  expect(reactionArtOf(reacting, named)).toEqual([{event: 'checkin_milestone', code: 'R004', clip}]);
  // A landed clip with no trigger never plays (R005), and a trigger without a clip neither.
  const unlanded: Skin = {...skin, extras: {...skin.extras!, reactions: Object.fromEntries(Object.keys(skin.extras!.reactions).map(code => [code, null]))}};
  expect(reactionArtOf(unlanded, named)).toEqual([]);
});
