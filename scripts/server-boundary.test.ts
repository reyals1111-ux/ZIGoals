import {expect,it} from 'vitest';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {clientServerViolations} from './lib/server-boundary';
it('rejects indirect provider imports from client modules, including dynamic imports',()=>{
 const dir=mkdtempSync(join(tmpdir(),'zigoals-server-boundary-'));
 try{
 writeFileSync(join(dir,'client.ts'),'"use client"; import "./bridge";');
 writeFileSync(join(dir,'bridge.ts'),'export const load=()=>import("./provider");');
 writeFileSync(join(dir,'provider.ts'),'import "server-only"; export const server=true;');
 expect(clientServerViolations(dir)).toHaveLength(1);
 writeFileSync(join(dir,'bridge.ts'),'export const publicValue=true;');
 expect(clientServerViolations(dir)).toEqual([]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
it('keeps the real client graph free of server-only imports and poisons the provider entry',()=>{
 expect(readFileSync('apps/web/lib/server/coingecko.ts','utf8')).toMatch(/^import 'server-only';/);
 expect(readFileSync('apps/web/lib/server/market-service.ts','utf8')).toMatch(/^import 'server-only';/);
 expect(clientServerViolations('apps/web')).toEqual([]);
});
