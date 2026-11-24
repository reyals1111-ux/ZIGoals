import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';

/**
 * Review B6P-8 (Session AV lane 2, r6-body): round 6's lazy parts sit in `<LoadBoundary quiet>` as their siblings do
 * (sleep-card, sleep-view), so a chunk that cannot load (offline, a stale cache) is left out instead of taking the
 * Meditation view, an exercise's detail, a check-in's choices or a journal entry's More down with it.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');
const PARTS: [file: string, lazyParts: string[], uses: number][] = [
  ['components/health/meditation/meditation-view.tsx', ['CalmR6', 'MedParts'], 4],
  ['components/health/workouts/exercise-library.tsx', ['ExerciseOwn'], 1],
  ['components/mood-words/feeling-choices.tsx', ['Lifts', 'BringUpAdd'], 2],
  ['components/journal/entry-more.tsx', ['BringUpAdd'], 1],
];
describe('B6P-8: round 6 lazy parts keep a failed load to themselves', () => {
  for (const [file, names, uses] of PARTS) test(file, () => {
    const source = read(file);
    const all = [...source.matchAll(new RegExp(`<Suspense fallback=\\{[^}]*\\}><(${names.join('|')})\\b`, 'g'))];
    expect(all).toHaveLength(uses);
    for (const m of all) expect(source.slice(Math.max(0, m.index - '<LoadBoundary quiet>'.length), m.index), `${m[1]} in ${file}`).toBe('<LoadBoundary quiet>');
  });
});
