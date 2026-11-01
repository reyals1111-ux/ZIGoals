'use client';
import {useEffect, useState} from 'react';
import {guardText, mayHoldSecret} from '../../lib/secret-guard/guard';
import {wordListNeeds} from '../../lib/emergency-sheet/secrets';
import {loadWordLists} from '../../lib/secret-guard/word-lists';
import './secret-guard.css';

/**
 * Session AK (BUILD list 2 #1): the guard's line itself, loaded on demand by `SecretGuard`.
 * Session AK (FU; G7 follow-up, security review F10): when the text needs a word list that is not here yet, the line is
 * read again once that list arrives, so a pasted everyday list loses its cautious warning without another keystroke (and
 * recovery words in a newly loaded script gain theirs). The answer is computed on each render, so it always matches the
 * lists loaded now.
 */
export default function SecretGuardNote({text, onRemove, chat = false, leaves = false}: {text: string; onRemove?: () => void; chat?: boolean; leaves?: boolean}) {
  const [, setLists] = useState(0);
  useEffect(() => {
    const needs = mayHoldSecret(text) ? wordListNeeds(text) : [];
    if (!needs.length) return;
    let on = true;
    void loadWordLists(needs).then(() => { if (on) setLists(n => n + 1); });
    return () => { on = false; };
  }, [text]);
  const found = guardText(text);
  if (!found) return null;
  return <div className="secret-guard" role="status" data-kind={found.kind}>
    <p>{found.line} {chat ? 'ZIGi will not send this message.' : leaves ? 'This would go in your email. Remove it before sending.' : 'You can still save it; it stays on this device.'}</p>
    {onRemove && <button type="button" className="secondary" onClick={onRemove}>Remove it</button>}
  </div>;
}
