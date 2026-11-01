'use client';
import {Suspense, lazy, useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {ACCOUNTS} from '../../lib/accounts/schema';
import {netWorthHistory} from '../../lib/accounts/net-worth';
import {NETWORTH_MILESTONES} from '../../lib/networth-milestones/milestones';
import {netWorthCard, type NetWorthAmount} from '../../lib/share-cards/kinds';
import {isShowcase} from '../../lib/showcase-storage';
import {addLocalDays, localDate} from '../../lib/local-date';
import {addMonths} from '../../lib/bills/cadence';
import {formatDate, formatMoney} from '../../lib/visual-format';
import {moneyText} from '../../lib/accounts/net-worth';

/**
 * Session AK (BUILD list 2 #17): "Share a net-worth moment" under the net worth and on the milestone celebration. A
 * share image made on this device through the one share-card system (lib/share-cards, the sheet and renderer load on
 * the tap): the change in per cent of the net worth from accounts and debts since a month end, and a milestone the
 * person picked. Amounts are off until "Include numbers" is ticked; nothing is uploaded; a Showcase card says Example.
 */
const ShareCardSheet = lazy(() => import('../share-cards/share-card-sheet'));
type Since = 'month' | 'year';
export default function NetWorthShare({currencies, preferred, milestone, label = 'Share a net-worth moment'}: {currencies: readonly string[]; preferred?: string; milestone?: {currency: string; amount: string; on: string} | null; label?: string}) {
  const id = useId(), accounts = useDeviceRecord(ACCOUNTS), milestones = useDeviceRecord(NETWORTH_MILESTONES), today = localDate();
  const [open, setOpen] = useState(false), [since, setSince] = useState<Since>('month'), [example] = useState(() => isShowcase());
  const [currency, setCurrency] = useState(() => preferred && currencies.includes(preferred) ? preferred : currencies[0] ?? '');
  const history = useMemo(() => accounts.loaded && !accounts.unreadable ? netWorthHistory(accounts.data, today, 12) : [], [accounts.loaded, accounts.unreadable, accounts.data, today]);
  // The month end before this month, or the one twelve months back (the month ends netWorthHistory reads).
  const monthStart = addLocalDays(today, 1 - Number(today.slice(8))), thenDate = since === 'month' ? addLocalDays(monthStart, -1) : addLocalDays(addMonths(monthStart, -11), -1);
  const pick = (date: string | null): NetWorthAmount | null => { const h = date ? history.find(x => x.date === date && x.currency === currency) : undefined; return h ? {value: h.net.value, decimals: h.net.decimals} : null; };
  // The milestone: the one being celebrated, else the latest one passed with a celebration in this currency.
  const latest = milestone ?? [...(milestones.data.reached ?? [])].filter(r => r.currency === currency && !r.quiet).sort((a, b) => b.on.localeCompare(a.on))[0] ?? null;
  const [mention, setMention] = useState(!!milestone);
  const usedMilestone = latest && latest.currency === currency && mention ? {amount: latest.amount, onLabel: formatDate(latest.on)} : null;
  if (!currencies.length) return null;
  return <div className="nws">
    <button type="button" className="secondary" aria-expanded={open} aria-controls={`${id}-sheet`} onClick={() => setOpen(v => !v)}>{label}</button>
    {open && <div id={`${id}-sheet`} className="nws-body">
      <div className="nws-choices">
        {currencies.length > 1 && <label className="field"><span>Currency</span><select value={currency} onChange={e => setCurrency(e.target.value)}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
        <fieldset className="nws-since"><legend>Change since</legend>
          <label><input type="radio" name={`${id}-since`} checked={since === 'month'} onChange={() => setSince('month')}/>Last month&rsquo;s end</label>
          <label><input type="radio" name={`${id}-since`} checked={since === 'year'} onChange={() => setSince('year')}/>Twelve months ago</label>
        </fieldset>
        {latest && latest.currency === currency && <label className="nws-mention"><input type="checkbox" checked={mention} onChange={e => setMention(e.target.checked)}/>Mention my milestone of {formatDate(latest.on)}</label>}
      </div>
      {!pick(thenDate) ? <p className="fine">There is no earlier month-end balance in {currency} yet, so the card shows no per cent. It needs a balance recorded before this month.</p> : null}
      <Suspense fallback={<p className="fine" aria-busy="true">Loading…</p>}>
        <ShareCardSheet heading="Share a net-worth moment" onClose={() => setOpen(false)} build={o => netWorthCard({
          currency, now: pick(today), then: pick(thenDate), sinceLabel: formatDate(thenDate), milestone: usedMilestone,
          money: m => formatMoney(moneyText(m), currency),
        }, {...o, example})}/>
      </Suspense>
    </div>}
  </div>;
}
