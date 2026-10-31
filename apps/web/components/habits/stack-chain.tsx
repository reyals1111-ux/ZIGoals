'use client';
import {stackSentence, stackSteps} from '../../lib/habit-intentions/intentions';
import type {HabitExtras} from '../../lib/habits-extras/schema';
import './stack-chain.css';

/**
 * Session AK (F5b): a habit stack shown in order on one line, "After I pour coffee → 2 min stretch → Read": the first
 * habit's own "when" (its implementation intention, a cue that is not a habit) and then each habit of the chain. A screen
 * reader hears one sentence; the arrows are decoration. Display only.
 */
export function StackChain({chain, extras}: {chain: readonly {id: string; title: string}[]; extras: HabitExtras | null}) {
  const {cue, steps} = stackSteps(chain, extras);
  if (steps.length < 2 && !cue) return null;
  return <p className="habit-stack-sentence" role="img" aria-label={stackSentence(chain, extras)}>
    {cue && <span className="habit-stack-cue" aria-hidden="true">{cue}</span>}
    {steps.map((s, i) => <span key={s.id} aria-hidden="true">{(i > 0 || cue) && <span className="habit-stack-arrow"> → </span>}<span className="habit-stack-step">{s.title}</span></span>)}
  </p>;
}
