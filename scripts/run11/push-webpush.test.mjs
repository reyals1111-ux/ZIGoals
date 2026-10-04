// The Web Push primitives of workers/push-reminders/webpush.mjs against the published vectors: RFC 8291 Appendix A
// and §5 (the exact intermediate values, header, ciphertext and body) and RFC 8292 §2.4 (the example token and key),
// both read from rfc-editor.org on 2026-10-04. The PRK values the RFC prints are checked here with HMAC, since
// WebCrypto's HKDF does not expose them; everything else is the Worker's own code.
import {expect,test} from 'vitest';
import {b64url,concat,deriveContentKeys,ecdhSecret,encryptPush,fromB64url,importVapidKey,jwkPoint,vapidAuthorization,verifyVapid} from '../../workers/push-reminders/webpush.mjs';
import {decryptPush} from './push-fixture.mjs';

const V={
 plaintext:'V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24',
 asPublic:'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',asPrivate:'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
 uaPublic:'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',uaPrivate:'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
 salt:'DGv6ra1nlYgDCS1FRnbzlw',auth:'BTBZMqHH6r4Tts7J_aSIgg',
 secret:'kyrL1jIIOHEzg3sM2ZWRHDRB62YACZhhSlknJ672kSs',prkKey:'Snr3JMxaHVDXHWJn5wdC52WjpCtd2EIEGBykDcZW32k',
 ikm:'S4lYMb_L0FxCeq0WhDx813KgSYqU26kOyzWUdsXYyrg',prk:'09_eUZGrsvxChDCGRCdkLiDXrReGOEVeSCdCcPBSJSc',cek:'oIhVW04MRdy2XN9CiKLxTg',nonce:'4h_95klXJ5E_qnoN',
 header:'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
 ciphertext:'8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ',
 body:'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};
const ECDH={name:'ECDH',namedCurve:'P-256'};
const point=b64=>fromB64url(b64),coords=b64=>({x:b64url(point(b64).slice(1,33)),y:b64url(point(b64).slice(33,65))});
const privateEcdh=(d,pub)=>crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',d,...coords(pub)},ECDH,true,['deriveBits']);
async function hmac(key,data){const k=await crypto.subtle.importKey('raw',key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,data));}

test('RFC 8291 Appendix A: the ECDH secret, PRK_key, IKM, PRK, CEK and nonce are the printed values',async()=>{
 const asPrivate=await privateEcdh(V.asPrivate,V.asPublic),secret=await ecdhSecret(asPrivate,point(V.uaPublic));
 expect(b64url(secret)).toBe(V.secret);
 expect(b64url(await hmac(point(V.auth),secret))).toBe(V.prkKey);
 const keys=await deriveContentKeys({secret,auth:point(V.auth),uaPublic:point(V.uaPublic),asPublic:point(V.asPublic),salt:point(V.salt)});
 expect(b64url(keys.ikm)).toBe(V.ikm);
 expect(b64url(await hmac(point(V.salt),keys.ikm))).toBe(V.prk);
 expect(b64url(keys.cek)).toBe(V.cek);expect(b64url(keys.nonce)).toBe(V.nonce);
 // The other direction gives the same secret: the user agent's private key with the server's point.
 expect(b64url(await ecdhSecret(await privateEcdh(V.uaPrivate,V.uaPublic),point(V.asPublic)))).toBe(V.secret);
});
test('RFC 8291 §5: with the vector keys and salt the header, ciphertext and body are the published bytes',async()=>{
 const asKeys={privateKey:await privateEcdh(V.asPrivate,V.asPublic),publicKey:await crypto.subtle.importKey('raw',point(V.asPublic),ECDH,true,[])};
 const body=await encryptPush({plaintext:point(V.plaintext),uaPublic:point(V.uaPublic),auth:point(V.auth),salt:point(V.salt),asKeys});
 // 144 bytes: 86 of header, 41 of text, the delimiter and the 16-byte tag. The example's "Content-Length: 145" line does not
 // match its own base64url body, which decodes to 144 bytes.
 expect(body.length).toBe(144);
 expect(b64url(body.slice(0,86))).toBe(V.header);expect(b64url(body.slice(86))).toBe(V.ciphertext);expect(b64url(body)).toBe(V.body);
 expect(new TextDecoder().decode(point(V.plaintext))).toBe('When I grow up, I want to be a watermelon');
});
test('the vector body decrypts with the user agent\'s private key to the sentence; a changed byte or another delimiter is refused',async()=>{
 const privateKey=await privateEcdh(V.uaPrivate,V.uaPublic),input={body:point(V.body),privateKey,uaPublic:point(V.uaPublic),auth:point(V.auth)};
 expect(await decryptPush(input)).toBe('When I grow up, I want to be a watermelon');
 const damaged=point(V.body);damaged[100]^=1;await expect(decryptPush({...input,body:damaged})).rejects.toThrow();
 // A record ending in 0x01 (RFC 8188's "not the last record") or without a delimiter is not a push message.
 const keys=await deriveContentKeys({secret:await ecdhSecret(privateKey,point(V.asPublic)),auth:point(V.auth),uaPublic:point(V.uaPublic),asPublic:point(V.asPublic),salt:point(V.salt)});
 const aes=await crypto.subtle.importKey('raw',keys.cek,'AES-GCM',false,['encrypt']);
 for(const tail of [[1],[]]){
  const record=concat([point(V.plaintext),new Uint8Array(tail)]),ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:keys.nonce},aes,record));
  await expect(decryptPush({...input,body:concat([point(V.header),ciphertext])})).rejects.toThrow('DELIMITER');
 }
});
test('a fresh encryption uses a new sender key and salt every time, stays under 4 KB and refuses a long message',async()=>{
 const uaPublic=point(V.uaPublic),auth=point(V.auth),plaintext=new TextEncoder().encode('{"v":1}');
 const a=await encryptPush({plaintext,uaPublic,auth}),b=await encryptPush({plaintext,uaPublic,auth});
 expect(a.length).toBe(86+plaintext.length+1+16);expect(b64url(a.slice(0,16))).not.toBe(b64url(b.slice(0,16)));expect(b64url(a.slice(21,86))).not.toBe(b64url(b.slice(21,86)));
 expect(await decryptPush({body:a,privateKey:await privateEcdh(V.uaPrivate,V.uaPublic),uaPublic,auth})).toBe('{"v":1}');
 await expect(encryptPush({plaintext:new Uint8Array(4096-86-16),uaPublic,auth})).rejects.toThrow('PAYLOAD_TOO_LARGE');
 await expect(encryptPush({plaintext,uaPublic:uaPublic.slice(1),auth})).rejects.toThrow('UA_PUBLIC');
 await expect(encryptPush({plaintext,uaPublic,auth:auth.slice(1)})).rejects.toThrow('AUTH_SECRET');
});

const EXAMPLE={
 token:'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJhdWQiOiJodHRwczovL3B1c2guZXhhbXBsZS5uZXQiLCJleHAiOjE0NTM1MjM3NjgsInN1YiI6Im1haWx0bzpwdXNoQGV4YW1wbGUuY29tIn0.i3CYb7t4xfxCDquptFOepC9GAu_HLGkMlMuCGSK2rpiUfnK9ojFwDXb1JrErtmysazNjjvW2L9OkSSHzvoD1oA',
 k:'BA1Hxzyi1RUM1b5wjxsn7nGxAszw2u61m164i3MrAIxHF6YK5h4SDYic-dRuU_RCPCfA5aq9ojSwk5Y2EmClBPs',
 jwk:{crv:'P-256',kty:'EC',x:'DUfHPKLVFQzVvnCPGyfucbECzPDa7rWbXriLcysAjEc',y:'F6YK5h4SDYic-dRuU_RCPCfA5aq9ojSwk5Y2EmClBPs'},
 exp:1453523768,
};
test('RFC 8292 §2.4: the example token verifies with its k= key before 2016-01-23T04:36:08Z and not after; the JWK is that point',async()=>{
 expect(b64url(jwkPoint(EXAMPLE.jwk))).toBe(EXAMPLE.k);
 const before=EXAMPLE.exp*1000-1000;
 expect(await verifyVapid(EXAMPLE.token,point(EXAMPLE.k),before)).toEqual({aud:'https://push.example.net',exp:EXAMPLE.exp,sub:'mailto:push@example.com'});
 expect(await verifyVapid(EXAMPLE.token,point(EXAMPLE.k),EXAMPLE.exp*1000)).toBeNull();
 const [head,claims,signature]=EXAMPLE.token.split('.');
 const forged=b64url(new TextEncoder().encode(JSON.stringify({aud:'https://push.example.net',exp:EXAMPLE.exp+60,sub:'mailto:push@example.com'})));
 expect(await verifyVapid(`${head}.${forged}.${signature}`,point(EXAMPLE.k),before)).toBeNull();
 expect(await verifyVapid(`${head}.${claims}`,point(EXAMPLE.k),before)).toBeNull();
 expect(await verifyVapid(EXAMPLE.token,point(V.asPublic),before)).toBeNull();
});
test('our own token: ES256 over header.claims, aud the push origin, exp at most 24 h, verified with WebCrypto and refused with another key',async()=>{
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
 const key=await importVapidKey(jwk),now=Date.UTC(2026,9,4,10,0,0,500);
 const {token,header}=await vapidAuthorization({privateKey:key.privateKey,publicPoint:key.publicPoint,audience:'https://web.push.apple.com',subject:'mailto:hello@zigoals.app',now});
 expect(header).toBe(`vapid t=${token}, k=${b64url(key.publicPoint)}`);
 const [head,claims,signature]=token.split('.');
 expect(JSON.parse(new TextDecoder().decode(fromB64url(head)))).toEqual({typ:'JWT',alg:'ES256'});
 expect(JSON.parse(new TextDecoder().decode(fromB64url(claims)))).toEqual({aud:'https://web.push.apple.com',exp:Math.floor(now/1000)+12*3600,sub:'mailto:hello@zigoals.app'});
 expect(fromB64url(signature).length).toBe(64);
 expect(await verifyVapid(token,key.publicPoint,now)).toMatchObject({aud:'https://web.push.apple.com'});
 expect(await verifyVapid(token,key.publicPoint,now+13*3600*1000)).toBeNull();
 const other=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 expect(await verifyVapid(token,jwkPoint(await crypto.subtle.exportKey('jwk',other.publicKey)),now)).toBeNull();
 await expect(vapidAuthorization({privateKey:key.privateKey,publicPoint:key.publicPoint,audience:'https://web.push.apple.com/path',subject:'mailto:a@b',now})).rejects.toThrow('VAPID_AUDIENCE');
 await expect(vapidAuthorization({privateKey:key.privateKey,publicPoint:key.publicPoint,audience:'https://web.push.apple.com',subject:'mailto:a@b',now,seconds:25*3600})).rejects.toThrow('VAPID_EXPIRY');
 const long=await vapidAuthorization({privateKey:key.privateKey,publicPoint:key.publicPoint,audience:'https://web.push.apple.com',subject:'mailto:a@b',now,seconds:24*3600});
 expect(await verifyVapid(long.token,key.publicPoint,now)).not.toBeNull();
 // An ECDH key (the per-message encryption pair) is not a signing key.
 const ecdh=await crypto.subtle.generateKey(ECDH,true,['deriveBits']);
 await expect(vapidAuthorization({privateKey:ecdh.privateKey,publicPoint:key.publicPoint,audience:'https://web.push.apple.com',subject:'mailto:a@b',now})).rejects.toThrow();
 await expect(importVapidKey({kty:'EC',crv:'P-256',x:jwk.x,y:jwk.y})).rejects.toThrow('VAPID_PRIVATE_KEY');
});
test('base64url helpers round-trip and refuse other alphabets',()=>{
 const bytes=crypto.getRandomValues(new Uint8Array(37));
 expect(fromB64url(b64url(bytes))).toEqual(bytes);expect(b64url(bytes)).not.toMatch(/[+/=]/);
 expect(()=>fromB64url('ab+c')).toThrow('BASE64URL');expect(()=>fromB64url('abcde')).toThrow('BASE64URL');expect(()=>fromB64url(42)).toThrow('BASE64URL');
 expect(fromB64url('')).toEqual(new Uint8Array(0));
});
