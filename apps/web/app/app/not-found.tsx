import Link from 'next/link';
import {ThemeRestore} from '../../components/theme-restore';

/** Session AL (3g): the places people most often mean, so a mistyped address is one tap from where they wanted to go. */
const PLACES: readonly (readonly [string, string])[] = [['/app/goals', 'Goals'], ['/app/habits', 'Habits'], ['/app/health', 'Health'], ['/app/wealth', 'Wealth'], ['/app/tasks', 'Tasks'], ['/app/settings', 'Settings']];

/** Session X Part 14 (J254): an address under /app with no page. Calm, with the way back; nothing was changed. The tab's
 *  title comes from the catch-all page beside it ([...missing]/page.tsx). Session AL (3g): in the page header's pattern
 *  (eyebrow, title, lede), with the main pages as links and search named, in every theme. */
export default function NotFound() {
  return <section className="panel empty-state app-not-found" aria-labelledby="app-not-found-title">
    <p className="eyebrow">404 · No page here</p>
    <h1 id="app-not-found-title">Page not found.</h1>
    <p>There is no page at this address in ZIGoals. Nothing was changed: your records are where you left them.</p>
    <div className="actions"><Link className="primary" href="/app">Go to Today</Link><Link className="secondary" href="/app/help">Open Help</Link></div>
    <nav className="app-not-found-places" aria-label="Pages you may have meant">
      <p>Or go straight to:</p>
      <ul>{PLACES.map(([href, label]) => <li key={href}><Link className="text-link" href={href} prefetch={false}>{label}</Link></li>)}</ul>
      <p>Looking for something else? Search finds every page: the magnifier at the top, or press / on a keyboard.</p>
    </nav>
    {/* Session AK P6: this page comes from the error shell, without the theme's early script; the person's theme comes back here. */}
    <ThemeRestore/>
  </section>;
}
