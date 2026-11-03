"use client";
import Link from 'next/link';
import {AppIcon} from './app-icon';
import {useUnifiedGoals} from './use-unified-goals';
import {QuickAddLine} from './quick-add-line';
/** Quick add's heavier parts (the typed line with Health and Habits, the Goal choice), loaded after the page (weights). */
function ContributionChoices({close}:{close:()=>void}){const collection=useUnifiedGoals(),goals=collection.goals.filter(g=>g.status==='active'&&g.type!=='Project Goal');return <nav aria-label="Choose a Goal to contribute to">{!collection.loaded?<p>Loading your Goals…</p>:!goals.length?<><p>Create a financial Goal to start recording contributions.</p><Link href="/app/goals/new" onClick={close}>Create a Goal →</Link></>:goals.map(g=><Link key={g.key} href={g.key.startsWith('private:')?`${g.href}?contribute=1#funding-wealth`:`${g.href}#local-simulation`} onClick={close}><span className="icon-medallion"><AppIcon name="goals" luminous/></span><span><strong>{g.name}</strong><small>{g.type} · {g.fundingHealth.replaceAll('_',' ')}</small></span><span aria-hidden="true">↗</span></Link>)}</nav>;}
export default function QuickAddSheet({part,close}:{part:'line'|'goals';close:()=>void}){
 return part==='line'?<QuickAddLine close={close}/>:<ContributionChoices close={close}/>;
}
