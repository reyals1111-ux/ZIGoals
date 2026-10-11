import {expect,test,vi} from 'vitest';
import {mkdtemp,mkdir,copyFile,writeFile,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {CONFIGS,ADMIN_CONFIG,strayAdminBindings,checkAdmin} from './activation-check.mjs';
import {makePrivateConfigs,makeAdminConfig} from './make-private-configs.mjs';

// The owner's real ops checkout holds nested git repositories: old worktrees under .superpowers/ and the
// cargo-audit database in .toolchain/advisory-db/. `git ls-files -o` returns them as directory entries
// ending in "/", which the stray-binding scan once read as files ("EISDIR: illegal operation on a
// directory, read"). That broke `activation-check.mjs --admin`, `recovery-admin.mjs status` and the admin
// line of stage7-preflight.mjs, which all reach checkAdmin(). Clean CI checkouts have no such folders.
const fsHook=vi.hoisted(()=>({unreadable:null}));
vi.mock('node:fs',async importOriginal=>{
 const fs=await importOriginal();
 // Root can read a mode-000 file, so an unreadable regular file is simulated at the read itself.
 const readFileSync=(path,...rest)=>{if(fsHook.unreadable&&String(path).endsWith(fsHook.unreadable))throw Object.assign(new Error(`EACCES: permission denied, open '${path}'`),{code:'EACCES'});return fs.readFileSync(path,...rest);};
 return {...fs,default:{...fs,readFileSync},readFileSync};
});

const repo=resolve(import.meta.dirname,'../..');
const STRAY=JSON.stringify({name:'stray',services:[{binding:'RECOVERY',service:'zigoals-lifecycle-local',entrypoint:'LifecycleRecoveryAdmin'}]});
const git=(cwd,...args)=>execFileSync('git',['-c','user.email=fixture@example.invalid','-c','user.name=Fixture',...args],{cwd,encoding:'utf8'});
const stray=path=>path+': binds a recovery admin entrypoint; only the local recovery-admin config may.';
async function checkout(){
 const base=await mkdtemp(join(tmpdir(),'activation-entries-')),root=join(base,'ops');await mkdir(root);git(root,'init','-q');
 for(const path of [...Object.values(CONFIGS),ADMIN_CONFIG,'apps/web/wrangler.alpha.jsonc','landing/wrangler.jsonc']){await mkdir(dirname(join(root,path)),{recursive:true});await copyFile(join(repo,path),join(root,path));}
 await copyFile(join(repo,'.gitignore'),join(root,'.gitignore'));
 const policy=join(base,'policy.json');await writeFile(policy,JSON.stringify({resetTimeZone:'UTC',monthlyCredits:10000}));
 makePrivateConfigs(root,{authRef:'abcdefghijklmnopqrst',workersSubdomain:'fictional-team',appOrigin:'https://acctest.fictional-owner.net',namePrefix:'zigoals-acctest',marketAccountId:'fictional-account',marketPolicyFile:policy});
 makeAdminConfig(root);
 // A separate repository whose worktrees land inside the checkout, as the owner's old worktrees did.
 const other=join(base,'other');await mkdir(other);git(other,'init','-q');await writeFile(join(other,'wrangler.jsonc'),STRAY);git(other,'add','.');git(other,'commit','-qm','fixture');
 git(other,'worktree','add','-q',join(root,'.superpowers/worktrees/old-session'));
 git(other,'worktree','add','-q',join(root,'old-worktree'));
 // A nested repository with a matching config inside, like .toolchain/advisory-db/.
 await mkdir(join(root,'.toolchain/advisory-db'),{recursive:true});git(join(root,'.toolchain/advisory-db'),'init','-q');await writeFile(join(root,'.toolchain/advisory-db/config.jsonc'),STRAY);
 return {base,root};
}
const listed=(root,...args)=>execFileSync('git',['ls-files','-z',...args],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);

test('nested repositories and worktrees in the checkout are skipped, so the admin check passes',async()=>{
 const {root}=await checkout();
 // Precondition: git really returns them as directory entries, so this test cannot pass vacuously.
 expect(listed(root,'-o','-i','--exclude-standard','--','*.owner.jsonc','*.owner.json','*.owner.toml')).toEqual(expect.arrayContaining(['.superpowers/worktrees/old-session/','.toolchain/advisory-db/']));
 expect(strayAdminBindings(root)).toEqual([]);
 expect(checkAdmin(root)).toMatch(/^PASS/);
},30_000);

test('a real stray binding is still found next to them: tracked, untracked and ignored owner copy',async()=>{
 const {root}=await checkout();
 const tracked='workers/extra/wrangler.jsonc',untracked='workers/scratch/wrangler.jsonc',ignored='workers/private-sync/wrangler.stray.acctest.owner.jsonc';
 for(const path of [tracked,untracked,ignored]){await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),STRAY);}
 git(root,'add',tracked);
 expect(strayAdminBindings(root).sort()).toEqual([stray(ignored),stray(tracked),stray(untracked)].sort());
 expect(()=>checkAdmin(root)).toThrow(stray(ignored));
},30_000);

test('a symlinked config is read through its link; a dangling link or a directory named like a config is skipped',async()=>{
 const {base,root}=await checkout();
 const target=join(base,'outside-config.jsonc');await writeFile(target,STRAY);
 await mkdir(join(root,'workers/linked'),{recursive:true});await symlink(target,join(root,'workers/linked/wrangler.jsonc'));
 await mkdir(join(root,'workers/dangling'),{recursive:true});await symlink(join(base,'missing.jsonc'),join(root,'workers/dangling/wrangler.jsonc'));
 await mkdir(join(root,'workers/odd/wrangler.jsonc'),{recursive:true});await writeFile(join(root,'workers/odd/wrangler.jsonc/inner.txt'),'not a config');
 expect(strayAdminBindings(root)).toEqual([stray('workers/linked/wrangler.jsonc')]);
},30_000);

test('an unreadable regular config still fails closed',async()=>{
 const {root}=await checkout();
 await mkdir(join(root,'workers/locked'),{recursive:true});await writeFile(join(root,'workers/locked/wrangler.jsonc'),'{}');
 fsHook.unreadable='workers/locked/wrangler.jsonc';
 try{
  expect(()=>strayAdminBindings(root)).toThrow('EACCES');
  expect(()=>checkAdmin(root)).toThrow('EACCES');
 }finally{fsHook.unreadable=null;}
},30_000);
