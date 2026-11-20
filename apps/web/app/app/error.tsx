'use client';
import Link from 'next/link';
import {useEffect} from 'react';
import {isStaleCodeError, recoverFromStaleCode} from '../../lib/sw/update-recovery';

/**
 * Session X Part 14 (J154): when a page under /app fails while drawing, say so calmly and offer a way on. Without this
 * the framework's own fallback writes raw HTML, which the app's Trusted Types policy refuses, and the page went blank.
 * Nothing is sent anywhere; the error's details stay in the browser.
 */
export default function AppError({error, retry}: {error: Error & {digest?: string}; retry: () => void}) {
  // Session AV Part 2 ([TIER 3] (PWA), D-PWA): code of the previous version that a deploy removed reloads the page once into
  // the newest version (lib/sw/update-recovery.ts); this screen shows only until then, or when the person is busy.
  useEffect(() => { if (isStaleCodeError(error)) void recoverFromStaleCode(window, process.env.NEXT_PUBLIC_APP_COMMIT ?? ''); }, [error]);
  return <section className="panel empty-state app-error" role="alert" aria-labelledby="app-error-title">
    <h1 id="app-error-title">This page could not be shown.</h1>
    <p>Something went wrong while drawing it. Nothing was changed or lost: your records stay on this device.</p>
    <div className="actions"><button type="button" className="primary" onClick={() => retry()}>Try again</button><Link className="secondary" href="/app">Go to Today</Link></div>
  </section>;
}
