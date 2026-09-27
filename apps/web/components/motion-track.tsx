'use client';
import type {HTMLAttributes} from 'react';
import {useEntrance} from './use-entrance';
/** A progress track whose fill grows in once, the first time it is seen. Width, role and ARIA values stay the caller's and are final from first render. */
export function MotionTrack({identity,...props}:HTMLAttributes<HTMLDivElement>&{identity:string}){const ref=useEntrance<HTMLDivElement>(identity);return <div ref={ref} {...props}/>;}
