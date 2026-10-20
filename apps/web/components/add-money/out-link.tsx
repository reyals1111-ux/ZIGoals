import Link from 'next/link';
import {useId, type ReactNode} from 'react';
import {VerifiedLink} from '../links/verified-link';
import '../links/verified-link.css';
import {l2bLink, type L2bLinkId} from '../../lib/wallets/links';
import {formatDate} from '../../lib/visual-format';
import type {GuideLink} from '../../lib/onramps/next-steps';
import type {VerifiedKind, VerifiedProvider} from '@zigoals/ecosystem-registry/verified-links';

/**
 * Session AF (L2b, Part 4, ADR-028 H25, H34, H52): every outgoing link of Add money. A registry link is the registry's own
 * `VerifiedLink`; a lane row (lib/wallets/links.ts, waiting to join the registry) is drawn with the same mark and the same
 * rules: the URL from the list only, a new tab, `rel="noopener noreferrer"`, never framed, never a script-opened window. A
 * provider hand-off (`href` built from public parameters, lib/onramps/urls.ts) uses the same anchor with its own row's mark.
 */
export function LaneLink({id, href, children, className = ''}: {id: L2bLinkId; href?: string; children: ReactNode; className?: string}) {
  const row = l2bLink(id), mark = `vl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const url = href ?? row.url;
  if (!url.startsWith(row.url) && !(id === 'banxa-site' && /^https:\/\/[a-z0-9-]{2,40}\.banxa\.com\/\?/.test(url))) throw Error(`Not a link of ${id}.`);
  const day = formatDate(`${row.checkedAt}T12:00:00Z`, {timeZone: 'UTC'}), from = new URL(row.source).hostname;
  const detail = row.check === 'ok' ? `ZIGoals opened this address on ${day}. It opens the site’s own page in a new tab.` : `This site turns away automated checks, so ZIGoals took the address from ${from} on ${day}. It opens the site’s own page in a new tab.`;
  return <span className="verified-link" data-mark="full">
    <a className={className || undefined} href={url} target="_blank" rel="noopener noreferrer" aria-describedby={mark} data-lane-link={id}>{children}<span aria-hidden="true" className="verified-link-arrow">↗</span></a>
    <small className="verified-mark" id={mark} title={detail} data-check={row.check}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 1.5 13.5 3.6v4.1c0 3.2-2.2 5.6-5.5 6.8-3.3-1.2-5.5-3.6-5.5-6.8V3.6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="m5.4 8.1 1.8 1.8 3.5-3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <span>verified link · {day}</span><span className="sr-only">. {detail}</span>
    </small>
  </span>;
}
export function GuideLinkOut({link, className = 'secondary'}: {link: GuideLink; className?: string}) {
  if (link.source === 'app') return <Link className={className} href={link.href}>{link.label} →</Link>;
  if (link.source === 'l2b') return <LaneLink id={link.id} className={className}>{link.label}</LaneLink>;
  return <VerifiedLink provider={link.provider} kind={link.kind as VerifiedKind<VerifiedProvider>} className={className}>{link.label}</VerifiedLink>;
}
