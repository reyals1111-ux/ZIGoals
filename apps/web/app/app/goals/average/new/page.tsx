import {AverageGoalForm} from '../../../../../components/goals/average-goals';
import {PageHeader} from '../../../../../components/page-header';
import type {Metadata} from 'next';
// Session AA-Cloud Part 2 (G8): a new "keep an average" goal, optionally from a library template.
export const metadata: Metadata = {title: 'Keep an average'};
export default async function Page({searchParams}: {searchParams: Promise<{template?: string}>}) {
  const {template} = await searchParams;
  return <div className="dashboard average-goal-new">
    <PageHeader className="page-heading" eyebrow="A goal you keep" title="Keep an average" lede="Sleep, steps, water or your own measure, held over a rolling window. Kept on this device for now." />
    <AverageGoalForm templateId={template} />
  </div>;
}
