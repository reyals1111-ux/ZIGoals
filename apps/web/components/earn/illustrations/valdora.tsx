'use client';
import {Box, Btn, Illustration, Lines, Mark, T} from './parts';

/**
 * Session AF chunk 2 (P1.18): Valdora's own pages, redrawn from the Part 0 captures of valdora.finance/stake, /unstake and
 * /vault/stablecoin-yield (2026-10-18, 22:22–22:23 UTC; docs/earn/ILLUSTRATIONS.md). Labels as the pages write them.
 */
const stakeCard = (tab: 'Stake' | 'Unstake') => <>
  <T x={160} y={16} size={11} tone="strong" anchor="middle">{tab === 'Stake' ? 'Stake Your $ZIG and Receive stZIG' : 'Unstake your stZIG and Receive ZIG'}</T>
  <Box x={70} y={24} w={180} h={150}/>
  <Btn x={78} y={32} w={80} h={16} label="Stake" hot={false} pill/>
  <Btn x={162} y={32} w={80} h={16} label="Unstake" pill/>
</>;
export function ValdoraStake() {
  return <Illustration app="Valdora" host="valdora.finance/stake" screens={[
    {label: 'the Stake page with Connect Wallet', caption: 'On Valdora’s Stake page, press Connect Wallet (top right, or under the form) and pick your wallet.', draw: <>
      {stakeCard('Stake')}
      <T x={80} y={64} tone="muted">Amount</T><T x={80} y={80} size={14} tone="strong">0.00</T>
      <Btn x={170} y={56} w={22} h={13} label="25%" pill/><Btn x={195} y={56} w={22} h={13} label="50%" pill/><Btn x={220} y={56} w={22} h={13} label="Max" pill/>
      <T x={240} y={96} size={7} tone="muted" anchor="end">Available : 0 ZIG</T>
      <T x={80} y={114} tone="muted">You will get</T><T x={80} y={130} size={12} tone="strong">0 stZIG</T>
      <Btn x={78} y={146} w={164} label="Connect Wallet" hot/><Mark x={258} y={155} n={1}/>
      <Btn x={248} y={-12} w={64} h={14} label="Connect Wallet"/>
    </>},
    {label: 'the amount and Stake', caption: 'Type the ZIG to stake (or press 25 %, 50 % or Max), check “You will get … stZIG”, then press Stake.', draw: <>
      {stakeCard('Stake')}
      <Box x={78} y={54} w={84} h={32} tone="field"/><T x={84} y={74} size={12} tone="gold">amount</T>
      <Btn x={170} y={56} w={22} h={13} label="25%" pill/><Btn x={195} y={56} w={22} h={13} label="50%" pill/><Btn x={220} y={56} w={22} h={13} label="Max" pill/>
      <T x={80} y={114} tone="muted">You will get</T><T x={80} y={130} size={12} tone="strong">… stZIG</T>
      <Btn x={78} y={146} w={164} label="Stake" hot/><Mark x={258} y={155} n={2}/>
    </>},
    {label: 'your wallet asks you to approve', caption: 'Your wallet opens with the transaction: ZIG to Valdora’s staking contract, stZIG back to you. Read it, then approve. ZIGoals sees none of this.', draw: <>
      <Box x={20} y={10} w={150} h={160} tone="dim"/>{stakeCard('Stake')}
      <Box x={150} y={20} w={150} h={150}/>
      <T x={225} y={40} size={10} tone="strong" anchor="middle">Your wallet</T>
      <Lines x={162} y={56} widths={[120, 96, 110, 70]}/>
      <T x={162} y={104} tone="muted">Fee shown before you approve</T>
      <Btn x={162} y={140} w={60} label="Reject"/><Btn x={228} y={140} w={62} label="Approve" hot/><Mark x={296} y={130} n={3}/>
    </>},
    {label: 'the Unstake tab and Claim', host: 'valdora.finance/unstake', caption: 'To leave through Valdora: the Unstake tab, then Claim once “Available for claiming” shows your ZIG after the waiting time.', draw: <>
      {stakeCard('Unstake')}
      <rect x={162} y={32} width={80} height={16} rx={8} className="il-ring"/><Mark x={258} y={40} n={4}/>
      <T x={80} y={66} tone="muted">Amount</T><T x={80} y={82} size={14} tone="strong">0.00</T>
      <T x={80} y={110} tone="muted">Available for claiming</T><T x={80} y={124} size={10} tone="strong">0 stZIG</T>
      <Btn x={196} y={110} w={46} h={16} label="Claim" hot/>
      <T x={80} y={150} size={7} tone="muted">My Unstaking Request</T><T x={80} y={162} size={7} tone="muted">Staked Amount</T>
    </>},
  ]}/>;
}
export function ValdoraVault() {
  return <Illustration app="Valdora" host="valdora.finance/vault/…" screens={[
    {label: 'a vault page with Supply and Withdraw', caption: 'Each vault has its own page (Stablecoin Yield, Private Credit, Core Income). Read “Strategy Details”, “Withdrawal Mechanics” and “Risk Information” first.', draw: <>
      <T x={16} y={18} size={13} tone="strong">Stablecoin Yield</T>
      <Lines x={16} y={30} widths={[150, 130, 160, 120, 140, 100]}/>
      <T x={16} y={98} size={8} tone="gold">Strategy Details · Withdrawal Mechanics · Risk Information</T><Mark x={8} y={95} n={1}/>
      <Box x={196} y={8} w={110} h={160}/>
      <Btn x={204} y={16} w={46} h={15} label="Supply" pill/><Btn x={254} y={16} w={46} h={15} label="Withdraw" pill/>
      <Box x={204} y={40} w={96} h={26} tone="field"/><T x={210} y={57} tone="muted">USDC</T><Btn x={272} y={46} w={24} h={13} label="Max" pill/>
      <Btn x={204} y={142} w={96} label="Connect Wallet"/>
    </>},
    {label: 'Supply, then approve in your wallet', caption: 'Connect your wallet, type the USDC to supply and press Supply; your wallet asks you to approve one deposit that returns vault shares.', draw: <>
      <T x={16} y={18} size={13} tone="strong">Stablecoin Yield</T>
      <Lines x={16} y={30} widths={[150, 130, 160, 120]}/>
      <Box x={196} y={8} w={110} h={160}/>
      <rect x={204} y={16} width={46} height={15} rx={7.5} className="il-ring"/><Btn x={204} y={16} w={46} h={15} label="Supply" pill/><Btn x={254} y={16} w={46} h={15} label="Withdraw" pill/>
      <Box x={204} y={40} w={96} h={26} tone="field"/><T x={210} y={57} tone="gold">amount</T>
      <Btn x={204} y={142} w={96} label="Supply" hot/><Mark x={190} y={151} n={2}/>
    </>},
    {label: 'Withdraw is a request', caption: 'To leave: the Withdraw tab files a request; the USDC comes back when the vault pays it out (the page says up to 60 days).', draw: <>
      <T x={16} y={18} size={13} tone="strong">Withdrawal Mechanics</T>
      <Lines x={16} y={30} widths={[160, 140, 150, 90]}/>
      <Box x={196} y={8} w={110} h={160}/>
      <Btn x={204} y={16} w={46} h={15} label="Supply" pill/><rect x={254} y={16} width={46} height={15} rx={7.5} className="il-ring"/><Btn x={254} y={16} w={46} h={15} label="Withdraw" pill/><Mark x={312} y={23} n={3}/>
      <Box x={204} y={40} w={96} h={26} tone="field"/><T x={210} y={57} tone="muted">shares</T>
      <Btn x={204} y={142} w={96} label="Withdraw"/>
    </>},
  ]}/>;
}
