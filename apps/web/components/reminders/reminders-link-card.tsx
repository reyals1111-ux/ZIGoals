'use client';
import Link from 'next/link';

/**
 * The "Reminders" link for Settings (AA-Cloud's `settings:reminders` place, right under the push reminders panel):
 * one line to the reminders plan page. Registered by `components/game/register.ts`; renders nothing anywhere else.
 */
export function RemindersLinkCard() {
  return <p className="fine reminders-link-card"><Link className="text-link" href="/app/settings/reminders">Reminders: every type, quiet hours and what shows on Today →</Link></p>;
}
