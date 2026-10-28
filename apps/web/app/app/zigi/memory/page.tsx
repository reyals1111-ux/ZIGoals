import type {Metadata} from 'next';
import {PageHeader} from '../../../../components/page-header';
import {MemoryPageClient} from '../../../../components/ai/memory-page';
// Session AI (feature 3): "What ZIGi remembers", the person's own notes for ZIGi on one page.
export const metadata: Metadata = {title: 'What ZIGi remembers'};
export default function Page() {
  return <div className="dashboard zigi-memory-route">
    <PageHeader className="page-heading" eyebrow="Your notes for ZIGi" title="What ZIGi remembers" lede="Everything ZIGi keeps about you, in your words: see it, edit it, pause it, export it or erase it. On this device only; sent to your own AI only while you allow it." />
    <MemoryPageClient />
  </div>;
}
