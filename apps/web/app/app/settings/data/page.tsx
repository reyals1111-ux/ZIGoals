import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHeader} from '../../../../components/page-header';
import {DataHealthView} from '../../../../components/data-health/data-health-view';
// Session AA-Cloud Part 6: Settings → Your data, where each part of your data lives.
// Settings' own layout sets a plain title, so the root template does not reach this page: the full title is written here.
export const metadata: Metadata = {title: {absolute: 'Your data · ZIGoals Alpha'}};
export default function Page() {
  return <div className="dashboard data-health-page">
    <PageHeader className="page-heading" eyebrow="Settings · data health" title="Your data" lede="Where each part of your data lives, what this device holds and what ZIGi can see. It changes nothing unless you restore a backup." actions={<Link className="secondary" href="/app/settings">← Settings</Link>} />
    <DataHealthView />
  </div>;
}
