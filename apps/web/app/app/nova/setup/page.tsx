import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHeader} from '../../../../components/page-header';
import {NovaSetupPage} from '../../../../components/nova/setup/setup-page';
// Session AK (owner follow-up 2, N3; lane NC): "Build your own NOVA", the ten-planet setup guide.
export const metadata: Metadata = {title: 'Build your own NOVA'};
export default function Page() {
  return <div className="dashboard nova-setup-route">
    <PageHeader className="page-heading" eyebrow="NOVA · your private AI" title="Build your own NOVA" lede="A private assistant with a brain you choose: a model on your own computer first, or your own key. Ten planets, each checked as you go. Nothing here needs a ZIGoals server." actions={<Link className="secondary" href="/app/nova">Back to NOVA</Link>}/>
    <NovaSetupPage/>
  </div>;
}
