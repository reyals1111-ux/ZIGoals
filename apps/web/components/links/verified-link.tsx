import {useId, type MouseEventHandler, type ReactNode} from 'react';
import {verifiedLink, type VerifiedKind, type VerifiedProvider} from '@zigoals/ecosystem-registry/verified-links';
import {formatDate} from '../../lib/visual-format';
import './verified-link.css';

/**
 * Session AF (ADR-028 H25, H34, H94; `TIER 3 (public-safety labels)`): the one way the Earn pages link out. The URL comes
 * only from the verified link registry (a provider and a kind, both checked at compile time), never from props, chain
 * data or a page. It opens the site's own page in a new tab with `rel="noopener noreferrer"` (never framed, never
 * `window.open`), and carries the mark "verified link · <date>": the day ZIGoals read it. A site that turns automated
 * checks away says so in the mark's description, with the official page the address came from.
 */
export function VerifiedLink<P extends VerifiedProvider>({provider, kind, children, className = '', mark = 'full', onOpen}: {
  provider: P; kind: VerifiedKind<P>; children: ReactNode; className?: string;
  /** 'full' writes "verified link · <date>" after the link; 'compact' keeps the shield and says the words to screen readers only. */
  mark?: 'full' | 'compact';
  /** Guide mode: called as the new tab opens (the click is never prevented). */
  onOpen?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const link = verifiedLink(provider, kind), id = `vl${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const day = formatDate(`${link.checkedAt}T12:00:00Z`, {timeZone: 'UTC'}), from = new URL(link.source).hostname;
  const detail = link.check === 'ok'
    ? `ZIGoals opened this address on ${day}. It opens the site's own page in a new tab.`
    : `This site turns away automated checks, so ZIGoals took the address from ${from} on ${day}. It opens the site's own page in a new tab.`;
  return <span className={`verified-link ${className}`.trim()} data-mark={mark}>
    <a href={link.url} target="_blank" rel="noopener noreferrer" aria-describedby={id} data-verified-link={`${provider}:${String(kind)}`} onClick={onOpen}>
      {children}<span aria-hidden="true" className="verified-link-arrow">↗</span>
    </a>
    <small className="verified-mark" id={id} title={detail} data-check={link.check}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 1.5 13.5 3.6v4.1c0 3.2-2.2 5.6-5.5 6.8-3.3-1.2-5.5-3.6-5.5-6.8V3.6z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="m5.4 8.1 1.8 1.8 3.5-3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <span className={mark === 'compact' ? 'sr-only' : undefined}>verified link · {day}</span>
      <span className="sr-only">. {detail}</span>
    </small>
  </span>;
}
