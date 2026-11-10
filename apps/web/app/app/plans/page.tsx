import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHeader} from '../../../components/page-header';
import {PLAN_PLACEHOLDER_LINE} from '../../../lib/entitlements';
import '../../../components/plans/plans.css';

export const metadata: Metadata = {title: 'Plans'};

/**
 * Session AL Part 12 (owner decision O2): the placeholder Plans page. Two one-time prices in euros, what each includes
 * (only what this build has), and the Alpha's truth: everything is free and ZIGoals charges nothing. No buy button, no
 * payment code, no checkout, no account. A server page with no script of its own; the landing page does not link here.
 */
const BASE = [
  'Today, with Goals, Habits, Health and Wealth: the four areas of your life on one page',
  'The Checklist, Tasks, Notes, the Journal and the Agenda',
  'NOVA, your whole life on one screen',
  'Markets you follow, your Portfolio and Earn, when you switch them on',
  'Journey: XP, quests and badges, when you turn Gamify on',
  'Music: focus sounds, or your own Spotify or Apple Music',
  'Nebula, Light and Dark themes, and your own pages and buttons',
  'Backups, export and restore: your records stay on your device first',
];
const PREMIUM = [
  'Everything in ZIGoals',
  'ZIGi · Your Personal AI Companion',
  'NOVA’s premium features',
  'You still bring your own AI: an API key, a model on your own computer, or the AI app you already use. Your AI provider bills you for it, never ZIGoals.',
];
function Plan({name, price, items, note}: {name: string; price: string; items: readonly string[]; note: string}) {
  const id = `plan-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return <section className="plan-card panel" aria-labelledby={id}>
    <h2 id={id}>{name}</h2>
    <p className="plan-price"><strong>{price}</strong> <span>one-time · placeholder</span></p>
    <p className="plan-note">{note}</p>
    <ul className="plan-includes">{items.map(item => <li key={item}>{item}</li>)}</ul>
    <p className="plan-free"><strong>Free during the Alpha</strong></p>
  </section>;
}
export default function Page() {
  return <div className="dashboard plans-route">
    <PageHeader className="page-heading" titleId="plans-title" eyebrow="ZIGoals · Plans" title="Plans" lede="Everything is free during the Alpha. These are the prices ZIGoals plans to ask later, shown now so you know what to expect."/>
    <p className="plans-placeholder" role="note">{PLAN_PLACEHOLDER_LINE}</p>
    <div className="plans-grid">
      <Plan name="ZIGoals" price="€20" note="Pay once, keep it. No subscription." items={BASE}/>
      <Plan name="ZIGoals Premium" price="€50" note="Pay once, keep it. No subscription. Everything in ZIGoals, plus your AI companion." items={PREMIUM}/>
    </div>
    <section className="panel plans-facts" aria-labelledby="plans-facts-title">
      <h2 id="plans-facts-title">During the Alpha</h2>
      <ul>
        <li>Everything is free during the Alpha, Premium included. ZIGoals bills nothing: there is no checkout, no card to enter and no account to make.</li>
        <li>When paid plans begin is not decided yet. The prices above are placeholders and may change.</li>
        {/* Session AL (N-MO-02): nothing in docs/ decides what Alpha users keep later, so the page says so, and promises nothing. */}
        <li>Whether people who used the Alpha keep any features once paid plans begin is not decided yet either.</li>
        <li>Prices are shown in euros only; ZIGoals never invents a conversion.</li>
        <li>“Spotify Premium” in Music is Spotify’s own plan, not ZIGoals Premium.</li>
      </ul>
      <p className="plans-links"><Link className="text-link" href="/app/settings">Back to Settings</Link> · <Link className="text-link" href="/app/help">Help</Link></p>
    </section>
  </div>;
}
