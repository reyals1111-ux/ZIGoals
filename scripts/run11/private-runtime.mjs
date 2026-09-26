import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
export const ACCOUNT='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export async function privateRuntime(persist){
 persist??=await mkdtemp(join(tmpdir(),'zigoals-run11-vault-'));
 const mf=await createPrivateMiniflare({persist});
 const call=(path,body,token='fixture')=>mf.dispatchFetch('https://sync.test'+path,{method:body?'POST':'GET',headers:{origin:'https://app.test',authorization:'Bearer '+fixtureToken(token),'x-zigoals-account':ACCOUNT,'content-type':'application/json'},...(body?{body:JSON.stringify(body.action==='refresh'?{...body,previous:fixtureToken(body.previous)}:body)}:{})});
 return {mf,call,persist};
}

export async function createPrivateMiniflare({persist,origin='https://app.test',outboundService,recoveryMode='serve',bindings={}}){
 const syntheticUpstream=outboundService??(async request=>Response.json(fixtureAlias(request)==='invalid'?{}:{id:ACCOUNT},{status:fixtureAlias(request)==='invalid'?401:200}));
 // Every worker outbound request stays in this Node callback. Never forward to fetch.
 const isolatedUpstream=async request=>{if(new URL(request.url).hostname!=='fixture.supabase.co'&&new URL(request.url).hostname!=='test.supabase.co')throw Error('Fixture refused external destination');return syntheticUpstream(request);};
 const bundle=async name=>(await build({entryPoints:[new URL('../../workers/private-sync/'+name,import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text;
 return new Miniflare({...convertV4MiniflareOptions({workers:[{name:'run11-private-sync',modules:true,script:await bundle('worker.mjs'),compatibilityDate:'2026-09-13',durableObjects:{VAULTS:{className:'PrivateVault',useSQLite:true}},serviceBindings:{LIFECYCLE:{name:'run11-lifecycle',entrypoint:'LifecycleService'}},bindings:{AUTH_ORIGIN:'https://fixture.supabase.co',AUTH_PUBLIC_KEY:'public-fixture',APP_ORIGIN:origin,...bindings},outboundService:isolatedUpstream},{name:'run11-lifecycle',modules:true,script:await bundle('lifecycle.mjs'),compatibilityDate:'2026-09-13',durableObjects:{LIFECYCLES:{className:'LifecycleAuthority',useSQLite:true}},bindings:{RECOVERY_MODE:recoveryMode,AUTH_ORIGIN:'https://fixture.supabase.co',...(bindings.AUTH_ADMIN_KEY?{AUTH_ADMIN_KEY:bindings.AUTH_ADMIN_KEY}:{})},outboundService:isolatedUpstream}],durableObjectsPersist:persist}),resourcePersistencePath:persist});
}

export function fixtureToken(alias,account=ACCOUNT,family=['old','new','racer','revived'].includes(alias)?'refresh-family':alias){
 const hash=createHash('sha256').update(family).digest('hex'),session=hash.slice(0,8)+'-'+hash.slice(8,12)+'-4'+hash.slice(13,16)+'-8'+hash.slice(17,20)+'-'+hash.slice(20,32);
 return Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:account,session_id:session,fixture_alias:alias})).toString('base64url')+'.fixture-signature';
}
export function fixtureAlias(request){try{return JSON.parse(Buffer.from(request.headers.get('authorization').slice(7).split('.')[1],'base64url').toString()).fixture_alias;}catch{return 'invalid';}}
