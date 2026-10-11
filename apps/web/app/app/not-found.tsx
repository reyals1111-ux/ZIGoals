import Link from 'next/link';

/** Session X Part 14 (J254): an address under /app with no page. Calm, with the way back; nothing was changed. The tab's
 *  title comes from the catch-all page beside it ([...missing]/page.tsx). */
export default function NotFound() {
  return <section className="panel empty-state app-not-found" aria-labelledby="app-not-found-title">
    <h1 id="app-not-found-title">Page not found.</h1>
    <p>There is no page at this address in ZIGoals. Nothing was changed: your records are where you left them.</p>
    <div className="actions"><Link className="primary" href="/app">Go to Today</Link><Link className="secondary" href="/app/help">Open Help</Link></div>
  </section>;
}
