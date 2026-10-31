'use client';
import {Suspense, lazy, useDeferredValue} from 'react';
import {GUARD_MIN_CHARS} from '../../lib/secret-guard/min';
import {LoadBoundary} from '../load-boundary';

// The detector and the line load only once a field holds text long enough to contain a secret.
const SecretGuardNote = lazy(() => import('./secret-guard-note'));

/**
 * Session AK (BUILD list 2 #1): one calm line under a free-text field while its words look like recovery words or a
 * private key. `onRemove` empties the field ("Remove it"). For a note the person may still save (the line says so);
 * `chat` is ZIGi's box, which never sends such a message. Renders nothing for ordinary or short text.
 */
/** `leaves`: the text is sent from the device (the feedback email), so the line says so (security review F10, R1-F8). */
export function SecretGuard({text, onRemove, chat = false, leaves = false}: {text: string; onRemove?: () => void; chat?: boolean; leaves?: boolean}) {
  const deferred = useDeferredValue(text);
  if (deferred.length < GUARD_MIN_CHARS) return null;
  return <LoadBoundary quiet><Suspense fallback={null}><SecretGuardNote text={deferred} onRemove={onRemove} chat={chat} leaves={leaves}/></Suspense></LoadBoundary>;
}
