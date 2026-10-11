// Shape classification only. This cannot validate signature, project, expiry or provider state.
export function isPublicSupabaseKey(value){
 if(typeof value!=='string'||!value||value.length>4096||/placeholder|unconfigured|changeme|replace|example|your[-_]|dummy|fixture|fictional/i.test(value))return false;
 if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(value))return true;
 const parts=value.split('.');
 if(parts.length!==3||parts.some(part=>!part||!/^[A-Za-z0-9_-]+$/.test(part)))return false;
 try{
  const decode=part=>{const bytes=Buffer.from(part,'base64url');if(bytes.toString('base64url')!==part)throw Error();return JSON.parse(bytes.toString('utf8'));};
  const header=decode(parts[0]),payload=decode(parts[1]);
  return header&&typeof header==='object'&&!Array.isArray(header)&&typeof header.alg==='string'&&header.alg!=='none'&&
   payload&&typeof payload==='object'&&!Array.isArray(payload)&&payload.role==='anon'&&
   !('sub' in payload)&&!('email' in payload)&&!('session_id' in payload);
 }catch{return false;}
}
