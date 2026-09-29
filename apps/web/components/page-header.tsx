import type {ReactNode} from 'react';
/** The shared page header: eyebrow, title with its actions on the right of the same row, then the lede. `tools` holds the layout lock (top right). */
export function PageHeader({eyebrow,title,lede,actions,tools,titleId,className=''}:{eyebrow:ReactNode;title:ReactNode;lede?:ReactNode;actions?:ReactNode;tools?:ReactNode;titleId?:string;className?:string}){
 return <div className={`page-header ${className}`.trim()}>
  <p className="eyebrow page-eyebrow">{eyebrow}</p>
  {tools&&<div className="page-header-tools">{tools}</div>}
  <h1 id={titleId}>{title}</h1>
  {actions&&<div className="page-header-actions">{actions}</div>}
  {lede&&<p className="page-lede">{lede}</p>}
 </div>;
}
