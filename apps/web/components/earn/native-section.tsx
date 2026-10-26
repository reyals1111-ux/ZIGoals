'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {aprAtCommission} from '../../lib/earn/apr';
import type {LiveState, ValidatorsAnswer} from '../../lib/earn/client';
import {decimal, duration, pct, pctShort, zig} from '../../lib/earn/format';
import type {ChainData, MeasuredData} from '../../lib/earn/live/types';
import {aprAgreement} from '../../lib/earn/live/measured.mjs';
import {IllustrationSlot} from './illustrations/slot';
import {VerifiedLink} from '../links/verified-link';
import {EarnGlyphMark} from './earn-glyph';
import {GuideLink, type Guide} from './guide-panel';
import {LiveFigure, Unavailable, shown} from './live-figure';
import {OptionSection} from './option-section';
import {Risk} from './risk';
import type {PositionRead} from './use-earn-positions';
import {WhatsThis} from './whats-this';
import {YourPosition} from './your-position';

/**
 * Session AF (L1, ADR-028 H9, H51): native validator staking, the chain's own way to earn. The APR is computed from the
 * chain's figures at one block height (lib/earn/apr.ts), shown before and at a validator's commission, with the formula
 * and every input one tap away. The commission choices are the rates live validators charge now, never a number ZIGoals
 * picked. Signing happens in the person's own wallet: on ZIGoals' Staking page, in Keplr or on the ZIGChain Hub.
 */
export const NATIVE_GUIDE: Guide<'zig-finance'> = {id: 'native-keplr', app: 'Keplr', title: 'Stake ZIG in Keplr', provider: 'zig-finance', kind: 'keplr-staking', open: 'Open Keplr staking', option: 'native-staking',
  steps: ['In Keplr’s staking page, make sure ZIGChain is the chain shown.', 'Choose a validator. Compare commission, uptime and how much stake it already holds (the list on this page has all three).', 'Enter an amount. Keep a little ZIG for network fees.', 'Review in Keplr: you sign one delegation that moves ZIG from your balance into your stake. Nothing else.', 'Come back to ZIGoals: your stake shows on the Staking page once it is read.']};
export function commissionChoices(validators: LiveState<ValidatorsAnswer>): string[] {
  if (validators.phase !== 'ok') return [];
  const active = validators.answer.data.validators.filter(v => v.status === 'bonded' && !v.jailed);
  return [...new Set(active.map(v => v.commission.rate))].sort((a, b) => a - b).map(r => r.toFixed(6));
}
/** Session AF chunk 2 (H97): the measured figure beside the issuance figure, compared at the measured validator's own commission. */
export function aprComparison(chain: LiveState<ChainData>, measured: LiveState<MeasuredData>) {
  if (chain.phase !== 'ok' || measured.phase !== 'ok' || measured.answer.data.measured.status !== 'ok') return null;
  const issuance = aprAtCommission(chain.answer.data.apr, measured.answer.data.validator.commission);
  return {issuance, measured: measured.answer.data.measured.rate, ...aprAgreement(issuance, measured.answer.data.measured.rate)};
}
export function NativeSection({chain, validators, measured, now, reads = []}: {chain: LiveState<ChainData>; validators: LiveState<ValidatorsAnswer>; measured: LiveState<MeasuredData>; now: number; reads?: readonly PositionRead[]}) {
  const choices = useMemo(() => commissionChoices(validators), [validators]);
  const [picked, setPicked] = useState<string | null>(null);
  const commission = picked && choices.includes(picked) ? picked : choices[0] ?? null;
  const data = chain.phase === 'ok' ? chain.answer.data : null;
  const atCommission = data && commission ? aprAtCommission(data.apr, commission) : null;
  const range = validators.phase === 'ok' && choices.length ? `${pctShort(choices[0]!)} to ${pctShort(choices.at(-1)!)}` : null;
  const m = measured.phase === 'ok' ? measured.answer.data : null, compare = aprComparison(chain, measured);
  return <OptionSection id="native-staking" eyebrow="ZIGChain · the network’s own staking" title="Stake ZIG with a validator"
    lede={<>Lend your ZIG’s weight to a validator that helps run ZIGChain, and share in the new ZIG the network pays out every block. <WhatsThis term="validator"/></>}
    logo={{alt: '', glyph: <EarnGlyphMark/>}}
    tags={[{tone: 'live', text: 'Live on mainnet'}, {tone: 'keys', text: 'You keep the keys'}]}
    facts={[
      {label: 'Best for', value: <>Holding ZIG for the long run and earning the network’s own rewards, with no app in between. <WhatsThis term="rewards"/></>},
      {label: 'Who runs it', value: <>The ZIGChain network itself, and the validator you choose to delegate to. <WhatsThis term="staking"/></>},
      {label: 'Who holds the funds', value: <>You do. Your ZIG stays in your own account, delegated; only you can move it. <WhatsThis term="custody"/></>},
      {label: 'Who can use it', value: 'Anyone with a ZIGChain wallet. The rules of the country you live in still apply to you.'},
    ]}
    figures={<>
      <LiveFigure id="native-apr" big label={commission ? <>Yearly rate at a {pctShort(commission)} validator commission · estimate, variable</> : 'Yearly rate before the validator’s commission · estimate, variable'} now={now}
        figure={shown(chain, d => commission ? pct(aprAtCommission(d.apr, commission)) : pct(d.apr.beforeCommission))}
        hint={<>The issuance figure: a simple yearly rate (APR) from the new ZIG the network pays out, block time measured over {data ? <>the last {decimal(data.apr.windowBlocks, 0)} blocks</> : 'recent blocks'}; rewards are not compounded unless you stake them again. Rates move every block. <WhatsThis term="apr"/> <WhatsThis term="commission"/></>}/>
      <LiveFigure id="native-apr-measured" big label={m ? <>Measured: what {m.validator.moniker}’s own stake earned, at its {pctShort(m.validator.commission)} commission</> : 'Measured on one validator’s own stake'} now={now}
        figure={shown(measured, d => d.measured.status === 'ok' ? pct(d.measured.rate) : {unavailable: d.measured.reason})}
        hint={m ? <>The rewards waiting on that validator’s own stake of {zig(m.latest.selfBond)}, read at block {m.latest.height} and {m.measured.status === 'ok' ? decimal(m.measured.windowBlocks, 0) : '10,000'} blocks earlier (block {m.earlier.height}), over the real time between them; it includes what the issuance figure leaves out (transaction fees). One validator, one window: a check, not a promise.</> : 'What one named validator’s own stake earned over the last 10,000 blocks, read from the chain at two heights.'}/>
      <LiveFigure id="native-apr-before" label="Before any commission · estimate, variable" now={now} figure={shown(chain, d => pct(d.apr.beforeCommission))}/>
      <LiveFigure id="native-bonded" label="ZIG staked on the network" now={now} figure={shown(chain, d => <>{zig(d.staking.bondedTokens, {compact: true})} <span className="earn-unit">({pct(d.staking.bondedShare, 1)} of all ZIG)</span></>)}/>
      <LiveFigure id="native-unbonding" label="Unbonding time when you leave" now={now} figure={shown(chain, d => duration(d.staking.unbondingSeconds))} hint={<WhatsThis term="unbonding"/>}/>
      <LiveFigure id="native-commission" label="Commission validators charge now" now={now} figure={validators.phase === 'ok' && range ? {kind: 'ok', value: range, answer: validators.answer} : validators.phase === 'ok' ? {kind: 'unavailable', reason: 'MALFORMED'} : shown(validators, () => null)}/>
      <LiveFigure id="native-inflation" label="New ZIG a year (inflation)" now={now} figure={shown(chain, d => pct(d.mint.inflation))}/>
    </>}
    figuresNote={<>
      {compare && <p className="earn-agreement" data-apr-agreement={compare.disagree ? 'disagree' : 'agree'}>{compare.disagree
        ? <><b>The two figures disagree</b>: at the same {pctShort(m!.validator.commission)} commission, the rate worked out from the new ZIG the network pays out is {pct(compare.issuance)} and the measured stake earned {pct(compare.measured)}. The gap between them is more than a tenth of the worked-out rate (a relative difference of over 10 %, not 10 percentage points). Both stay here; neither is a promise.</>
        : <>At the same {pctShort(m!.validator.commission)} commission, the rate worked out from the new ZIG the network pays out is {pct(compare.issuance)} and the measured stake earned {pct(compare.measured)}. They agree: the gap between them is less than a tenth of the worked-out rate (a relative difference under 10 %, not 10 percentage points).</>}</p>}
      {choices.length > 1 && <fieldset className="earn-commission"><legend>See the rate at a commission validators charge now</legend>{choices.map(c => <label key={c}><input type="radio" name="earn-commission" checked={c === commission} onChange={() => setPicked(c)}/><span>{pctShort(c)}</span></label>)}</fieldset>}
      <details className="earn-formula">
        <summary>How this is computed</summary>
        {data ? <div>
          <p><b>APR = annual provisions ÷ ZIG staked × (1 − community tax) × (real blocks a year ÷ the mint module’s blocks a year) × (1 − the validator’s commission).</b></p>
          <ul>
            <li>Annual provisions: {zig(data.mint.annualProvisions, {compact: true})} a year; ZIG staked: {zig(data.staking.bondedTokens, {compact: true})}. Divided: {pct(data.apr.gross)} gross.</li>
            <li>The network keeps a community tax of {pctShort(data.distribution.communityTax)}: {pct(data.apr.afterTax)} after it.</li>
            <li>The mint module pays per block and counts {decimal(data.mint.blocksPerYear, 0)} blocks a year ({decimal(String(31_536_000 / Number(data.mint.blocksPerYear)), 2)} seconds each over 365 days). Over the last {decimal(data.apr.windowBlocks, 0)} blocks a block took {decimal(data.apr.blockSeconds, 3)} seconds, so a year has about {decimal(data.apr.realBlocksPerYear, 0)} blocks: × {decimal(data.apr.factor, 4)} = {pct(data.apr.beforeCommission)}.</li>
            <li>{commission && atCommission ? <>At a {pctShort(commission)} commission: {pct(atCommission)}.</> : 'Your validator then keeps its commission from that.'} Transaction fees, which also reach stakers, are not counted.</li>
          </ul>
          <p className="fine">Read from the chain at block {data.blocks.latest.height}, with the earlier block {data.blocks.earlier.height}. This is the chain’s arithmetic, not a promise: the rate changes as more or less ZIG is staked.</p>
        </div> : <p>The inputs are <Unavailable reason={chain.phase === 'unavailable' ? chain.reason : 'UPSTREAM_DOWN'} short/> right now, so no rate is shown.</p>}
      </details>
    </>}
    mine={<YourPosition reads={reads} kind="native"/>}
    columns={[
      {title: 'Fees', body: <p>A small network fee for each step you sign, paid in ZIG. Your wallet shows it before you sign. The validator keeps its commission from your rewards ({range ?? 'see the validator list'}). <WhatsThis term="gas"/></p>},
      {title: 'Lockups', body: <p>Your stake earns while it stays. When you leave, your ZIG is locked for {data ? duration(data.staking.unbondingSeconds) : <>the unbonding period (its length is <Unavailable reason={chain.phase === 'unavailable' ? chain.reason : 'UPSTREAM_DOWN'} short/> right now)</>} with no rewards meanwhile. Moving to another validator is instant. <WhatsThis term="redelegate"/></p>},
      {title: 'Minimums', body: <p>No minimum set by the network: any amount above the fee. Keep a little ZIG in your wallet for fees.</p>},
      // Session AF (L1c, N5): each risk with its source: the chain's own rules read live, or a verified link.
      {title: 'Risks', body: <ul className="earn-risks">
        <Risk chain="ZIGChain’s staking rules (the unbonding time), read live">Leaving takes time: after you unstake, your ZIG stays locked for {data ? duration(data.staking.unbondingSeconds) : <>the unbonding period (its length is <Unavailable reason={chain.phase === 'unavailable' ? chain.reason : 'UPSTREAM_DOWN'} short/> right now)</>}, earning nothing and unable to move. Stake only what you can leave alone that long.</Risk>
        <Risk chain="ZIGChain’s slashing rules, read live" tap={<WhatsThis term="slashing"/>}>If your validator double-signs, the network takes {data ? pct(data.slashing.slashFractionDoubleSign) : 'a part'} of the stake delegated to it (slashing) and removes it for good.</Risk>
        <Risk chain="ZIGChain’s slashing rules, read live" tap={<WhatsThis term="jailed"/>}>If it is offline too long (signing fewer than {data ? pctShort(data.slashing.minSignedPerWindow) : 'the set share'} of the last {data ? decimal(data.slashing.signedBlocksWindow, 0) : ''} blocks), the network takes {data ? pct(data.slashing.slashFractionDowntime) : 'a part'} and pauses it (jails it) for {data ? duration(data.slashing.downtimeJailSeconds) : 'a while'}; meanwhile your stake with it earns nothing.</Risk>
        <Risk chain="each validator’s commission record on ZIGChain (its rate, its maximum and its daily change), read live">Your validator can raise its commission, up to the maximum and the daily change it set on the chain, so the share of rewards you keep can change.</Risk>
        <Risk chain={<>the validator list read from ZIGChain (<a className="text-link" href="#validators">see the list below</a>)</>} tap={<WhatsThis term="voting-power"/>}>Most stake sits with a few validators, so the network depends on them; spreading yours helps.</Risk>
        <Risk chain="ZIG’s price in OroSwap’s ZIG / USDC pools, read from the chain (the OroSwap section)">ZIG’s price moves, and staking does not protect you from that: your stake can be worth less when you leave than when you started.</Risk>
        <Risk chain="ZIGChain’s slashing rules, read live" link={<VerifiedLink provider="zig-finance" kind="docs" className="text-link" mark="compact">ZIGChain docs</VerifiedLink>}>The docs and the chain can disagree: ZIGChain’s docs gave a different double-sign penalty from the one the chain applies (read 2 October 2026). ZIGoals shows the chain’s own rules.</Risk>
      </ul>},
    ]}
    steps={[
      {text: 'Choose where to sign: ZIGoals’ Staking page with your connected wallet, Keplr’s staking page, or the ZIGChain Hub.'},
      {text: <>Pick a validator from <a className="text-link" href="#validators">the list on this page</a>. Look at its commission, its uptime and how much stake it already holds.</>},
      {text: 'Enter an amount, keeping a little ZIG for network fees.'},
      {text: 'Review in your wallet and sign.', sign: 'one delegation that moves ZIG from your balance into your stake. Nothing else.', how: <p>Your wallet names this message <code>MsgDelegate</code> (ZIGChain’s staking module): one message, from your address to the validator you picked.</p>},
      {text: 'Rewards start right away. Claim them whenever you like, or stake them again.'},
      {text: <>To leave, undelegate: your ZIG comes back after {data ? duration(data.staking.unbondingSeconds) : 'the unbonding time'}.</>},
    ]}
    stepsTime="about 5 minutes to stake; rewards start with the next block."
    illustration={<IllustrationSlot set="keplr-staking"/>}
    actions={<>
      <Link className="primary" href="/app/staking">Go to Staking</Link>
      <GuideLink guide={NATIVE_GUIDE} className="secondary"/>
      <VerifiedLink provider="zig-finance" kind="hub-staking" className="secondary">Open the ZIGChain Hub</VerifiedLink>
    </>}
  />;
}
