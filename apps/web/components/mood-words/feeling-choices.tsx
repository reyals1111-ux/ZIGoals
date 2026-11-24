'use client';
import Link from 'next/link';
import {habitRuleOn} from '../../lib/habits';
import {nextStepFor, quadrantOfWord, walkHabit, type QuadrantId} from '../../lib/mood-words/words';
import {strategiesFor, type Strategy} from '../../lib/mood-words/strategies';
import {useHabits} from '../habits/use-habits';
import {Suspense, lazy} from 'react';
import {LoadBoundary} from '../load-boundary';
// Session AV lane 2, round 6 (r6-body; LEDGER #412, #416): on an unpleasant word, the person's own "What lifts you" first,
// and a link to their own "On a low day" page; its own chunk.
const Lifts = lazy(() => import('../health/r6/lifts'));
// Session AV lane 2, round 6 (r6-body; LEDGER #417): the feeling word onto the list for the next visit, one tap.
const BringUpAdd = lazy(() => import('../health/r6/bring-up-add'));

/**
 * Session AV lane 2 (r4-mind; LEDGER #325, How We Feel's strategies): two or three choices for the corner of the day's
 * word, each opening a tool ZIGoals has or a one-line action — offered, never advised; nothing is counted. An unpleasant
 * word's first choice is its one small step as before (a short walk opens the person's walk habit when there is one).
 * Its own chunk, loaded with the feeling words.
 */
export default function FeelingChoices({word, quadrant, day, say}: {word: string; quadrant: QuadrantId | null; /** Session AV lane 2, round 6 (LEDGER #417): the check-in's day. */ day?: string; /** Session AV lane 2 (fix2011): the feeling words' one status line; What lifts you and Bring this up speak through it. */ say?: (text: string) => void}) {
  const q = quadrantOfWord(word)?.id ?? quadrant, unpleasant = !!q && q.endsWith('unpleasant');
  return <>
    {unpleasant && <LoadBoundary quiet><Suspense fallback={null}><Lifts lowDay say={say}/></Suspense></LoadBoundary>}
    {nextStepFor(word) === 'walk' ? <WithWalk word={word} quadrant={quadrant}/> : <Choices list={strategiesFor(word, quadrant)} word={word}/>}
    {day && <p className="mood-words-bring-up"><LoadBoundary quiet><Suspense fallback={null}><BringUpAdd text={`Felt ${word}`} from="checkin" day={day} className="text-link" say={say}/></Suspense></LoadBoundary></p>}
  </>;
}
function WithWalk({word, quadrant}: {word: string; quadrant: QuadrantId | null}) {
  const habits = useHabits();
  const walk = habits.loaded && !habits.error ? walkHabit(habits.data.habits.filter(h => habitRuleOn(h, habits.today)?.state !== 'archived')) : undefined;
  return <Choices list={strategiesFor(word, quadrant, walk?.id ?? null)} word={word}/>;
}
function Choices({list, word}: {list: readonly Strategy[]; word: string}) {
  if (!list.length) return null;
  return <div className="mood-words-step mood-words-choices" role="group" aria-label={`If you like, for “${word}”`}>
    <p className="fine">If you like, one of these:</p>
    <ul>{list.map(s => <li key={s.id}>
      {s.href ? (s.fullLoad || s.href.startsWith('/app/journal#') ? <a className="secondary" href={s.href}>{s.label}</a> /* a full load on purpose: Health's camera and Bluetooth policy applies to its own document; a #part opens its fold (hashchange) */ : <Link className="secondary" href={s.href}>{s.label}</Link>)
        : <p className="mood-words-choice-line"><strong>{s.label}</strong> <span className="fine">{s.line}</span></p>}
    </li>)}</ul>
  </div>;
}
