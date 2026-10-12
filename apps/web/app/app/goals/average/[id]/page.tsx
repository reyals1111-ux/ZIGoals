import {AverageGoalDetail} from '../../../../../components/goals/average-goals';
import type {Metadata} from 'next';
// Session AA-Cloud Part 2 (G8): an average goal's own page.
export const metadata: Metadata = {title: 'Goal'};
export default async function Page({params}: {params: Promise<{id: string}>}) { const {id} = await params; return <AverageGoalDetail id={id} />; }
