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
export function documentAllowsCamera(doc:Document):boolean{
 const policy=(doc as Document&{permissionsPolicy?:{allowsFeature:(feature:string)=>boolean};featurePolicy?:{allowsFeature:(feature:string)=>boolean}});
 try{return (policy.permissionsPolicy??policy.featurePolicy)?.allowsFeature('camera')??false;}catch{return false;}
}
