import {UnifiedGoalWizard} from '../../../../components/unified-goal-wizard';
import {NebulaFlow} from '../../../../components/nebula-flow';
import type {Metadata} from 'next';
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: 'Create a goal'};
// Gate C (security read): a repeated parameter arrives as a list; only its first value is ever read.
type Param=string|string[]|undefined;
const one=(v:Param)=>Array.isArray(v)?v[0]:v;
export default async function NewGoal({searchParams}:{searchParams:Promise<Record<'position'|'template'|'from'|'name'|'target'|'currency'|'date'|'contribution'|'every',Param>>}){
 const raw=await searchParams,position=one(raw.position),template=one(raw.template),rest=Object.fromEntries((['from','name','target','currency','date','contribution','every'] as const).map(k=>[k,one(raw[k])])) as Record<'from'|'name'|'target'|'currency'|'date'|'contribution'|'every',string|undefined>;
 // Session AA-Cloud Part 3: "Turn this into a goal" from the calculator (checked again in the wizard).
 const calculator=rest.from==='calculator'?{name:rest.name,target:rest.target,currency:rest.currency,date:rest.date,contribution:rest.contribution,every:rest.every}:undefined;
 return <><div className="page-heading"><div><p className="eyebrow page-eyebrow"><NebulaFlow identity="goal-new-eyebrow">A destination worth planning for</NebulaFlow></p><h1><NebulaFlow identity="goal-new-title">Create a goal.</NebulaFlow></h1></div></div><UnifiedGoalWizard positionId={position} templateId={template} calculator={calculator} sharedName={rest.from==='share'?rest.name?.slice(0,100):undefined}/></>;
}
