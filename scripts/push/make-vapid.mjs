#!/usr/bin/env node
// Session AK Part 2 (ADR-036 Q3): the VAPID key pair for the DEVICE push Worker (workers/push-device), made on this machine
// with WebCrypto, offline. The private key (a P-256 JWK) goes to a NEW 0600 file OUTSIDE the repository — never to the
// console, never inside the checkout; the public key is printed for config/public-integrations.json `pushVapidPublicKey`.
// Usage: node scripts/push/make-vapid.mjs [--out <file>]   (default: ~/.zigoals/push-device.vapid.json)
import {mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname,join,relative,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateVapidKeys,writePrivateKey} from './make-vapid-keys.mjs';

export const REPOSITORY=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const DEFAULT_OUT=join(homedir(),'.zigoals','push-device.vapid.json');
/** True when `path` lies inside the repository (where a key must never be written). @param {string} path @param {string} [root] */
export function insideRepository(path,root=REPOSITORY){const rel=relative(root,resolve(path));return rel===''||(!rel.startsWith('..')&&!isAbsolute(rel));}
/** @param {string[]} argv @param {string} [root] */
export function parseArgs(argv,root=REPOSITORY){
 let out=DEFAULT_OUT;
 if(argv.length===2&&argv[0]==='--out'&&argv[1])out=resolve(argv[1]);else if(argv.length)throw Error('Usage: node scripts/push/make-vapid.mjs [--out <file outside the repository>]');
 if(insideRepository(out,root))throw Error('Refused: the private key must be written outside the repository.');
 return {out};
}
async function main(){
 const {out}=parseArgs(process.argv.slice(2));
 mkdirSync(dirname(out),{recursive:true,mode:0o700});
 const keys=await generateVapidKeys();
 writePrivateKey(out,keys.privateJwk);
 console.log(`Private key written to ${out} (mode 0600, outside the repository). It is never printed.`);
 console.log(`Public key (config/public-integrations.json pushVapidPublicKey): ${keys.publicKey}`);
 console.log('Next: wrangler secret put VAPID_PRIVATE_KEY for the device push Worker, pasting that file\'s one line; see docs/run11/PUSH_PUBLIC_ALPHA.md.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
