import type {Metadata} from 'next';
import {PageHeader} from '../../../components/page-header';
import {JournalPageClient} from '../../../components/journal/journal-page-client';
// Session AI (feature 6): the journal and the daily energy rating, kept on this device.
export const metadata: Metadata = {title: 'Journal'};
export default function Page() {
  return <div className="dashboard journal-route">
    <PageHeader className="page-heading" eyebrow="Your days, in your words" title="Journal" lede="A few lines a day, your energy, and one question from ZIGi. Private, on this device." />
    <JournalPageClient />
  </div>;
}
