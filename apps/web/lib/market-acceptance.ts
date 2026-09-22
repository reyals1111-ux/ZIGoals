/** Runner evidence must be produced by canonical parsers, never status code alone.
 * VERIFIED = correct identity, valid/fresh evidence, and complete catalog partitions.
 * Arbitrary HTTP 403 is UNCONFIRMED; explicit edge denial (e.g. Error 1010) is EDGE_DENIED.
 * No network requests, exact-price assertion, deployment gate or rollback here.
 */
export type MarketAcceptanceOutcome='APPLICATION_SECURITY_FAILURE'|'DEPLOYMENT_IDENTITY_FAILURE'|'PROVIDER_UNAVAILABLE'|'PROVIDER_THROTTLED'|'PROVIDER_MALFORMED_RESPONSE'|'MARKET_PARTIAL'|'VERIFIED'|'BLOCKED';
export type MarketProbeEvidence='VERIFIED'|'STALE'|'PARTIAL'|'UNAVAILABLE'|'THROTTLED'|'MALFORMED'|'NOT_RUN';
export type MarketAcceptanceEvidence={
 reachability:'APPLICATION'|'EDGE_DENIED'|'UNREACHABLE'|'UNCONFIRMED';
 security:'PASS'|'FAIL'|'NOT_CHECKED';
 identity:'PASS'|'FAIL'|'NOT_CHECKED';
 probes:Record<'bitcoinQuote'|'zigQuote'|'catalog'|'bitcoinHistory',MarketProbeEvidence>;
};
export function classifyMarketAcceptance(evidence:MarketAcceptanceEvidence):MarketAcceptanceOutcome {
 if(evidence.reachability!=='APPLICATION')return 'BLOCKED';
 if(evidence.security==='FAIL')return 'APPLICATION_SECURITY_FAILURE';
 if(evidence.identity==='FAIL')return 'DEPLOYMENT_IDENTITY_FAILURE';
 const probes=[evidence.probes.bitcoinQuote,evidence.probes.zigQuote,evidence.probes.catalog,evidence.probes.bitcoinHistory];
 // Reached the application but did not finish acceptance: incomplete, not an edge block.
 if(evidence.security!=='PASS'||evidence.identity!=='PASS'||probes.some(p=>!p||p==='NOT_RUN'))return 'MARKET_PARTIAL';
 if(probes.every(p=>p==='VERIFIED'))return 'VERIFIED';
 if(probes.some(p=>p==='VERIFIED'||p==='STALE'||p==='PARTIAL'))return 'MARKET_PARTIAL';
 if(probes.includes('MALFORMED'))return 'PROVIDER_MALFORMED_RESPONSE';
 if(probes.includes('THROTTLED'))return 'PROVIDER_THROTTLED';
 return 'PROVIDER_UNAVAILABLE';
}
