import type {Metadata} from 'next';
import {PageHeader} from '../../../components/page-header';
import {NotesPageClient} from '../../../components/notes/notes-page-client';
// Session AK (owner follow-up 2, B): notes that connect to your life — capture, daily notes, [[links]], backlinks, a graph
// and Markdown files, all on this device. The body loads on use (components/notes/notes-page-client.tsx).
// Session AK G2 (RELEASE_REVIEW_2 R2-18): the lede says how Notes and the Journal differ; `[[` is explained in the note field.
export const metadata: Metadata = {title: 'Notes'};
export default function Page() {
  return <div className="dashboard notes-route">
    <PageHeader className="page-heading" eyebrow="Your thoughts, linked to your life" title="Notes" lede="Capture now, file later. Journal is how the day felt; a note is anything you want to keep. Private, on this device." />
    <NotesPageClient />
  </div>;
}
