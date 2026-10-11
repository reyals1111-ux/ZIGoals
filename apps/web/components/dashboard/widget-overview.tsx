'use client';
import Link from 'next/link';
import {AppIcon} from '../app-icon';
import {WIDGET_CATALOG,type DashboardWidget} from '../../lib/dashboard-settings';
import {widgetMetric,type DashboardSources} from '../../lib/dashboard-metrics';

export function WidgetOverview({widgets,sources,loaded,error,ready,domainError,onCustomize,customizing}:{
 widgets:DashboardWidget[];
 sources:DashboardSources;
 loaded:boolean;
 error:string;
 ready:(domain:string)=>boolean;
 domainError:(domain:string)=>string;
 onCustomize:()=>void;
 customizing:boolean;
}){
 const visible=widgets.filter(widget=>!widget.hidden);
 return <section className="dashboard-summary panel" aria-label="Your selected widgets">
  <div className="section-heading"><div><p className="eyebrow">YOUR DAILY SPACE, AT A GLANCE</p><h2>Your snapshot, your way.</h2><p>Each card follows the record you chose; currencies and units stay separate.</p></div><button type="button" className="secondary" onClick={onCustomize} disabled={!loaded||!!error}>{customizing?'Finish customizing':'Customize Today'}</button></div>
  {!loaded?<p role="status">Loading your layout…</p>:error?<p role="alert">Your saved layout needs recovery in Settings.</p>:visible.length?<div className="dashboard-summary-grid">{visible.map(widget=>{
   const domain=WIDGET_CATALOG[widget.kind].domain;
   const metric=widgetMetric(widget,sources);
   const unavailable=!ready(domain)||!!domainError(domain);
   return <Link key={widget.id} href={unavailable?'/app/settings':metric.href} className="dashboard-summary-item" data-domain={domain} data-size={widget.size} aria-label={`${metric.title}: ${unavailable?'Unavailable':metric.value}`}>
    <span className="dashboard-summary-glyph"><AppIcon name={domain==='wealth'?'wallet':domain} size={26} luminous/></span>
    <span className="dashboard-summary-copy"><small>{metric.title}</small><strong>{unavailable?ready(domain)?'Needs attention':'Loading…':metric.value}</strong><span>{unavailable?'Review this private record in Settings.':metric.detail}</span>{!unavailable&&metric.warning&&<small className="dashboard-warning">{metric.warning}</small>}</span>
   </Link>;
  })}</div>:<p>No visible widgets yet. Choose a preset or add one to your daily space.</p>}
 </section>;
}
