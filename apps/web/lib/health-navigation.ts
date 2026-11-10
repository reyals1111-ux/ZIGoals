/**
 * Session U Part 3: why a click into Health becomes a full page load.
 *
 * Health asks for the camera (the barcode scanner). Chrome and Edge grant it only to a document that was loaded as
 * /app/health: next.config.ts sends `camera=(self)` there and `camera=()` on every other app page, and a client-side
 * navigation keeps the old document with its old policy. So a soft navigation into Health left the scanner with only
 * "Reload Health for camera access". A full load fixes that, with two exceptions:
 * - this document already allows the camera (it was loaded as Health), so a soft navigation keeps it;
 * - an account is open in this tab: a full load locks it (lib/account-session.ts), so the scanner keeps its reload
 *   link and the person chooses.
 * A browser that cannot say whether the camera is allowed gets the full load: it costs one page load, never the camera.
 */
export type HealthNavigationInput={href:string;origin:string;cameraAllowed:boolean;accountOpen:boolean;button:number;modified:boolean;target:string;download:boolean};
export function healthNavigation({href,origin,cameraAllowed,accountOpen,button,modified,target,download}:HealthNavigationInput):'document'|'client'{
 if(button!==0||modified||download||(target!==''&&target!=='_self'))return 'client';
 let url:URL;try{url=new URL(href,origin);}catch{return 'client';}
 if(url.origin!==origin||url.pathname!=='/app/health')return 'client';
 return cameraAllowed||accountOpen?'client':'document';
}
/** Whether this document may use the camera, where the browser can tell; otherwise false. */
export function documentAllowsCamera(doc:Document):boolean{return documentAllowsFeature(doc,'camera');}
/**
 * Whether this document may use a policy-controlled feature, where the browser can tell; otherwise false. Session W
 * Part 8: Web Bluetooth followed the camera's rule; since Session AL (TK-191) the header carries no "bluetooth" token
 * (Chromium does not recognise one), and only Health's components reach the API.
 */
/**
 * Session AL third pass (INT, Bluetooth): what this document's policy says about a feature. A browser that does not
 * know the feature lists it nowhere in `features()`, and its `allowsFeature` answers false for it, which read as
 * "blocked" before; such a browser cannot be blocking it by policy, so the answer is 'unknown'. 'unknown' also when the
 * browser has no policy API at all.
 */
export function documentFeatureState(doc:Document,feature:'camera'|'bluetooth'):'allowed'|'blocked'|'unknown'{
 const policy=(doc as Document&{permissionsPolicy?:{allowsFeature:(feature:string)=>boolean;features?:()=>string[]};featurePolicy?:{allowsFeature:(feature:string)=>boolean;features?:()=>string[]}});
 const api=policy.permissionsPolicy??policy.featurePolicy;
 if(!api||typeof api.allowsFeature!=='function')return 'unknown';
 try{
  if(typeof api.features==='function'){const known=api.features();if(Array.isArray(known)&&!known.includes(feature))return 'unknown';}
  return api.allowsFeature(feature)?'allowed':'blocked';
 }catch{return 'unknown';}
}
export function documentAllowsFeature(doc:Document,feature:'camera'|'bluetooth'):boolean{
 const policy=(doc as Document&{permissionsPolicy?:{allowsFeature:(feature:string)=>boolean};featurePolicy?:{allowsFeature:(feature:string)=>boolean}});
 try{return (policy.permissionsPolicy??policy.featurePolicy)?.allowsFeature(feature)??false;}catch{return false;}
}
