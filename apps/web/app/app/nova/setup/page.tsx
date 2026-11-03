import type {Metadata} from 'next';
import {PageHeader} from '../../../../components/page-header';
import {NovaGuideBand} from '../../../../components/nova/guide-band';
import {NovaSetupPage} from '../../../../components/nova/setup/setup-page';
// Session AK (owner follow-up 2, N3; lane NC): "Build your own NOVA", the ten-planet setup guide.
export const metadata: Metadata = {title: 'Build your own NOVA'};
export default function Page() {
  return <div className="dashboard nova-setup-route">
    {/* Session AK P3 (ND-19): NOVA's night strip, with "Back to NOVA" as the page's first control. */}
    <NovaGuideBand guide="nova"/>
    <PageHeader className="page-heading" eyebrow="NOVA · your private AI" title="Build your own NOVA" lede="A private assistant with a brain you choose: a model on your own computer first, or your own key. Ten planets, each checked as you go. Nothing here needs a ZIGoals server."/>
    <NovaSetupPage/>
  </div>;
}
