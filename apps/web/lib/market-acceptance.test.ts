import {expect,it} from 'vitest';
import {classifyMarketAcceptance,type MarketAcceptanceEvidence} from './market-acceptance';
const verified:MarketAcceptanceEvidence={reachability:'APPLICATION',security:'PASS',identity:'PASS',probes:{bitcoinQuote:'VERIFIED',zigQuote:'VERIFIED',catalog:'VERIFIED',bitcoinHistory:'VERIFIED'}};
it('requires all four validated probes, security and identity for VERIFIED',()=>{
 expect(classifyMarketAcceptance(verified)).toBe('VERIFIED');
 expect(classifyMarketAcceptance({...verified,probes:{...verified.probes,catalog:'PARTIAL'}})).toBe('MARKET_PARTIAL');
 expect(classifyMarketAcceptance({...verified,probes:{...verified.probes,bitcoinHistory:'STALE'}})).toBe('MARKET_PARTIAL');
});
it('keeps explicit edge denial / unreachable runner BLOCKED independent of provider appearance',()=>{
 expect(classifyMarketAcceptance({...verified,reachability:'EDGE_DENIED'})).toBe('BLOCKED');
 expect(classifyMarketAcceptance({...verified,reachability:'UNREACHABLE'})).toBe('BLOCKED');
 expect(classifyMarketAcceptance({...verified,reachability:'UNCONFIRMED'})).toBe('BLOCKED');
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
