// `activation-check.mjs --push` (ADR-010): the push template and the owner's private copy, checked on their own; the
// six-Worker checks (activation-check.test.mjs, activation-check-entries.test.mjs) are untouched by it.
import {expect,test} from 'vitest';
import {readFileSync,mkdirSync,writeFileSync,chmodSync,copyFileSync} from 'node:fs';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import JSON5 from 'json5';
import {CONFIGS,PUSH_CONFIG,checkPush,privatePath,validatePushPrivateCopy,validatePushTemplate} from './activation-check.mjs';

const repo=resolve(import.meta.dirname,'../..');
const template=()=>JSON5.parse(readFileSync(resolve(repo,PUSH_CONFIG),'utf8'));
const APP={name:'friends-run11'},SYNC={name:'friends-private-sync',vars:{AUTH_ORIGIN:'https://abcdefgh.supabase.co',APP_ORIGIN:'https://app.example.net'}};
function goodCopy(){const c=template();c.name='friends-push-reminders';c.vars={AUTH_ORIGIN:'https://abcdefgh.supabase.co',APP_ORIGIN:'https://app.example.net',VAPID_SUBJECT:'mailto:hello@zigoals.app'};c.workers_dev=true;return c;}

test('the committed push template is an isolated, nonpublic target with the reviewed object, date and placeholder origins',()=>{
 expect(validatePushTemplate(template())).toEqual([]);
 const c=template();expect(c.name).toBe('zigoals-push-reminders-local');expect(c.services).toBeUndefined();expect(Object.keys(c.vars).sort()).toEqual(['APP_ORIGIN','AUTH_ORIGIN','VAPID_SUBJECT']);
});
test.each([
 ['public',c=>{c.workers_dev=true;}],['route',c=>{c.routes=[{pattern:'push.example.net',custom_domain:true}];}],['credential',c=>{c.vars.VAPID_PRIVATE_KEY='x';}],
 ['fixture clock',c=>{c.vars.ISOLATED_FIXTURE='true';}],['binding',c=>{c.durable_objects.bindings[0].class_name='Other';}],['migration',c=>{c.migrations=[];}],
 ['service',c=>{c.services=[{binding:'LIFECYCLE',service:'zigoals-lifecycle-local',entrypoint:'LifecycleService'}];}],['date',c=>{c.compatibility_date='2026-01-01';}],
 ['logging',c=>{c.observability.enabled=true;}],['subject',c=>{c.vars.VAPID_SUBJECT='hello@zigoals.app';}],['hosts',c=>{c.vars.PUSH_ALLOWED_HOSTS='not a host';}],
 ['unknown var',c=>{c.vars.EXTRA='1';}],['admin',c=>{c.services=[{binding:'ADMIN',service:'x',entrypoint:'LifecycleRecoveryAdmin'}];}],['name',c=>{c.name='zigoals-alpha';}],
])('the push template check rejects %s',(_,mutate)=>{const c=template();mutate(c);expect(validatePushTemplate(c)).not.toEqual([]);});

test('a private copy passes with workers.dev, or with one custom-domain route and workers.dev off; it may list extra hosts',()=>{
 expect(validatePushPrivateCopy(goodCopy(),template(),{app:APP,sync:SYNC})).toEqual([]);
 const routed=goodCopy();routed.workers_dev=false;routed.routes=[{pattern:'push.example.net',custom_domain:true}];
 expect(validatePushPrivateCopy(routed,template(),{app:APP,sync:SYNC})).toEqual([]);
 const zoned=goodCopy();zoned.workers_dev=false;zoned.routes=[{pattern:'push.example.net/*',zone_name:'example.net'}];
 expect(validatePushPrivateCopy(zoned,template(),{app:APP,sync:SYNC})).toEqual([]);
 const hosts=goodCopy();hosts.vars.PUSH_ALLOWED_HOSTS='jmt17.google.com, *.notify.windows.com';
 expect(validatePushPrivateCopy(hosts,template(),{app:APP,sync:SYNC})).toEqual([]);
});
test.each([
 ['a placeholder origin',c=>{c.vars.APP_ORIGIN='http://127.0.0.1:3110';}],['a non-https origin',c=>{c.vars.AUTH_ORIGIN='http://abcdefgh.supabase.co';}],
 ['an origin with a path',c=>{c.vars.APP_ORIGIN='https://app.example.net/app';}],['another AUTH_ORIGIN than private sync',c=>{c.vars.AUTH_ORIGIN='https://other.supabase.co';}],
 ['another APP_ORIGIN than private sync',c=>{c.vars.APP_ORIGIN='https://other.example.net';}],['a template name',c=>{c.name='zigoals-push-reminders-local';}],
 ['another prefix than the app Worker',c=>{c.name='other-push-reminders';}],['both a route and workers.dev',c=>{c.routes=[{pattern:'push.example.net',custom_domain:true}];}],
 ['neither a route nor workers.dev',c=>{c.workers_dev=false;}],['a wildcard route',c=>{c.workers_dev=false;c.routes=[{pattern:'*.example.net/*',zone_name:'example.net'}];}],
 ['a changed object class',c=>{c.durable_objects.bindings[0].class_name='PushAccountV2';}],['a changed date',c=>{c.compatibility_date='2026-09-14';}],
 ['a credential var',c=>{c.vars.AUTH_PUBLIC_KEY='x';}],['the test clock',c=>{c.vars.ISOLATED_FIXTURE='true';}],['a service binding',c=>{c.services=[{binding:'X',service:'y'}];}],
 ['an invalid host list',c=>{c.vars.PUSH_ALLOWED_HOSTS='https://example.com';}],['logging',c=>{c.observability={enabled:true};}],
])('the private push copy check rejects %s',(_,mutate)=>{const c=goodCopy();mutate(c);expect(validatePushPrivateCopy(c,template(),{app:APP,sync:SYNC})).not.toEqual([]);});
test('without the Stage 4 copies the private push copy is refused; messages never carry values',()=>{
 const errors=validatePushPrivateCopy(goodCopy(),template(),{});
 expect(errors).toEqual(['push: the private app copy is missing (Stage 4 first).','push: the private sync copy is missing (Stage 4 first).']);
 const leaky=goodCopy();leaky.vars.APP_ORIGIN='http://secret-host.invalid';
 expect(validatePushPrivateCopy(leaky,template(),{app:APP,sync:SYNC}).join('\n')).not.toContain('secret-host');
});

const git=(cwd,...args)=>execFileSync('git',['-c','user.email=fixture@example.invalid','-c','user.name=Fixture',...args],{cwd,encoding:'utf8'});
/** A checkout with the template, the repository's .gitignore and the Stage 4 app and sync copies. */
async function checkout(){
 const root=join(await mkdtemp(join(tmpdir(),'activation-push-')),'ops');mkdirSync(root);git(root,'init','-q');
 for(const path of [PUSH_CONFIG,CONFIGS.app,CONFIGS.private]){mkdirSync(dirname(join(root,path)),{recursive:true});copyFileSync(join(repo,path),join(root,path));}
 copyFileSync(join(repo,'.gitignore'),join(root,'.gitignore'));
 const write=(path,value)=>{writeFileSync(join(root,path),JSON.stringify(value,null,2));chmodSync(join(root,path),0o600);};
 write(privatePath(CONFIGS.app),APP);write(privatePath(CONFIGS.private),SYNC);
 return {root,write};
}
test('--push on a checkout: a missing copy, a readable copy, a bad copy and a good one',async()=>{
 const {root,write}=await checkout(),path=privatePath(PUSH_CONFIG);
 expect(()=>checkPush(root)).toThrow(/missing/);
 write(path,goodCopy());chmodSync(join(root,path),0o644);
 expect(()=>checkPush(root)).toThrow(/not mode 0600/);
 chmodSync(join(root,path),0o600);
 const bad=goodCopy();bad.vars.APP_ORIGIN='https://other.example.net';write(path,bad);
 expect(()=>checkPush(root)).toThrow(/APP_ORIGIN must match private sync/);
 write(path,goodCopy());
 expect(checkPush(root)).toMatch(/^PASS: the push template is isolated/);
 expect(git(root,'check-ignore',path).trim()).toBe(path);
},30_000);
