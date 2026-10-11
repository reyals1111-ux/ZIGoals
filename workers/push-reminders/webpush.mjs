/**
 * Web Push primitives on WebCrypto only (ADR-010): the VAPID authorization of RFC 8292 (an ES256 JWT) and the
 * aes128gcm message encryption of RFC 8291 with the RFC 8188 content-coding header. Vectors: RFC 8291 Appendix A
 * and RFC 8292 §2.4 (rfc-editor.org, read 2026-10-04), checked by scripts/run11/push-webpush.test.mjs. Nothing here
 * decrypts in production; the tests decrypt with the same derivation (deriveContentKeys).
 */
const encoder=new TextEncoder(),decoder=new TextDecoder();
const ECDH={name:'ECDH',namedCurve:'P-256'},ECDSA={name:'ECDSA',namedCurve:'P-256'},SIGN={name:'ECDSA',hash:'SHA-256'};
/** RFC 8292 §2: a token may not live longer than 24 hours. RFC 8188 and RFC 8291 §4: one record, at most 4096 bytes. */
export const MAX_VAPID_SECONDS=24*3600,RECORD_SIZE=4096,HEADER_BYTES=86;
/** @param {Uint8Array|ArrayBuffer} bytes */
export function b64url(bytes){const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);let text='';for(const byte of view)text+=String.fromCharCode(byte);return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
/** @param {unknown} text */
export function fromB64url(text){
 if(typeof text!=='string'||!/^[A-Za-z0-9_-]*$/.test(text)||text.length%4===1)throw Error('BASE64URL');
 const binary=atob(text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4)),out=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out;
}
/** @param {Uint8Array[]} parts */
export function concat(parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;}
/** An uncompressed P-256 point: 65 bytes, 0x04 || x || y. @param {Uint8Array} point */
export const isPoint=point=>point.length===65&&point[0]===4;
/** The uncompressed point of a P-256 JWK. @param {{x?:string,y?:string}} jwk */
export function jwkPoint(jwk){const x=fromB64url(jwk.x),y=fromB64url(jwk.y);if(x.length!==32||y.length!==32)throw Error('JWK_POINT');return concat([new Uint8Array([4]),x,y]);}
/** RFC 5869 HKDF-SHA-256 through WebCrypto. @param {Uint8Array} salt @param {Uint8Array} ikm @param {Uint8Array} info @param {number} length */
async function hkdf(salt,ikm,info,length){const key=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8));}
/** @param {string} label */
const labelled=label=>concat([encoder.encode(label),new Uint8Array([0])]);
/** The ECDH shared secret between a private key and the other party's uncompressed point. @param {CryptoKey} privateKey @param {Uint8Array} point */
export async function ecdhSecret(privateKey,point){
 if(!isPoint(point))throw Error('POINT');const publicKey=await crypto.subtle.importKey('raw',point,ECDH,false,[]);
 // WebCrypto's ECDH parameter is `public`; workerd's generated declaration spells that field `$public`.
 const algorithm=/** @type {SubtleCryptoDeriveKeyAlgorithm} */(/** @type {unknown} */({name:'ECDH',public:publicKey}));
 return new Uint8Array(await crypto.subtle.deriveBits(algorithm,privateKey,256));
}
/**
 * RFC 8291 §3: the IKM from the ECDH secret, the authentication secret and both public keys; then the content
 * encryption key and the nonce of RFC 8188 from the IKM and the message salt.
 * @param {{secret:Uint8Array,auth:Uint8Array,uaPublic:Uint8Array,asPublic:Uint8Array,salt:Uint8Array}} input
 */
export async function deriveContentKeys({secret,auth,uaPublic,asPublic,salt}){
 const ikm=await hkdf(auth,secret,concat([encoder.encode('WebPush: info'),new Uint8Array([0]),uaPublic,asPublic]),32);
 return {ikm,cek:await hkdf(salt,ikm,labelled('Content-Encoding: aes128gcm'),16),nonce:await hkdf(salt,ikm,labelled('Content-Encoding: nonce'),12)};
}
/**
 * Encrypts one push message: a fresh ECDH pair per message (never the VAPID key), one aes128gcm record with the
 * delimiter 0x02 and no padding, the 86-byte header (salt, rs 4096, idlen 65, the sender's point), the ciphertext.
 * @param {{plaintext:Uint8Array,uaPublic:Uint8Array,auth:Uint8Array,salt?:Uint8Array,asKeys?:CryptoKeyPair}} input
 */
export async function encryptPush({plaintext,uaPublic,auth,salt,asKeys}){
 if(!isPoint(uaPublic))throw Error('UA_PUBLIC');if(auth.length!==16)throw Error('AUTH_SECRET');
 const keys=asKeys??/** @type {CryptoKeyPair} */(await crypto.subtle.generateKey(ECDH,true,['deriveBits']));
 const asPublic=new Uint8Array(/** @type {ArrayBuffer} */(await crypto.subtle.exportKey('raw',keys.publicKey)));
 const messageSalt=salt??crypto.getRandomValues(new Uint8Array(16));if(messageSalt.length!==16)throw Error('SALT');
 const {cek,nonce}=await deriveContentKeys({secret:await ecdhSecret(keys.privateKey,uaPublic),auth,uaPublic,asPublic,salt:messageSalt});
 const record=concat([plaintext,new Uint8Array([2])]);
 if(HEADER_BYTES+record.length+16>RECORD_SIZE)throw Error('PAYLOAD_TOO_LARGE');
 const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,record));
 return concat([messageSalt,new Uint8Array([0,0,16,0]),new Uint8Array([65]),asPublic,ciphertext]);
}
/** The VAPID signing key: a private P-256 JWK (the output of scripts/push/make-vapid-keys.mjs). @param {unknown} value */
export async function importVapidKey(value){
 const jwk=/** @type {JsonWebKey} */(value);
 if(!jwk||typeof jwk!=='object'||jwk.kty!=='EC'||jwk.crv!=='P-256'||typeof jwk.d!=='string'||typeof jwk.x!=='string'||typeof jwk.y!=='string')throw Error('VAPID_PRIVATE_KEY');
 return {privateKey:await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',d:jwk.d,x:jwk.x,y:jwk.y},ECDSA,false,['sign']),publicPoint:jwkPoint(jwk)};
}
/**
 * RFC 8292: the JWT (header {typ, alg ES256}; claims aud = the push service's origin, exp at most 24 h ahead, sub)
 * signed with ECDSA P-256 over SHA-256, the signature as the raw 64-byte r || s that JWS expects; the header value
 * "vapid t=<token>, k=<public point>".
 * @param {{privateKey:CryptoKey,publicPoint:Uint8Array,audience:string,subject:string,now:number,seconds?:number}} input
 */
export async function vapidAuthorization({privateKey,publicPoint,audience,subject,now,seconds=12*3600}){
 if(!Number.isSafeInteger(seconds)||seconds<=0||seconds>MAX_VAPID_SECONDS)throw Error('VAPID_EXPIRY');
 if(new URL(audience).origin!==audience)throw Error('VAPID_AUDIENCE');
 const head=b64url(encoder.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),claims=b64url(encoder.encode(JSON.stringify({aud:audience,exp:Math.floor(now/1000)+seconds,sub:subject})));
 const signature=new Uint8Array(await crypto.subtle.sign(SIGN,privateKey,encoder.encode(`${head}.${claims}`)));
 const token=`${head}.${claims}.${b64url(signature)}`;
 return {token,header:`vapid t=${token}, k=${b64url(publicPoint)}`};
}
/** Verifies a VAPID token against an uncompressed public point at `now` (ms): the claims, or null. @param {unknown} token @param {Uint8Array} publicPoint @param {number} now */
export async function verifyVapid(token,publicPoint,now){
 if(typeof token!=='string'||!isPoint(publicPoint))return null;
 const parts=token.split('.');if(parts.length!==3)return null;
 let header,claims;try{header=JSON.parse(decoder.decode(fromB64url(parts[0])));claims=JSON.parse(decoder.decode(fromB64url(parts[1])));}catch{return null;}
 if(header?.typ!=='JWT'||header?.alg!=='ES256'||typeof claims?.aud!=='string'||!Number.isSafeInteger(claims?.exp)||typeof claims?.sub!=='string')return null;
 if(claims.exp*1000<=now||claims.exp*1000>now+MAX_VAPID_SECONDS*1000)return null;
 let signature;try{signature=fromB64url(parts[2]);}catch{return null;}if(signature.length!==64)return null;
 const key=await crypto.subtle.importKey('raw',publicPoint,ECDSA,false,['verify']);
 return await crypto.subtle.verify(SIGN,key,signature,encoder.encode(`${parts[0]}.${parts[1]}`))?claims:null;
}
