'use client';
import './wallet.css';
import {Suspense, lazy, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {useGoals} from '../goal-provider';
import {SHOWCASE_WALLET_MESSAGE, useLinkedWallets} from './use-linked-wallets';
import {LinkedWalletError, LINK_LIMIT_MESSAGE, LINK_UNREADABLE_MESSAGE, MAX_LINKED_WALLETS, withoutWallet, type LinkedWallet, type WalletVia} from '../../lib/linked-wallets';
import {COSMOS_LINK_ERROR, COSMOS_WALLETS, EVM_LINK_ERROR, KEPLR_SITE, discoverEvmWallets, forgetKeplrPermission, keplrInstalled, readCosmosAddress, readEvmAddress, type EvmWallet} from '../../lib/wallet-link';
import {shortAddress, verifyAddress, type AddressKind} from '../../lib/wallet-address';
import {evmSuggestions} from '../../lib/wallets/eip6963';
import {SOLANA_LINK_ERROR, discoverSolanaWallets, forgetSolanaConnection, readSolanaAddress, type SolanaWallet} from '../../lib/wallets/solana-link';
import {l2bLink} from '../../lib/wallets/links';
import {phoneWalletPaths} from './phone-wallet-paths';
import {LoadBoundary} from '../load-boundary';
import {XPUB_OPEN_EVENT} from '../../lib/wallets/xpub/events';
/** Session AF (L2b): the WalletConnect panel and, through it, the package load only when the person opens it. */
const WalletConnectPanel = lazy(() => import('./walletconnect-panel'));
import {forgetWalletBalances} from '../../lib/wallets/balances/store';
import {stopWalletConnect} from '../../lib/wallets/walletconnect';
import {getAppStorage} from '../../lib/showcase-storage';

/**
 * Session AE (Part 6, ADR-027; `TIER 3 (wallet)`): the wallet choices beside "Connect Keplr". Keplr stays the app's own,
 * recommended wallet for ZIGChain (the main button's flow, unchanged) and gains Disconnect. Other wallets are linked
 * read-only for display: a ZIGChain address from a Cosmos wallet that is still installed, an EVM wallet's account through
 * EIP-6963, or a Bitcoin address typed in (watch-only, checked on this device). Nothing is signed or sent; a linked
 * address never becomes the app's wallet. Wallets that are not installed get a link to their official site only.
 * Two forms: a menu under the ▾ button on computers (lazy chunk; arrows, Home/End, Escape and Tab as in a menu), and rows
 * in the phone's Status & wallet sheet (44 px each).
 * Session AF (L2b, ADR-028 H40, H41, H87; `TIER 3 (wallet)`): working connections for the six EVM wallets R4 checked
 * (MetaMask, Rabby, Coinbase Wallet, Trust, OKX, Phantom; any other EIP-6963 wallet still lists itself), Solana wallets
 * through the Wallet Standard (`standard:connect` only: lib/wallets/solana-link.ts), and on phones the wallets' own
 * in-app browsers plus the honest WalletConnect line (components/wallet/phone-wallet-paths.tsx). Keplr's own flow is
 * unchanged (H87). Remove is each linked wallet's disconnect on this device.
 */
type Item = {key: string; label: string; name?: string; detail?: string; title?: string; icon?: ReactNode; href?: string; onSelect?: () => void; busy?: boolean};
type Group = {key: string; title: string; items: Item[]; note?: string};
const LINK_REFUSED = 'The wallet did not share an address (it was refused or closed), so nothing was linked.';
const BTC_INVALID = 'That is not a valid Bitcoin address (bc1…, 1… or 3…), so nothing was added.';
const messageOf = (error: unknown) => error instanceof LinkedWalletError ? error.message : error instanceof Error && (error.message === COSMOS_LINK_ERROR || error.message === EVM_LINK_ERROR || error.message === SOLANA_LINK_ERROR) ? error.message : LINK_REFUSED;

function WalletGlyph() {
  return <svg className="wallet-glyph" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M19 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7m18 6h-6v4h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function WalletIcon({icon}: {icon: string | null}) {
  // An announced icon only as a checked data: image (lib/wallet-link.ts safeWalletIcon); an <img> never runs its content.
  // eslint-disable-next-line @next/next/no-img-element
  return icon ? <img className="wallet-icon" src={icon} alt="" width={24} height={24} decoding="async"/> : <WalletGlyph/>;
}

export default function WalletMenu({variant, id, onClose}: {variant: 'menu' | 'sheet'; id?: string; onClose?: (focusTrigger: boolean) => void}) {
  const s = useGoals(), linked = useLinkedWallets(), own = useId(), menuId = id ?? own, router = useRouter();
  const [evm, setEvm] = useState<EvmWallet[]>([]), [sol, setSol] = useState<SolanaWallet[]>([]), [busy, setBusy] = useState<string | null>(null), [status, setStatus] = useState(''), [btcOpen, setBtcOpen] = useState(false), [btc, setBtc] = useState(''), [btcError, setBtcError] = useState(''), [wcOpen, setWcOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null), focusNext = useRef<string | null>(null);
  // EIP-6963: the page's EVM wallets announce themselves when asked, each time the choices open.
  useEffect(() => discoverEvmWallets(setEvm), []);
  // The Wallet Standard (Solana): wallets register through the two-event handshake, each time the choices open.
  useEffect(() => discoverSolanaWallets(setSol), []);
  const connected = s.walletState === 'CONNECTED', sheet = variant === 'sheet';
  const blocked = linked.showcase ? SHOWCASE_WALLET_MESSAGE : linked.unreadable ? LINK_UNREADABLE_MESSAGE : linked.stored >= MAX_LINKED_WALLETS ? LINK_LIMIT_MESSAGE : '';

  /** One link at a time; true when the address was stored. */
  async function run(key: string, kind: AddressKind, wallet: string, label: string, read: () => Promise<string>, via: WalletVia = 'extension'): Promise<boolean> {
    if (busy) return false;
    // The checks that need no wallet come first, so a full or unreadable record never opens a wallet's prompt.
    if (blocked) { setStatus(blocked); return false; }
    setBusy(key); setStatus(''); focusNext.current = key;
    try { const entry = await linked.link({kind, wallet, label, address: await read(), via}); setStatus(`${entry.label} ${shortAddress(entry.address)} linked, read-only.`); return true; }
    catch (error) { setStatus(messageOf(error)); return false; }
    finally { setBusy(null); }
  }
  function remove(w: LinkedWallet, next: string | null) {
    try {
      linked.write(record => withoutWallet(record, w.id)); setStatus(`${w.label} ${shortAddress(w.address)} removed from this device.`); focusNext.current = next;
      // A Solana wallet linked in this tab is also asked to forget this site, best effort (its own standard:disconnect).
      if (w.kind === 'solana') forgetSolanaConnection(sol.find(x => x.key === w.wallet));
      // Its last read balances leave with it (lib/wallets/balances/store.ts); a WalletConnect session of this tab ends.
      forgetWalletBalances(getAppStorage(), w.id);
      if (w.via === 'walletconnect') void stopWalletConnect();
    }
    catch (error) { setStatus(messageOf(error)); }
  }
  async function addBitcoin(event: FormEvent) {
    event.preventDefault();
    const address = btc.trim();
    if (!await verifyAddress('btc', address)) { setBtcError(BTC_INVALID); return; }
    setBtcError('');
    if (!await run('btc', 'btc', 'bitcoin-watch', 'Bitcoin', async () => address, 'typed')) return;
    setBtc(''); setBtcOpen(false); focusNext.current = 'btc';
  }
  function disconnect() {
    // The app's side first (the local demo, like "Demo records", and the reconnect hint cleared), then Keplr's permission, best effort.
    s.useLocal(); forgetKeplrPermission();
    if (sheet) setStatus('Keplr disconnected. Your demo records are back.'); else onClose?.(true);
  }

  const groups: Group[] = [];
  const keplr: Item[] = [];
  // The main button's own flow (it stays the place to connect; the sheet shows that button above these rows).
  const connecting = s.busy || s.walletState === 'CONNECTING' || s.walletState === 'ADDING_TESTNET';
  if (!sheet) keplr.push({key: 'keplr', label: 'Keplr', detail: connected ? 'Connected · choose to refresh the connection' : 'Recommended for ZIGChain', icon: <WalletGlyph/>, onSelect: () => { onClose?.(true); if (!connecting) void s.connect(); }});
  if (connected) keplr.push({key: 'disconnect', label: 'Disconnect', detail: 'Ends this tab’s Keplr connection; your records stay', onSelect: disconnect});
  if (!keplrInstalled()) keplr.push({key: 'get-keplr', label: 'Get Keplr', detail: 'keplr.app · opens in a new tab', href: KEPLR_SITE});
  if (keplr.length) groups.push({key: 'keplr', title: 'Keplr · recommended for ZIGChain', items: keplr});
  const cosmos = COSMOS_WALLETS.map(w => ({...w, provider: w.find()}));
  groups.push({key: 'cosmos', title: 'Other Cosmos wallets · read-only', items: cosmos.flatMap(w => w.provider ? [{key: w.id, label: `${w.name}: link address`, detail: `${w.ended}. Reads only its ZIGChain address.`, icon: <WalletGlyph/>, busy: busy === w.id, onSelect: () => void run(w.id, 'cosmos', w.id, w.name, () => readCosmosAddress(w.provider!))}] : []),
    note: cosmos.some(w => !w.provider) ? `${cosmos.filter(w => !w.provider).map(w => w.name).join(' and ')} ended ${cosmos.filter(w => !w.provider).length > 1 ? 'their wallets' : 'its wallet'} in 2026, so there is nothing to install. Keplr is the wallet for ZIGChain.` : undefined});
  groups.push({key: 'evm', title: 'EVM wallets · read-only', items: [
    ...evm.map(w => ({key: `evm:${w.uuid}`, label: `${w.name}: link address`, detail: 'Asks only for your account address', icon: <WalletIcon icon={w.icon}/>, busy: busy === `evm:${w.uuid}`, onSelect: () => void run(`evm:${w.uuid}`, 'evm', w.rdns, w.name, () => readEvmAddress(w))})),
    ...evmSuggestions(evm).map(x => ({key: `get:${x.rdns}`, label: `Get ${x.name}`, detail: `${new URL(x.href).host.replace(/^www\./, '')} · opens in a new tab`, href: x.href}))]});
  groups.push({key: 'solana', title: 'Solana wallets · read-only', items: sol.length
    ? sol.map(w => ({key: `sol:${w.key}`, label: `${w.name}: link Solana address`, detail: 'Asks only for your Solana address', icon: <WalletIcon icon={w.icon}/>, busy: busy === `sol:${w.key}`, onSelect: () => void run(`sol:${w.key}`, 'solana', w.key, w.name, () => readSolanaAddress(w))}))
    : [{key: 'get:solana', label: 'Get Phantom for Solana', detail: `${new URL(l2bLink('phantom-site').url).host} · opens in a new tab`, href: l2bLink('phantom-site').url}]});
  groups.push({key: 'btc', title: 'Bitcoin · watch-only', items: [
    // Session AJ (item 36, D2b): a whole wallet by its extended public key, on Wealth (its key stays on this device).
    {key: 'xpub', label: 'Watch a Bitcoin wallet (xpub)', detail: 'Every address of one wallet; read from mempool.space', icon: <WalletGlyph/>, onSelect: () => { onClose?.(false); window.dispatchEvent(new Event(XPUB_OPEN_EVENT)); router.push('/app/wealth#xpub'); }},
    {key: 'btc', label: 'Watch a Bitcoin address', detail: 'Checked on this device; nothing is sent', icon: <WalletGlyph/>, onSelect: () => { if (blocked) { setStatus(blocked); return; } setBtcOpen(true); setBtcError(''); }}]});
  if (linked.wallets.length) groups.push({key: 'linked', title: 'Linked on this device', items: linked.wallets.map((w, i, all) => ({key: `remove:${w.id}`, label: `${w.label} · ${shortAddress(w.address)}`, name: `Remove ${w.label} ${shortAddress(w.address)}`, detail: 'Remove · disconnects it on this device', title: w.address, onSelect: () => remove(w, all[i + 1] ? `remove:${all[i + 1]!.id}` : all[i - 1] ? `remove:${all[i - 1]!.id}` : 'btc')}))});

  // Menu focus: the first item on open, the next one after a Remove, the Bitcoin item after its form closes.
  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  useEffect(() => { if (!sheet && !btcOpen) (items().find(el => el.dataset.key === focusNext.current) ?? items()[0])?.focus({preventScroll: true}); focusNext.current = null; }, [sheet, btcOpen, linked.wallets.length]);
  const onKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const all = items(), at = all.indexOf(event.target as HTMLElement);
    // Tab leaves the menu from the ▾ (the menu is gone by the time the browser moves the focus on).
    if (event.key === 'Tab') { onClose?.(true); return; }
    const move = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : event.key === 'Home' ? -at : event.key === 'End' ? all.length - 1 - at : 0;
    if (!move || at < 0) return;
    event.preventDefault(); all[(at + move + all.length) % all.length]?.focus();
  };

  const control = (item: Item) => {
    const describedBy = item.detail ? `${menuId}-${item.key}-detail` : undefined;
    const body = <>{item.icon ?? <span className="wallet-row-icon-space" aria-hidden="true"/>}<span className="wallet-row-text"><span className="wallet-row-label">{item.label}</span>{item.detail && <span className="wallet-row-detail" id={describedBy}>{item.busy ? 'Waiting for the wallet…' : item.detail}</span>}</span>{item.href && <span className="wallet-row-external" aria-hidden="true">↗</span>}</>;
    // The name is the label alone (the detail is its description), so no row's name repeats the main buttons' words.
    const common = {className: 'wallet-row', 'data-key': item.key, title: item.title, 'aria-label': item.name ?? item.label, 'aria-describedby': describedBy, ...(sheet ? {} : {role: 'menuitem', tabIndex: -1})};
    return item.href
      ? <a {...common} href={item.href} target="_blank" rel="noopener noreferrer">{body}</a>
      : <button {...common} type="button" aria-busy={item.busy || undefined} onClick={item.onSelect}>{body}</button>;
  };
  // Phones: the wallets' own in-app browsers and the honest WalletConnect line (the sheet only).
  if (sheet) groups.push(phoneWalletPaths(undefined, () => { if (blocked) { setStatus(blocked); return; } setWcOpen(true); }));
  const notes = groups.filter(g => g.note).map(g => g.note!);
  const bitcoinForm = <form className="wallet-btc-form" aria-label="Watch a Bitcoin address" onSubmit={e => void addBitcoin(e)}>
    <label htmlFor={`${menuId}-btc`}>Bitcoin address</label>
    <input id={`${menuId}-btc`} autoFocus value={btc} onChange={e => setBtc(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} inputMode="text" maxLength={100} placeholder="bc1…, 1… or 3…" aria-invalid={!!btcError || undefined} aria-describedby={btcError ? `${menuId}-btc-error` : `${menuId}-btc-help`}/>
    {btcError ? <p className="wallet-btc-error" id={`${menuId}-btc-error`} role="alert">{btcError}</p> : <p className="wallet-btc-help" id={`${menuId}-btc-help`}>Watch-only: checked on this device, nothing is sent. Testnet addresses are not accepted.</p>}
    <div className="wallet-btc-actions"><button type="submit" className="primary" disabled={!!busy}>Add</button><button type="button" className="secondary" onClick={() => { setBtcOpen(false); setBtcError(''); focusNext.current = 'btc'; }}>Back</button></div>
  </form>;
  const statusLine = <p className="wallet-menu-status" role="status">{status}</p>;

  if (sheet) return <section className="wallet-choices" aria-labelledby={`${menuId}-title`}>
    <h3 id={`${menuId}-title`} className="wallet-choices-title">More wallets</h3>
    {linked.showcase ? <p className="wallet-choices-note">{SHOWCASE_WALLET_MESSAGE}</p> : groups.map(g => <div key={g.key} className="wallet-choices-group">
      <h4>{g.title}</h4>
      {g.items.length > 0 && <ul>{g.items.map(item => <li key={item.key}>{control(item)}</li>)}</ul>}
      {g.key === 'btc' && btcOpen && bitcoinForm}
      {g.key === 'phone' && wcOpen && <LoadBoundary label="WalletConnect"><Suspense fallback={<p className="wallet-choices-note">Loading WalletConnect…</p>}><WalletConnectPanel onDone={message => { setWcOpen(false); setStatus(message); }}/></Suspense></LoadBoundary>}
      {g.note && <p className="wallet-choices-note">{g.note}</p>}
    </div>)}
    {statusLine}
  </section>;
  return <div id={menuId} className="wallet-menu">
    {btcOpen ? bitcoinForm : <div ref={menu} role="menu" aria-label="More wallets" onKeyDown={onKey}>
      {groups.filter(g => g.items.length).map(g => <div key={g.key} role="group" aria-labelledby={`${menuId}-${g.key}-title`} className="wallet-menu-group">
        <p id={`${menuId}-${g.key}-title`} className="wallet-menu-heading" aria-hidden="true">{g.title}</p>
        {g.items.map(item => <div key={item.key} role="none">{control(item)}</div>)}
      </div>)}
    </div>}
    {!btcOpen && notes.map(note => <p key={note} className="wallet-menu-note">{note}</p>)}
    {statusLine}
  </div>;
}
