import {expect,test} from 'vitest';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,stat,chmod,unlink,readdir,appendFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import JSON5 from 'json5';
import {makePrivateConfigs,parseArgs,setMarketPolicy,setFoodUserAgent,privateCheckStatus,foodUserAgentProblems} from './make-private-configs.mjs';
import {CONFIGS,privatePath} from './activation-check.mjs';

// Stage 6 update modes. Runs in a throwaway git repository holding the six templates and this .gitignore; the
// owner's Stage 4 copies carry hand-written comments, a block comment and a trailing comma, as real ones may.
const repo=new URL('../..',import.meta.url).pathname;
const MARKET=privatePath(CONFIGS.market),FOOD=privatePath(CONFIGS.food);
const UA='ZIGoals/0.1.0 (owner@fictional-owner.net)';
const POLICY={resetTimeZone:'UTC',monthlyCredits:20000,perMinute:30,checkedAt:'2026-10-01'};
async function checkout(){
 const root=await mkdtemp(join(tmpdir(),'private-config-update-'));execFileSync('git',['init','-q'],{cwd:root});
 for(const path of Object.values(CONFIGS)){await mkdir(dirname(join(root,path)),{recursive:true});await copyFile(join(repo,path),join(root,path));}
 await copyFile(join(repo,'.gitignore'),join(root,'.gitignore'));
 const initial=join(root,'initial.market-policy.private.json');await writeFile(initial,JSON.stringify({resetTimeZone:'UTC',monthlyCredits:10000}),{mode:0o600});
 makePrivateConfigs(root,{authRef:'abcdefghijklmnopqrst',workersSubdomain:'fictional-team',appOrigin:'https://acctest.fictional-owner.net',namePrefix:'zigoals-acctest',marketAccountId:'fictional-account',marketPolicyFile:initial});
 // The owner's edits: comments everywhere, a trailing comma, a block comment.
 const market=await readFile(join(root,MARKET),'utf8');
 await writeFile(join(root,MARKET),'// Stage 4 copy, reviewed 2026-10-01 (fictional)\n'+market.replace('"MARKET_ACCOUNT_ID"','/* opaque label */ "MARKET_ACCOUNT_ID"').replace(/("MARKET_POLICY": "(?:[^"\\]|\\.)*")/,'$1, // Stage 6 replaces this')+'// end\n');
 const food=await readFile(join(root,FOOD),'utf8');
 await writeFile(join(root,FOOD),food.replace(/\n}\n$/,', // owner: FOOD_USER_AGENT comes at Stage 6\n}\n').replace('{\n','{\n  // food lookup, private copy\n'));
 const policy=join(root,'owner.market-policy.private.json');await writeFile(policy,JSON.stringify(POLICY,null,2),{mode:0o600});
 return {root,policy};
}
const text=(root,path)=>readFile(join(root,path),'utf8');
const mode=async(root,path)=>(await stat(join(root,path))).mode&0o777;
const ignored=(root,path)=>spawnSync('git',['check-ignore','-q',join(root,path)],{cwd:root}).status===0;
const leftovers=async root=>(await Promise.all([dirname(MARKET),dirname(FOOD)].map(d=>readdir(join(root,d))))).flat().filter(f=>f.startsWith('.set-'));

test('the fixture copies carry the owner comments and a trailing comma, and still pass the private check',async()=>{
 const {root}=await checkout();
 expect(await text(root,MARKET)).toContain('// Stage 6 replaces this');expect(await text(root,FOOD)).toContain('// owner: FOOD_USER_AGENT comes at Stage 6');
 expect(privateCheckStatus(root)).toBe('activation-check --private: PASS (values not printed).');
});

test('--set-market-policy replaces only the MARKET_POLICY value: every other byte, comment and the order stay identical',async()=>{
 const {root,policy}=await checkout(),before=await text(root,MARKET),old=JSON5.parse(before).vars.MARKET_POLICY;
 const lines=setMarketPolicy(root,policy),after=await text(root,MARKET);
 expect(before.split(JSON.stringify(old))).toHaveLength(2);
 expect(after).toBe(before.replace(JSON.stringify(old),JSON.stringify(JSON.stringify(POLICY))));
 expect(JSON5.parse(after)).toEqual({...JSON5.parse(before),vars:{...JSON5.parse(before).vars,MARKET_POLICY:JSON.stringify(POLICY)}});
 expect(await mode(root,MARKET)).toBe(0o600);expect(ignored(root,MARKET)).toBe(true);expect(await leftovers(root)).toEqual([]);
 expect(lines[0]).toBe(MARKET+': MARKET_POLICY set (value not printed); every other byte is unchanged.');
 expect(lines.join('\n')).not.toMatch(/20000|perMinute|2026-10-01|fictional-account/);
 expect(setMarketPolicy(root,policy)[0]).toBe(MARKET+': MARKET_POLICY already has this value; nothing written.');
});

test('--set-food-user-agent adds FOOD_USER_AGENT without touching a byte, then replaces it in place; the private check passes',async()=>{
 const {root}=await checkout(),before=await text(root,FOOD);
 const lines=setFoodUserAgent(root,UA),after=await text(root,FOOD);
 // Only bytes were added: removing the inserted comma and the new member gives the original back.
 const inserted=after.match(/\n {2}"vars": \{\n {4}"FOOD_USER_AGENT": "[^"]*"\n {2}\},?/)[0];
 expect(after.replace(inserted,'').replace(/,(?=, \/\/ owner)/,'')).toBe(before);
 expect(JSON5.parse(after)).toEqual({...JSON5.parse(before),vars:{FOOD_USER_AGENT:UA}});
 expect(await mode(root,FOOD)).toBe(0o600);expect(await leftovers(root)).toEqual([]);
 expect(lines).toEqual([FOOD+': FOOD_USER_AGENT set (value not printed); every other byte is unchanged.','activation-check --private: PASS (values not printed).']);
 expect(lines.join('\n')).not.toContain('owner@');
 const next='ZIGoals/0.2.0 (owner@fictional-owner.net)';setFoodUserAgent(root,next);
 expect(await text(root,FOOD)).toBe(after.replace(JSON.stringify(UA),JSON.stringify(next)));
});

test('the market policy file must be a JSON object inside the checkout, mode 0600 and ignored; nothing is written otherwise',async()=>{
 const {root,policy}=await checkout(),before=await text(root,MARKET);
 const outside=join(await mkdtemp(join(tmpdir(),'policy-outside-')),'x.market-policy.private.json');await writeFile(outside,'{}',{mode:0o600});
 const plain=join(root,'policy.json');await writeFile(plain,'{}',{mode:0o600});
 const cases=[[outside,'outside the checkout'],[plain,'not ignored by git'],[join(root,'missing.market-policy.private.json'),'missing']];
 for(const [file,message]of cases)expect(()=>setMarketPolicy(root,file),message).toThrow(message);
 await chmod(policy,0o644);expect(()=>setMarketPolicy(root,policy)).toThrow('not mode 0600');await chmod(policy,0o600);
 for(const body of ['[]','"policy"','not json','null'])
 {await writeFile(policy,body);expect(()=>setMarketPolicy(root,policy),body).toThrow('--market-policy-file must contain a JSON object.');}
 expect(await text(root,MARKET)).toBe(before);expect(await leftovers(root)).toEqual([]);
});

test('FOOD_USER_AGENT must follow FOOD_READINESS.md: refusals name no value and write nothing',async()=>{
 const {root}=await checkout(),before=await text(root,FOOD);
 const bad=['','ZIGoals/0.1.0','OtherApp/1.0 (owner@fictional-owner.net)','ZIGoals/0.1.0 (owner@fictional-owner.net)\nX-Injected: 1','ZIGoals/0.1.0 (owner@fictional-owner.net)\r','ZIGoals/0.1.0 (owner\u0007@fictional-owner.net)','ZIGoals/0.1.0 (ownér@fictional-owner.net)','ZIGoals/<version> (<owner contact email>)','ZIGoals/0.1.0 (owner@example.com)','ZIGoals/0.1.0 (owner@localhost.net)','ZIGoals/0.1.0  (owner@fictional-owner.net)','ZIGoals/0.1.0 (owner@fictional-owner.net) ','ZIGoals/'+'1'.repeat(40)+' (owner@fictional-owner.net)','ZIGoals/0.1.0 ('+'a'.repeat(70)+'@fictional-owner.net)'];
 for(const value of bad){
  expect(foodUserAgentProblems(value).length,JSON.stringify(value)).toBeGreaterThan(0);
  let message='';try{setFoodUserAgent(root,value);}catch(error){message=error.message;}
  expect(message,JSON.stringify(value)).toMatch(/FOOD_READINESS|real owner contact/);
  if(value.length>12)expect(message).not.toContain(value);
 }
 expect(foodUserAgentProblems(UA)).toEqual([]);
 expect(await text(root,FOOD)).toBe(before);expect(await leftovers(root)).toEqual([]);
});

test('refuses when the target copy is missing, readable by others or not ignored, and when it cannot be edited safely',async()=>{
 const {root,policy}=await checkout();
 await chmod(join(root,MARKET),0o644);const loose=await text(root,MARKET);
 expect(()=>setMarketPolicy(root,policy)).toThrow(MARKET+': not mode 0600');expect(await text(root,MARKET)).toBe(loose);
 await unlink(join(root,FOOD));expect(()=>setFoodUserAgent(root,UA)).toThrow(FOOD+': missing');
 const other=await checkout();await appendFile(join(other.root,'.gitignore'),'\n!'+FOOD+'\n');
 expect(()=>setFoodUserAgent(other.root,UA)).toThrow('not ignored by git');
 const json5=await checkout();await writeFile(join(json5.root,FOOD),"{name: 'food-lookup'}\n",{mode:0o600});
 expect(()=>setFoodUserAgent(json5.root,UA)).toThrow('FOOD_USER_AGENT could not be located safely');
 const dup=await checkout(),dupText='{\n  "name": "x",\n  "vars": {"FOOD_USER_AGENT": "a", "FOOD_USER_AGENT": "b"}\n}\n';await writeFile(join(dup.root,FOOD),dupText,{mode:0o600});
 expect(()=>setFoodUserAgent(dup.root,UA)).toThrow('duplicate key');expect(await text(dup.root,FOOD)).toBe(dupText);
});

test('each update mode stands alone on the command line',()=>{
 expect(parseArgs(['--set-market-policy','owner.market-policy.private.json'])).toEqual({update:'--set-market-policy',value:'owner.market-policy.private.json'});
 expect(parseArgs(['--set-food-user-agent',UA])).toEqual({update:'--set-food-user-agent',value:UA});
 for(const argv of [['--set-market-policy'],['--set-food-user-agent',UA,'--set-market-policy','x'],['--set-market-policy','x','--auth-ref','y']])expect(()=>parseArgs(argv)).toThrow('Usage');
});

test('the private check reports remaining problems by name only',async()=>{
 const {root}=await checkout();
 expect(privateCheckStatus(root)).toBe('activation-check --private: PASS (values not printed).');
 await chmod(join(root,FOOD),0o640);
 expect(privateCheckStatus(root)).toBe('activation-check --private still reports:\n  '+FOOD+': not mode 0600');
});
