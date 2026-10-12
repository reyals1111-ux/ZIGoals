import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHeader} from '../../../../components/page-header';
import {DataHealthView} from '../../../../components/data-health/data-health-view';
// Session AA-Cloud Part 6: Settings → Your data, where each part of your data lives.
export const metadata: Metadata = {title: 'Your data'};
export default function Page() {
  return <div className="dashboard data-health-page">
    <PageHeader className="page-heading" eyebrow="Settings · data health" title="Your data" lede="Where each part of your data lives, what this device holds and what ZIGi can see. This page only reads; it changes nothing." actions={<Link className="secondary" href="/app/settings">← Settings</Link>} />
    <DataHealthView />
  </div>;
}
