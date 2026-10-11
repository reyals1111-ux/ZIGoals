import {expect,test} from 'vitest';
import {mkdtemp,copyFile,readFile,writeFile,stat,chmod} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {parseArgs,nextOwnerPolicy,prepareNextPolicy} from './next-market-policy.mjs';
import {validateOwnerPolicy} from './market-policy.mjs';
import {DurableMarketAccount} from '../../apps/web/lib/server/durable-market-account.ts';
// Session U Part 2d, follow-up F2 (two windows installed in advance). Every figure here is fictional. Runs in a throwaway git repository with this checkout's
// .gitignore, so nothing is written into the real checkout.
const repo=resolve(import.meta.dirname,'../..');
const template=JSON.parse(await readFile(join(repo,'scripts/run11/market-policy.template.json'),'utf8'));
const current=()=>{const owner=structuredClone(template);owner.provider={checkedOn:'2031-05-12',perMinuteLimit:173,monthlyCredits:45678,creditsUsedThisPeriod:1234,reset:{kind:'exact-window',windowId:'plan-2031-04',windowStart:'2031-04-17T16:00:00Z',windowEnd:'2031-05-17T16:00:00Z'},endpointCosts:{quote:2,catalog:3,history:4,insights:5,token:6,rwa:'disabled'},exclusiveAccountUse:true};return owner;};
const boundary=Date.UTC(2031,4,17,16),before=Date.UTC(2031,4,14,9),after=boundary+5*60000;
const ownerFile='plan.market-policy.owner.json',installedFile='plan.market-policy.private.json',out='next.market-policy.private.json';
/** The policy market-policy.mjs wrote for the current period when it was installed (its checkedOn day). */
const installed=()=>validateOwnerPolicy(current(),{now:Date.UTC(2031,4,12,12)}).policy;
async function sandbox(owner=current(),policy=installed()){
 const root=await mkdtemp(join(tmpdir(),'next-market-policy-'));execFileSync('git',['init','-q'],{cwd:root});
 await copyFile(join(repo,'.gitignore'),join(root,'.gitignore'));
 for(const [file,value] of [[ownerFile,owner],[installedFile,policy]]){await writeFile(join(root,file),JSON.stringify(value),{mode:0o600});await chmod(join(root,file),0o600);}
 return root;
}
const input=(extra={})=>({ownerFile,currentPolicy:installedFile,windowEnd:'2031-06-16T16:00:00Z',creditsUsed:0,write:false,...extra});
class Storage{
 rows=new Map();
 async get(key){return structuredClone(this.rows.get(key));}async put(key,value){this.rows.set(key,structuredClone(value));}async delete(key){this.rows.delete(key);}
 async transaction(fn){const tx=new Storage();tx.rows=structuredClone(this.rows);const result=await fn(tx);this.rows=tx.rows;return result;}
}

test('a dry run days before the boundary pairs the installed window with the next one, prints every step and writes nothing',async()=>{
 const root=await sandbox();
 const lines=prepareNextPolicy(root,input(),{now:before});
 expect(lines[0]).toBe('Two windows: the installed plan-2031-04 until 2031-05-17T16:00:00.000Z, then period-2031-05-17 from 2031-05-17T16:00:00.000Z to 2031-06-16T16:00:00.000Z (30 days). The coordinator switches by itself at 2031-05-17T16:00:00.000Z.');
 expect(lines.join('\n')).toContain('as of 2031-05-17T16:00:00.000Z');
 expect(lines).toContain('Dry run: nothing written, nothing changed.');
 expect(lines.join('\n')).toContain('any time before 2031-05-17T16:00:00.000Z');
 expect(lines.join('\n')).toContain(`--current-policy ${installedFile} --window-end 2031-06-16T16:00:00.000Z`);
 expect(lines.join('\n')).toContain('--write --out <name>.market-policy.private.json');
 expect(lines.join('\n')).toContain('node scripts/run11/make-private-configs.mjs --set-market-policy <name>.market-policy.private.json');
 expect(lines.join('\n')).toContain('wrangler deploy --config "$PWD/workers/market-coordinator/wrangler.acctest.owner.jsonc"');
 expect(lines.join('\n')).toContain('Nothing to do at 2031-05-17T16:00:00.000Z.');
 // No figure from either file is printed.
 for(const figure of ['173','45678','1234'])expect(lines.join('\n')).not.toContain(figure);
 expect(existsSync(join(root,out))).toBe(false);
});

test('--write before the boundary writes the pair once; the real coordinator serves the old window, then the next one by itself',async()=>{
 const root=await sandbox();
 const lines=prepareNextPolicy(root,input({write:true,out,dailyRowBudget:100000}),{now:before});
 expect(lines).toContain(`Wrote MARKET_POLICY to ${out} (0600, ignored by git; values not printed). Nothing else was changed.`);
 expect((await stat(join(root,out))).mode&0o777).toBe(0o600);
 expect(spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout).toBe('?? .gitignore\n');
 const policy=JSON.parse(await readFile(join(root,out),'utf8'));
 expect(Object.keys(policy)).toEqual(['windows']);
 expect(policy.windows[0]).toEqual(installed());
 expect(policy.windows[1].month).toEqual({id:'period-2031-05-17',start:boundary,end:Date.UTC(2031,5,16,16)});
 expect(policy.windows[1].dailyRowBudget).toBe(100000);
 expect(()=>prepareNextPolicy(root,input({write:true,out}),{now:before})).toThrow('Refusing to overwrite');
 // The real coordinator with the pair installed days before: the old period until the boundary, then the new one.
 let clock=before;const storage=new Storage(),account=new DurableMarketAccount(storage,()=>clock,JSON.stringify(policy));
 const w={operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id:'fictional-coin'},currency:'USD'}};
 const serve=async()=>{const acquired=await account.apply({action:'acquire',work:w});return acquired.lease?account.apply({action:'enqueue',priority:'interactive',kind:'request',associations:[{work:w,lease:acquired.lease}]}):acquired;};
 expect(await serve()).toMatchObject({ok:true});
 expect(await account.apply({action:'inspect'})).toMatchObject({ok:true,dailyRowBudget:20000});
 clock=boundary;expect(await account.apply({action:'inspect'})).toMatchObject({ok:true,dailyRowBudget:100000});
 clock=boundary+60000;expect(await serve()).toMatchObject({ok:true});
 clock=Date.UTC(2031,5,16,16);expect(await account.apply({action:'inspect'})).toMatchObject({ok:false,reason:'CLOCK_OR_PERIOD'});
 // The month after: the pair just written is the installed policy; its last window is the one that ends at the next boundary.
 const later=current();later.provider.reset={kind:'exact-window',windowId:'period-2031-05-17',windowStart:'2031-05-17T16:00:00Z',windowEnd:'2031-06-16T16:00:00Z'};later.provider.checkedOn='2031-06-12';
 const next=await sandbox(later,policy);
 expect(JSON.parse(await readFile(join(next,installedFile),'utf8'))).toEqual(policy);
 expect(prepareNextPolicy(next,input({windowEnd:'2031-07-16T16:00:00Z'}),{now:Date.UTC(2031,5,13)})[0]).toBe('Two windows: the installed period-2031-05-17 until 2031-06-16T16:00:00.000Z, then period-2031-06-16 from 2031-06-16T16:00:00.000Z to 2031-07-16T16:00:00.000Z (30 days). The coordinator switches by itself at 2031-06-16T16:00:00.000Z.');
});

test('an installed policy that does not end where the next period starts is refused, and so is a loose file',async()=>{
 const root=await sandbox(current(),{...installed(),month:{...installed().month,end:boundary+1}});
 expect(()=>prepareNextPolicy(root,input(),{now:before})).toThrow(`${installedFile} has no exact window ending at 2031-05-17T16:00:00.000Z`);
 const loose=await sandbox();await chmod(join(loose,installedFile),0o644);
 expect(()=>prepareNextPolicy(loose,input(),{now:before})).toThrow('not mode 0600');
});

test('figures that do not hold for the new period are refused by field name; a calendar file needs no next period',async()=>{
 const root=await sandbox();
 expect(()=>prepareNextPolicy(root,input({creditsUsed:45678}),{now:after})).toThrow(/provider\.creditsUsedThisPeriod/);
 expect(()=>prepareNextPolicy(root,input({checkedOn:'2031-05-01'}),{now:after+10*86400000})).toThrow(/provider\.checkedOn/);
 expect(()=>prepareNextPolicy(root,input({dailyRowBudget:999}),{now:after})).toThrow(/coordinator\.dailyRowBudget/);
 const calendar=current();calendar.provider.reset={kind:'utc-calendar-month',windowId:null,windowStart:null,windowEnd:null};
 expect(nextOwnerPolicy(calendar,input())).toEqual({problem:'This owner file resets on the UTC calendar month: its policy never expires, so there is no next period to set.'});
 for(const windowEnd of ['2031-06-16T16:00:00','2031-06-10T16:00:00Z','2031-06-20T16:00:00Z','tomorrow'])expect(nextOwnerPolicy(current(),input({windowEnd})).problem).toMatch(/--window-end/);
 expect(nextOwnerPolicy(current(),input({windowId:'plan-2031-04'})).problem).toBe("--window-id must differ from the current period's windowId.");
 const loose=await sandbox();await chmod(join(loose,ownerFile),0o644);
 expect(()=>prepareNextPolicy(loose,input(),{now:after})).toThrow('not mode 0600');
});

test('arguments: required flags, --write only with --out, whole numbers only',()=>{
 expect(parseArgs(['--owner-file','a','--current-policy','p','--window-end','2031-06-16T16:00:00Z','--credits-used','0'])).toEqual({ownerFile:'a',currentPolicy:'p',windowEnd:'2031-06-16T16:00:00Z',creditsUsed:0,windowId:undefined,checkedOn:undefined,dailyRowBudget:undefined,write:false,out:undefined});
 expect(parseArgs(['--write','--owner-file','a','--current-policy','p','--window-end','e','--credits-used','5','--out','o','--daily-row-budget','100000'])).toMatchObject({write:true,out:'o',creditsUsed:5,dailyRowBudget:100000});
 for(const argv of [[],['--owner-file','a','--window-end','e'],['--owner-file','a','--window-end','e','--credits-used','0'],['--owner-file','a','--current-policy','p','--window-end','e','--credits-used','0','--write'],['--owner-file','a','--current-policy','p','--window-end','e','--credits-used','0','--out','o'],['--owner-file','a','--owner-file','b','--window-end','e','--credits-used','0'],['--owner-file','--window-end','e','--credits-used','0'],['--owner-file','a','--window-end','e','--credits-used','0','--secret','x']])expect(()=>parseArgs(argv)).toThrow('Usage');
 for(const value of ['-1','1.5','1e3','x'])expect(()=>parseArgs(['--owner-file','a','--current-policy','p','--window-end','e','--credits-used',value])).toThrow('--credits-used must be a whole number');
});
