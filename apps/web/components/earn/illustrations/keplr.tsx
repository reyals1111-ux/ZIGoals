'use client';
import {Box, Btn, Illustration, Lines, Mark, T} from './parts';

/**
 * Session AF chunk 2 (P1.18): Keplr's web dashboard for ZIGChain and its staking deep link, redrawn from the Part 0 captures
 * of wallet.keplr.app/chains/zigchain (2026-10-18, 22:24–22:25 UTC). The staking window opens only once a wallet is
 * connected, which Part 0 never did: the last step is in words, as Keplr describes it, not drawn.
 */
export function KeplrStaking() {
  return <Illustration app="Keplr" host="wallet.keplr.app/chains/zigchain" screens={[
    {label: 'the ZIGChain page and Connect Wallet', caption: 'Keplr’s ZIGChain page lists the validators. Press Connect Wallet and approve the connection in the Keplr extension or app.', draw: <>
      <Box x={8} y={4} w={58} h={170} tone="dim"/><T x={16} y={22} size={8} tone="muted">Chains</T><T x={16} y={40} size={8} tone="muted">Buy Crypto</T>
      <T x={78} y={20} size={13} tone="strong">ZIGChain</T><Btn x={238} y={8} w={72} h={16} label="Connect Wallet" hot/><Mark x={230} y={30} n={1}/>
      <Btn x={78} y={32} w={44} h={13} label="Staking" pill/><Btn x={126} y={32} w={58} h={13} label="Governance" pill/>
      <Btn x={78} y={54} w={52} h={13} label="Active (14)" pill/>
    </>},
    {label: 'the validator table', caption: 'Compare validators by Voting Power and Commission (ZIGoals’ own list below adds uptime and self-bond). Choose one that is not top-heavy.', draw: <>
      <T x={16} y={14} size={11} tone="strong">ZIGChain</T><Btn x={16} y={22} w={52} h={13} label="Active (14)" pill/>
      <Box x={16} y={42} w={292} h={18} tone="field"/><T x={24} y={54} size={8} tone="muted">Validator</T><T x={180} y={54} size={8} tone="muted">Voting Power</T><T x={260} y={54} size={8} tone="muted">Commission</T>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><Lines x={24} y={70 + i * 20} widths={[96]}/><Lines x={180} y={70 + i * 20} widths={[40]}/><Lines x={260} y={70 + i * 20} widths={[22]}/></g>)}
      <rect x={18} y={84} width={288} height={18} rx={5} className="il-ring"/><Mark x={10} y={93} n={2}/>
    </>},
  ]}/>;
}
