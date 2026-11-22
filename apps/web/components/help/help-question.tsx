'use client';
import {useContext, useEffect, useRef, type ReactNode} from 'react';
import Link from 'next/link';
import {ChainNoteContext} from './chain-note-context';
import {CHAIN_HELP_SETTINGS_HREF} from '../../lib/help/chain-help';

/**
 * A Help question that a link can open: `/app/help#help-<id>` reveals it (the details opens, the summary takes focus)
 * on arrival and on every hash change, so the "What's new" card and the feature panels can point at one answer.
 * Reads nothing, writes nothing; without a matching hash it is the same closed details as the other questions.
 * Session AV lane 2 (PK-10): a chain answer that a link opened before the chain was chosen (components/help/chain-help.tsx)
 * starts with the note on how to choose it (lib/help/chain-help.ts CHAIN_HELP_NOTE, word for word).
 */
export function HelpQuestion({id, question, children}: {id: string; question: string; children: ReactNode}) {
  const ref = useRef<HTMLDetailsElement>(null), chainNote = useContext(ChainNoteContext);
  useEffect(() => {
    const reveal = () => { const details = ref.current; if (!details || window.location.hash !== `#${details.id}`) return; details.open = true; details.querySelector('summary')?.focus({preventScroll: true}); details.scrollIntoView({block: 'start'}); };
    reveal(); window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);
  return <details ref={ref} id={`help-${id}`} className="help-question"><summary>{question}</summary><div>{chainNote && <p className="help-chain-note">This answer is about the money and chain pages. Switch one on in <Link className="text-link" href={CHAIN_HELP_SETTINGS_HREF}>Settings → Your pages &amp; buttons</Link> to see these topics in Help.</p>}{children}</div></details>;
}
