'use client';
import {useEffect, useRef, useState} from 'react';
import {useHealth} from '../use-health';
import {useJournalZone} from '../../use-journal-zone';
import {useDeviceZone} from '../../use-device-zone';
import {dailyData} from '../../../lib/health-daily';
import {getAccountScope, isAccountLocked} from '../../../lib/account-session';
import {isShowcase} from '../../../lib/showcase-storage';
import {hasTokens} from '../../../lib/links/token-store';
import {LINK_PROVIDERS, providerInfo, type LinkProvider} from '../../../lib/health-link/providers';
import {beginLink, readCallback} from '../../../lib/health-link/oauth';
import {linkConfig, type LinkConfig} from '../../../lib/health-link/client';
import {ReconnectRequired, syncLink} from '../../../lib/health-link/sync';
import {finishLink, syncedHealth, unlink} from '../../../lib/health-link/flow';
import {removeLinkedRecords} from '../../../lib/health-link/mappers';

/**
 * Health → Devices → Linked accounts (Session W Part 8). Off unless this build says NEXT_PUBLIC_HEALTH_LINK=on and the
 * owner has registered ZIGoals with a service (docs/run11/HEALTH_LINK_ACTIVATION.md): until then each service says
 * "needs setup by ZIGoals" and how to bring its data in today. When on, a service is connected with the person's
 * account open and an unticked Health box ticked; its tokens are sealed on this device; "Sync now" (and, except Strava,
 * opening this page at most once an hour) brings new records in under the same rules as an import; Disconnect removes
 * the tokens, revokes access where the service allows it, and can remove what the service brought.
 */
const BUILD_ON = process.env.NEXT_PUBLIC_HEALTH_LINK === 'on';
const SYNCED_KEY = 'zigoals:link-synced:v1';
/** The open account's id, or null (also when the account selection cannot be read). */
const scopeNow = () => { try { return getAccountScope(); } catch { return null; } };
type Row = {state: 'idle' | 'busy'; connected: boolean; message: string; error: string};
export function HealthLinks() {
  if (!BUILD_ON) return <section className="panel devices-section" aria-labelledby="devices-links-title">
    <h2 id="devices-links-title">Linked accounts</h2>
    <p>These services need ZIGoals to be registered with them, with a secret only ZIGoals&apos; own server may hold. That is not set up yet, so nothing connects.</p>
    <ul className="devices-platforms">{LINK_PROVIDERS.map(p => <li key={p.id}><strong>{p.label}</strong> <span className="devices-state">Needs setup by ZIGoals</span><p>Would bring: {p.brings}</p><p className="fine">{p.limits} Today: {p.instead}</p></li>)}</ul>
  </section>;
  return <LiveLinks />;
}

function LiveLinks() {
  const health = useHealth(), journal = useJournalZone().zone, device = useDeviceZone();
  const zone = dailyData(health.data).preferences.timezone ?? journal ?? device ?? 'UTC';
  const [config, setConfig] = useState<LinkConfig | null>(null), [problem, setProblem] = useState(''), [rows, setRows] = useState<Partial<Record<LinkProvider, Row>>>({});
  const [agreed, setAgreed] = useState<LinkProvider | null>(null), [removeToo, setRemoveToo] = useState(false), [asking, setAsking] = useState<LinkProvider | null>(null);
  const handled = useRef(false);
  const set = (p: LinkProvider, patch: Partial<Row>) => setRows(r => ({...r, [p]: {state: 'idle', connected: false, message: '', error: '', ...r[p], ...patch}}));
  async function sync(p: LinkProvider, scope: string, quiet = false) {
    set(p, {state: 'busy', error: '', ...(quiet ? {} : {message: ''})});
    try {
      const items = await syncLink(scope, scope, p, {zone});
      let added = 0;
      await health.update(latest => { const r = syncedHealth(latest, items, health.importLimit); added = r.added; return r.next; });
      try { const all = JSON.parse(sessionStorage.getItem(SYNCED_KEY) ?? '{}') as Record<string, number>; sessionStorage.setItem(SYNCED_KEY, JSON.stringify({...all, [p]: Date.now()})); } catch { /* the hourly spacing is only a courtesy */ }
      set(p, {state: 'idle', connected: true, message: added ? `${added} new ${added === 1 ? 'record' : 'records'} from ${providerInfo(p).label}.` : `Nothing new from ${providerInfo(p).label}.`});
    } catch (error) {
      if (error instanceof ReconnectRequired) set(p, {state: 'idle', connected: false, error: error.message});
      else set(p, {state: 'idle', error: error instanceof Error && error.message ? error.message : 'The sync did not finish. Nothing was changed.'});
    }
  }
  useEffect(() => {
    if (handled.current) return; handled.current = true;
    let scope: string | null = null, locked = true;
    try { scope = getAccountScope(); locked = isAccountLocked(); } catch { scope = null; }
    // The provider's answer first, synchronously: the pending record goes and the address is cleaned before any await.
    const callback = readCallback(window.location.search, scope && !locked ? scope : null);
    if (callback.kind !== 'none') window.history.replaceState(null, '', '/app/health?view=devices');
    if (isShowcase()) { queueMicrotask(() => setProblem('Showcase holds fictional records only, so no account is linked here.')); return; }
    if (!scope) { queueMicrotask(() => setProblem('Linking a health account needs your ZIGoals account. Sign in from Settings, then come back.')); return; }
    void (async () => {
      if (callback.kind === 'refused') setProblem(callback.message);
      if (callback.kind === 'denied' && callback.provider) set(callback.provider, {error: `You declined at ${providerInfo(callback.provider).label}; nothing was connected.`});
      if (callback.kind === 'code') {
        const p = callback.provider;
        set(p, {state: 'busy', message: `Finishing the connection with ${providerInfo(p).label}…`});
        try {
          await finishLink(scope, p, callback.code, callback.verifier);
          set(p, {state: 'idle', connected: true, message: `Connected to ${providerInfo(p).label}.`});
          void sync(p, scope, true);
        } catch (error) { set(p, {state: 'idle', error: error instanceof Error && error.message ? error.message : 'The connection did not finish.'}); }
      }
      try { setConfig(await linkConfig(scope)); } catch (error) { setProblem(error instanceof Error ? error.message : 'Linked accounts are unavailable right now.'); return; }
      let synced: Record<string, number> = {}; try { synced = JSON.parse(sessionStorage.getItem(SYNCED_KEY) ?? '{}') as Record<string, number>; } catch { synced = {}; }
      for (const p of LINK_PROVIDERS) {
        if (!(await hasTokens(scope, p.id))) continue;
        set(p.id, {connected: true});
        if (p.syncOnOpen && Date.now() - (synced[p.id] ?? 0) > 3_600_000 && !(callback.kind === 'code' && callback.provider === p.id)) void sync(p.id, scope, true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function connect(p: LinkProvider) {
    const scope = scopeNow(), entry = config?.providers.find(x => x.id === p);
    if (!scope || !entry || !config) return;
    try { window.location.assign(await beginLink(p, {clientId: entry.clientId, redirectUri: config.redirectUri}, scope)); }
    catch { set(p, {error: 'The connection could not start in this browser.'}); }
  }
  async function disconnect(p: LinkProvider) {
    const scope = scopeNow(); if (!scope) return;
    set(p, {state: 'busy', error: '', message: ''});
    const {revoked} = await unlink(scope, p);
    let removed = '';
    if (removeToo) { try { await health.update(latest => removeLinkedRecords(latest, p)); removed = ' What it brought was removed from your Health journal.'; } catch { removed = ' What it brought could not be removed; nothing was changed.'; } }
    set(p, {state: 'idle', connected: false, message: `${providerInfo(p).label} is disconnected on this device.${revoked ? '' : ` To remove ZIGoals' access there too, remove it in your ${providerInfo(p).label} account's connected apps.`}${removed}`});
    setAsking(null); setRemoveToo(false);
  }
  return <section className="panel devices-section" aria-labelledby="devices-links-title">
    <h2 id="devices-links-title">Linked accounts</h2>
    {problem && <p className="notice">{problem}</p>}
    <ul className="devices-platforms">{LINK_PROVIDERS.map(p => {
      const row = rows[p.id], ready = !!config?.providers.some(x => x.id === p.id);
      return <li key={p.id}><strong>{p.label}</strong> <span className="devices-state">{row?.connected ? 'Connected on this device' : ready ? 'Not connected' : 'Not set up for this ZIGoals'}</span>
        <p>Brings: {p.brings}</p><p className="fine">{p.limits}</p>
        {row?.connected ? <div className="actions">
          <button type="button" className="secondary" disabled={row.state === 'busy'} onClick={() => { const scope = scopeNow(); if (scope) void sync(p.id, scope); }}>{row.state === 'busy' ? 'Syncing…' : 'Sync now'}</button>
          {asking === p.id ? <span className="devices-confirm"><label className="checkbox"><input type="checkbox" checked={removeToo} onChange={e => setRemoveToo(e.target.checked)} />Also remove what {p.label} brought</label><button type="button" className="secondary" onClick={() => void disconnect(p.id)}>Disconnect</button><button type="button" className="quiet" onClick={() => setAsking(null)}>Keep it</button></span>
            : <button type="button" className="quiet" onClick={() => setAsking(p.id)}>Disconnect…</button>}
        </div> : ready && <div className="devices-connect">
          <label className="checkbox"><input type="checkbox" checked={agreed === p.id} onChange={e => setAgreed(e.target.checked ? p.id : null)} />I understand this brings health records from {p.label} into my Health journal; with Health sync on, they sync like the rest of Health.</label>
          <div className="actions"><button type="button" className="secondary" disabled={agreed !== p.id || row?.state === 'busy'} onClick={() => void connect(p.id)}>Connect {p.label}</button></div>
        </div>}
        {row?.message && <p role="status">{row.message}</p>}
        {row?.error && <p role="alert">{row.error}</p>}
      </li>;
    })}</ul>
  </section>;
}
