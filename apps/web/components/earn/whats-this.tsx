'use client';
import {useId, useState} from 'react';
import {PLAIN_ASK, type PlainTerm} from '../../lib/earn/plain-words';
import './whats-this.css';

/**
 * Session AF (L1c, non-negotiable N1): a word's plain explanation, one tap away. A button with `aria-expanded` asks the
 * question ("What’s a validator?"); its answer opens inline, right after it, in the words of the Earn glossary
 * (lib/ai/earn/glossary.ts, English), which loads on the first tap so no page carries the definitions until someone asks.
 * Placed once per section, where the word first appears, at the end of that sentence or fact (never inside it). A
 * 44 px target, 14 px and larger, a native button for the keyboard (Enter and Space), and nothing moves: no transition,
 * no animation, the same under reduced motion and Motion Off. It reads nothing and sends nothing.
 */
type Glossary = typeof import('../../lib/ai/earn/glossary');
let glossary: Promise<Glossary> | null = null;
const loadGlossary = () => glossary ??= import('../../lib/ai/earn/glossary').catch(error => { glossary = null; throw error; });
export function WhatsThis({term}: {term: PlainTerm}) {
  const [open, setOpen] = useState(false), [text, setText] = useState<string | null>(null), [failed, setFailed] = useState(false);
  const id = `wt${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next || text !== null) return;
    setFailed(false);
    loadGlossary().then(({GLOSSARY}) => { const words = GLOSSARY.find(t => t.id === term)?.text.en; if (words) setText(words); else setFailed(true); }).catch(() => setFailed(true));
  };
  return <>
    <button type="button" className="whats-this" aria-expanded={open} aria-controls={id} data-whats-this={term} onClick={toggle}>{PLAIN_ASK[term]}</button>
    <span id={id} className="whats-this-def" data-term={term} hidden={!open} aria-live="polite">
      {open ? text ?? (failed ? 'The plain words could not load just now. Close this and try again.' : 'Reading the plain words…') : null}
    </span>
  </>;
}
