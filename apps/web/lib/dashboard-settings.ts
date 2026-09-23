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
 ecosystem:{label:'Ecosystem shortcut',domain:'wealth',metrics:['directory']},
} as const;
export type WidgetKind=keyof typeof WIDGET_CATALOG;
const widgetSchema=z.object({id:z.string().min(1).max(100),kind:z.enum(['goals','goal','habits','habit','health','wealth','asset','ecosystem']),entity:z.string().min(1).max(250).optional(),metric:z.string().min(1).max(40),title:z.string().trim().max(80),size:z.enum(['compact','wide']),hidden:z.boolean(),revision:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER)}).strict().superRefine((w,ctx)=>{
 if(!(WIDGET_CATALOG[w.kind].metrics as readonly string[]).includes(w.metric))ctx.addIssue({code:'custom',message:'This metric is not supported by this widget.'});
 if(['goal','habit','asset'].includes(w.kind)!==!!w.entity)ctx.addIssue({code:'custom',message:'Choose a record only for an entity widget.'});
});
export type DashboardWidget=z.infer<typeof widgetSchema>;
export const dashboardSettingsSchema=z.object({schemaVersion:z.literal(1),kind:z.literal('zigoals-settings'),preset:z.enum(['balanced','wealth','habits-health','health']),onboarded:z.boolean(),widgets:z.array(widgetSchema).max(24)}).strict().superRefine((s,ctx)=>{
 if(new Set(s.widgets.map(w=>w.id)).size!==s.widgets.length)ctx.addIssue({code:'custom',message:'Widget IDs must be unique.'});
 if(new Set(s.widgets.map(binding)).size!==s.widgets.length)ctx.addIssue({code:'custom',message:'Each chosen metric can appear once.'});
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
 const w=widgetSchema.parse(input),existing=s.widgets.find(x=>x.id===w.id);
 if(expectedRevision!==undefined&&(!existing||existing.revision!==expectedRevision))throw Error('This widget changed. Reopen its settings before saving.');
 if(existing&&expectedRevision===undefined)throw Error('Widget already exists.');
 if(s.widgets.some(x=>x.id!==w.id&&binding(x)===binding(w)))throw Error('That metric is already on Today. Edit or show the existing widget.');
 const updated={...w,revision:existing?existing.revision+1:1};
 return dashboardSettingsSchema.parse({...s,onboarded:true,widgets:existing?s.widgets.map(x=>x.id===w.id?updated:x):[...s.widgets,updated]});
}
export function moveWidget(s:DashboardSettings,id:string,direction:-1|1):DashboardSettings{
 const index=s.widgets.findIndex(w=>w.id===id),target=index+direction;if(index<0||target<0||target>=s.widgets.length)return s;
 const widgets=[...s.widgets];[widgets[index],widgets[target]]=[widgets[target]!,widgets[index]!];return {...s,widgets};
}
export function removeWidget(s:DashboardSettings,id:string):DashboardSettings{return {...s,widgets:s.widgets.filter(w=>w.id!==id)};}
