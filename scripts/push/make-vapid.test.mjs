import {mkdtempSync,readFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {expect,test} from 'vitest';
import {REPOSITORY,insideRepository,parseArgs} from './make-vapid.mjs';

// Session AK Part 2: the device push Worker's VAPID keys are written outside the repository, 0600, never printed.
test('paths inside the repository are refused; the default lies outside it',()=>{
 expect(insideRepository(join(REPOSITORY,'x.json'))).toBe(true);
 expect(insideRepository(join(REPOSITORY,'apps','web','k.json'))).toBe(true);
 expect(()=>parseArgs(['--out',join(REPOSITORY,'k.json')])).toThrow(/outside the repository/);
 expect(insideRepository(parseArgs([]).out)).toBe(false);
 expect(()=>parseArgs(['--bad'])).toThrow(/Usage/);
});
test('it writes a 0600 P-256 JWK outside the repository and prints only the public key',()=>{
 const dir=mkdtempSync(join(tmpdir(),'zigoals-vapid-')),out=join(dir,'k.json');
 const run=spawnSync(process.execPath,[join(REPOSITORY,'scripts/push/make-vapid.mjs'),'--out',out],{encoding:'utf8'});
 expect(run.status,run.stderr).toBe(0);
 const jwk=JSON.parse(readFileSync(out,'utf8'));
 expect(jwk).toMatchObject({kty:'EC',crv:'P-256'});expect(typeof jwk.d).toBe('string');
 expect(statSync(out).mode&0o777).toBe(0o600);
 expect(run.stdout).not.toContain(jwk.d);
 expect(run.stdout).toMatch(/pushVapidPublicKey\): [A-Za-z0-9_-]{87}\n/);
 // Never over an existing file.
 expect(spawnSync(process.execPath,[join(REPOSITORY,'scripts/push/make-vapid.mjs'),'--out',out],{encoding:'utf8'}).status).not.toBe(0);
});
