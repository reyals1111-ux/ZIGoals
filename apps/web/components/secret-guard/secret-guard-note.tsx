'use client';
import {useMemo} from 'react';
import {guardText} from '../../lib/secret-guard/guard';
import './secret-guard.css';

/** Session AK (BUILD list 2 #1): the guard's line itself, loaded on demand by `SecretGuard`. */
export default function SecretGuardNote({text, onRemove, chat = false, leaves = false}: {text: string; onRemove?: () => void; chat?: boolean; leaves?: boolean}) {
  const found = useMemo(() => guardText(text), [text]);
  if (!found) return null;
  return <div className="secret-guard" role="status" data-kind={found.kind}>
    <p>{found.line} {chat ? 'ZIGi will not send this message.' : leaves ? 'This would go in your email. Remove it before sending.' : 'You can still save it; it stays on this device.'}</p>
    {onRemove && <button type="button" className="secondary" onClick={onRemove}>Remove it</button>}
  </div>;
}
