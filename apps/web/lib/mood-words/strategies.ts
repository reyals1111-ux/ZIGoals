import {nextStepFor, nextStepLink, quadrantOfWord, type QuadrantId} from './words';

/**
 * Session AV lane 2 (r4-mind; LEDGER #325, How We Feel's strategies for a feeling): two or three written choices for the
 * corner a feeling word is in, each opening a tool ZIGoals already has (breathing in Health's meditation, Write it out,
 * the thought check, Three good things, a short walk) or a one-line action ("Text someone you like"). Choices, never
 * advice and never a task: nothing is stored or counted. An unpleasant word's first choice is its one next step as before
 * (nextStepFor); pleasant feelings get "savour it" choices. How We Feel's strategy videos are Carried: they need content
 * made for ZIGoals. Pure.
 */
export type Strategy = {id: string; theme: 'think' | 'move' | 'mindful' | 'reach' | 'savour'; label: string; href?: string; fullLoad?: boolean; line?: string};
const BREATHE: Strategy = {id: 'breathe', theme: 'mindful', label: 'Breathe for a minute', href: '/app/health?view=meditation', fullLoad: true};
const WRITE_OUT: Strategy = {id: 'write-it-out', theme: 'think', label: 'Write it out, on a page that is never saved', href: '/app/journal#write-it-out'};
const THOUGHT: Strategy = {id: 'thought-check', theme: 'think', label: 'Check a thought', href: '/app/journal#thought-check'};
const GOOD: Strategy = {id: 'good-things', theme: 'savour', label: 'Write three good things', href: '/app/journal#good-things'};
const TEXT: Strategy = {id: 'text-someone', theme: 'reach', label: 'Text someone you like', line: 'A short message to someone you like, about anything.'};
const OUTSIDE: Strategy = {id: 'outside', theme: 'move', label: 'Step outside for a few minutes', line: 'A few minutes outside, at your own pace.'};
const SAVOUR: Strategy = {id: 'savour', theme: 'savour', label: 'Savour it: note one detail', href: '/app/journal#journal-write'};
const SHARE: Strategy = {id: 'share', theme: 'reach', label: 'Tell someone about it', line: 'Share the good part with someone who would enjoy it.'};
const STRETCH: Strategy = {id: 'stretch', theme: 'move', label: 'Stretch for a minute', line: 'Reach up, roll your shoulders, and let them drop.'};
const REST: Strategy = {id: 'rest', theme: 'mindful', label: 'Sit and notice it for a minute', line: 'Stay with the feeling for a minute, nothing to do.'};
/** Per corner, in the order shown. */
export const STRATEGIES: Record<QuadrantId, readonly Strategy[]> = {
  'high-unpleasant': [BREATHE, THOUGHT, OUTSIDE],
  'low-unpleasant': [WRITE_OUT, TEXT, STRETCH],
  'high-pleasant': [SAVOUR, SHARE, GOOD],
  'low-pleasant': [REST, GOOD, SAVOUR],
};
/**
 * The choices for a word (a built-in word's corner, or `quadrant` for the person's own word): an unpleasant word's own
 * next step first (a short walk opens the walk habit), then the corner's others; at most three.
 */
export function strategiesFor(word: string, quadrant?: QuadrantId | null, walkHabitId?: string | null): Strategy[] {
  const q = quadrantOfWord(word)?.id ?? quadrant ?? null;
  if (!q) return [];
  const step = nextStepFor(word), list = [...STRATEGIES[q]];
  if (step) {
    const link = nextStepLink(step, walkHabitId), first: Strategy = {id: `step-${step}`, theme: step === 'walk' ? 'move' : step === 'breathe' ? 'mindful' : 'think', label: link.label, href: link.href, fullLoad: link.fullLoad};
    return [first, ...list.filter(s => !(step === 'breathe' && s.id === 'breathe'))].slice(0, 3);
  }
  return list.slice(0, 3);
}
