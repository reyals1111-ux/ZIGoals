'use client';
import {useEffect, useRef, type ReactNode} from 'react';

/**
 * A Help question that a link can open: `/app/help#help-<id>` reveals it (the details opens, the summary takes focus)
 * on arrival and on every hash change, so the "What's new" card and the feature panels can point at one answer.
 * Reads nothing, writes nothing; without a matching hash it is the same closed details as the other questions.
 */
export function HelpQuestion({id, question, children}: {id: string; question: string; children: ReactNode}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const reveal = () => { const details = ref.current; if (!details || window.location.hash !== `#${details.id}`) return; details.open = true; details.querySelector('summary')?.focus({preventScroll: true}); details.scrollIntoView({block: 'start'}); };
    reveal(); window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);
  return <details ref={ref} id={`help-${id}`} className="help-question"><summary>{question}</summary><div>{children}</div></details>;
}
