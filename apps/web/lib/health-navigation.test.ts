import {test,expect} from 'vitest';
import {healthNavigation,documentAllowsCamera,type HealthNavigationInput} from './health-navigation';
// Session U Part 3: when a click into Health becomes a full page load (so Health's own camera permission applies).
const base:HealthNavigationInput={href:'https://alpha.test/app/health',origin:'https://alpha.test',cameraAllowed:false,accountOpen:false,button:0,modified:false,target:'',download:false};
const decide=(change:Partial<HealthNavigationInput>)=>healthNavigation({...base,...change});

test('a plain same-tab click into Health from a page without the camera is a full load, with any query or hash',()=>{
 for(const href of ['https://alpha.test/app/health','/app/health','/app/health#fasting','/app/health?date=2026-10-05#entry-1'])expect(decide({href})).toBe('document');
 expect(decide({target:'_self'})).toBe('document');
});

test('everything else stays a normal navigation',()=>{
 expect(decide({cameraAllowed:true})).toBe('client');
 expect(decide({accountOpen:true})).toBe('client');
 expect(decide({button:1})).toBe('client');
 expect(decide({modified:true})).toBe('client');
 expect(decide({target:'_blank'})).toBe('client');
 expect(decide({download:true})).toBe('client');
 for(const href of ['https://alpha.test/app','https://alpha.test/app/health/other','https://alpha.test/app/healthy','https://elsewhere.test/app/health','/app/habits#health','http://[bad'])expect(decide({href})).toBe('client');
});

test('the document policy is read where the browser exposes it; otherwise the camera counts as not allowed',()=>{
 const doc=(policy:object)=>policy as unknown as Document;
 expect(documentAllowsCamera(doc({featurePolicy:{allowsFeature:(f:string)=>f==='camera'}}))).toBe(true);
 expect(documentAllowsCamera(doc({featurePolicy:{allowsFeature:()=>false}}))).toBe(false);
 expect(documentAllowsCamera(doc({permissionsPolicy:{allowsFeature:()=>true},featurePolicy:{allowsFeature:()=>false}}))).toBe(true);
 expect(documentAllowsCamera(doc({}))).toBe(false);
 expect(documentAllowsCamera(doc({featurePolicy:{allowsFeature:()=>{throw Error('blocked');}}}))).toBe(false);
});
