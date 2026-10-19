import Link from 'next/link';
import type {Metadata} from 'next';
import {PageHeader} from '../../../components/page-header';
import {OrbitArt} from '../../../components/header-art/orbit-art';
import {ReviewGlyph} from '../../../components/header-art/glyphs/review';
import {LifeReviewView} from '../../../components/life-review/life-review-view';
// Session AA-Cloud Part 5: the Life review, a week or a month across Goals, Habits, Health and Wealth.
export const metadata: Metadata = {title: 'Life review'};
export default function Page() {
  return <div className="dashboard life-review-page">
    <PageHeader className="page-heading" eyebrow="Your life, in review" title="Life review" lede="A week or a month across your goals, habits, health and wealth, from your own records. Kept on this device." art={<OrbitArt glyph={ReviewGlyph} spin={-8}/>} actions={<Link className="secondary" href="/app/stories">Stories →</Link>} />
    <LifeReviewView />
  </div>;
}
