import type {Metadata} from 'next';
import {PageHeader} from '../../../components/page-header';
import {OrbitArt} from '../../../components/header-art/orbit-art';
import {ShareGlyph} from '../../../components/header-art/glyphs/share';
import {ShareInbox} from '../../../components/share/share-inbox';
// Session AA-Cloud Part 7: the manifest's share target (GET), what another app shared with ZIGoals.
export const metadata: Metadata = {title: 'Shared with ZIGoals'};
type Q = {title?: string | string[]; text?: string | string[]; url?: string | string[]};
const one = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
export default async function Page({searchParams}: {searchParams: Promise<Q>}) {
  const q = await searchParams;
  return <div className="dashboard share-page">
    <PageHeader className="page-heading" eyebrow="From another app" title="Shared with ZIGoals" art={<OrbitArt glyph={ShareGlyph} spin={20}/>} />
    <ShareInbox title={one(q.title)} text={one(q.text)} url={one(q.url)} />
  </div>;
}
