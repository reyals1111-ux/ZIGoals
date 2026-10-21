import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHeader} from '../../../../../components/page-header';
import AddMoneyBack from '../../../../../components/add-money/add-money-back';
// Session AF (L2b, Part 4, ADR-028 H83): where Ramp or Banxa send the person back; what happens next and the balance watch.
export const metadata: Metadata = {title: 'Add money: what happens next'};
export default function Page() {
  return <div className="dashboard add-money-page">
    <PageHeader className="page-heading" eyebrow="Wealth · Add money" title="What happens next" lede="The provider sends your crypto to your own wallet. ZIGoals watches that one address, read-only, and shows it when it lands." actions={<Link className="secondary" href="/app/wealth">← Wealth</Link>} />
    <AddMoneyBack />
  </div>;
}
