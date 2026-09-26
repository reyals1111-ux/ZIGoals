import {healthSchema} from '../health';
import {habitDataSchema} from '../habits';
import {platformSchema} from '../positions';
import {dashboardSettingsSchema} from '../dashboard-settings';
const domains={finance:{label:'Goals and Wealth',schema:platformSchema},habits:{label:'Habits',schema:habitDataSchema},health:{label:'Health',schema:healthSchema},settings:{label:'Today preferences',schema:dashboardSettingsSchema}};
type Domain=keyof typeof domains;
const labels:Record<string,string>={positions:'Positions',goals:'Goals',allocations:'Allocations',snapshots:'Snapshots',contributions:'Contribution records',valuationSnapshots:'Valuation observations',goalHistory:'Goal history records',assetEvents:'Asset lifecycle records',financialPortfolios:'Financial portfolios',financialEvents:'Financial evidence',manualFx:'Dated exchange rates',performanceReviews:'Performance reviews',habits:'Habits',foods:'Foods',recipes:'Recipes',diary:'Meals',weights:'Weight records',measurements:'Body measurements',activity:'Activity records',widgets:'Widgets',water:'Water records',savedMeals:'Saved meals',plans:'Planned meals'};
export type BackupModuleSummary={domain:Domain;label:string;version:number;counts:{label:string;count:number}[];from:string|null;through:string|null};
/** Inventory is computed only from validated decrypted records. It never enters the public transport. */
export function summarizeBackupModules(data:Partial<Record<Domain,string>>):BackupModuleSummary[]{
 return Object.entries(data).map(([key,raw])=>{
  if(!Object.hasOwn(domains,key))throw Error('Unsupported backup module.');const domain=key as Domain,definition=domains[domain],parsed=definition.schema.parse(JSON.parse(raw!)) as Record<string,unknown>,counts:{label:string;count:number}[]=[];
  const countArrays=(value:Record<string,unknown>)=>{for(const [name,rows]of Object.entries(value))if(Array.isArray(rows)&&labels[name])counts.push({label:labels[name]!,count:rows.length});};
  countArrays(parsed);if(domain==='health'&&parsed.daily&&typeof parsed.daily==='object')countArrays(parsed.daily as Record<string,unknown>);
  if(domain==='habits'){const habits=parsed.habits as Array<Record<string,unknown>>;for(const [field,label]of [['entries','Check-ins'],['ruleRevisions','Rule revisions'],['timerReceipts','Timer recording receipts']])counts.push({label:label!,count:habits.reduce((n,h)=>{const rows=h[field!];return n+(Array.isArray(rows)?rows.length:0);},0)});}
  const dates:string[]=[];
  const visit=(value:unknown)=>{if(Array.isArray(value)){for(const item of value)visit(item);return;}if(!value||typeof value!=='object')return;for(const [name,item]of Object.entries(value)){if(typeof item==='string'&&/^(date|at|createdAt|updatedAt|recordedAt|observedAt|occurredAt|effectiveFrom|from|to|startDate|endDate|archivedAt|restoredAt|completedAt|closedAt)$/.test(name)&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(item)&&Number.isFinite(Date.parse(item)))dates.push(item.length===10?item:new Date(item).toISOString().slice(0,10));else if(item&&typeof item==='object')visit(item);}};
  visit(parsed);dates.sort();return {domain,label:definition.label,version:Number(parsed.schemaVersion),counts,from:dates[0]??null,through:dates.at(-1)??null};
 });
}
