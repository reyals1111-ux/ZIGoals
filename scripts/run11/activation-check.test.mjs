import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import JSON5 from 'json5';
import {CONFIGS,validateTopology} from './activation-check.mjs';
const configs=()=>Object.fromEntries(Object.entries(CONFIGS).map(([k,p])=>[k,JSON5.parse(readFileSync(new URL('../../'+p,import.meta.url),'utf8'))]));
test('six real template files have compatible nonpublic binding topology and closed lifecycle gate',()=>expect(validateTopology(configs())).toEqual([]));
test.each(['public','credential','admin','binding','migration','serve'] )('activation check rejects unsafe %s template',kind=>{const c=configs();if(kind==='public')c.app.workers_dev=true;if(kind==='credential')c.app.vars.SECRET='not-a-real-secret';if(kind==='admin')c.app.services.push({binding:'ADMIN',service:c.lifecycle.name,entrypoint:'LifecycleRecoveryAdmin'});if(kind==='binding')c.app.services=[];if(kind==='migration')c.private.migrations=[];if(kind==='serve')c.lifecycle.vars.RECOVERY_MODE='serve';expect(validateTopology(c).length).toBeGreaterThan(0);});
