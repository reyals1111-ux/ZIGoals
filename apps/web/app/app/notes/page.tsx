import type {Metadata} from 'next';
import {PageHeader} from '../../../components/page-header';
import {NotesPageClient} from '../../../components/notes/notes-page-client';
// Session AK (owner follow-up 2, B): notes that connect to your life — capture, daily notes, [[links]], backlinks, a graph
// and Markdown files, all on this device. The body loads on use (components/notes/notes-page-client.tsx).
export const metadata: Metadata = {title: 'Notes'};
export default function Page() {
  return <div className="dashboard notes-route">
    <PageHeader className="page-heading" eyebrow="Your thoughts, linked to your life" title="Notes" lede="Capture now, file later. Daily notes beside what you did that day, and [[links]] to your goals and habits. Private, on this device." />
    <NotesPageClient />
  </div>;
}
