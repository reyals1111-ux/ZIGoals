'use client';
import Link from 'next/link';

/**
 * Session X Part 14 (J154): when a page under /app fails while drawing, say so calmly and offer a way on. Without this
 * the framework's own fallback writes raw HTML, which the app's Trusted Types policy refuses, and the page went blank.
 * Nothing is sent anywhere; the error's details stay in the browser.
 */
export default function AppError({retry}: {error: Error & {digest?: string}; retry: () => void}) {
  return <section className="panel empty-state app-error" role="alert" aria-labelledby="app-error-title">
    <h1 id="app-error-title">This page could not be shown.</h1>
    <p>Something went wrong while drawing it. Nothing was changed or lost: your records stay on this device.</p>
    <div className="actions"><button type="button" className="primary" onClick={() => retry()}>Try again</button><Link className="secondary" href="/app">Go to Today</Link></div>
  </section>;
}
