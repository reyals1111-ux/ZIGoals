import {expect,test} from 'vitest';
import {mkdtemp,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DEFAULT_OUT,generateVapidKeys,parseArgs,writePrivateKey} from './make-vapid-keys.mjs';
import {fromB64url,importVapidKey,vapidAuthorization,verifyVapid} from '../../workers/push-reminders/webpush.mjs';

const script=fileURLToPath(new URL('./make-vapid-keys.mjs',import.meta.url));

test('a generated pair signs a token the printed public key verifies; the public key is the 65-byte point of the JWK',async()=>{
 const keys=await generateVapidKeys();
 expect(keys.privateJwk).toMatchObject({kty:'EC',crv:'P-256'});expect(Object.keys(keys.privateJwk).sort()).toEqual(['crv','d','kty','x','y']);
 const point=fromB64url(keys.publicKey);expect(point.length).toBe(65);expect(point[0]).toBe(4);
 const key=await importVapidKey(keys.privateJwk),now=Date.UTC(2026,9,4,12);
 const {token,header}=await vapidAuthorization({privateKey:key.privateKey,publicPoint:key.publicPoint,audience:'https://push.test',subject:'mailto:push@zigoals.test',now});
 expect(header).toBe(`vapid t=${token}, k=${keys.publicKey}`);
 expect(await verifyVapid(token,point,now)).toMatchObject({aud:'https://push.test',sub:'mailto:push@zigoals.test',exp:Math.floor(now/1000)+12*3600});
 const other=await generateVapidKeys();expect(await verifyVapid(token,fromB64url(other.publicKey),now)).toBeNull();
});
test('the private file is written once, mode 0600, and never overwritten',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'zigoals-vapid-')),path=join(dir,'zigoals.vapid.owner.json'),keys=await generateVapidKeys();
 writePrivateKey(path,keys.privateJwk);
 expect((await stat(path)).mode&0o777).toBe(0o600);
 expect(JSON.parse(await readFile(path,'utf8'))).toEqual(keys.privateJwk);
 expect(()=>writePrivateKey(path,keys.privateJwk)).toThrow(/EEXIST/);
});
test('the command writes the file, prints only the public key and refuses a second run',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'zigoals-vapid-cli-')),path=join(dir,'keys.json');
 const output=execFileSync(process.execPath,[script,'--out',path],{encoding:'utf8'});
 const jwk=JSON.parse(await readFile(path,'utf8'));
 expect(output).toContain('Public key (ZIGOALS_PUSH_PUBLIC_KEY): ');expect(output).not.toContain(jwk.d);
 const printed=output.match(/ZIGOALS_PUSH_PUBLIC_KEY\): (\S+)/)?.[1];
 expect(printed).toBeDefined();expect(fromB64url(printed).length).toBe(65);
 expect(()=>execFileSync(process.execPath,[script,'--out',path],{encoding:'utf8',stdio:'pipe'})).toThrow();
});
test('arguments: none means the default ignored file name; anything else is refused',()=>{
 expect(parseArgs([])).toEqual({out:DEFAULT_OUT});expect(DEFAULT_OUT).toMatch(/\.vapid\.owner\.json$/);
 expect(parseArgs(['--out','x.json'])).toEqual({out:'x.json'});
 expect(()=>parseArgs(['--print'])).toThrow(/Usage/);
});
