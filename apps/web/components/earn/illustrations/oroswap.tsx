'use client';
import {Box, Btn, Illustration, Lines, Mark, T} from './parts';

/**
 * Session AF chunk 2 (P1.18): OroSwap's app, redrawn from the Part 0 captures of app.oroswap.org/swap and /pools (2026-10-18,
 * 22:23–22:24 UTC). On a first visit a Terms of Service gate covers the app; Part 0 did not accept it (that is the person's
 * own choice), so the swap and pool screens were read dimmed behind the gate: labels as the app writes them.
 */
const nav = (active: 'Swap' | 'Liquidity') => <>
  {(['Swap', 'Liquidity', 'Portfolio'] as const).map((n, i) => <T key={n} x={16 + i * 46} y={10} size={8} tone={n === active ? 'gold' : 'muted'}>{n}</T>)}
  <Btn x={240} y={1} w={68} h={14} label="Connect Wallet"/>
</>;
export function OroswapSwap() {
  return <Illustration app="OroSwap" host="app.oroswap.org/swap" screens={[
    {label: 'the Terms of Service gate', caption: 'On a first visit OroSwap shows its Terms of Service. Read them; accepting is your own decision (tick the box, then “I agree and I’m a non-restricted User”).', draw: <>
      <Box x={70} y={4} w={180} h={170}/>
      <T x={160} y={22} size={10} tone="strong" anchor="middle">Terms of Service</T>
      <Lines x={84} y={32} widths={[150, 146, 152, 120, 148, 140, 96]}/>
      <rect x={84} y={106} width={9} height={9} rx={2} className="il-ring"/><T x={98} y={114} size={7} tone="muted">By clicking this checkbox, I agree…</T><Mark x={72} y={110} n={1}/>
      <Btn x={84} y={132} w={152} h={20} label="I agree and I'm a non-restricted User" hot/>
    </>},
    {label: 'the Swap card', caption: 'Connect your wallet, then choose what you give (From) and what you get (To), and the amount. 50 % and Max fill it in for you.', draw: <>
      {nav('Swap')}
      <Box x={70} y={24} w={180} h={150}/>
      <T x={80} y={40} size={10} tone="strong">Swap</T><Btn x={214} y={31} w={28} h={13} label="0.5%" pill/>
      <Box x={80} y={48} w={160} h={36} tone="field"/><T x={86} y={60} tone="muted">From</T><Btn x={192} y={54} w={40} h={14} label="USDC" pill/><T x={86} y={77} size={9} tone="gold">amount</T>
      <Btn x={150} y={70} w={18} h={11} label="50%" pill/><Btn x={171} y={70} w={18} h={11} label="Max" pill/>
      <Box x={80} y={90} w={160} h={36} tone="field"/><T x={86} y={102} tone="muted">To</T><Btn x={192} y={96} w={40} h={14} label="ZIG" pill/>
      <Btn x={80} y={140} w={160} label="Connect Wallet" hot/><Mark x={258} y={149} n={2}/>
    </>},
    {label: 'price impact, slippage, Swap', caption: 'Before pressing Swap, check the price impact and the slippage limit (0.5 % here). Your wallet then asks you to approve one swap.', draw: <>
      {nav('Swap')}
      <Box x={70} y={24} w={180} h={150}/>
      <T x={80} y={40} size={10} tone="strong">Swap</T><rect x={214} y={31} width={28} height={13} rx={6.5} className="il-ring"/><Btn x={214} y={31} w={28} h={13} label="0.5%" pill/>
      <Lines x={80} y={56} widths={[140, 120, 150]} gap={14}/>
      <Btn x={80} y={140} w={160} label="Swap" hot/><Mark x={258} y={149} n={3}/>
    </>},
  ]}/>;
}
export function OroswapPools() {
  return <Illustration app="OroSwap" host="app.oroswap.org/pools" screens={[
    {label: 'the Liquidity Pools list', caption: 'Liquidity lists the pools. Find the two tokens you hold and press Deposit on that pool (Create makes a new pool and costs a fee).', draw: <>
      {nav('Liquidity')}
      <T x={16} y={36} size={12} tone="strong">Liquidity Pools</T><Btn x={262} y={26} w={46} h={14} label="Create"/>
      {[0, 1, 2, 3].map(i => <g key={i}><Box x={16} y={48 + i * 30} w={292} h={24} tone="field"/><Lines x={26} y={57 + i * 30} widths={[70]}/><Btn x={250} y={52 + i * 30} w={50} h={16} label="Deposit" hot={i === 1}/></g>)}
      <Mark x={312} y={86} n={1}/>
    </>},
    {label: 'both amounts, then Deposit', caption: 'Type one amount; the page fills in the other at the pool’s price. Your wallet asks you to approve one deposit that returns LP tokens, your share.', draw: <>
      {nav('Liquidity')}
      <Box x={70} y={24} w={180} h={150}/>
      <Box x={80} y={34} w={160} h={30} tone="field"/><T x={86} y={53} size={9} tone="gold">amount</T><Btn x={196} y={42} w={36} h={14} label="ZIG" pill/>
      <Box x={80} y={70} w={160} h={30} tone="field"/><T x={86} y={89} size={9} tone="muted">filled in</T><Btn x={196} y={78} w={36} h={14} label="USDC" pill/>
      <Btn x={80} y={140} w={160} label="Deposit" hot/><Mark x={258} y={149} n={2}/>
    </>},
  ]}/>;
}
