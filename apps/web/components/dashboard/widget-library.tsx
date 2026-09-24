'use client';
import Link from 'next/link';
import {useState} from 'react';
import {AppIcon} from '../app-icon';
import {WIDGET_CATALOG,type DashboardWidget,type WidgetKind} from '../../lib/dashboard-settings';
import {widgetMetricLabel,type DashboardSources} from '../../lib/dashboard-metrics';
import {eligibleWidgetSources,selectableWidgetKinds,WIDGET_DESCRIPTIONS,WIDGET_GROUPS,widgetNeedsSource} from '../../lib/dashboard-widget-registry';

export function WidgetLibrary({kind,metric,entity,title,size,initial,sources,ready,onKind,onMetric,onEntity,onTitle,onSize}:{
 kind:WidgetKind;metric:string;entity:string;title:string;size:DashboardWidget['size'];initial?:DashboardWidget;sources:DashboardSources;
 ready:(domain:string)=>boolean;onKind:(kind:WidgetKind)=>void;onMetric:(metric:string)=>void;onEntity:(id:string)=>void;onTitle:(title:string)=>void;onSize:(size:DashboardWidget['size'])=>void;
}){
 const [group,setGroup]=useState<typeof WIDGET_GROUPS[number]['id']>(WIDGET_GROUPS.find(g=>(g.kinds as readonly string[]).includes(kind))?.id??'health');
 const selectable=selectableWidgetKinds(sources,ready),chosen=WIDGET_GROUPS.find(g=>g.id===group)!;
 const sourcesForKind=eligibleWidgetSources(kind,sources);
 const missingSaved=!!initial?.entity&&entity===initial.entity&&!sourcesForKind.some(e=>e.id===entity);
 return <div className="widget-library">
  <div className="widget-library-groups" role="group" aria-label="Widget categories">{WIDGET_GROUPS.map(g=><button key={g.id} type="button" className="widget-library-group" aria-pressed={group===g.id} onClick={()=>{setGroup(g.id);if(!(g.kinds as readonly string[]).includes(kind)){const first=g.kinds.find(k=>selectable.includes(k));if(first)onKind(first);}}}><AppIcon name={g.icon} luminous/><span>{g.label}</span></button>)}</div>
  <div className="widget-library-tiles" role="group" aria-label={`${chosen.label} widgets`}>{chosen.kinds.filter(k=>selectable.includes(k)||k===initial?.kind).map(k=><button key={k} type="button" className="widget-library-tile" aria-pressed={kind===k} onClick={()=>onKind(k)}><AppIcon name={chosen.icon} size={28} luminous/><span><strong>{WIDGET_CATALOG[k].label}</strong><small>{WIDGET_DESCRIPTIONS[k]}</small></span></button>)}</div>
  {!chosen.kinds.some(k=>selectable.includes(k)||k===initial?.kind)&&<p className="widget-library-empty">No saved source is available for this category yet. <Link href={group==='goals'?'/app/goals/new':group==='habits'?'/app/habits':group==='wealth'?'/app/wealth':'/app/health'}>Create or review a source →</Link></p>}
  {(chosen.kinds as readonly string[]).includes(kind)&&<>
   {widgetNeedsSource(kind)&&<div className="widget-library-choices" role="group" aria-label="Choose a saved record"><h3>Choose your saved {kind==='goal'?'Goal':kind==='habit'?'Habit':'asset or Position'}</h3>{missingSaved&&<div className="widget-library-unavailable" role="status">Previously selected record unavailable. Keep this binding for recovery, or choose another saved record.</div>}{sourcesForKind.map(source=><button key={source.id} type="button" className="widget-library-choice" aria-pressed={entity===source.id} onClick={()=>onEntity(source.id)}>{source.label}</button>)}</div>}
   {kind==='ecosystem'&&<div className="widget-library-choices" role="group" aria-label="Choose an ecosystem shortcut"><h3>Official research shortcut</h3><button type="button" className="widget-library-choice" aria-pressed={!entity} onClick={()=>onEntity('')}>Whole directory</button>{missingSaved&&<div className="widget-library-unavailable" role="status">Previously chosen research record unavailable.</div>}{sourcesForKind.map(source=><button key={source.id} type="button" className="widget-library-choice" aria-pressed={entity===source.id} onClick={()=>onEntity(source.id)}>{source.label}</button>)}</div>}
   <div className="widget-library-choices" role="group" aria-label="Choose a metric"><h3>What should this card show?</h3>{WIDGET_CATALOG[kind].metrics.map(m=><button key={m} type="button" className="widget-library-choice" aria-pressed={metric===m} onClick={()=>onMetric(m)}>{widgetMetricLabel(m)}</button>)}</div>
   <details className="widget-library-advanced"><summary>Title and display size</summary><div className="form-grid"><label>Card title (optional)<input maxLength={80} value={title} onChange={e=>onTitle(e.target.value)} placeholder="Use the source name"/></label><div className="widget-library-size" role="group" aria-label="Card size"><span>Display size</span><button type="button" aria-pressed={size==='compact'} onClick={()=>onSize('compact')}>Compact</button><button type="button" aria-pressed={size==='wide'} onClick={()=>onSize('wide')}>Wide</button></div></div></details>
  </>}
 </div>;
}
