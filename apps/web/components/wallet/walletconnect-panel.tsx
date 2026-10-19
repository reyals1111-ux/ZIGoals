'use client';
import {useEffect, useRef, useState} from 'react';
import {useLinkedWallets} from './use-linked-wallets';
import {LinkedWalletError} from '../../lib/linked-wallets';
import {PUBLIC_INTEGRATIONS} from '../../lib/public-integrations';
import {WalletConnectUnavailable, startWalletConnect, trustWalletConnectLink} from '../../lib/wallets/walletconnect';
import {shortAddress} from '../../lib/wallet-address';

/**
 * Session AF (L2b, ADR-028 D1, H38; `TIER 3 (dependencies)`): "Connect by WalletConnect" in the phone's Status & wallet
 * sheet, shown only when the owner's project ID is set. On open it starts one pairing (the package loads now, not
 * before), offers the pairing link to the wallet app (Trust's documented link, a copy button, the link as text for Ledger
 * Wallet or Keplr Mobile) and, once the wallet approves, links each address the session holds, read-only. Nothing is asked
 * of the wallet beyond the session, nothing is signed, and nothing is stored but the linked addresses.
 */
export default function WalletConnectPanel({onDone}: {onDone: (message: string) => void}) {
  const linked = useLinkedWallets(), [uri, setUri] = useState(''), [status, setStatus] = useState('Starting WalletConnect…'), started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let alive = true;
    void (async () => {
      try {
        const pairing = await startWalletConnect({projectId: PUBLIC_INTEGRATIONS.reownProjectId, origin: window.location.origin});
        if (!alive) return;
        setUri(pairing.uri); setStatus('Open the link in your wallet app, then approve there. ZIGoals asks only for your addresses.');
        const {accounts, wallet} = await pairing.approval;
        let count = 0;
        for (const a of accounts) {
          try { await linked.link({kind: a.kind, wallet: `walletconnect:${wallet}`.slice(0, 120), label: wallet, address: a.address, via: 'walletconnect'}); count++; }
          catch (error) { if (!(error instanceof LinkedWalletError)) throw error; }
        }
        if (alive) onDone(count ? `${wallet}: ${count} ${count === 1 ? 'address' : 'addresses'} linked, read-only (${accounts.map(a => shortAddress(a.address)).join(', ')}).` : 'The wallet shared no new address, so nothing was linked.');
      } catch (error) {
        if (alive) setStatus(error instanceof WalletConnectUnavailable ? error.message : 'WalletConnect did not connect (it was refused, closed or timed out), so nothing was linked.');
      }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one pairing per open
  return <div className="wallet-wc-panel">
    <p className="wallet-choices-note" role="status">{status}</p>
    {uri && <ul>
      <li><a className="wallet-row" href={trustWalletConnectLink(uri)} target="_blank" rel="noopener noreferrer"><span className="wallet-row-text"><span className="wallet-row-label">Open in Trust Wallet</span><span className="wallet-row-detail">Trust’s own WalletConnect link</span></span><span className="wallet-row-external" aria-hidden="true">↗</span></a></li>
      <li><button type="button" className="wallet-row" onClick={() => { void navigator.clipboard?.writeText(uri).then(() => setStatus('Link copied. Paste it in your wallet app’s WalletConnect screen.'), () => setStatus('Copying was refused; select the link below instead.')); }}><span className="wallet-row-text"><span className="wallet-row-label">Copy the WalletConnect link</span><span className="wallet-row-detail">For Ledger Wallet, Keplr Mobile or another WalletConnect wallet</span></span></button></li>
    </ul>}
    {uri && <code className="wallet-wc-uri">{uri}</code>}
  </div>;
}
