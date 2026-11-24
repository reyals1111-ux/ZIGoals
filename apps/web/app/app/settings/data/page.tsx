import type {Metadata} from 'next';
import Link from 'next/link';
import {PageHeader} from '../../../../components/page-header';
import {OrbitArt} from '../../../../components/header-art/orbit-art';
import {DataGlyph} from '../../../../components/header-art/glyphs/data';
import {DataHealthView} from '../../../../components/data-health/data-health-view';
import {AboutThisAlpha} from '../../../../components/alpha/about-this-alpha';
import {SectionHeading} from '../../../../components/ui/section-heading';
import ExportBridges from '../../../../components/export/export-bridges';
import {ReportLauncher} from '../../../../components/report/report-launcher';
// Session AA-Cloud Part 6: Settings → Your data, where each part of your data lives.
// Settings' layout carries the root template on (Session AC), so the title is "Your data · ZIGoals Alpha".
export const metadata: Metadata = {title: 'Your data'};
export default function Page() {
  return <div className="dashboard data-health-page">
    <PageHeader className="page-heading" eyebrow="Settings · data health" title="Your data" lede="Where each part of your data lives, what this device holds and what ZIGi can see. It changes nothing unless you restore a backup." actions={<Link className="secondary" href="/app/settings">← Settings</Link>} art={<OrbitArt glyph={DataGlyph} spin={8}/>} />
    {/* Session AV lane 2 (fr-layout, FR-L-7): the restore is 6–8 screens down (About this Alpha and the lists come first); one jump,
        right under the header: in the header's actions it wrapped into the header art's corner on a phone (CI run 2012, header-art-ae). */}
    <p className="data-restore-jump-row"><a className="text-link data-restore-jump" href="#restore">Restore from a backup ↓</a></p>
    {/* Session AC (owner finding 3): this Alpha's facts, always here (they left the footer). */}
    <section className="panel about-alpha-panel" aria-labelledby="about-alpha-title"><SectionHeading id="about-alpha-title" eyebrow="Settings · your data" title="About this Alpha"/><AboutThisAlpha/></section>
    <DataHealthView />
    {/* Session AK (lane S, item 14): a printable report of the person's own log for a visit; its code loads on use. */}
    <ReportLauncher />
    {/* Session AK Part 8.8 (A16): what other apps really import. */}
    <ExportBridges />
  </div>;
}
