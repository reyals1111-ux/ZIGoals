'use client';
import {useId, useState} from 'react';
import {useEarnLive} from '../earn/use-earn-live';
import {pctShort} from '../../lib/earn/format';
import {formatNumber} from '../../lib/visual-format';

/**
 * Session AH (ST3; N-027, N-198, N-201, B-065, L-042, D-082, T-129): the reward scenario before any wallet is tracked, and
 * in the Showcase. An amount you type and a yearly rate prefilled from the chain's own figure (Earn's source, before a
 * validator's commission: an estimate that moves), both editable. Nothing is saved, read about you or sent anywhere.
 */
const AMOUNT = /^\d{1,12}([.,]\d{1,6})?$/, RATE = /^\d{1,3}([.,]\d{1,4})?$/;
export function StakingTryScenario() {
  const id = useId(), chain = useEarnLive('chain');
  const live = chain.phase === 'ok' ? chain.answer.data.apr.beforeCommission : null;
  const [amount, setAmount] = useState('1000'), [rate, setRate] = useState<string | null>(null);
  const shownRate = rate ?? (live ? String(Math.round(Number(live) * 10_000) / 100) : '');
  const a = AMOUNT.test(amount.trim()) ? Number(amount.trim().replace(',', '.')) : NaN, r = RATE.test(shownRate.trim()) ? Number(shownRate.trim().replace(',', '.')) : NaN;
  const amountBad = amount.trim() !== '' && Number.isNaN(a), rateBad = shownRate.trim() !== '' && (Number.isNaN(r) || r > 100);
  const ok = !Number.isNaN(a) && !Number.isNaN(r) && r <= 100;
  return <div className="staking-try" data-staking-try>
    <p className="fine">Try it with any amount; nothing is saved. Track a wallet to use your own stake.</p>
    <div className="platform-form">
      <label className="field">Amount to stake (ZIG)<input value={amount} inputMode="decimal" onChange={e => setAmount(e.target.value)} aria-invalid={amountBad || undefined} aria-describedby={amountBad ? `${id}-amount` : undefined}/></label>
      {amountBad && <p className="field-error" id={`${id}-amount`} role="alert">Write an amount in ZIG, like 1000 or 250.5.</p>}
      <label className="field">Yearly rate % (estimate, variable)<input value={shownRate} inputMode="decimal" placeholder={chain.phase === 'loading' ? 'Reading the chain’s rate…' : 'Your rate'} onChange={e => setRate(e.target.value)} aria-invalid={rateBad || undefined} aria-describedby={`${id}-rate`}/></label>
      <p className="fine" id={`${id}-rate`}>{rateBad ? 'Write a rate from 0 to 100.' : live ? `Prefilled with the chain’s own yearly rate before a validator’s commission, ${pctShort(live)}, as Earn shows it. A validator keeps its commission from this.` : 'The chain’s rate is unavailable just now; write your own.'}</p>
    </div>
    <div className="summary-strip">{[7, 30, 365].map(days => <div key={days}><small>{days}-day rewards, illustration</small><strong>{ok ? `${formatNumber(a * r / 100 * days / 365, {maximumFractionDigits: 2})} ZIG` : '—'}</strong></div>)}</div>
  </div>;
}
