#!/usr/bin/env node
// Generates the VAPID key pair for the push Worker (ADR-010) on this machine, offline. The private key is written as
// a P-256 JWK to an ignored 0600 file for `wrangler secret put VAPID_PRIVATE_KEY`; the public key is printed as the
// base64url uncompressed point for ZIGOALS_PUSH_PUBLIC_KEY. It refuses to overwrite and never prints the private key.
// Usage: node scripts/push/make-vapid-keys.mjs [--out <file>]   (default: zigoals.vapid.owner.json in the checkout root)
import {closeSync,fsyncSync,openSync,writeSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {b64url,jwkPoint} from '../../workers/push-reminders/webpush.mjs';

export const DEFAULT_OUT='zigoals.vapid.owner.json';
/** A fresh ECDSA P-256 pair: the private JWK (for the secret) and the public point (for the app). @param {SubtleCrypto} [subtle] */
export async function generateVapidKeys(subtle=crypto.subtle){
 const pair=/** @type {CryptoKeyPair} */(await subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']));
 const jwk=await subtle.exportKey('jwk',pair.privateKey);
 if(jwk.kty!=='EC'||jwk.crv!=='P-256'||typeof jwk.d!=='string'||typeof jwk.x!=='string'||typeof jwk.y!=='string')throw Error('The runtime did not export a P-256 private JWK.');
 return {privateJwk:{kty:'EC',crv:'P-256',d:jwk.d,x:jwk.x,y:jwk.y},publicKey:b64url(jwkPoint(jwk))};
}
/** Writes the private JWK to a new 0600 file (never over an existing one). @param {string} path @param {object} privateJwk */
export function writePrivateKey(path,privateJwk){
 const fd=openSync(path,'wx',0o600);
 try{writeSync(fd,JSON.stringify(privateJwk)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
}
/** @param {string[]} argv */
export function parseArgs(argv){
 if(argv.length===0)return {out:DEFAULT_OUT};
 if(argv.length===2&&argv[0]==='--out'&&argv[1])return {out:argv[1]};
 throw Error('Usage: node scripts/push/make-vapid-keys.mjs [--out <file>]');
}
async function main(){
 const {out}=parseArgs(process.argv.slice(2)),root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),path=resolve(root,out);
 const keys=await generateVapidKeys();
 writePrivateKey(path,keys.privateJwk);
 console.log(`Private key written to ${path} (mode 0600; keep it out of git: *.vapid.owner.json is ignored).`);
 console.log(`Public key (ZIGOALS_PUSH_PUBLIC_KEY): ${keys.publicKey}`);
 console.log('Next: `wrangler secret put VAPID_PRIVATE_KEY --config <private push config>` and paste the file contents; see docs/run11/PUSH_ACTIVATION.md.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
