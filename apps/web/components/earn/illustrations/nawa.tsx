'use client';
import {Box, Btn, Illustration, Lines, Mark, T} from './parts';

/**
 * Session AF chunk 2 (P1.18): Nawa's site, redrawn from the Part 0 captures of www.nawa.finance and app.nawa.finance
 * (2026-10-18, 22:27–22:28 UTC). Without a connected wallet the app showed the same landing page, so only its way in is
 * drawn: what the vault screens look like after connecting was not seen by ZIGoals.
 */
export function NawaVaults() {
  return <Illustration app="Nawa" host="www.nawa.finance" screens={[
    {label: 'the landing page and View All Vaults', caption: 'Nawa’s page explains its Shariah-compliant approach. “View All Vaults” leads to the vaults; “Audits” to its audit report.', draw: <>
      <T x={16} y={10} size={8} tone="muted">Sharia Compliance · Yield Strategies · Insights</T><Btn x={262} y={1} w={46} h={14} label="Use Nawa"/>
      <T x={16} y={44} size={12} tone="strong">Ethical yield infrastructure…</T>
      <Lines x={16} y={56} widths={[200, 170]}/>
      <Btn x={16} y={78} w={86} label="View All Vaults" hot/><Mark x={110} y={87} n={1}/><Btn x={124} y={78} w={46} label="Audits"/>
      <Box x={16} y={108} w={140} h={60} tone="dim"/><Box x={166} y={108} w={140} h={60} tone="dim"/>
    </>},
  ]}/>;
}
