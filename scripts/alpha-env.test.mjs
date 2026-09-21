import {afterEach,expect,it} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sanitizeAlphaEnv} from '../apps/web/scripts/sanitize-alpha-env.mjs';
const roots=[];
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
function fixture(extra=''){const root=mkdtempSync(join(tmpdir(),'zigoals-alpha-env-'));roots.push(root);mkdirSync(join(root,'cloudflare'));writeFileSync(join(root,'cloudflare/next-env.mjs'),['production','development','test'].map(mode=>`export const ${mode} = ${JSON.stringify({NEXT_PUBLIC_APP_ENVIRONMENT:'PUBLIC_ALPHA_UNDEPLOYED',COINGECKO_DEMO_API_KEY:'fixture-runtime-only-secret'})};`).join('\n')+'\n');if(extra)writeFileSync(join(root,'worker.js'),extra);return root;}
it('removes runtime-only credentials from all compiled modes while retaining public configuration',()=>{const root=fixture();sanitizeAlphaEnv(root);const text=readFileSync(join(root,'cloudflare/next-env.mjs'),'utf8');expect(text).not.toContain('fixture-runtime-only-secret');expect(text).not.toContain('COINGECKO_DEMO_API_KEY');expect(text.match(/PUBLIC_ALPHA_UNDEPLOYED/g)).toHaveLength(3);});
it('fails the build if the same credential survives elsewhere without exposing its value',()=>{const root=fixture('const unexpected="fixture-runtime-only-secret";');expect(()=>sanitizeAlphaEnv(root)).toThrow('Runtime credential remains in an Alpha artifact; values suppressed.');});
it('fails closed on an unexpected adapter output format',()=>{const root=fixture();writeFileSync(join(root,'cloudflare/next-env.mjs'),'unexpected-format');expect(()=>sanitizeAlphaEnv(root)).toThrow('Unexpected compiled environment format.');});
