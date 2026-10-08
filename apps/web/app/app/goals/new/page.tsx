import {UnifiedGoalWizard} from '../../../../components/unified-goal-wizard';
import {NebulaFlow} from '../../../../components/nebula-flow';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: 'Create a goal'};
export default async function NewGoal({searchParams}:{searchParams:Promise<{position?:string}>}){
 const {position}=await searchParams;
 return <><div className="page-heading"><div><p className="eyebrow page-eyebrow"><NebulaFlow identity="goal-new-eyebrow">A destination worth planning for</NebulaFlow></p><h1><NebulaFlow identity="goal-new-title">Create a goal.</NebulaFlow></h1></div></div><UnifiedGoalWizard positionId={position}/></>;
}
