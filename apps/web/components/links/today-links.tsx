import Link from 'next/link';
import type {LayoutAttrs} from '../layout-edit';
import {LinkGlyph} from './link-glyph';
import type {PersonalLink} from '../../lib/links/schema';
import './links.css';

/**
 * My links on Today (Session W Part 19): a button per link, in the person's order, opening in a new tab with no opener and
 * no referrer; ZIGoals adds nothing to the address. On a phone the card is a folded row ("My links").
 */
export function TodayLinks({links, ...layout}: LayoutAttrs & {links: readonly PersonalLink[]}) {
  return <section {...layout} className="panel today-links" aria-labelledby="today-links-title">
    <header className="today-links-head"><h2 id="today-links-title">My links</h2><Link className="text-link" href="/app/settings#links">Edit</Link></header>
    <ul className="today-links-list">{links.map(link => <li key={link.id}><a href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><LinkGlyph icon={link.icon} label={link.label} /><span>{link.label}</span><span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul>
  </section>;
}
