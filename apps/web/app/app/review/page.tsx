import type {Metadata} from 'next';
import {PageHeader} from '../../../components/page-header';
import {LifeReviewView} from '../../../components/life-review/life-review-view';
// Session AA-Cloud Part 5: the Life review, a week or a month across Goals, Habits, Health and Wealth.
export const metadata: Metadata = {title: 'Life review'};
export default function Page() {
  return <div className="dashboard life-review-page">
    <PageHeader className="page-heading" eyebrow="Your life, in review" title="Life review" lede="A week or a month across your goals, habits, health and wealth, from your own records. Kept on this device." />
    <LifeReviewView />
  </div>;
}
