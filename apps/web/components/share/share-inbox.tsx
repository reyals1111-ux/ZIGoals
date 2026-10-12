'use client';
import Link from 'next/link';
import {askZigi, launcherShown} from '../ai/ask';
import {openSearch} from '../search/search-trigger';
import {SectionHeading} from '../ui/section-heading';
import './share.css';

/**
 * What another app shared with ZIGoals (Session AA-Cloud Part 7, the manifest's `share_target`, GET): a title, text or a
 * link, shown here and nowhere else. Nothing is saved and nothing is fetched (the link is never opened by the app) until
 * the person picks what to do with it: ask ZIGi about it (fills ZIGi's composer only), make it a goal (the wizard opens
 * with the name filled in), or search ZIGoals for it. Files and images are not accepted (ADR-021 A34).
 */
const clip = (s: string | undefined, n: number) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
export function ShareInbox({title, text, url}: {title?: string; text?: string; url?: string}) {
  const t = clip(title, 200), body = clip(text, 2000), link = /^https?:\/\/\S+$/i.test(url?.trim() ?? '') ? url!.trim().slice(0, 2000) : '';
  const words = [t, body, link].filter(Boolean).join(' · '), name = (t || body || link).slice(0, 100);
  const zigi = typeof document !== 'undefined' && launcherShown();
  if (!words) return <section className="panel share-inbox aa-empty"><h2>Nothing was shared.</h2><p>Share a title, some text or a link from another app to bring it here.</p><Link className="primary" href="/app">Go to Today</Link></section>;
  return <section className="panel share-inbox" aria-labelledby="share-title">
    <SectionHeading id="share-title" eyebrow="Shared with ZIGoals" title="What would you like to do with it?" lede="It stays on this page: nothing is saved or opened until you choose." />
    <blockquote className="share-card">
      {t && <strong>{t}</strong>}
      {body && <p>{body}</p>}
      {link && <p className="share-link"><a href={link} rel="noopener noreferrer nofollow" target="_blank">{link}</a></p>}
    </blockquote>
    <div className="share-actions">
      <button type="button" className="primary" disabled={!zigi} onClick={() => askZigi(`About this: ${words}`)}>Ask ZIGi about it</button>
      <Link className="secondary" href={`/app/goals/new?${new URLSearchParams({from: 'share', name})}`}>Make it a goal</Link>
      <button type="button" className="secondary" onClick={() => openSearch(name.slice(0, 80))}>Search ZIGoals for it</button>
      <Link className="quiet" href="/app">Done</Link>
    </div>
    {!zigi && <p className="fine">ZIGi is off or hidden. Turn it on in Settings → ZIGi to ask about what you shared.</p>}
  </section>;
}
