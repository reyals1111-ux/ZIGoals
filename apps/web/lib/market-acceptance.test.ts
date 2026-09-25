import {expect,it} from 'vitest';
import {classifyMarketAcceptance,marketAcceptanceReport,type MarketAcceptanceEvidence} from './market-acceptance';
const verified:MarketAcceptanceEvidence={reachability:'APPLICATION_REACHED',security:'PASS',identity:'PASS',probes:{bitcoinQuote:'VERIFIED',zigQuote:'VERIFIED',catalog:'VERIFIED',bitcoinHistory:'VERIFIED'}};
it('requires all four validated probes, security and identity for VERIFIED',()=>{
 expect(classifyMarketAcceptance(verified)).toBe('VERIFIED');
 expect(classifyMarketAcceptance({...verified,probes:{...verified.probes,catalog:'PARTIAL'}})).toBe('MARKET_PARTIAL');
 expect(classifyMarketAcceptance({...verified,probes:{...verified.probes,bitcoinHistory:'STALE'}})).toBe('MARKET_PARTIAL');
});
it('keeps explicit edge denial / unreachable runner BLOCKED independent of provider appearance',()=>{
 expect(classifyMarketAcceptance({...verified,reachability:'EDGE_BLOCKED'})).toBe('BLOCKED');
 expect(classifyMarketAcceptance({...verified,reachability:'UNREACHABLE'})).toBe('BLOCKED');
 expect(classifyMarketAcceptance({...verified,reachability:'UNKNOWN'})).toBe('BLOCKED');
});
it.each([['security','APPLICATION_SECURITY_FAILURE'],['identity','DEPLOYMENT_IDENTITY_FAILURE']] as const)('keeps %s acceptance distinct', (field,outcome)=>{
 expect(classifyMarketAcceptance({...verified,[field]:'FAIL'})).toBe(outcome);
});
it.each([['UNAVAILABLE','PROVIDER_UNAVAILABLE'],['THROTTLED','PROVIDER_THROTTLED'],['MALFORMED','PROVIDER_MALFORMED_RESPONSE']] as const)('classifies %s with no verified evidence', (probe,outcome)=>{
 expect(classifyMarketAcceptance({...verified,probes:{bitcoinQuote:probe,zigQuote:probe,catalog:probe,bitcoinHistory:probe}})).toBe(outcome);
 expect(classifyMarketAcceptance({...verified,probes:{...verified.probes,zigQuote:probe}})).toBe('MARKET_PARTIAL');
});
it('cannot call an incomplete runner VERIFIED',()=>{
 expect(classifyMarketAcceptance({...verified,security:'NOT_CHECKED'})).toBe('MARKET_PARTIAL');
 expect(classifyMarketAcceptance({...verified,probes:{...verified.probes,bitcoinHistory:'NOT_RUN'}})).toBe('MARKET_PARTIAL');
});

it.each([
 ['blocked',{reachability:'EDGE_BLOCKED',security:'NOT_CHECKED',identity:'NOT_CHECKED'},['NOT_RUN','NOT_RUN','NOT_RUN','NOT_RUN'],'BLOCKED'],
 ['partial',{},['VERIFIED','UNAVAILABLE','UNAVAILABLE','UNAVAILABLE'],'MARKET_PARTIAL'],
 ['mixed failures',{},['MALFORMED','THROTTLED','UNAVAILABLE','UNAVAILABLE'],'PROVIDER_MALFORMED_RESPONSE'],
 ['stale only',{},['STALE','STALE','STALE','STALE'],'MARKET_PARTIAL'],
 ['not run',{},['NOT_RUN','NOT_RUN','NOT_RUN','NOT_RUN'],'MARKET_PARTIAL'],
 ['security',{security:'FAIL'},['UNAVAILABLE','UNAVAILABLE','UNAVAILABLE','UNAVAILABLE'],'APPLICATION_SECURITY_FAILURE'],
 ['identity',{identity:'FAIL'},['UNAVAILABLE','UNAVAILABLE','UNAVAILABLE','UNAVAILABLE'],'DEPLOYMENT_IDENTITY_FAILURE'],
] as const)('retains every raw dimension: %s',(_name,overrides,probes,outcome)=>{
 const input:MarketAcceptanceEvidence={...verified,...overrides,probes:{bitcoinQuote:probes[0],zigQuote:probes[1],catalog:probes[2],bitcoinHistory:probes[3]}};
 const report=marketAcceptanceReport(input);expect(report.outcome).toBe(outcome);expect(report.evidence).toEqual(input);
 input.probes.catalog='VERIFIED';expect(report.evidence.probes.catalog).toBe(probes[2]);
});
