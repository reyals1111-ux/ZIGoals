'use client';
import Link from 'next/link';
import {useState} from 'react';

export type WhatsNewLink = {href: string; label: string};
export const WHATS_NEW_LINKS: WhatsNewLink[] = [
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
];
/** The one-time "What's new" card (Session P): links to the Help entries of the new features; "Got it" writes the device flag. */
export function WhatsNewCard({links = WHATS_NEW_LINKS, onDismiss}: {links?: WhatsNewLink[]; onDismiss: () => boolean}) {
  const [error, setError] = useState('');
  return <section className="panel for-you-card whats-new-card" aria-labelledby="whats-new-title">
    <p className="eyebrow">What’s new</p><h2 id="whats-new-title">A few new things.</h2>
    <p className="fine">All of this stays on this device, and nothing happens unless you use it.</p>
    <ul className="whats-new-links">{links.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>
    <button type="button" className="primary" onClick={() => { if (!onDismiss()) setError('This card could not be hidden on this device; it may show once more.'); }}>Got it</button>
    {error && <p role="alert">{error}</p>}
  </section>;
}
