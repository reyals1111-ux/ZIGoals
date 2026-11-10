'use client';
/** The frame every bottom section shares (UI design pass, Part 8): its panel, heading and the "—" count. Its own module (CI13,
 *  weights) so each page loads only its own section: components/bottom-sections.tsx, bottom-goal-milestones.tsx,
 *  bottom-habit-rhythm.tsx, bottom-value-sources.tsx and bottom-data-home.tsx. */
import type {ReactNode} from 'react';
import type {LayoutAttrs} from './layout-edit';
import './bottom-sections.css';
import {NebulaFlow} from './nebula-flow';
import {formatNumber, formatWeekday} from '../lib/visual-format';

export const dayLabel=(date:string)=>({weekday:formatWeekday(date),day:Number(date.slice(8))});
export function Shell({id,eyebrow,title,lede,children,layout,className=''}:{id:string;eyebrow:string;title:ReactNode;lede?:ReactNode;children:ReactNode;layout:LayoutAttrs;className?:string}){
 return <section {...layout} className={`bottom-section panel ${className}`.trim()} aria-labelledby={id}>
  <div className="bottom-section-heading"><p className="eyebrow">{eyebrow}</p><h2 id={id}><NebulaFlow identity={id}>{title}</NebulaFlow></h2>{lede&&<p className="bottom-section-lede">{lede}</p>}</div>
  {children}
 </section>;
}
export const Count=({value,label}:{value:number;label:string})=>value?<strong>{formatNumber(value)}</strong>:<strong className="bottom-none"><span aria-hidden="true">—</span><span className="sr-only">No {label} recorded</span></strong>;
