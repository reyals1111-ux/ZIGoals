import {lockAccount} from '../account-session';
import type {RotationTransport} from './rotation';
export function rotationTransport(account:string,fence:()=>void):RotationTransport{return {async request(operation){
 fence();const response=await fetch('/api/private-account'+(operation?'':'?action=rotation'),{method:operation?'POST':'GET',headers:{'X-Zigoals-Account':account,...(operation?{'Content-Type':'application/json'}:{})},...(operation?{body:JSON.stringify({action:'rotation',operation})}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const reader=response.body?.getReader();if(!reader)throw Error('Rotation response unavailable.');const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>1_000_000)throw Error('Rotation response exceeds capacity.');chunks.push(part.value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
 fence();const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!response.ok){if(response.status===401||response.status===410){lockAccount();throw Error('Account access changed. Sign in and unlock again.');}throw Error('Rotation acknowledgement was not confirmed. Keep the new recovery secret and retry; activation may already have completed.');}return result;
}};}
