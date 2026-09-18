import {UnifiedGoalWizard} from '../../../../components/unified-goal-wizard';
export default async function NewGoal({searchParams}:{searchParams:Promise<{position?:string}>}){
 const {position}=await searchParams;
 return <><div className="page-heading"><div><p className="eyebrow">A destination worth planning for</p><h1>Create a goal.</h1></div></div><UnifiedGoalWizard positionId={position}/></>;
}
