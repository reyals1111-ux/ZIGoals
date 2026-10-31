'use client';
import {Suspense, lazy, useEffect, useRef, useState} from 'react';
import {useLinkedWallets} from './use-linked-wallets';
import {LinkedWalletError} from '../../lib/linked-wallets';
import {PUBLIC_INTEGRATIONS} from '../../lib/public-integrations';
import {PHONE_WALLETS_SWITCHING_ON, WalletConnectUnavailable, startWalletConnect, walletConnectLinks} from '../../lib/wallets/walletconnect';
import {shortAddress} from '../../lib/wallet-address';

/** Session AK (Part 1a, A8): the pairing link as a QR code, for a wallet on another device; loaded with the panel only. */
const QrCode = lazy(() => import('../qr/qr-code'));
/**
 * Session AF (L2b, ADR-028 D1, H38; `TIER 3 (dependencies)`) and Session AK (Part 1a, `TIER 3 (wallet)`, A7–A9): "Connect
 * by WalletConnect". On open it starts one pairing (the package loads now, not before) and offers the pairing link three
 * ways: a QR code to scan with a wallet on another device (shown first on a computer), each wallet app's own link (shown
 * first on a phone), and the link to copy. Each wallet is listed only for what it links (A7). Once the wallet approves,
 * each address the session holds is linked read-only. Nothing is asked of the wallet beyond the session, nothing is
 * signed here, and nothing is stored but the linked addresses. If WalletConnect will not start (the owner's allowed
 * domains, A9), it says phone wallets are being switched on.
 */
export default function WalletConnectPanel({onDone}: {onDone: (message: string) => void}) {
  const linked = useLinkedWallets(), [uri, setUri] = useState(''), [status, setStatus] = useState('Starting WalletConnect…'), started = useRef(false);
  const [phone] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true);
  const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let alive = true;
    void (async () => {
      try {
        const pairing = await startWalletConnect({projectId: PUBLIC_INTEGRATIONS.reownProjectId, origin: window.location.origin});
        if (!alive) return;
        setUri(pairing.uri); setStatus(phone ? 'Open the link in your wallet app, then approve there. ZIGoals asks only for your addresses.' : 'Scan the code with your phone’s wallet, then approve there. ZIGoals asks only for your addresses.');
        const {accounts, wallet} = await pairing.approval;
        let count = 0;
        for (const a of accounts) {
          try { await linked.link({kind: a.kind, wallet: `walletconnect:${wallet}`.slice(0, 120), label: wallet, address: a.address, via: 'walletconnect'}); count++; }
          catch (error) { if (!(error instanceof LinkedWalletError)) throw error; }
        }
        if (alive) onDone(count ? `${wallet}: ${count} ${count === 1 ? 'address' : 'addresses'} linked, read-only (${accounts.map(a => shortAddress(a.address)).join(', ')}).` : 'The wallet shared no address ZIGoals reads, so nothing was linked.');
      } catch (error) {
        if (alive) setStatus(error instanceof WalletConnectUnavailable ? error.message : uri ? 'WalletConnect did not connect (it was refused, closed or timed out), so nothing was linked.' : PHONE_WALLETS_SWITCHING_ON);
      }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one pairing per open
  const links = uri ? walletConnectLinks(uri, android) : [];
  const qr = uri ? <details className="wallet-wc-qr" open={!phone}><summary>{phone ? 'Show a QR code for a wallet on another device' : 'QR code for your phone’s wallet'}</summary><Suspense fallback={<p>Drawing the code…</p>}><QrCode value={uri} label="QR code to pair a wallet with WalletConnect" size={220}/></Suspense></details> : null;
  return <div className="wallet-wc-panel">
    <p className="wallet-choices-note" role="status">{status}</p>
    {!phone && qr}
    {uri && <ul aria-label="Open the pairing link in a wallet app">
      {links.map(link => <li key={link.key}><a className="wallet-row" href={link.href} rel="noopener noreferrer"><span className="wallet-row-text"><span className="wallet-row-label">{link.label}</span><span className="wallet-row-detail">{link.detail} · read-only</span></span><span className="wallet-row-external" aria-hidden="true">↗</span></a></li>)}
      <li><button type="button" className="wallet-row" onClick={() => { void navigator.clipboard?.writeText(uri).then(() => setStatus('Link copied. Paste it in your wallet app’s WalletConnect screen.'), () => setStatus('Copying was refused; select the link below instead.')); }}><span className="wallet-row-text"><span className="wallet-row-label">Copy the WalletConnect link</span><span className="wallet-row-detail">For OKX Wallet or another WalletConnect wallet</span></span></button></li>
    </ul>}
    {phone && qr}
    {uri && <code className="wallet-wc-uri">{uri}</code>}
  </div>;
}
