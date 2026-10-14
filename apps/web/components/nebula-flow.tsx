'use client';
import type {ReactNode} from 'react';
import {useEntrance} from './use-entrance';
/** Text whose nebula colour flows from its middle to its end, with one light sweep the first time it is seen (static under reduced motion and Motion Off). Used for the Health titles and the Wealth total. */
export function NebulaFlow({identity,children,className=''}:{identity:string;children:ReactNode;className?:string}){
 const ref=useEntrance<HTMLSpanElement>(identity);
 // Session AB-Design Phase 2 closing pass (design critique): a figure ("$501,800.00", "300,000 ZIG") takes the smooth
 // figure gradient, so no digit sits on a colour edge; titles keep the white → nebula flow.
 const figure=typeof children==='string'&&/\d/.test(children)&&!/[A-Za-z]{4,}/.test(children);
 return <span ref={ref} className={`nebula-flow${figure?' is-figure':''} ${className}`.trim()}>{children}</span>;
}
