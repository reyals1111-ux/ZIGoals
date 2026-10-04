#!/usr/bin/env node
// Session U Part 2d: the next billing period's MARKET_POLICY in one command, for an owner file with an `exact-window`
// reset (ACTIVATION Stage 6). A dry run by default: it builds the next period from the current owner file, validates it
// exactly as market-policy.mjs does (as of the new period's start when that is still ahead), prints the period and the
// owner steps, and writes nothing. `--write --out <file>` writes only that policy file: inside the checkout, ignored by
// git, mode 0600, never overwritten. It never edits a config, never calls wrangler or Cloudflare, and never prints a
// figure from the owner file.
//
// Why --write waits for the period's start: the coordinator refuses a period that has not started (validTime in
// market-budget-policy.ts), and the old period's policy refuses everything once it has ended. So the switch is made
// right after the boundary; prepare it with a dry run in the days before (around 28 October for the period ending
// 2026-10-31 16:00 UTC).
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {privateFileProblems} from './activation-check.mjs';
import {validateOwnerPolicy,writePolicyFile} from './market-policy.mjs';

const DAY=86400000;
const FLAGS=['--owner-file','--window-end','--credits-used','--window-id','--checked-on','--daily-row-budget','--out'];
const USAGE='Usage: node scripts/run11/next-market-policy.mjs --owner-file <current filled owner file> --window-end <next period end, UTC, from the CoinGecko dashboard, e.g. 2026-11-30T16:00:00Z> --credits-used <credits used in the next period, from the dashboard; 0 before it starts> [--window-id <label>] [--checked-on YYYY-MM-DD] [--daily-row-budget <rows>] [--write --out <name>.market-policy.private.json]';

export function parseArgs(argv){
 const values={};let write=false;
 for(let i=0;i<argv.length;){
  if(argv[i]==='--write'){if(write)throw Error(USAGE);write=true;i++;continue;}
  if(!FLAGS.includes(argv[i])||argv[i+1]===undefined||argv[i+1].startsWith('--')||argv[i] in values)throw Error(USAGE);
  values[argv[i]]=argv[i+1];i+=2;
 }
 if(!values['--owner-file']||!values['--window-end']||values['--credits-used']===undefined||write!==Boolean(values['--out']))throw Error(USAGE);
 const integer=(flag,min)=>{if(values[flag]===undefined)return undefined;if(!/^\d{1,12}$/.test(values[flag])||Number(values[flag])<min)throw Error(`${flag} must be a whole number${min?` of at least ${min}`:''}.`);return Number(values[flag]);};
 return {ownerFile:values['--owner-file'],windowEnd:values['--window-end'],creditsUsed:integer('--credits-used',0),windowId:values['--window-id'],checkedOn:values['--checked-on'],dailyRowBudget:integer('--daily-row-budget',1),write,out:values['--out']};
}

/** The next period's owner object, or {problem} when it cannot be built. Figures are copied, never printed. */
export function nextOwnerPolicy(owner,{windowEnd,creditsUsed,windowId,checkedOn,dailyRowBudget},now=Date.now()){
 const reset=owner?.provider?.reset;
 if(reset?.kind==='utc-calendar-month')return {problem:'This owner file resets on the UTC calendar month: its policy never expires, so there is no next period to set.'};
 if(reset?.kind!=='exact-window'||typeof reset.windowEnd!=='string'||!reset.windowEnd.endsWith('Z')||!Number.isFinite(Date.parse(reset.windowEnd)))return {problem:'The owner file must be the filled owner file of the current period, with an exact-window reset (provider.reset.windowEnd, UTC, ending in Z).'};
 const start=Date.parse(reset.windowEnd),end=windowEnd.endsWith('Z')?Date.parse(windowEnd):NaN;
 if(!Number.isFinite(end))return {problem:'--window-end must be a UTC timestamp ending in Z, as the CoinGecko dashboard shows the next reset.'};
 if(end-start<27*DAY||end-start>32*DAY)return {problem:`--window-end must be 27 to 32 days after the current period's end (${new Date(start).toISOString()}).`};
 const next=structuredClone(owner),startIso=new Date(start).toISOString(),id=windowId??`period-${startIso.slice(0,10)}`;
 // The coordinator moves to a new period only under a new label (validTime): the same label would be refused.
 if(id===reset.windowId)return {problem:'--window-id must differ from the current period\'s windowId.'};
 next.provider.reset={kind:'exact-window',windowId:id,windowStart:startIso,windowEnd:new Date(end).toISOString()};
 next.provider.creditsUsedThisPeriod=creditsUsed;
 next.provider.checkedOn=checkedOn??new Date(now).toISOString().slice(0,10);
 if(dailyRowBudget!==undefined)next.coordinator={...next.coordinator,dailyRowBudget};
 return {owner:next,start,end};
}

/** Returns the lines to print. Throws with a reason (field names only) when nothing can be prepared or written. */
export function prepareNextPolicy(root,input,{now=Date.now()}={}){
 const ownerProblems=privateFileProblems(root,input.ownerFile);
 if(ownerProblems.length)throw Error(`${input.ownerFile}: ${ownerProblems.join(', ')}. Keep the filled owner file inside the checkout, mode 0600 and ignored by git.`);
 let owner;try{owner=JSON.parse(readFileSync(resolve(root,input.ownerFile),'utf8'));}catch{throw Error(`${input.ownerFile} is not valid JSON.`);}
 const built=nextOwnerPolicy(owner,input,now);
 if(built.problem)throw Error(built.problem);
 const {start,end}=built,startIso=new Date(start).toISOString(),endIso=new Date(end).toISOString(),started=now>=start;
 if(input.write&&!started)throw Error(`Not written: the coordinator refuses a period before it starts. Run --write at or after ${startIso}.`);
 // Before the start, validate as of the start: the figures must then hold for the whole new period.
 const result=validateOwnerPolicy(built.owner,{now:Math.max(now,start)});
 if(result.errors.length)throw Error(['Next period rejected; nothing written:',...result.errors.map(e=>'- '+e)].join('\n'));
 if(input.write)writePolicyFile(root,input.out,result.policy);
 const out=input.out??'<name>.market-policy.private.json',config='"$PWD/workers/market-coordinator/wrangler.acctest.owner.jsonc"';
 const command=`node scripts/run11/next-market-policy.mjs --owner-file ${input.ownerFile} --window-end ${endIso} --credits-used <the dashboard's figure for the new period>${input.dailyRowBudget!==undefined?` --daily-row-budget ${input.dailyRowBudget}`:''} --write --out ${out}`;
 return [
  `Next period: ${result.policy.month.id}, ${startIso} to ${endIso} (${Math.round((end-start)/DAY)} days).`,
  `Checked: every field as market-policy.mjs checks it${started?'':`, as of ${startIso}`}. Enabled operations: ${result.enabled.join(', ')}.${result.disabled.length?` Disabled, fail closed: ${result.disabled.join(', ')}.`:''}`,
  `Daily row budget: ${result.policy.dailyRowBudget===undefined?'the coordinator default (20000)':'from the owner file or --daily-row-budget (value not printed)'}.`,
  input.write?`Wrote MARKET_POLICY to ${out} (0600, ignored by git; values not printed). Nothing else was changed.`:'Dry run: nothing written, nothing changed.',
  '',
  'Owner steps (in the ops checkout, one at a time; this tool runs none of them):',
  ...(input.write?[]:[`1. At or after ${startIso} (the coordinator refuses the new period before it starts; until you finish step 4, every price is refused):`,`   ${command}`]),
  `${input.write?'1':'2'}. node scripts/run11/make-private-configs.mjs --set-market-policy ${out}`,
  `${input.write?'2':'3'}. pnpm --filter @zigoals/web exec wrangler login, then: pnpm --filter @zigoals/web exec wrangler deployments list --config ${config}   (read only: note the live version, your rollback)`,
  `${input.write?'3':'4'}. pnpm --filter @zigoals/web exec wrangler deploy --config ${config}`,
  `${input.write?'4':'5'}. node scripts/verify-hosted-alpha.mjs <new evidence dir>: it prints "Market policy period ends ${endIso}". Then wrangler logout.`,
  `${input.write?'5':'6'}. For the period after this one: set ${input.ownerFile}'s provider.reset to windowId ${result.policy.month.id}, windowStart ${startIso}, windowEnd ${endIso}.`,
 ];
}

function main(){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
 console.log(prepareNextPolicy(root,parseArgs(process.argv.slice(2))).join('\n'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch(error){console.error(error.message);process.exitCode=1;}
