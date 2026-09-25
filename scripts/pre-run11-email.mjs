#!/usr/bin/env node
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function validateEmailTarget(config,email){
 const {origin,allowedOrigin,key,recipients}=config;
 try{const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin||!/^[a-z0-9-]+\.supabase\.co$/.test(u.hostname)||origin!==allowedOrigin)return 'TARGET_NOT_APPROVED';}catch{return 'TARGET_NOT_APPROVED';}
 if(typeof key!=='string'||!key||/service[_-]?role|sb_secret_|placeholder|unconfigured|dummy/i.test(key))return 'PUBLIC_KEY_REQUIRED';
 if(!Array.isArray(recipients)||!recipients.includes(email)||!/^\S+@\S+\.\S+$/.test(email))return 'RECIPIENT_NOT_APPROVED';
 return 'PASS';
}

export async function emailCodeOperation(mode,config,email,code,fetcher=fetch){
 const target=validateEmailTarget(config,email);if(target!=='PASS')return target;
 if(mode!=='request'&&mode!=='verify')return 'INVALID_MODE';
 if(mode==='verify'&&!/^\d{6,10}$/.test(code??''))return 'INVALID_CODE_FORMAT';
 const path=mode==='request'?'otp':'verify';
 try{
  const response=await fetcher(`${config.origin}/auth/v1/${path}`,{method:'POST',headers:{apikey:config.key,'content-type':'application/json'},body:JSON.stringify(mode==='request'?{email,create_user:true}:{email,token:code,type:'email'}),redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok){await response.body?.cancel().catch(()=>{});return response.status===429?'RATE_LIMITED':mode==='verify'?'CODE_REJECTED':'REQUEST_REJECTED';}
  if(mode==='request'){await response.body?.cancel().catch(()=>{});return 'CODE_REQUEST_ACCEPTED';}
  if(Number(response.headers.get('content-length')||0)>32768){await response.body?.cancel().catch(()=>{});return 'VERIFY_RESPONSE_INVALID';}
  const raw=await response.text();if(raw.length>32768)return 'VERIFY_RESPONSE_INVALID';
  const data=JSON.parse(raw);return typeof data?.access_token==='string'&&data.access_token&&data.user?'CODE_VERIFIED':'VERIFY_RESPONSE_INVALID';
 }catch{return 'NETWORK_ERROR';}
}

function readPrivate(prompt){
 return new Promise((resolveInput,reject)=>{
  if(!process.stdin.isTTY||!process.stdin.setRawMode){reject(Error('TTY_REQUIRED'));return;}
  process.stdout.write(prompt);let value='';process.stdin.setRawMode(true);process.stdin.resume();
  function done(error){process.stdin.setRawMode(false);process.stdin.pause();process.stdin.off('data',onData);process.stdout.write('\n');if(error)reject(error);else resolveInput(value);}
  function onData(buf){for(const ch of buf.toString('utf8')){if(ch==='\r'||ch==='\n'){done();return;}if(ch==='\u0003'){done(Error('CANCELLED'));return;}if(ch==='\u007f'){value=value.slice(0,-1);continue;}if(value.length<254&&ch>=' '&&ch<='~')value+=ch;}}
  process.stdin.on('data',onData);
 });
}
async function main(){
 const mode=process.argv[2];if(!['request','verify'].includes(mode)||process.argv.length!==3){console.error('Usage: node --env-file=apps/web/.env.local scripts/pre-run11-email.mjs request|verify');process.exitCode=2;return;}
 const config={origin:process.env.ZIGOALS_AUTH_ORIGIN,allowedOrigin:process.env.ZIGOALS_ALLOWED_AUTH_ORIGIN,key:process.env.ZIGOALS_AUTH_PUBLIC_KEY,recipients:(process.env.ZIGOALS_TEST_RECIPIENTS||'').split(',').map(v=>v.trim()).filter(Boolean)};
 try{const email=await readPrivate('Approved test recipient (input hidden): ');const code=mode==='verify'?await readPrivate('Email code (input hidden): '):null;
  const result=await emailCodeOperation(mode,config,email,code);console.log(result);if(!['CODE_REQUEST_ACCEPTED','CODE_VERIFIED'].includes(result))process.exitCode=1;
 }catch{console.error('INPUT_UNAVAILABLE_OR_CANCELLED');process.exitCode=1;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
