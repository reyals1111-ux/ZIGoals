'use client';
import Link from 'next/link';
import {useState} from 'react';

export type WhatsNewLink = {href: string; label: string};
/** Session X-Local (release `2026-10-session-x`): ZIGi comes alive; each link opens its Help answer. */
export const WHATS_NEW_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-your-ai-alive', label: 'ZIGi comes alive: the real art, idle, emotions'},
  {href: '/app/help#help-your-ai-act', label: 'ZIGi creates anything: stacks, edits, the mood, links, widgets'},
  {href: '/app/help#help-your-ai-auto', label: 'Auto-accept: cards added for you, with Undo'},
];
/** Session W (release `2026-10-session-w`), folded under "Earlier updates" with Session V's. */
const SESSION_W_LINKS: WhatsNewLink[] = [
  {href: '/app/help#help-w-pages', label: 'Hide pages and buttons'},
  {href: '/app/help#help-w-sleep', label: 'Sleep and sleep debt'},
  {href: '/app/help#help-w-meditation', label: 'Meditation and breathing'},
  {href: '/app/help#help-w-music', label: 'Focus sounds and music'},
  {href: '/app/help#help-w-import', label: 'Bring data from other apps'},
  {href: '/app/help#help-w-devices', label: 'Heart-rate monitors, scales'},
  {href: '/app/help#help-w-habits', label: 'Habit challenges and stacks'},
  {href: '/app/help#help-w-goals', label: 'Milestones and “On track?”'},
  {href: '/app/help#help-w-wealth', label: 'Accounts, debts, net worth'},
  {href: '/app/help#help-w-chess', label: 'Chess: chess.com, Lichess'},
  {href: '/app/help#help-w-links', label: 'My links on Today'},
];
/** The previous release's links (Session V), folded under "Earlier updates". */
export const EARLIER_LINKS: WhatsNewLink[] = [
  ...SESSION_W_LINKS,
  {href: '/app/help#help-auto-checkins', label: 'Habits that tick themselves off from Health'},
  {href: '/app/help#help-health-goals', label: 'Health goals'},
  {href: '/app/help#help-skips', label: 'Planned skips and vacation days'},
  {href: '/app/help#help-weekly-review', label: 'A weekly review'},
  {href: '/app/help#help-fasting', label: 'A fasting timer'},
  {href: '/app/help#help-insights', label: 'Things you might notice'},
  {href: '/app/help#help-imports', label: 'Import a CSV'},
  {href: '/app/help#help-export-everything', label: 'Export everything (optional)'},
  {href: '/app/help#help-quick-add', label: 'Type a line into Quick add'},
  {href: '/app/help#help-push-reminders', label: 'Reminders when ZIGoals is closed'},
  {href: '/app/help#help-guide', label: 'The Guide, on this device'},
  {href: '/app/help#help-your-ai-what', label: 'ZIGi · your AI (Premium, free during Alpha)'},
  {href: '/app/help#help-your-ai-data', label: 'Ask ZIGi about your records, and more from ZIGi'},
];
/**
 * The one-time "What's new" card (Session P): links to the Help entries of the new features, the previous release's under
 * "Earlier updates"; "Got it" writes the device flag.
 */
export function WhatsNewCard({links = WHATS_NEW_LINKS, earlier = EARLIER_LINKS, onDismiss}: {links?: WhatsNewLink[]; earlier?: WhatsNewLink[]; onDismiss: () => boolean}) {
  const [error, setError] = useState('');
  return <section className="panel for-you-card whats-new-card" aria-labelledby="whats-new-title">
    <p className="eyebrow">What’s new</p><h2 id="whats-new-title">A few new things.</h2>
    <p className="fine">Each one is optional, and nothing changes until you use it.</p>
    <ul className="whats-new-links">{links.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
    {earlier.length > 0 && <details className="whats-new-earlier"><summary>Earlier updates</summary><ul className="whats-new-links">{earlier.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul></details>}
    <button type="button" className="primary" onClick={() => { if (!onDismiss()) setError('This card could not be hidden on this device; it may show once more.'); }}>Got it</button>
    {error && <p role="alert">{error}</p>}
  </section>;
}
