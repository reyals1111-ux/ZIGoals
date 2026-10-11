import {fileURLToPath} from 'node:url';
// Wrangler reads local secrets next to the config: `.dev.vars`, else `.env`/`.env.local`/... (and
// process.env when CLOUDFLARE_INCLUDE_PROCESS_ENV is set). A developer's files would then change what
// a harness Worker sees. Naming one deliberately empty env file skips all of them.
export const NO_LOCAL_SECRETS=fileURLToPath(new URL('./fixtures/no-local-secrets.env',import.meta.url));
/** unstable_getMiniflareWorkerOptions without any developer env file or process.env secrets. */
export function hermeticWorkerOptions(getMiniflareWorkerOptions,configPath){
 const previous=process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV;process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV='false';
 try{return getMiniflareWorkerOptions(configPath,undefined,{envFiles:[NO_LOCAL_SECRETS]});}
 finally{if(previous===undefined)delete process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV;else process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV=previous;}
}
