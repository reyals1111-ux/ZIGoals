import {expect,test} from 'vitest';
import {dashboardSettingsSchema,emptyDashboardSettings,presetSettings,saveWidget,moveWidget,removeWidget,visibleDomains,type DashboardWidget} from './dashboard-settings';
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
