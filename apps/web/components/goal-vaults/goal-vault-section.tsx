'use client';
import './goal-vaults.css';
import Link from 'next/link';
import {useEffect, useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useLinkedWallets} from '../wallet/use-linked-wallets';
import {VaultLinkForm} from './vault-link-form';
import {VaultOrbit} from './vault-orbit';
import {GOAL_VAULTS, GoalVaultError, linksFor, writeGoalVaults, withoutLink, type VaultLink} from '../../lib/goal-vaults/store';
import {progressOf, shareOfGoal, stakeOf, type Progress} from '../../lib/goal-vaults/progress';
import {ILLUSTRATION_LABEL, illustrate, rateFromPercent} from '../../lib/goal-vaults/illustration';
import {WALLET_BALANCES, observationOf} from '../../lib/wallets/balances/store';
import {chainById} from '../../lib/wallets/balances/chains';
import {BALANCE_FRESH_MS, refreshOne} from '../../lib/wallets/balances/read';
import {shownUnits} from '../../lib/wallets/balances/units';
import {readEarn} from '../../lib/earn/client';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {formatDateTime} from '../../lib/visual-format';
import type {LinkedWallet} from '../../lib/linked-wallets';

/**
 * Session AF (L2b, Part 6, ADR-028 H8, H11, H17, H44; P6.2–P6.4): Goal Vaults inside a Goal's detail (a lazy chunk). Link a
 * ZIGChain wallet's real stake (delegations and/or Valdora stZIG) to this Goal; the card then shows the stake now, the
 * rewards waiting, stZIG in ZIG at the two-source rate (or in stZIG units when the sources disagree), the change since the
 * link, and the stake as a moon on the Goal's ring. A projection appears only as a labelled illustration. Read-only: the
 * stake never leaves the wallet, no message is built, practice (testnet) stake never counts (H11), and the link is a
 * device-only record. Reads happen only when the module is open (ZIGoals' read-only relay, at most every 15 minutes).
 */
const ZIGCHAIN = chainById('zigchain-1')!;
const clock = () => Date.now();
const zig = (azig: bigint) => `${azig < 0n ? '−' : ''}${shownUnits((azig < 0n ? -azig : azig).toString(), 18, 4)} ZIG`;
export const VAULT_LINE = 'Your money is working toward this goal: the ZIG you staked keeps earning on ZIGChain, and it never leaves your wallet.';
export const NOT_RECONSTRUCTED = 'Rewards you claimed and moved out since linking are not counted back: ZIGoals keeps no history of them.';
type Rates = {stzig: {phase: 'loading'} | {phase: 'ok'; rate: string; source: string; at: string} | {phase: 'unavailable'; reason: string}; chain: {phase: 'loading'} | {phase: 'ok'; rate: string; height?: string; at: string} | {phase: 'unavailable'; reason: string}};
export default function GoalVaultSection({goal}: {goal: {id: string; name: string; asset: string; decimals: number; target: string}}) {
  const id = useId(), root = useRef<HTMLDivElement>(null), linked = useLinkedWallets(), vaults = useDeviceRecord(GOAL_VAULTS), balances = useDeviceRecord(WALLET_BALANCES);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState<string[]>([]), [message, setMessage] = useState(''), [assumption, setAssumption] = useState('');
  const [rates, setRates] = useState<Rates>({stzig: {phase: 'loading'}, chain: {phase: 'loading'}});
  const wallets = linked.wallets.filter(w => w.kind === 'cosmos' && /^zig1/.test(w.address)), links = linksFor(vaults.data, goal.id);
  // Open or closed: the Goal module is a <details>; nothing is read until the person opens it.
  useEffect(() => {
    const details = root.current?.closest('details');
    if (!details) { setOpen(true); return; }
    const sync = () => setOpen(details.open);
    sync(); details.addEventListener('toggle', sync);
    return () => details.removeEventListener('toggle', sync);
  }, []);
  const read = async (wallet: LinkedWallet) => {
    if (isShowcase()) return;
    setBusy(b => [...b, wallet.id]);
    try { await refreshOne(getAppStorage(), wallet, ZIGCHAIN); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: WALLET_BALANCES.key})); }
    finally { setBusy(b => b.filter(x => x !== wallet.id)); }
  };
  const linkedKey = links.map(l => l.walletId).join(',');
  useEffect(() => {
    if (!open || !balances.loaded) return;
    for (const l of links) {
      const w = wallets.find(x => x.id === l.walletId), o = w && observationOf(balances.data, w.id, ZIGCHAIN.id);
      const last = Math.max(0, ...[o?.at, o?.errorAt].map(t => Date.parse(t ?? '')).filter(Number.isFinite));
      if (w && clock() - last >= BALANCE_FRESH_MS) void read(w);
    }
    let alive = true;
    void readEarn('valdora').then(s => { if (!alive) return; const r = s.phase === 'ok' ? s.answer.data.rate : null;
      setRates(x => ({...x, stzig: s.phase === 'ok' && r && r.status === 'ok' ? {phase: 'ok', rate: r.zigPerStZig, source: s.answer.source.name, at: s.answer.fetchedAt} : {phase: 'unavailable', reason: s.phase === 'ok' && r && r.status === 'unavailable' ? (r.reason === 'SOURCES_DISAGREE' ? 'Valdora’s rate and OroSwap’s pool disagree by more than 2 %' : 'the rate could not be read') : 'the rate could not be read'}})); });
    void readEarn('chain').then(s => { if (!alive) return;
      setRates(x => ({...x, chain: s.phase === 'ok' ? {phase: 'ok', rate: s.answer.data.apr.beforeCommission, at: s.answer.fetchedAt, ...(s.answer.height ? {height: s.answer.height} : {})} : {phase: 'unavailable', reason: 'the chain’s rate could not be read'}})); });
    return () => { alive = false; };
  }, [open, balances.loaded, linkedKey]); // eslint-disable-line react-hooks/exhaustive-deps -- once per opening and link set
  const stzigRate = rates.stzig.phase === 'ok' ? rates.stzig.rate : null;
  const remove = (link: VaultLink) => { try { writeGoalVaults(getAppStorage(), r => withoutLink(r, link.id)); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: GOAL_VAULTS.key})); setMessage('The link is removed. Your stake is unchanged.'); } catch (e) { setMessage(e instanceof GoalVaultError ? e.message : 'This device refused to remove the link.'); } };
  const readingOf = (walletId: string) => { const o = observationOf(balances.data, walletId, ZIGCHAIN.id); return {reading: stakeOf(o), error: o?.error, busy: busy.includes(walletId)}; };
  const ownRate = rateFromPercent(assumption);
  return <div ref={root} className="goal-vault" data-goal-vault>
    <p className="goal-vault-line">{VAULT_LINE}</p>
    {linked.showcase ? <p className="fine">The Showcase keeps its simulated wallet; Goal Vaults use the wallets you link yourself.</p> : <>
      {links.map(link => {
        const wallet = wallets.find(w => w.id === link.walletId), state = readingOf(link.walletId), now = state.reading;
        const p: Progress | null = now ? progressOf(link, now, stzigRate) : null, share = p ? shareOfGoal(goal, p.totalAzig) : null;
        const goalAzig = goal.asset === 'ZIG' ? BigInt(goal.target) * 10n ** BigInt(18 - Math.min(18, goal.decimals)) : null;
        const ill = p && goalAzig !== null ? illustrate({currentAzig: p.totalAzig, targetAzig: goalAzig, yearlyRate: ownRate ?? (rates.chain.phase === 'ok' ? rates.chain.rate : null)}) : null;
        return <section key={link.id} className="goal-vault-card" aria-labelledby={`${id}-${link.id}`} data-vault={link.id}>
          <VaultOrbit share={share} rewards={!!p && p.rewardsAzig > 0n}/>
          <div className="goal-vault-figures">
            <h3 id={`${id}-${link.id}`}>{wallet ? `${wallet.label}’s stake` : 'A wallet no longer linked'}</h3>
            {!wallet ? <p>That wallet is no longer linked on this device. Link it again to see this Goal Vault.</p>
              : !now ? <p role="status">{state.busy ? 'Reading your stake…' : state.error ? `Couldn't read the chain just now: ${state.error}` : 'Reading your stake…'}</p>
              : <>
                <dl>
                  {p!.parts.includes('delegations') && <><div><dt>Staked now</dt><dd>{zig(p!.stakedAzig)}</dd></div><div><dt>Rewards waiting</dt><dd>{zig(p!.rewardsAzig)}</dd></div></>}
                  {p!.stzig && <div><dt>Valdora stZIG</dt><dd>{shownUnits(p!.stzig.units.toString(), 6, 4)} stZIG{p!.stzig.valueAzig !== null ? ` ≈ ${zig(p!.stzig.valueAzig)}` : ''}{p!.stzig.valueAzig === null && <small> · value unavailable ({rates.stzig.phase === 'unavailable' ? rates.stzig.reason : 'reading the rate'})</small>}</dd></div>}
                  <div><dt>Working toward “{goal.name}”</dt><dd><strong>{zig(p!.totalAzig)}</strong>{!p!.complete && ' (stZIG not counted)'}{share !== null && ` · ${share.toFixed(2)} % of the Goal`}</dd></div>
                  <div><dt>Since you linked on {formatDateTime(link.linkedAt)}</dt><dd>{p!.since.azig >= 0n ? '+' : ''}{zig(p!.since.azig)}{!p!.since.complete && p!.since.stzigUnits !== null && ` · stZIG ${p!.since.stzigUnits >= 0n ? '+' : '−'}${shownUnits((p!.since.stzigUnits < 0n ? -p!.since.stzigUnits : p!.since.stzigUnits).toString(), 6, 4)}`}</dd></div>
                </dl>
                <p className="fine">Read {formatDateTime(now.at)}{now.height ? ` at block ${now.height}` : ''} through ZIGoals’ read-only relay{state.error ? `; the latest read failed (${state.error}), so this reading is kept` : ''}.{stzigRate && rates.stzig.phase === 'ok' ? ` stZIG at ${stzigRate} ZIG each (Valdora’s rate, matching OroSwap’s pool within 2 %, as of ${formatDateTime(rates.stzig.at)}).` : ''} {NOT_RECONSTRUCTED}</p>
                {goalAzig !== null && <div className="goal-vault-illustration" role="group" aria-label={ILLUSTRATION_LABEL}>
                  <p><strong>{ILLUSTRATION_LABEL}.</strong> {ill?.reached ? 'This stake already covers the Goal.' : ill?.months ? `If this stake kept earning ${ownRate ? `${(Number(ownRate) * 100).toFixed(2)} % a year (your assumption)` : rates.chain.phase === 'ok' ? `${(Number(rates.chain.rate) * 100).toFixed(2)} % a year (the chain’s rate before a validator’s commission, ZIGoals’ read of ZIGChain${rates.chain.height ? ` at block ${rates.chain.height}` : ''})` : ''}, compounded monthly, it would reach the Goal in about ${ill.months} months. Rates change; this is not a promise.` : rates.chain.phase === 'loading' && !ownRate ? 'Reading the chain’s rate…' : 'No illustration: give a yearly rate to see one.'}</p>
                  <label>Your own yearly rate assumption (%) <input inputMode="decimal" value={assumption} onChange={e => setAssumption(e.target.value)} placeholder="e.g. 5" maxLength={6}/></label>
                </div>}
              </>}
            <div className="goal-vault-actions">
              {wallet && <button type="button" className="secondary" disabled={state.busy} onClick={() => void read(wallet)}>{state.busy ? 'Reading…' : '↻ Read again'}</button>}
              {/* Session AF chunk 3 (lane L2a, H60): the rewards sweep's one action here — it opens Staking's restake, which reviews and signs there. */}
              {p && p.rewardsAzig > 0n && <Link className="secondary" href="/app/staking#rewards-sweep">Put your rewards to work →</Link>}
              <button type="button" className="text-link" onClick={() => remove(link)}>Unlink this stake</button>
            </div>
          </div>
        </section>;
      })}
      {!links.length && <p className="goal-vault-empty"><strong>Link your stake to this goal.</strong> Choose a ZIGChain wallet you linked; its staked ZIG (and stZIG) then shows here as working toward “{goal.name}”. Practice stake does not count.</p>}
      {wallets.some(w => !links.some(l => l.walletId === w.id)) || !wallets.length
        ? <VaultLinkForm goalId={goal.id} wallets={wallets.filter(w => !links.some(l => l.walletId === w.id))} readingOf={readingOf} rate={stzigRate} onRead={walletId => { const w = wallets.find(x => x.id === walletId); if (w) void read(w); }} onSaved={m => { window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: GOAL_VAULTS.key})); setMessage(m); }}/>
        : null}
      {message && <p role="status">{message}</p>}
      <p className="fine">Stake on ZIGChain from <Link href="/app/staking">Staking</Link>; the options and their risks are on <Link href="/app/earn">Earn</Link>.</p>
    </>}
  </div>;
}
