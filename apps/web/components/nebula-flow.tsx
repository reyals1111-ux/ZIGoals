'use client';
import type {ReactNode} from 'react';
import {useEntrance} from './use-entrance';
/** Text whose nebula colour flows from its middle to its end, with one light sweep the first time it is seen (static under reduced motion and Motion Off). Used for the Health titles and the Wealth total. */
export function NebulaFlow({identity,children,className=''}:{identity:string;children:ReactNode;className?:string}){
 const ref=useEntrance<HTMLSpanElement>(identity);
 return <span ref={ref} className={`nebula-flow ${className}`.trim()}>{children}</span>;
}
