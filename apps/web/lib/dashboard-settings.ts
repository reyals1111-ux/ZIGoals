import {z} from 'zod';
export const DASHBOARD_SETTINGS_KEY='zigoals:settings:v1';
export const PRESETS=[{id:'balanced',label:'Balanced',description:'Goals, daily rhythm, Health and Wealth.'},{id:'wealth',label:'Wealth',description:'Your assets and financial destinations.'},{id:'habits-health',label:'Habits + Health',description:'Daily routines and caring for yourself.'},{id:'health',label:'Health-only',description:'Meals, water, movement and measurements.'}] as const;
export type DashboardPreset=typeof PRESETS[number]['id'];
export const WIDGET_CATALOG={
 goals:{label:'Goals overview',domain:'goals',metrics:['overview']},
 goal:{label:'A chosen Goal',domain:'goals',metrics:['progress','next-contribution']},
 habits:{label:'Daily Habits',domain:'habits',metrics:['overview']},
 habit:{label:'A chosen Habit',domain:'habits',metrics:['today','streak']},
 health:{label:'Health metric',domain:'health',metrics:['kcal','macros','water','weight','steps','activity']},
 wealth:{label:'Wealth by currency',domain:'wealth',metrics:['USD','EUR']},
 asset:{label:'An asset or Position',domain:'wealth',metrics:['quantity','value','available']},
 staking:{label:'Staking and rewards',domain:'wealth',metrics:['quantity']},
 allocation:{label:'Allocation and availability',domain:'wealth',metrics:['allocation']},
 ecosystem:{label:'Ecosystem shortcut',domain:'wealth',metrics:['directory']},
} as const;
export type WidgetKind=keyof typeof WIDGET_CATALOG;
const widgetSchema=z.object({id:z.string().min(1).max(100),kind:z.enum(['goals','goal','habits','habit','health','wealth','asset','staking','allocation','ecosystem']),entity:z.string().min(1).max(250).optional(),metric:z.string().min(1).max(40),title:z.string().trim().max(80),size:z.enum(['compact','wide']),hidden:z.boolean(),revision:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER)}).strict().superRefine((w,ctx)=>{
 if(!(WIDGET_CATALOG[w.kind].metrics as readonly string[]).includes(w.metric))ctx.addIssue({code:'custom',message:'This metric is not supported by this widget.'});
 if(['goal','habit','asset','staking','allocation'].includes(w.kind)!==!!w.entity)ctx.addIssue({code:'custom',message:'Choose a record only for an entity widget.'});
});
export type DashboardWidget=z.infer<typeof widgetSchema>;
export const DASHBOARD_BUILTINS=[
 {id:'whole-life',label:'Whole-life overview',region:'main',hideable:false,financial:false},
 {id:'attention',label:'Attention agenda',region:'main',hideable:false,financial:false},
 {id:'funding',label:'Funding rhythm',region:'main',hideable:true,financial:true},
 {id:'needs-attention',label:'Records needing attention',region:'main',hideable:false,financial:false},
 {id:'watchlist',label:'Watchlist',region:'main',hideable:true,financial:true},
 {id:'goals',label:'Your Goals',region:'main',hideable:true,financial:true},
 {id:'progress',label:'Financial progress',region:'main',hideable:true,financial:true},
 {id:'habits',label:'Daily Habits',region:'main',hideable:true,financial:false},
 {id:'health',label:'Daily Health',region:'main',hideable:true,financial:false},
 {id:'next-action',label:'Next Goal action',region:'main',hideable:true,financial:true},
 {id:'summary',label:'Widget summary',region:'main',hideable:false,financial:false},
 {id:'wallet',label:'Wallet',region:'rail',hideable:true,financial:true},
 {id:'staking',label:'Staking',region:'rail',hideable:true,financial:true},
 {id:'destination',label:'Next destination',region:'rail',hideable:true,financial:true},
 {id:'activity',label:'Recent activity',region:'rail',hideable:true,financial:true},
] as const;
export type DashboardBuiltinId=typeof DASHBOARD_BUILTINS[number]['id'];
const builtinIdSchema=z.enum(DASHBOARD_BUILTINS.map(b=>b.id));
const itemRefSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('builtin'),id:builtinIdSchema}).strict(),
 z.object({kind:z.literal('widget'),id:z.string().min(1).max(100)}).strict(),
]);
export type DashboardItemRef=z.infer<typeof itemRefSchema>;
export type DashboardRegion='main'|'rail';
const itemKey=(ref:DashboardItemRef)=>JSON.stringify([ref.kind,ref.id]);
const placementSchema=z.object({version:z.literal(1),revision:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),main:z.array(itemRefSchema).max(39),rail:z.array(itemRefSchema).max(39),hiddenBuiltins:z.array(builtinIdSchema).max(DASHBOARD_BUILTINS.length)}).strict().superRefine((p,ctx)=>{
 const refs=[...p.main,...p.rail];
 if(new Set(refs.map(itemKey)).size!==refs.length)ctx.addIssue({code:'custom',message:'Each dashboard item can be placed only once.'});
 for(const region of ['main','rail'] as const)if(p[region].some(ref=>ref.kind==='builtin'&&DASHBOARD_BUILTINS.find(b=>b.id===ref.id)!.region!==region))ctx.addIssue({code:'custom',message:'This built-in card cannot move to that column.'});
 if(new Set(p.hiddenBuiltins).size!==p.hiddenBuiltins.length)ctx.addIssue({code:'custom',message:'Hidden dashboard cards must be unique.'});
 if(p.hiddenBuiltins.some(id=>!DASHBOARD_BUILTINS.find(b=>b.id===id)!.hideable))ctx.addIssue({code:'custom',message:'This essential dashboard card cannot be hidden.'});
});
export type DashboardPlacement=z.infer<typeof placementSchema>;
export const dashboardSettingsSchema=z.object({schemaVersion:z.literal(1),kind:z.literal('zigoals-settings'),preset:z.enum(['balanced','wealth','habits-health','health']),onboarded:z.boolean(),widgets:z.array(widgetSchema).max(24),placement:placementSchema.optional()}).strict().superRefine((s,ctx)=>{
 if(new Set(s.widgets.map(w=>w.id)).size!==s.widgets.length)ctx.addIssue({code:'custom',message:'Widget IDs must be unique.'});
 if(new Set(s.widgets.map(binding)).size!==s.widgets.length)ctx.addIssue({code:'custom',message:'Each chosen metric can appear once.'});
 if(s.placement&&[...s.placement.main,...s.placement.rail].some(ref=>ref.kind==='widget'&&!s.widgets.some(w=>w.id===ref.id)))ctx.addIssue({code:'custom',message:'A dashboard placement refers to an unavailable widget.'});
});
export type DashboardSettings=z.infer<typeof dashboardSettingsSchema>;
const binding=(w:DashboardWidget)=>JSON.stringify([w.kind,w.entity??'',w.metric]);
export function presetSettings(preset:DashboardPreset):DashboardSettings{
 const specs:Record<DashboardPreset,[WidgetKind,string][]>= {balanced:[['goals','overview'],['habits','overview'],['health','kcal'],['wealth','USD']],wealth:[['wealth','USD'],['wealth','EUR'],['goals','overview'],['ecosystem','directory']],'habits-health':[['habits','overview'],['health','kcal'],['health','water'],['health','activity']],health:[['health','kcal'],['health','water'],['health','weight'],['health','steps']]};
 return {schemaVersion:1,kind:'zigoals-settings',preset,onboarded:true,widgets:specs[preset].map(([kind,metric],i)=>({id:`preset-${preset}-${i}`,kind,metric,title:'',size:kind==='habits'?'wide':'compact',hidden:false,revision:1}))};
}
export function emptyDashboardSettings():DashboardSettings{return {...presetSettings('balanced'),onboarded:false};}
export function visibleDomains(s:DashboardSettings){return [...new Set(s.widgets.filter(w=>!w.hidden).map(w=>WIDGET_CATALOG[w.kind].domain))];}
export function saveWidget(s:DashboardSettings,input:DashboardWidget,expectedRevision?:number):DashboardSettings{
 dashboardSettingsSchema.parse(s);
 const w=widgetSchema.parse(input),existing=s.widgets.find(x=>x.id===w.id);
 if(expectedRevision!==undefined&&(!existing||existing.revision!==expectedRevision))throw Error('This widget changed. Reopen its settings before saving.');
 if(existing&&expectedRevision===undefined)throw Error('Widget already exists.');
 if(s.widgets.some(x=>x.id!==w.id&&binding(x)===binding(w)))throw Error('That metric is already on Today. Edit or show the existing widget.');
 const updated={...w,revision:existing?existing.revision+1:1};
 const placement=s.placement&&!existing?reconcileDashboardPlacement(s):s.placement;
 return dashboardSettingsSchema.parse({...s,onboarded:true,widgets:existing?s.widgets.map(x=>x.id===w.id?updated:x):[...s.widgets,updated],...(placement?{placement:existing?placement:{...placement,revision:placement.revision+1,main:[...placement.main,{kind:'widget',id:w.id}]}}:{})});
}
export function moveWidget(s:DashboardSettings,id:string,direction:-1|1):DashboardSettings{
 dashboardSettingsSchema.parse(s);
 if(s.placement){const p=reconcileDashboardPlacement(s),ref:DashboardItemRef={kind:'widget',id};const region:DashboardRegion=p.main.some(r=>itemKey(r)===itemKey(ref))?'main':'rail',index=p[region].findIndex(r=>itemKey(r)===itemKey(ref)),anchor=p[region][index+direction];return index<0||!anchor?s:moveDashboardItem(s,ref,{region,anchor,position:direction===-1?'before':'after'});}
 const index=s.widgets.findIndex(w=>w.id===id),target=index+direction;if(index<0||target<0||target>=s.widgets.length)return s;
 const widgets=[...s.widgets];[widgets[index],widgets[target]]=[widgets[target]!,widgets[index]!];return {...s,widgets};
}
export function removeWidget(s:DashboardSettings,id:string):DashboardSettings{
 dashboardSettingsSchema.parse(s);if(!s.widgets.some(w=>w.id===id))return s;
 const p=s.placement?reconcileDashboardPlacement(s):undefined,keep=(r:DashboardItemRef)=>r.kind!=='widget'||r.id!==id;
 return dashboardSettingsSchema.parse({...s,widgets:s.widgets.filter(w=>w.id!==id),...(p?{placement:{...p,revision:p.revision+1,main:p.main.filter(keep),rail:p.rail.filter(keep)}}:{})});
}
function defaultPlacement(s:DashboardSettings):DashboardPlacement{
 const financial=visibleDomains(s).some(d=>d==='goals'||d==='wealth');
 return {version:1,revision:1,main:[...DASHBOARD_BUILTINS.filter(b=>b.region==='main').map(b=>({kind:'builtin' as const,id:b.id})),...s.widgets.map(w=>({kind:'widget' as const,id:w.id}))],rail:DASHBOARD_BUILTINS.filter(b=>b.region==='rail').map(b=>({kind:'builtin' as const,id:b.id})),hiddenBuiltins:DASHBOARD_BUILTINS.filter(b=>b.hideable&&b.financial&&!financial).map(b=>b.id)};
}
/** Read-only legacy reconciliation: incomplete known layouts fill deterministically; invalid backups throw. */
export function reconcileDashboardPlacement(s:DashboardSettings):DashboardPlacement{
 const parsed=dashboardSettingsSchema.parse(s),defaults=defaultPlacement(parsed);if(!parsed.placement)return defaults;
 const p=parsed.placement,seen=new Set([...p.main,...p.rail].map(itemKey));
 return {...p,main:[...p.main,...defaults.main.filter(r=>!seen.has(itemKey(r)))],rail:[...p.rail,...defaults.rail.filter(r=>!seen.has(itemKey(r)))],hiddenBuiltins:[...p.hiddenBuiltins]};
}
function currentPlacement(s:DashboardSettings,expectedRevision?:number){const p=reconcileDashboardPlacement(s);if(expectedRevision!==undefined&&p.revision!==expectedRevision)throw Error('This layout changed. Reopen customization before saving.');return p;}
export function moveDashboardItem(s:DashboardSettings,ref:DashboardItemRef,target:{region:DashboardRegion;anchor?:DashboardItemRef;position?:'before'|'after'},expectedRevision?:number):DashboardSettings{
 const p=currentPlacement(s,expectedRevision),item=itemRefSchema.parse(ref),region=z.enum(['main','rail']).parse(target.region);
 if(item.kind==='builtin'&&DASHBOARD_BUILTINS.find(b=>b.id===item.id)!.region!==region)throw Error('This built-in card cannot move to that column.');
 if(![...p.main,...p.rail].some(r=>itemKey(r)===itemKey(item)))throw Error('Choose an existing dashboard item.');
 const anchor=target.anchor?itemRefSchema.parse(target.anchor):undefined;
 if((anchor===undefined)!==(target.position===undefined))throw Error('Choose both an anchor and before/after placement.');
 if(anchor&&!p[region].some(r=>itemKey(r)===itemKey(anchor)))throw Error('The destination card is not in that column.');
 if(target.position!==undefined)z.enum(['before','after']).parse(target.position);
 if(anchor&&itemKey(anchor)===itemKey(item))return s;
 const main=p.main.filter(r=>itemKey(r)!==itemKey(item)),rail=p.rail.filter(r=>itemKey(r)!==itemKey(item)),items=region==='main'?main:rail;
 const index=anchor?items.findIndex(r=>itemKey(r)===itemKey(anchor))+(target.position==='after'?1:0):items.length;items.splice(index,0,item);
 if(JSON.stringify(main)===JSON.stringify(p.main)&&JSON.stringify(rail)===JSON.stringify(p.rail))return s;
 return dashboardSettingsSchema.parse({...s,onboarded:true,placement:{...p,revision:p.revision+1,main,rail}});
}
export function setDashboardBuiltinHidden(s:DashboardSettings,id:DashboardBuiltinId,hidden:boolean,expectedRevision?:number):DashboardSettings{
 const p=currentPlacement(s,expectedRevision),valid=builtinIdSchema.parse(id);z.boolean().parse(hidden);
 if(hidden&&!DASHBOARD_BUILTINS.find(b=>b.id===valid)!.hideable)throw Error('This essential dashboard card cannot be hidden.');
 if(p.hiddenBuiltins.includes(valid)===hidden)return s;
 const hiddenBuiltins=hidden?[...p.hiddenBuiltins,valid]:p.hiddenBuiltins.filter(b=>b!==valid);
 return dashboardSettingsSchema.parse({...s,onboarded:true,placement:{...p,revision:p.revision+1,hiddenBuiltins}});
}
/** Preview and save the same result. Excluded widgets are retained and explicitly hidden, never deleted. */
export function applyDashboardPreset(s:DashboardSettings,preset:DashboardPreset):DashboardSettings{
 dashboardSettingsSchema.parse(s);const chosen=presetSettings(preset),bindings=new Set(chosen.widgets.map(binding));
 const widgets=s.widgets.map(w=>{const hidden=!bindings.has(binding(w));return hidden===w.hidden?w:{...w,hidden,revision:w.revision+1};}),ids=new Set(widgets.map(w=>w.id));
 for(const candidate of chosen.widgets){if(widgets.some(w=>binding(w)===binding(candidate)))continue;let id=candidate.id,suffix=2;while(ids.has(id))id=`${candidate.id}-${suffix++}`;ids.add(id);widgets.push({...candidate,id});}
 const next={...s,preset,onboarded:true,widgets};const placement=defaultPlacement(next);placement.revision=(s.placement?.revision??1)+1;
 return dashboardSettingsSchema.parse({...next,placement});
}
