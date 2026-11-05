'use client';
import {useId, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {isSafeReferenceUrl} from '@zigoals/ecosystem-registry/links';
import type {DirectoryEntry} from '@zigoals/ecosystem-registry/providers';
import {CardOptions} from './card-options';
import {AskZigiItem} from './ai/ask-zigi-item';
import {usePrivateStore} from './use-private-store';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, type DashboardWidget} from '../lib/dashboard-settings';
import {addShortcut, removeShortcut, restoreShortcut, shortcutOf} from '../lib/zigchain-eco/today-shortcut';
import {showUndo} from './ui/undo-toast';
import {plainErrorMessage} from '../lib/plain-error';
import {AppIcon} from './app-icon';
import {formatDate} from '../lib/visual-format';
import {EcosystemLiveLine} from './ecosystem-live';
import type {LiveState} from '../lib/earn/client';
import type {DefillamaData} from '../lib/earn/live/types';
import {directoryStatusOf} from '../lib/zigchain-eco/directory-status';
import type {UsedByMe} from '../lib/zigchain-eco/used-by-me';

/**
 * One Ecosystem project (Session I, Part 6). The header is a button (inside the heading, so the heading keeps the
 * project's name) that opens the project's full record in place: every field shown is the registry's own, worded as the
 * registry words it. Nothing here is invented (Session AH, CO7: the one live figure, value locked, is Earn's own DefiLlama
 * read, named with its source and time), nothing invites a transfer (no contract addresses), and a
 * listing never reads as a partnership. Several cards can be open; focus stays on the button.
 */
const VERIFICATION: Record<DirectoryEntry['provider']['verification'], string> = {
  UNCONFIRMED: 'Unconfirmed: the record has not been checked against primary sources yet.',
  PRIMARY_SOURCES_REVIEWED: 'Primary sources reviewed.',
  READ_ONLY_ROUTES_VERIFIED: 'Read-only routes verified.',
};
const KYC: Record<DirectoryEntry['provider']['eligibility']['kyc'], string> = {
  REQUIRED: 'Identity verification (KYC) is required.',
  NOT_REQUIRED_DOCUMENTED: 'Identity verification (KYC) is documented as not required.',
  PRODUCT_DEPENDENT: 'Identity verification (KYC) depends on the product.',
  UNKNOWN: 'Whether identity verification (KYC) is required is unknown.',
};
const ACTION_LABEL = {Website: 'Visit website', App: 'Open app', Docs: 'Read docs'} as const;
const external = {target: '_blank', rel: 'noopener noreferrer'} as const;

/**
 * Session AL (P-BN-57, BN-097): the ⋯ menu reads Today's widgets, so it works like a favourite: "Add … to Today" while the
 * shortcut is not there, "On Today · Remove …" once it is. Removing offers Undo, which puts the same widget back.
 */
export function EcosystemTodayOptions({id, name}: {id: string; name: string}) {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const label = `${name} research shortcut`, ready = settings.loaded && !settings.error;
  const onToday = ready ? shortcutOf(settings.data, id) : undefined;
  async function add() {
    setBusy(true); setMessage('');
    try {
      if (!ready) throw Error('Today settings need recovery in Settings.');
      const widgetId = crypto.randomUUID();
      await settings.update(latest => addShortcut(latest, id, widgetId));
      setMessage(`${label} added to Today.`);
    } catch (e) { setMessage(plainErrorMessage(e, 'Could not add this card to Today.')); } finally { setBusy(false); }
  }
  async function remove(widget: DashboardWidget) {
    setBusy(true); setMessage('');
    try {
      await settings.update(latest => removeShortcut(latest, id));
      setMessage(`${label} removed from Today.`);
      showUndo({message: `${label} removed from Today.`, undone: `${label} is back on Today.`,
        restore: () => settings.update(latest => restoreShortcut(latest, widget))});
    } catch (e) { setMessage(plainErrorMessage(e, 'Could not remove this card from Today.')); } finally { setBusy(false); }
  }
  return <div className="pin-to-today"><CardOptions label={name}>
    {onToday
      ? <button type="button" disabled={busy} onClick={() => void remove(onToday)} aria-label={`On Today. Remove ${label} from Today`}>On Today · Remove from Today</button>
      : <button type="button" disabled={busy || !ready} onClick={() => void add()} aria-label={`Add ${label} to Today`}>Add {label} to Today</button>}
    <AskZigiItem kind="ecosystem" metric="directory"/>
  </CardOptions>{message && <p role="status" className="pin-to-today-status">{message}</p>}</div>;
}

export function EcosystemCard({entry, open, onToggle, llama, used}: {entry: DirectoryEntry; open: boolean; onToggle: () => void; llama?: LiveState<DefillamaData>; used?: UsedByMe | null}) {
  const p = entry.provider, id = useId(), detailsId = `project-${entry.id}-details`, titleId = `${id}-title`;
  const documentation = p.documentation.filter(isSafeReferenceUrl).filter(url => !entry.actions.some(a => a.url === url));
  return <article className="ecosystem-project" data-category={entry.category} data-open={open || undefined} id={`project-${entry.id}`} aria-labelledby={titleId}>
    <header>
      {entry.logo.kind === 'raster' && entry.logo.path
        ? <span className="ecosystem-logo"><Image src={entry.logo.path} alt={`${entry.name} official site icon`} width={64} height={64} loading="lazy" unoptimized /></span>
        : <span className="ecosystem-initials" role="img" aria-label={`${entry.name} initials; official logo unavailable`} title={entry.logo.reason}>{entry.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('')}</span>}
      <div><p className="eyebrow">{entry.category}</p><h2 id={titleId}><button type="button" className="ecosystem-toggle" aria-expanded={open} aria-controls={detailsId} onClick={onToggle}><span>{entry.name}</span><span className="ecosystem-toggle-hint" aria-hidden="true">{open ? 'Less' : 'Details'}<AppIcon name="chevron" size={18} /></span></button></h2></div>
      <EcosystemTodayOptions id={entry.id} name={entry.name}/>
    </header>
    <p className="ecosystem-description">{entry.description}<small><a href={entry.descriptionSource} {...external}>Description source ↗</a></small></p>
    {llama && <EcosystemLiveLine id={entry.id} llama={llama}/>}
    {/* Session AL (C-BN-16, GAP-146): a project Wealth shows you use, from a holding that proves it. */}
    {used && <p className="ecosystem-used"><span className="zeco-status" data-kind="live">Used by you</span> Wealth shows you hold {used.what}{used.count > 1 ? ` (${used.count} holdings)` : ''}. <Link className="text-link" href="/app/wealth">Open Wealth →</Link></p>}
    {/* Session AK (F4): one dated status per project (live, closing, paused, not live yet…), with its source. */}
    {(() => { const status = directoryStatusOf(entry.id); return status ? <p className="ecosystem-status"><span className="zeco-status" data-kind={status.kind}>{status.label}</span> {status.detail} <small>({status.source}, read <time dateTime={status.readOn}>{formatDate(status.readOn)}</time>)</small></p> : null; })()}
    <div className="ecosystem-labels"><span>{entry.inclusion}</span><span>{p.phase === 'READ_ONLY' ? 'Read-only links' : 'Research only'}</span></div>
    <div className="ecosystem-project-actions">{entry.actions.map(action => <a key={action.kind} href={action.url} {...external}>{ACTION_LABEL[action.kind]} ↗</a>)}{!entry.actions.length && <span className="fine">No checked website link yet</span>}</div>
    <div className="ecosystem-details" id={detailsId} role="region" aria-labelledby={titleId} hidden={!open}>
      <p className="ecosystem-today"><strong>In ZIGoals today:</strong> research only — no connection to your money.</p>
      <section><h3>About</h3><p>{entry.description} <a href={entry.descriptionSource} {...external}>Description source ↗</a></p><p>{entry.inclusion}. <a href={entry.inclusionSource} {...external}>Inclusion evidence ↗</a></p></section>
      <section><h3>Evidence &amp; access</h3><p><strong>Destination:</strong> {entry.linkStatus}. Link review does not verify a live product or financial capability.</p><h4>ZIGoals capability</h4><p>{p.notes}</p></section>
      <section><h3>Verification and audits</h3><p>{VERIFICATION[p.verification]} Capability evidence last reviewed <time dateTime={p.lastVerified}>{p.lastVerified}</time>.</p>
        {p.audits.length ? <ul>{p.audits.map((a, i) => <li key={`${a.url}:${i}`}><a href={a.url} {...external}>{a.title} ↗</a><small>{a.supports}</small></li>)}</ul> : <p>No audit reference in this record.</p>}
        <p className="fine">Historical audit references do not establish the safety of current deployed code.</p></section>
      <section><h3>Eligibility and access</h3><p>{KYC[p.eligibility.kyc]}</p><p><strong>Jurisdiction:</strong> {p.eligibility.jurisdiction}</p><p>{p.eligibility.note}</p></section>
      {p.networks.length > 0 && <section><h3>Networks in the existing record</h3><ul>{p.networks.map((n, i) => <li key={i}><strong>{n.chainId}</strong> · {n.status.toLowerCase().replaceAll('_', ' ')}<br />{n.note}</li>)}</ul></section>}
      {p.risks.length > 0 && <section><h3>Unresolved risks</h3><ul>{p.risks.map(r => <li key={r}>{r}</li>)}</ul></section>}
      <section><h3>What the sources say</h3><ul>{p.sources.map((s, i) => <li key={`${s.url}:${i}`}><a href={s.url} {...external}>{s.title} ↗</a><small>{s.supports}</small></li>)}</ul></section>
      {/* The project's own links stay in the quick links above; documentation the record lists (HTTPS, no credentials) comes here. */}
      {documentation.length > 0 && <section><h3>Documentation</h3><ul className="ecosystem-links">{documentation.map(url => <li key={url}><a href={url} {...external}>{new URL(url).hostname}{new URL(url).pathname.replace(/\/$/, '')} ↗</a></li>)}</ul></section>}
      <p className="fine">Record reviewed <time dateTime={entry.reviewedAt}>{formatDate(entry.reviewedAt)}</time>. Logo: {entry.logo.reason}</p>
    </div>
  </article>;
}
