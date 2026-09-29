import 'fake-indexeddb/auto';
import {beforeEach,expect,test,vi} from 'vitest';
import {VaultDatabase} from './database';
import {enableDurableStore,exportDurableStore,restoreDurableStore} from './local';
import {importPrivateStore} from '../private-storage';
import {encryptBackup,decryptBackup} from './backup';
import {modules} from './account-data';
import type {Domain,PrivateData} from './cloud-sync';
import {buildShowcase} from '../showcase-data';
import {platformSchema,closeGoal,PLATFORM_KEY,type Platform} from '../positions';
import {archiveAsset} from '../asset-management';
import {createHabit,setHabitState,logHabitCount,habitDataSchema,HABITS_KEY,type HabitData} from '../habits';
import {healthSchema,saveFood,saveRecipe,logHealthItem,HEALTH_STORAGE_KEY,type HealthData} from '../health';
import {addWater,saveMealFromRecipe,saveHealthPreferences,dailyData} from '../health-daily';
import {presetSettings} from '../dashboard-settings';

// Export → encrypted backup → wipe → import, through the same functions Settings uses:
// each store's export, encryptBackup/decryptBackup, then restoreDurableStore (durable
// stores) or importPrivateStore (legacy stores). The result must be byte-identical.
const DOMAINS:Domain[]=['finance','habits','health','settings'];
function memoryStorage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});

async function roundTrip(input:PrivateData,mode:'durable'|'legacy'){
 const source=memoryStorage(),sourceDb=new VaultDatabase(crypto.randomUUID()),exported:PrivateData={};
 for(const domain of DOMAINS){const raw=input[domain];if(raw===undefined)continue;const {key,schema,empty}=modules[domain];source.setItem(key,raw);
  if(mode==='durable'){await enableDurableStore(source,key,schema,empty,sourceDb);exported[domain]=await exportDurableStore(source,key,sourceDb);}else exported[domain]=source.getItem(key)!;}
 const backup=await encryptBackup(exported);
 // Wipe: a new, empty browser profile (fresh localStorage and a separate IndexedDB database).
 const target=memoryStorage(),targetDb=new VaultDatabase(crypto.randomUUID()),restored=await decryptBackup(backup.file,backup.recovery),after:PrivateData={};
 expect(restored).toEqual(exported);
 for(const domain of DOMAINS){const raw=restored[domain];if(raw===undefined)continue;const {key,schema,empty}=modules[domain];
  if(mode==='durable'){await enableDurableStore(target,key,schema,empty,targetDb);await restoreDurableStore(target,key,schema,raw,targetDb);after[domain]=await exportDurableStore(target,key,targetDb);}
  else{await importPrivateStore(target,key,schema,raw);after[domain]=target.getItem(key)!;}}
 return {exported,after};
}
// Durable stores export their stored, schema-validated JSON, so the round trip is byte-identical.
// Legacy stores export raw localStorage bytes and import normalizes them through the schema
// (key order only): the data is identical, and from the second round trip on so are the bytes.
const expectIdentical=async(input:PrivateData)=>{
 const durable=await roundTrip(input,'durable');expect(durable.after,'durable').toEqual(durable.exported);
 const legacy=await roundTrip(input,'legacy');
 for(const domain of DOMAINS)if(input[domain]!==undefined){const expected=modules[domain].schema.parse(JSON.parse(input[domain]!));
  expect(JSON.parse(durable.after[domain]!),`durable ${domain}`).toEqual(expected);expect(JSON.parse(legacy.after[domain]!),`legacy ${domain}`).toEqual(expected);}
 const again=await roundTrip(legacy.after,'legacy');expect(again.after,'legacy second round trip').toEqual(legacy.after);
};

const unicode='Ünïcødé 日本旅行 ✈️ 👩‍👩‍👧 «quoted» \\ "escaped"   end';
function richData():PrivateData{
 const {records}=buildShowcase('2026-09-20'),at='2026-09-20T12:00:00.000Z';
 // Finance: Showcase history plus an archived asset, a closed Goal and unicode text.
 let platform:Platform=platformSchema.parse(JSON.parse(records[PLATFORM_KEY]!));
 platform=archiveAsset(platform,'showcase-custom',true,Date.parse(at));platform=closeGoal(platform,platform.goals.at(-1)!.id);
 platform=platformSchema.parse({...platform,goals:platform.goals.map((g,i)=>i===0?{...g,name:'Emergency fund '+unicode.slice(0,40),notes:unicode}:g)});
 // Habits: Showcase history, a large collection, unicode, and archived and paused Habits.
 let habits:HabitData=habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!));
 for(let i=0;i<150;i++){habits=createHabit(habits,{title:`Habit ${i} ${i%7===0?unicode.slice(0,20):''}`.trim(),category:'Wellbeing',description:'',notes:i===0?unicode:'',schedule:{kind:'daily'},target:1,measurement:{kind:'count',unit:'times'}},new Date(at));habits=logHabitCount(habits,habits.habits.at(-1)!.id,'2026-09-20',1,'',new Date(at));}
 habits=setHabitState(habits,habits.habits[0]!.id,'archived',new Date(at));habits=setHabitState(habits,habits.habits[1]!.id,'paused',new Date(at));
 // Health: Showcase diary plus a custom unicode food, a recipe, a saved meal, water and preferences.
 let health:HealthData=healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!));
 health=saveFood(health,{id:'health_custom-food-1',name:'Onigiri 🍙 '+unicode.slice(0,12),brand:'Café «Ümlaut»',servingGrams:110,nutrients:{kcal:180,proteinMg:4000,carbsMg:38000,fatMg:1000},createdAt:at,updatedAt:at});
 health=saveRecipe(health,{id:'health_custom-recipe-1',name:'Bento 🍱',portionsMilli:2000,items:[{foodId:'health_custom-food-1',quantityMilli:2000},{foodId:health.foods[0]!.id,quantityMilli:500}]},at);
 health=logHealthItem(health,{id:'health_custom-diary-1',sourceKind:'recipe',sourceId:'health_custom-recipe-1',date:'2026-09-20',meal:'Lunch',quantityMilli:1000},at);
 health=saveMealFromRecipe(health,'health_custom-meal-1','health_custom-recipe-1',1000,at);
 health=addWater(health,{id:'health_custom-water-1',date:'2026-09-20',amountMilli:250000,unit:'ml'},at);
 health=saveHealthPreferences(health,{...dailyData(health).preferences,timezone:'Asia/Tokyo'});
 return {finance:JSON.stringify(platform),habits:JSON.stringify(habits),health:JSON.stringify(health),settings:JSON.stringify({...presetSettings('habits-health'),onboarded:true})};
}

test('rich data in all four domains round-trips byte-identically, durable and legacy',async()=>{
 const data=richData();
 // The fixture really contains the edge cases it claims.
 const finance=JSON.parse(data.finance!),habits=JSON.parse(data.habits!),health=JSON.parse(data.health!);
 expect(finance.positions.some((p:{archivedAt?:string})=>p.archivedAt)).toBe(true);expect(finance.goals.some((g:{status:string})=>g.status==='closed')).toBe(true);
 expect(habits.habits.length).toBeGreaterThan(150);expect(habits.habits.some((h:{rules:{state:string}[]})=>h.rules.at(-1)!.state==='archived')).toBe(true);
 expect(health.recipes.length).toBe(1);expect(health.foods.some((f:{id:string})=>f.id==='health_custom-food-1')).toBe(true);
 await expectIdentical(data);
},60000);

test('empty domains round-trip and are not dropped',async()=>{
 await expectIdentical(Object.fromEntries(DOMAINS.map(d=>[d,JSON.stringify(modules[d].empty())])));
});

test('a subset backup restores only its own domains',async()=>{
 const data=richData();await expectIdentical({finance:data.finance,settings:data.settings});await expectIdentical({health:data.health});
},60000);

test('a large finance collection near the chunk boundary round-trips',async()=>{
 const base=platformSchema.parse(JSON.parse(buildShowcase('2026-09-20').records[PLATFORM_KEY]!));
 // Stretch goal notes so the domain spans many 48,000-character backup chunks.
 const platform=platformSchema.parse({...base,goals:base.goals.map((g,i)=>({...g,notes:(unicode+' ').repeat(40).slice(0,1990)+i}))});
 const raw=JSON.stringify(platform);expect(raw.length).toBeGreaterThan(48000);
 await expectIdentical({finance:raw});
},60000);
