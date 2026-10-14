import type {ReactNode} from 'react';
import {NebulaFlow} from './nebula-flow';
import {PILLARS, type Pillar} from './pillars';
/** The shared page header: eyebrow, title with its actions on the right of the same row, then the lede. `tools` holds the layout lock (top right). `pillar` (Session AB-Design, owner request 28) puts the pillar's fold mark before the eyebrow and sets its accent. */
export function PageHeader({eyebrow,title,lede,actions,tools,titleId,className='',pillar}:{eyebrow:ReactNode;title:ReactNode;lede?:ReactNode;actions?:ReactNode;tools?:ReactNode;titleId?:string;className?:string;pillar?:Pillar}){
 return <div className={`page-header ${className}`.trim()} data-pillar={pillar}>
  <p className="eyebrow page-eyebrow">{pillar&&<span className="pillar-mark" data-pillar={pillar} aria-hidden="true"><span className="pillar-mark-disc">{PILLARS[pillar].glyph(16)}</span></span>}<NebulaFlow identity={`${titleId??'page'}-eyebrow`}>{eyebrow}</NebulaFlow></p>
  {tools&&<div className="page-header-tools">{tools}</div>}
  <h1 id={titleId}><NebulaFlow identity={`${titleId??'page'}-title`}>{title}</NebulaFlow></h1>
  {actions&&<div className="page-header-actions">{actions}</div>}
  {lede&&<p className="page-lede">{lede}</p>}
 </div>;
}
