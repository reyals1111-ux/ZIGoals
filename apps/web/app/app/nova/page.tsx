import type {Metadata} from 'next';
import {NovaPageClient} from '../../../components/nova/nova-page-client';

// Session AK (owner follow-up 2 N2, follow-up 3 N12; lane NA): NOVA, the person's private command center. A server page
// with its title ("NOVA · ZIGoals Alpha" through the app's template); everything else loads on the client, on use.
export const metadata: Metadata = {title: 'NOVA'};
export default function Page() {
  return <NovaPageClient/>;
}
