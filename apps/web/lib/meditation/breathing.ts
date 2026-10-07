import type {BREATHING_PATTERNS} from './schema';

/**
 * Breathing patterns (Session W Part 5). Each is a cycle of timed phases; where a breath is in its cycle is worked out
 * from the time since the start, so the guide stays exact however the page is throttled. These are common relaxation
 * patterns, offered as such: not treatment, not advice. Stop if you feel dizzy or unwell.
 */
export type BreathingPattern = typeof BREATHING_PATTERNS[number];
export type PhaseKind = 'in' | 'hold' | 'out' | 'top-up' | 'rest';
type Phase = {kind: PhaseKind; seconds: number};
export const PATTERNS: Record<BreathingPattern, {label: string; summary: string; phases: readonly Phase[]}> = {
  box: {label: 'Box breathing', summary: 'In 4 · hold 4 · out 4 · hold 4', phases: [{kind: 'in', seconds: 4}, {kind: 'hold', seconds: 4}, {kind: 'out', seconds: 4}, {kind: 'rest', seconds: 4}]},
  '478': {label: '4-7-8', summary: 'In 4 · hold 7 · out 8', phases: [{kind: 'in', seconds: 4}, {kind: 'hold', seconds: 7}, {kind: 'out', seconds: 8}]},
  coherent: {label: 'Slow and even', summary: 'In 5 · out 5 (six breaths a minute)', phases: [{kind: 'in', seconds: 5}, {kind: 'out', seconds: 5}]},
  sigh: {label: 'Double inhale, long exhale', summary: 'In 2 · a little more 1 · out 6', phases: [{kind: 'in', seconds: 2}, {kind: 'top-up', seconds: 1}, {kind: 'out', seconds: 6}]},
};
export const PHASE_WORDS: Record<PhaseKind, string> = {in: 'Breathe in', hold: 'Hold', out: 'Breathe out', 'top-up': 'A little more in', rest: 'Hold, empty'};
export const cycleSeconds = (pattern: BreathingPattern) => PATTERNS[pattern].phases.reduce((t, p) => t + p.seconds, 0);

export type PhaseNow = {kind: PhaseKind; words: string; index: number; cycle: number; secondsLeft: number; progress: number; scale: number};
/**
 * Where the breath is at `elapsedMs`: the phase, its words, the whole seconds left in it (a count down from the phase's
 * length to 1), how far through it is (0–1), and the circle's scale for the visual (small after breathing out, full after
 * breathing in, held during a hold).
 */
export function phaseAt(pattern: BreathingPattern, elapsedMs: number): PhaseNow {
  const phases = PATTERNS[pattern].phases, cycleMs = cycleSeconds(pattern) * 1000, t = Math.max(0, elapsedMs);
  const cycle = Math.floor(t / cycleMs);
  let within = t - cycle * cycleMs, index = 0;
  while (within >= phases[index]!.seconds * 1000) { within -= phases[index]!.seconds * 1000; index++; }
  const phase = phases[index]!, progress = within / (phase.seconds * 1000);
  return {kind: phase.kind, words: PHASE_WORDS[phase.kind], index, cycle, secondsLeft: Math.max(1, Math.ceil(phase.seconds - within / 1000)), progress, scale: scaleFor(phases, index, progress)};
}
const SMALL = 0.55, FULL = 1;
function scaleFor(phases: readonly Phase[], index: number, progress: number): number {
  // The size reached at the end of each phase, so a hold keeps whatever came before it.
  const sizes: number[] = [];
  let size = SMALL;
  for (const p of phases) { size = p.kind === 'in' ? (phases.some(q => q.kind === 'top-up') ? 0.9 : FULL) : p.kind === 'top-up' ? FULL : p.kind === 'out' ? SMALL : size; sizes.push(size); }
  const from = index ? sizes[index - 1]! : sizes[sizes.length - 1]!, to = sizes[index]!;
  return from + (to - from) * easeInOut(progress);
}
const easeInOut = (x: number) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, x))) / 2;
/** The sentence a screen reader hears when a phase begins (once per phase, politely): "Breathe in, 4 seconds". */
export function phaseAnnouncement(pattern: BreathingPattern, index: number): string {
  const phase = PATTERNS[pattern].phases[index]!;
  return `${PHASE_WORDS[phase.kind]}, ${phase.seconds} ${phase.seconds === 1 ? 'second' : 'seconds'}`;
}
