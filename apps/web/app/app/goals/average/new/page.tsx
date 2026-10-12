import {AverageGoalForm} from '../../../../../components/goals/average-goals';
import type {Metadata} from 'next';
// Session AA-Cloud Part 2 (G8): a new "keep an average" goal, optionally from a library template.
export const metadata: Metadata = {title: 'Keep an average'};
export default async function Page({searchParams}: {searchParams: Promise<{template?: string}>}) { const {template} = await searchParams; return <AverageGoalForm templateId={template} />; }
