import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHeader} from '../../../../components/page-header';
import {OrbitArt} from '../../../../components/header-art/orbit-art';
import {WealthGlyph} from '../../../../components/header-art/glyphs/wealth';
import AddMoneyView from '../../../../components/add-money/add-money-view';
// Session AF (L2b, Part 4, ADR-028 H83): Add money, multi-asset, to the person's own wallet through Ramp or Banxa.
export const metadata: Metadata = {title: 'Add money'};
export default function Page() {
  return <div className="dashboard add-money-page">
    <PageHeader className="page-heading" eyebrow="Wealth · buy crypto with a card or a bank transfer" title="Add money" lede="Buy a digital dollar or a coin from a regulated provider, straight to your own wallet. ZIGoals guides you and watches for it to arrive; it never touches the money." actions={<Link className="secondary" href="/app/wealth">← Wealth</Link>} art={<OrbitArt glyph={WealthGlyph} tone="wealth" spin={24}/>} />
    <AddMoneyView />
  </div>;
}
