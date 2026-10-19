'use client';
import {Box, Btn, Illustration, Mark, T} from './parts';

/**
 * Session AF chunk 2 (P1.18): Skip Go's public bridge page, redrawn from the Part 0 capture of go.skip.build (2026-10-18,
 * 22:29 UTC): two “Select asset” fields, Connect Wallet and Settings. The screens after connecting a wallet were not read,
 * so the route review is described in words, not drawn.
 */
export function SkipGo() {
  return <Illustration app="Skip Go" host="go.skip.build" screens={[
    {label: 'two Select asset fields', caption: 'In the first field choose what you hold and its network (USDC on Base, say); in the second, the asset on ZIGChain (USDC.inj).', draw: <>
      <Btn x={262} y={4} w={46} h={14} label="Settings"/>
      <Box x={70} y={24} w={180} h={150}/>
      <Box x={80} y={34} w={160} h={36} tone="field"/><Btn x={88} y={44} w={70} h={16} label="Select asset" hot pill/><Mark x={68} y={52} n={1}/>
      <Box x={80} y={78} w={160} h={36} tone="field"/><Btn x={88} y={88} w={70} h={16} label="Select asset" hot pill/>
      <Btn x={80} y={140} w={160} label="Connect Wallet"/>
    </>},
    {label: 'Connect Wallet for each network', caption: 'Connect a wallet for every network the route passes through (an Ethereum wallet, and Keplr for Injective and ZIGChain), check the route’s time and steps, then approve each transaction as it asks.', draw: <>
      <Btn x={262} y={4} w={46} h={14} label="Settings"/>
      <Box x={70} y={24} w={180} h={150}/>
      <Box x={80} y={34} w={160} h={36} tone="field"/><T x={88} y={56} size={9} tone="strong">USDC · Base</T>
      <Box x={80} y={78} w={160} h={36} tone="field"/><T x={88} y={100} size={9} tone="strong">USDC.inj · ZIGChain</T>
      <Btn x={80} y={140} w={160} label="Connect Wallet" hot/><Mark x={258} y={149} n={2}/>
    </>},
  ]}/>;
}
