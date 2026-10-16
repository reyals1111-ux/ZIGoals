'use client';
import {useEffect, useId, useState} from 'react';
import {getAppStorage} from '../../lib/showcase-storage';
import {localDatabase} from '../../lib/vault/local';
import {SyncJournal, type Domain} from '../../lib/vault/cloud-sync';
import {portfolioSyncChosen} from '../../lib/vault/portfolio-sync';
import {SYNC_WRITES} from '../../lib/vault/sync-writes';
import {HEALTH_STAYS_LOCAL, SECTION_TIMES_NOTE, pendingBySection, sectionRows} from '../../lib/vault/section-status';
import type {ExtrasStatus, SectionSync} from '../vault-sync-controls';
import type {PortfolioStatus} from '../portfolio-sync-choice';
import {readExtrasChoiceNow} from './extras-sync-choice';
import './section-status.css';

type Props = {account: string; busy: boolean; error: string; health: boolean; sections: Partial<Record<Domain, SectionSync>>; extras: ExtrasStatus | null; portfolio: PortfolioStatus | null; portfolioAt: string; onRetry: () => void; onRetryPortfolio: () => void};

/**
 * Session AD item 11 (ADR-026): Settings → Sync, one row per section (Goals & Wealth, Habits, Health, Today, the extras,
 * the Portfolio). Shown only while the account's vault is open; it reads what this device already holds (the changes
 * waiting in the local outbox, the sections kept here after a cloud deletion) and never syncs by itself: "Try again" runs
 * the panel's own "Sync now" (or the Portfolio's own sync). The panel's single status line stays its one live status.
 */
export function SyncSections({account, busy, error, health, sections, extras, portfolio, portfolioAt, onRetry, onRetryPortfolio}: Props) {
  const id = useId();
  const [online, setOnline] = useState(true), [pending, setPending] = useState<Partial<Record<Domain, number>>>({}), [held, setHeld] = useState<Domain[]>([]);
  useEffect(() => {
    const network = () => setOnline(navigator.onLine !== false);
    network(); window.addEventListener('online', network); window.addEventListener('offline', network);
    return () => { window.removeEventListener('online', network); window.removeEventListener('offline', network); };
  }, []);
  // What is waiting, re-read after each sync ends and shortly after an edit; a read that fails keeps the last answer.
  useEffect(() => {
    if (busy) return;
    let active = true, timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => {
      void localDatabase.pending(`account:${account}`).then(entries => { if (active) setPending(pendingBySection(entries)); }, () => {});
      void new SyncJournal(account).read().then(state => { if (active) setHeld(state.heldDomains ?? []); }, () => {});
    };
    const edited = () => { clearTimeout(timer); timer = setTimeout(read, 400); };
    read(); window.addEventListener('zigoals:private-change', edited);
    return () => { active = false; clearTimeout(timer); window.removeEventListener('zigoals:private-change', edited); };
  }, [account, busy]);
  let portfolioOn = false;
  try { portfolioOn = portfolioSyncChosen(getAppStorage()); } catch { /* the row then reads as off */ }
  const rows = sectionRows({online, busy, error, health, held, synced: sections, pending, extras, extrasOn: readExtrasChoiceNow().enabled, portfolio, portfolioAt, portfolioOn})
    .filter(r => SYNC_WRITES || (r.id !== 'extras' && r.id !== 'portfolio'));
  return <div className="sync-sections" role="group" aria-labelledby={id + 'title'}>
    <h3 id={id + 'title'}>Sync by section</h3>
    <ul className="ss-rows" role="list">{rows.map(r => <li key={r.id} data-tone={r.tone}>
      <span className="ss-what"><strong>{r.label}</strong><span>{r.text}</span>{r.notice && <span className="ss-notice">{r.notice}</span>}</span>
      {r.retry && <button type="button" className="secondary" disabled={busy} aria-label={`Try again: ${r.label}`} onClick={r.retry === 'portfolio' ? onRetryPortfolio : onRetry}>Try again</button>}
    </li>)}</ul>
    {!health && <p className="fine">{HEALTH_STAYS_LOCAL}</p>}
    <p className="fine">{SECTION_TIMES_NOTE}</p>
  </div>;
}
