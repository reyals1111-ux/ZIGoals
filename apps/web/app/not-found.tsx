import Link from 'next/link';
import type {Metadata} from 'next';
import {LogoMark} from '../components/brand-mark';

export const metadata: Metadata = {title: 'Page not found'};
/**
 * Session AH (SE12; D-248, M-005, M-032, N-138): an address outside /app with no page. The same calm words as the app's
 * own not-found page, with the ZIGoals mark and the ways back (it had been the framework's bare white page).
 */
export default function NotFound() {
  return <main id="main" className="site-not-found">
    <section className="panel empty-state app-not-found" aria-labelledby="site-not-found-title">
      <p className="site-not-found-mark" aria-hidden="true"><LogoMark /></p>
      <h1 id="site-not-found-title">Page not found.</h1>
      <p>There is no page at this address in ZIGoals. Nothing was changed: your records are where you left them.</p>
      <div className="actions"><Link className="primary" href="/app">Open ZIGoals</Link><Link className="secondary" href="/">Home page</Link><Link className="secondary" href="/app/help">Help</Link></div>
    </section>
  </main>;
}
