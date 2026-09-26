import 'server-only';
import {getCloudflareContext} from '@opennextjs/cloudflare';
/** OpenNext 1.20.6 exposes the current request through AsyncLocalStorage. Its
 * process.env population happens only at first request; do not cache bindings or
 * infer current configuration from that process-wide copy. Async mode can start
 * Wrangler during SSG, so explicitly exclude static generation before calling it. */
export function runtimeIsStaticGeneration():boolean {
 return (globalThis as typeof globalThis & {__NEXT_DATA__?:{nextExport?:boolean}}).__NEXT_DATA__?.nextExport===true;
}
export async function loadRuntimeBindings<T extends object=Record<string,unknown>>():Promise<T>{
 if(runtimeIsStaticGeneration())return {} as T;
 try{return (await getCloudflareContext({async:true})).env as unknown as T;}catch{return {} as T;}
}
