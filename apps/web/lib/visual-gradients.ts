/** Decorative interpolation only: callers keep canonical segment values and labels. */
export function smoothConicGradient(segments:readonly {color:string;offset:number;size:number}[],track='#213650'){
 const visible=segments.filter(segment=>segment.size>0);
 if(!visible.length)return track;
 const stops=[`${visible[0]!.color} ${visible[0]!.offset}%`];
 for(let index=1;index<visible.length;index++){
  const previous=visible[index-1]!,current=visible[index]!,boundary=current.offset;
  const fade=Math.min(1.25,previous.size/4,current.size/4);
  stops.push(`${previous.color} ${Math.max(previous.offset,boundary-fade)}%`,`${current.color} ${Math.min(current.offset+current.size,boundary+fade)}%`);
 }
 const last=visible.at(-1)!,end=Math.min(100,last.offset+last.size);
 stops.push(`${last.color} ${end}%`);
 if(end<100)stops.push(`${track} ${end}% 100%`);
 return `conic-gradient(from 0deg,${stops.join(',')})`;
}
