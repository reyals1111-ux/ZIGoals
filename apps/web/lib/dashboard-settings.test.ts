import {expect,test} from 'vitest';
import {dashboardSettingsSchema,emptyDashboardSettings,presetSettings,saveWidget,moveWidget,removeWidget,visibleDomains,reconcileDashboardPlacement,moveDashboardItem,setDashboardBuiltinHidden,applyDashboardPreset,DASHBOARD_BUILTINS,type DashboardWidget} from './dashboard-settings';
const goal:DashboardWidget={id:'chosen-goal',kind:'goal',entity:'private:42',metric:'progress',title:'My destination',size:'wide',hidden:false,revision:1};
test('four useful presets contain only configuration, with a Health-only domain',()=>{
 const choices=['balanced','wealth','habits-health','health'] as const;
 const presets=choices.map(presetSettings);
 expect(new Set(presets.map(s=>JSON.stringify(s.widgets))).size).toBe(4);
 expect(visibleDomains(presets[3]!)).toEqual(['health']);
 expect(presets.every(s=>dashboardSettingsSchema.safeParse(s).success)).toBe(true);
 expect(JSON.stringify(presets)).not.toMatch(/"(?:quantity|balance|calories|secret|walletAddress)":/);
});
test('stable references survive reload, edit, hide, reorder and remove without copied values',()=>{
 let settings=saveWidget(emptyDashboardSettings(),goal);
 settings=dashboardSettingsSchema.parse(JSON.parse(JSON.stringify(settings)));
 settings=moveWidget(settings,goal.id,-1);
 expect(settings.widgets.at(-2)?.entity).toBe('private:42');
 settings=saveWidget(settings,{...goal,title:'New title',hidden:true},1);
 expect(settings.widgets.find(w=>w.id===goal.id)).toMatchObject({entity:'private:42',revision:2,hidden:true});
 expect(removeWidget(settings,goal.id).widgets.some(w=>w.id===goal.id)).toBe(false);
});
test('stale edits and duplicate bindings fail while unrelated concurrent changes survive',()=>{
 const initial=saveWidget(emptyDashboardSettings(),goal);
 const edited=saveWidget(initial,{...goal,title:'First edit'},1);
 expect(()=>saveWidget(edited,{...goal,title:'Stale edit'},1)).toThrow('changed');
 expect(()=>saveWidget(initial,{...goal,id:'another'})).toThrow('already');
 const added=saveWidget(edited,{...goal,id:'different',entity:'private:43'});
 expect(added.widgets.find(w=>w.id===goal.id)?.title).toBe('First edit');
});
test('future versions, unknown fields, unsupported metrics and missing references reject',()=>{
 const s=emptyDashboardSettings();
 for(const value of [{...s,schemaVersion:2},{...s,privateValue:'leak'},{...s,widgets:[{...goal,entity:''}]},{...s,widgets:[{...goal,metric:'calories'}]},{...s,widgets:[{...goal,balance:'42'}]}])expect(dashboardSettingsSchema.safeParse(value).success).toBe(false);
 expect(dashboardSettingsSchema.safeParse({...s,widgets:[goal,goal]}).success).toBe(false);
});

test('staking and allocation widgets persist stable source references without metric snapshots',()=>{
 let settings=presetSettings('health');
 for(const [kind,metric] of [['staking','quantity'],['allocation','allocation']] as const){
  settings=saveWidget(settings,{id:kind,kind,metric,entity:'position-42',title:'',size:'compact',hidden:false,revision:1});
 }
 expect(dashboardSettingsSchema.parse(JSON.parse(JSON.stringify(settings))).widgets.slice(-2).map(w=>w.entity)).toEqual(['position-42','position-42']);
 expect(dashboardSettingsSchema.safeParse({...settings,widgets:[{...settings.widgets.at(-1),entity:undefined}]}).success).toBe(false);
 expect(visibleDomains(presetSettings('health'))).toEqual(['health']);
});

const builtin=(id:typeof DASHBOARD_BUILTINS[number]['id'])=>({kind:'builtin' as const,id});
const widget=(id:string)=>({kind:'widget' as const,id});
test('legacy settings keep their original shape while placement resolves deterministically without mutation',()=>{
 const old=emptyDashboardSettings(),raw=JSON.stringify(old),parsed=dashboardSettingsSchema.parse(JSON.parse(raw));
 expect(JSON.stringify(parsed)).toBe(raw);expect(parsed.placement).toBeUndefined();
 const placement=reconcileDashboardPlacement(parsed);
 expect(placement.version).toBe(1);expect(placement.main.slice(0,11).map(r=>r.id)).toEqual(['whole-life','attention','funding','needs-attention','watchlist','goals','progress','habits','health','next-action','summary']);
 expect(placement.rail.map(r=>r.id)).toEqual(['wallet','staking','destination','activity']);
 expect(placement.main.slice(11)).toEqual(old.widgets.map(w=>widget(w.id)));
 expect(reconcileDashboardPlacement(parsed)).toEqual(placement);expect(JSON.stringify(old)).toBe(raw);
});
test('widgets move before and after built-ins and into rail without changing their records',()=>{
 const initial=saveWidget(emptyDashboardSettings(),goal),records=JSON.stringify(initial.widgets);
 let s=moveDashboardItem(initial,widget(goal.id),{region:'main',anchor:builtin('goals'),position:'before'});
 expect(s.placement!.main.indexOf(s.placement!.main.find(r=>r.kind==='widget'&&r.id===goal.id)!)).toBe(s.placement!.main.findIndex(r=>r.id==='goals')-1);
 s=moveDashboardItem(s,widget(goal.id),{region:'main',anchor:builtin('goals'),position:'after'},s.placement!.revision);
 expect(s.placement!.main.findIndex(r=>r.id===goal.id)).toBe(s.placement!.main.findIndex(r=>r.id==='goals')+1);
 s=moveDashboardItem(s,widget(goal.id),{region:'rail',anchor:builtin('staking'),position:'before'},s.placement!.revision);
 expect(s.placement!.rail.slice(0,3)).toEqual([builtin('wallet'),widget(goal.id),builtin('staking')]);
 expect(s.placement!.main).not.toContainEqual(widget(goal.id));expect(JSON.stringify(s.widgets)).toBe(records);
 expect(()=>moveDashboardItem(s,widget(goal.id),{region:'main'},1)).toThrow(/changed/i);
 expect(()=>moveDashboardItem(s,widget(goal.id),{region:'main',anchor:builtin('wallet'),position:'before'})).toThrow();
});
test('hide and show eligible built-ins preserve placements and protect attention cards',()=>{
 const s=emptyDashboardSettings();const changed=setDashboardBuiltinHidden(s,'wallet',true);
 expect(changed.placement!.hiddenBuiltins).toContain('wallet');expect(changed.widgets).toEqual(s.widgets);
 expect(setDashboardBuiltinHidden(changed,'wallet',false).placement!.hiddenBuiltins).not.toContain('wallet');
 for(const id of ['whole-life','attention','needs-attention','summary'] as const)expect(()=>setDashboardBuiltinHidden(s,id,true)).toThrow();
 expect(()=>setDashboardBuiltinHidden(changed,'wallet',false,1)).toThrow(/changed/i);
});
test('saving and removing widgets retain stable placement and unrelated IDs bindings and revisions',()=>{
 let s=moveDashboardItem(saveWidget(emptyDashboardSettings(),goal),widget(goal.id),{region:'rail'});
 const prior=s.placement!,others=s.widgets.filter(w=>w.id!==goal.id);
 s=saveWidget(s,{...goal,title:'Reviewed destination'},1);
 expect(s.placement).toEqual(prior);expect(s.widgets.filter(w=>w.id!==goal.id)).toEqual(others);
 s=saveWidget(s,{...goal,id:'second-goal',entity:'private:43'});
 expect(s.placement!.main.at(-1)).toEqual(widget('second-goal'));expect(s.placement!.rail.at(-1)).toEqual(widget(goal.id));
 s=removeWidget(s,goal.id);expect([...s.placement!.main,...s.placement!.rail]).not.toContainEqual(widget(goal.id));
 expect(s.widgets.find(w=>w.id==='second-goal')).toMatchObject({entity:'private:43',revision:1});
 expect(dashboardSettingsSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
});
test('preset changes retain prior widgets and identities while making excluded metrics explicitly hidden',()=>{
 const old=saveWidget(emptyDashboardSettings(),goal),oldKcal=old.widgets.find(w=>w.kind==='health')!;
 const health=applyDashboardPreset(old,'health');expect(visibleDomains(health)).toEqual(['health']);
 expect(health.widgets.find(w=>w.id===goal.id)).toEqual({...goal,hidden:true,revision:2});
 expect(health.widgets.find(w=>w.id===oldKcal.id)).toEqual(oldKcal);
 expect(health.placement!.hiddenBuiltins).toEqual(expect.arrayContaining(['wallet','staking','goals','funding','watchlist','progress','destination','next-action']));
 const again=applyDashboardPreset(health,'health');expect(again.widgets).toEqual(health.widgets);
 const balanced=applyDashboardPreset(health,'balanced');expect(balanced.widgets.find(w=>w.id===oldKcal.id)).toEqual(oldKcal);
 expect(balanced.widgets.find(w=>w.id===goal.id)?.entity).toBe('private:42');
 expect(old.widgets.find(w=>w.id===goal.id)?.hidden).toBe(false);
});
test('missing known placements reconcile but malformed or dangling layout backups fail without discarding data',()=>{
 const old=saveWidget(emptyDashboardSettings(),goal);
 const partial={...old,placement:{version:1 as const,revision:7,main:[widget(goal.id)],rail:[],hiddenBuiltins:[]}};
 const parsed=dashboardSettingsSchema.parse(partial),fixed=reconcileDashboardPlacement(parsed);
 expect(fixed.main[0]).toEqual(widget(goal.id));expect(fixed.main.filter(r=>r.id===goal.id)).toHaveLength(1);expect(fixed.rail).toHaveLength(4);expect(parsed).toEqual(partial);
 const base=reconcileDashboardPlacement(old);
 for(const placement of [{...base,version:2},{...base,revision:0},{...base,extra:true},{...base,rail:[...base.rail,widget(goal.id)]},{...base,main:[widget('deleted-record')]},{...base,main:[{kind:'builtin',id:'unknown'}]},{...base,hiddenBuiltins:['attention']},{...base,hiddenBuiltins:['wallet','wallet']}]){
  const value={...old,placement},raw=JSON.stringify(value);expect(dashboardSettingsSchema.safeParse(value).success).toBe(false);expect(()=>reconcileDashboardPlacement(value as typeof old)).toThrow();expect(JSON.stringify(value)).toBe(raw);
 }
});
test('built-ins stay in their supported columns while widget references can share their ID safely',()=>{
 const s=saveWidget(emptyDashboardSettings(),{...goal,id:'wallet'});
 expect(()=>moveDashboardItem(s,builtin('whole-life'),{region:'rail'})).toThrow();
 const placed=moveDashboardItem(s,widget('wallet'),{region:'rail',anchor:builtin('wallet'),position:'before'});
 expect(placed.placement!.rail.slice(0,2)).toEqual([widget('wallet'),builtin('wallet')]);
 const p=reconcileDashboardPlacement(s);
 expect(dashboardSettingsSchema.safeParse({...s,placement:{...p,main:p.main.filter(r=>r.id!=='whole-life'),rail:[...p.rail,builtin('whole-life')]}}).success).toBe(false);
});
test('capacity and revision exhaustion refuse writes while valid recovery stays within39 distinct items',()=>{
 const widgets=Array.from({length:24},(_,i)=>({...goal,id:`w-${i}`,entity:`goal-${i}`})),s={...emptyDashboardSettings(),widgets};
 const p=reconcileDashboardPlacement(s);expect([...p.main,...p.rail]).toHaveLength(39);
 const full={...s,placement:p},raw=JSON.stringify(full);
 expect(()=>applyDashboardPreset(full,'health')).toThrow();expect(()=>saveWidget(full,{...goal,id:'extra',entity:'extra'})).toThrow();expect(JSON.stringify(full)).toBe(raw);
 const exhausted={...full,placement:{...p,revision:Number.MAX_SAFE_INTEGER}},prior=JSON.stringify(exhausted);
 expect(()=>moveDashboardItem(exhausted,widget('w-0'),{region:'rail'})).toThrow();expect(()=>setDashboardBuiltinHidden(exhausted,'wallet',true)).toThrow();expect(()=>removeWidget(exhausted,'w-0')).toThrow();expect(JSON.stringify(exhausted)).toBe(prior);
});
test('preset-generated IDs cannot collide with retained custom records',()=>{
 const custom={...goal,id:'preset-health-0',revision:1},s=saveWidget({...emptyDashboardSettings(),widgets:[]},custom);
 const next=applyDashboardPreset(s,'health');expect(next.widgets.find(w=>w.id===custom.id)).toEqual({...custom,hidden:true,revision:2});
 expect(next.widgets.find(w=>w.kind==='health'&&w.metric==='kcal')?.id).toBe('preset-health-0-2');
 expect(new Set(next.widgets.map(w=>w.id)).size).toBe(5);
});
