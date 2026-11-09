'use client';
import type {ReactNode} from 'react';
import {useEntrance} from './use-entrance';
/** Text whose nebula colour flows from its middle to its end, with one light sweep the first time it is seen (static under reduced motion and Motion Off). Used for the Health titles and the Wealth total. */
export function NebulaFlow({identity,children,className=''}:{identity:string;children:ReactNode;className?:string}){
 const ref=useEntrance<HTMLSpanElement>(identity);
 // Session AB-Design Phase 2 closing pass (design critique): a figure ("$501,800.00", "300,000 ZIG") takes the smooth
 // figure gradient, so no digit sits on a colour edge; titles keep the white → nebula flow.
 const figure=typeof children==='string'&&/\d/.test(children)&&!/[A-Za-z]{4,}/.test(children);
 return <span ref={ref} className={`nebula-flow${figure?' is-figure':''} ${className}`.trim()}>{typeof children==='string'?withEmoji(children):children}</span>;
}
/**
 * Session AL (DV-031b): the flow paints its words with its gradient (a transparent fill, the background clipped to the
 * text), and an emoji's glyph took that paint as one solid shape: a goal named "🎯 Replay trip" showed a black disc by day
 * (a pale one by night). Each emoji keeps its own colours (app/globals.css `.nebula-flow-emoji`); the words keep the flow.
 */
const EMOJI=/(\p{Extended_Pictographic}(?:\uFE0F|\u20E3|[\u{1F3FB}-\u{1F3FF}]|\u200D\p{Extended_Pictographic}\uFE0F?)*)/u;
function withEmoji(text:string):ReactNode{
 if(!EMOJI.test(text))return text;
 return text.split(EMOJI).map((part,i)=>i%2?<span key={i} className="nebula-flow-emoji">{part}</span>:part);
}
