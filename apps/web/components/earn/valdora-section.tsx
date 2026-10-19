'use client';
import type {LiveState} from '../../lib/earn/client';
import {decimal, pctShort, tokenAmount, usd, zig} from '../../lib/earn/format';
import type {DefillamaData, ValdoraData} from '../../lib/earn/live/types';
import {PROVIDER_CLAIMS, READ_ON} from '../../lib/earn/options';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {VerifiedLink} from '../links/verified-link';
import {GuideLink, type Guide} from './guide-panel';
import {LiveFigure, Unavailable, shown} from './live-figure';
import {OptionSection, type Tag} from './option-section';
import {IllustrationSlot} from './illustrations/slot';
import {Risk} from './risk';
import type {PositionRead} from './use-earn-positions';
import {WhatsThis} from './whats-this';
import {YourPosition} from './your-position';

/**
 * Session AF (L1, ADR-028 H26, H44, H88): Valdora's liquid staking. The contract figures are read live from its pinned
 * mainnet staker (fee, minimum, supply, paused, the admin's key kind); the stZIG→ZIG rate is shown only while OroSwap's
 * pool agrees within 2 %. DefiLlama's figures are labelled third party. The single-admin-key fact is the chain's, stated
 * with the block it was read at, beside what Valdora's own security page says, without judgement.
 */
export const VALDORA_GUIDE: Guide<'valdora'> = {id: 'valdora-stake', app: 'Valdora', title: 'Stake ZIG on Valdora for stZIG', provider: 'valdora', kind: 'stake', open: 'Open Valdora', option: 'valdora',
  steps: ['On Valdora’s Stake page, press Connect Wallet and choose your wallet (Keplr, for example).', 'Enter the ZIG you want to stake: at least the minimum shown here.', 'Check “You will get … stZIG”, then press Stake.', 'In your wallet, review and sign: ZIG goes to Valdora’s staking contract and stZIG comes back to you.', 'To leave later: the Unstake tab, then Claim once the waiting time has passed. Or sell stZIG on OroSwap.']};
// crit1: written at render, so it follows the person's date style like every other "read" date on Earn.
const readDay = () => formatDate(`${READ_ON}T12:00:00Z`, {timeZone: 'UTC'});
export function ValdoraSection({valdora, llama, now, reads = []}: {valdora: LiveState<ValdoraData>; llama: LiveState<DefillamaData>; now: number; reads?: readonly PositionRead[]}) {
  const day = readDay();
  const data = valdora.phase === 'ok' ? valdora.answer.data : null;
  const tags: Tag[] = [data?.paused || data?.emergencyMode ? {tone: 'paused', text: data.emergencyMode ? 'Emergency mode on' : 'Paused right now'} : {tone: 'live', text: 'Live on mainnet'}, {tone: 'contract', text: 'A contract holds the ZIG'}];
  const stzigPool = llama.phase === 'ok' && llama.answer.data.pools.status === 'ok' ? llama.answer.data.pools.rows.find(r => r.project === 'valdora-finance' && r.symbol.toUpperCase() === 'STZIG') : undefined;
  const unavailable = valdora.phase === 'unavailable' ? valdora.reason : 'UPSTREAM_DOWN';
  return <OptionSection id="valdora" eyebrow="Valdora · liquid staking" title="Stake and keep a token: stZIG"
    lede={<>Stake ZIG through Valdora’s contract and receive stZIG, a token that stands for your staked ZIG and is worth more ZIG as rewards come in. <WhatsThis term="liquid-staking"/></>}
    logo={{src: '/ecosystem-logos/valdora.png', alt: 'Valdora site icon'}}
    tags={tags}
    facts={[
      {label: 'Best for', value: <>Staking while keeping a token you can move, or sell any time on an exchange. <WhatsThis term="swap"/></>},
      {label: 'Who runs it', value: 'Valdora Finance (part of the ZIG Finance ecosystem), through a smart contract on ZIGChain.'},
      {label: 'Who holds the funds', value: <>Valdora’s contract holds and stakes the ZIG; you hold stZIG in your own wallet. <WhatsThis term="custody"/></>},
      {label: 'Who can use it', value: 'Valdora’s terms ask that you are allowed to use it where you live. ZIGoals has not checked that for you.'},
    ]}
    figures={<>
      <LiveFigure id="valdora-rate" big label="1 stZIG is worth" now={now} figure={shown(valdora, d => d.rate.status === 'ok' ? <>{decimal(d.rate.zigPerStZig, 4)} ZIG</> : {unavailable: d.rate.reason})}
        hint={<>{data?.rate.status === 'ok' ? <>Valdora’s contract rate ({data.rate.basis}). OroSwap’s pool says {decimal(data.rate.dexZigPerStZig, 4)} ZIG; shown only while the two agree within 2 %.</> : 'Shown only while Valdora’s contract and OroSwap’s pool agree within 2 %.'} <WhatsThis term="exchange-rate"/></>}/>
      <LiveFigure id="valdora-fee" label="Valdora’s fee" now={now} figure={shown(valdora, d => <>{pctShort(d.feeOfRewards)} of the staking rewards</>)}/>
      <LiveFigure id="valdora-minimum" label="Minimum to stake" now={now} figure={shown(valdora, d => zig(d.minDepositAzig))}/>
      <LiveFigure id="valdora-supply" label="stZIG in circulation" now={now} figure={shown(valdora, d => tokenAmount(d.stZigSupplyUnits, d.stZigDecimals, 'stZIG', {compact: true}))}/>
      <LiveFigure id="valdora-state" label="Contract state" now={now} figure={shown(valdora, d => d.emergencyMode ? 'Emergency mode on' : d.paused ? 'Paused' : 'Running, not paused')}/>
      <LiveFigure id="valdora-llama-apy" label="DefiLlama’s yearly figure for stZIG" third now={now} figure={stzigPool ? (stzigPool.apy === null ? {kind: 'unavailable', reason: 'NOT_PUBLISHED'} : {kind: 'ok', value: <>{formatNumber(stzigPool.apy, {maximumFractionDigits: 2})} % (APY)</>, answer: (llama as Extract<typeof llama, {phase: 'ok'}>).answer}) : shown(llama, d => d.pools.status === 'ok' ? {unavailable: 'NOT_PUBLISHED'} : {unavailable: d.pools.reason})}
        hint={<>DefiLlama’s own estimate, not ZIGoals’ and not a promise. <WhatsThis term="apy"/></>}/>
      <LiveFigure id="valdora-llama-tvl" label="Value locked in Valdora on ZIGChain" third now={now} figure={shown(llama, d => d.protocols['valdora-finance'].status === 'ok' ? d.protocols['valdora-finance'].tvlUsd === null ? {unavailable: 'NOT_PUBLISHED'} : usd(d.protocols['valdora-finance'].tvlUsd) : {unavailable: d.protocols['valdora-finance'].reason})}/>
    </>}
    mine={<YourPosition reads={reads} kind="valdora"/>}
    columns={[
      {title: 'Fees', body: <><p>{data ? <>Valdora keeps {pctShort(data.feeOfRewards)} of the rewards (read from its contract).</> : <>Valdora’s fee is <Unavailable reason={unavailable} short/> right now.</>} Plus a small network fee for each step you sign. <WhatsThis term="gas"/></p><p className="fine">{PROVIDER_CLAIMS.valdoraUnstakeFee.text} <VerifiedLink provider="valdora" kind="fees" className="text-link" mark="compact">Economics page</VerifiedLink> · <VerifiedLink provider="valdora" kind="faq" className="text-link" mark="compact">FAQ</VerifiedLink></p></>},
      {title: 'Lockups', body: <><p>None while you hold stZIG. To turn stZIG back into ZIG through Valdora: {PROVIDER_CLAIMS.valdoraRedemption.text.charAt(0).toLowerCase() + PROVIDER_CLAIMS.valdoraRedemption.text.slice(1)} <span className="fine">(Valdora’s FAQ, read {day})</span> <WhatsThis term="unbonding"/></p><p><b>The faster way out:</b> sell stZIG for ZIG on OroSwap right away at the pool’s price, usually a little below the contract’s rate.</p></>},
      {title: 'Minimums', body: <p>{data ? <>At least {zig(data.minDepositAzig)} to stake (read from the contract).</> : <>The minimum is <Unavailable reason={unavailable} short/> right now.</>}</p>},
      // Session AF (L1c, N5): each risk with its source (R2 §2, plan section 5): a verified link, or the chain read in words.
      {title: 'Risks', body: <ul className="earn-risks">
        <Risk link={<VerifiedLink provider="valdora" kind="contracts" className="text-link" mark="compact">Valdora’s contracts</VerifiedLink>}>Contract risk: a fault in Valdora’s contract could lose staked ZIG.</Risk>
        <Risk chain={data ? <>the staker contract’s admin account on ZIGChain, read at block {valdora.phase === 'ok' ? valdora.answer.height : ''}</> : 'the staker contract’s admin account on ZIGChain'} link={<VerifiedLink provider="valdora" kind="security" className="text-link" mark="compact">Valdora’s security page</VerifiedLink>}>{data ? data.admin.key === 'single-key' ? <>Who can change the contract: ZIGChain shows that the staker contract’s admin is a single key ({data.admin.address.slice(0, 10)}…{data.admin.address.slice(-6)}), read at block {valdora.phase === 'ok' ? valdora.answer.height : ''}. {PROVIDER_CLAIMS.valdoraMultisig.text} <span className="fine">(read {day})</span></> : <>Who can change the contract: ZIGChain shows the staker contract’s admin as {data.admin.key === 'multisig' ? 'a multi-signature account' : data.admin.key === 'none' ? 'no admin' : 'another kind of account'}, read at block {valdora.phase === 'ok' ? valdora.answer.height : ''}.</> : <>Who can change the contract is <Unavailable reason={unavailable} short/> right now.</>}</Risk>
        <Risk chain={`the staker contract’s history on ZIGChain, read ${day}`}>That admin has replaced the contract’s code before, most recently on 30 September 2026. ZIGoals shows Valdora’s figures only while the contract runs the code ZIGoals checked.</Risk>
        <Risk link={<VerifiedLink provider="valdora" kind="faq" className="text-link" mark="compact">Valdora’s FAQ</VerifiedLink>}>Leaving through Valdora takes weeks and cannot be cancelled once it starts.</Risk>
        <Risk link={<><VerifiedLink provider="valdora" kind="faq" className="text-link" mark="compact">Valdora’s FAQ</VerifiedLink> and <VerifiedLink provider="valdora" kind="fees" className="text-link" mark="compact">its economics page</VerifiedLink></>}>Valdora’s own pages disagree on whether leaving costs a fee: its FAQ says unstaking may include one, its economics page says there is none on redemption.</Risk>
        <Risk chain="OroSwap’s stZIG / ZIG pool and Valdora’s contract, both read from the chain (the rate above)">Selling stZIG on OroSwap is quick, but usually gets a little less ZIG than the contract’s rate, and less again in a large sale.</Risk>
        <Risk chain="Valdora’s ledgers on ZIGChain, which stake with validators under the chain’s slashing rules">If a validator Valdora stakes with is slashed, the loss passes on to what stZIG is worth. <WhatsThis term="validator"/> <WhatsThis term="slashing"/></Risk>
        <Risk chain="ZIG’s price in OroSwap’s ZIG / USDC pools, read from the chain (the OroSwap section)">ZIG’s price moves, and stZIG moves with it.</Risk>
      </ul>},
    ]}
    steps={[
      {text: 'Open Valdora’s Stake page (a new tab) and connect your wallet with Valdora’s own Connect Wallet button.'},
      {text: <>Enter the ZIG to stake{data ? <> (at least {zig(data.minDepositAzig)})</> : null}.</>},
      {text: 'Press Stake and review in your wallet.', sign: 'one transaction to Valdora’s staking contract that sends your ZIG and returns stZIG to your wallet.'},
      {text: 'Your stZIG grows in ZIG value as rewards come in; you do not need to claim anything.'},
      {text: 'To leave: Unstake (wait, then Claim), or swap stZIG for ZIG on OroSwap.'},
    ]}
    stepsTime="about 5 minutes to stake; leaving through Valdora takes the unbonding time plus 2 days."
    illustration={<IllustrationSlot set="valdora-stake"/>}
    actions={<>
      <GuideLink guide={VALDORA_GUIDE}/>
      <VerifiedLink provider="valdora" kind="docs" className="secondary">Valdora’s docs</VerifiedLink>
      <VerifiedLink provider="valdora" kind="defillama" className="secondary" mark="compact">On DefiLlama</VerifiedLink>
    </>}
  />;
}
