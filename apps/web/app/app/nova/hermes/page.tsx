import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHeader} from '../../../../components/page-header';
import {NovaHermesPage} from '../../../../components/nova/hermes/hermes-page';
// Session AK (owner follow-up 3, N11; lane NC): "Connect your Hermes Agent", the second planet guide next to NOVA's.
export const metadata: Metadata = {title: 'Connect your Hermes Agent'};
export default function Page() {
  return <div className="dashboard nova-hermes-route">
    <PageHeader className="page-heading" eyebrow="NOVA · your own agent" title="Connect your Hermes Agent" lede="Already run Hermes Agent, Nous Research’s open-source agent? Make it NOVA’s brain, or a second agent NOVA can ask. It talks to this browser on your own computer; ZIGoals runs no server for it." actions={<Link className="secondary" href="/app/nova">Back to NOVA</Link>}/>
    <NovaHermesPage/>
  </div>;
}
