import records from './providers.json';
import {isSafeReferenceUrl,parseProvider,type EcosystemProvider} from './index';
export const directoryReviewedAt='2026-09-23';
export const directoryCategories=['All','Staking & vaults','Trading','Lending & real assets','Institutional infrastructure','Network tools','Funding rails'] as const;
export type DirectoryCategory=typeof directoryCategories[number];
export type DirectoryAction={kind:'Website'|'App'|'Docs';url:string;evidence:string};
export type DirectoryEntry={id:string;name:string;category:DirectoryCategory;description:string;descriptionSource:string;inclusion:'Official ecosystem listing'|'Existing research';inclusionSource:string;reviewedAt:string;linkStatus:'Reviewed destination'|'Official link · dynamic page'|'Unavailable in review';logo:{kind:'initials';reason:string;source:string};actions:DirectoryAction[];provider:EcosystemProvider};
const official='https://zigchain.com/';
// This is navigation metadata, never an execution capability or current audit attestation.
const summaries:Record<string,{category:DirectoryCategory;description:string;source?:string;listed?:boolean;dynamic?:boolean;unavailable?:boolean;actions?:DirectoryAction[]}>={
 'valdora':{category:'Staking & vaults',description:'Vault infrastructure and liquid staking with stZIG, according to Valdora.',listed:true,actions:[{kind:'App',url:'https://valdora.finance/vaults',evidence:'https://valdora.finance/'},{kind:'Docs',url:'https://docs.valdora.finance/',evidence:'https://valdora.finance/'}]},
 'oroswap':{category:'Trading',description:'A decentralized exchange on ZIGChain with swap and liquidity tools, according to OroSwap.',listed:true,actions:[{kind:'App',url:'https://app.oroswap.org/',evidence:'https://www.oroswap.org/'},{kind:'Docs',url:'https://docs.oroswap.org/',evidence:'https://docs.oroswap.org/'}]},
 'permapod':{category:'Lending & real assets',description:'Existing research describes lending infrastructure on ZIGChain. The project website could not be retrieved in this review.',source:'https://github.com/permapod-zigchain/permapod-skills',unavailable:true},
 'nawa':{category:'Staking & vaults',description:'ZIGChain lists Nawa as a DeFi project focused on ethical and Shariah-aligned finance. Certification claims remain separately unverified.',source:official,listed:true,dynamic:true},
 'zig-markets':{category:'Lending & real assets',description:'Investment product curation and distribution, according to ZIG Markets. Product access and eligibility vary.',listed:true},
 'zignaly':{category:'Trading',description:'Rules-based crypto investment portfolios, according to Zignaly. ZIGoals does not manage or connect exchange accounts.',listed:true},
 'wme':{category:'Institutional infrastructure',description:'ZIGChain’s planned wealth-management architecture. Current documentation does not provide a usable ZIGoals execution interface.'},
 'zamanat':{category:'Lending & real assets',description:'An orchestrator for tokenized investment products with a Shariah-aligned focus, according to Zamanat.',listed:true},
 'defa-invoicemate':{category:'Lending & real assets',description:'Receivables and payment-settlement liquidity infrastructure, according to DeFa. Terms and access require separate review.'},
 'beehive':{category:'Lending & real assets',description:'A business-financing marketplace connecting SMEs and investors, according to Beehive.',listed:true},
 'ondo':{category:'Lending & real assets',description:'Tokenized financial products, including treasury and equity exposure, according to Ondo. Product eligibility remains separate.',listed:true},
 'taurus':{category:'Institutional infrastructure',description:'Digital asset custody and tokenization infrastructure for institutions, according to Taurus.',listed:true},
 'apex-group':{category:'Institutional infrastructure',description:'Fund administration and related financial services, according to Apex Group. A service relationship does not establish a ZIGoals adapter.',listed:true},
 'noble':{category:'Funding rails',description:'Stablecoin infrastructure, according to Noble. Historical USDC routes retain the existing issuer-sunset restriction.'},
 'axelar':{category:'Funding rails',description:'Cross-chain connectivity infrastructure, according to Axelar. Individual asset routes require separate validation.'},
 'range':{category:'Network tools',description:'A blockchain explorer and intelligence destination linked by ZIGChain. ZIGoals supports informational navigation only.',source:'https://docs.zigchain.com/users/tools/block-explorers',listed:true,dynamic:true},
 'zigscan':{category:'Network tools',description:'A ZIGChain block explorer linked by the official network documentation. Existing known-record links remain separate from receipt verification.',source:'https://docs.zigchain.com/users/tools/block-explorers',listed:true,dynamic:true},
 'zigchain-hub':{category:'Network tools',description:'ZIGChain’s own network, validator and governance interface. Check the network selected by the external app.',source:official,listed:true,dynamic:true},
};
export const directoryEntries:DirectoryEntry[]=records.map(parseProvider).map(provider=>{
 const summary=summaries[provider.id];if(!summary)throw new Error(`Missing directory evidence for ${provider.id}`);
 const descriptionSource=summary.source??provider.website;
 const actions:DirectoryAction[]=summary.unavailable?[]:[{kind:provider.id==='wme'?'Docs':'Website',url:provider.website,evidence:summary.listed?official:descriptionSource},...(summary.actions??[])];
 if(actions.some(a=>!isSafeReferenceUrl(a.url)||new URL(a.url).search||!isSafeReferenceUrl(a.evidence)))throw new Error('Unsafe directory destination');
 return {id:provider.id,name:provider.name,category:summary.category,description:summary.description,descriptionSource,inclusion:summary.listed?'Official ecosystem listing':'Existing research',inclusionSource:summary.listed?official:provider.sources[0]!.url,reviewedAt:directoryReviewedAt,linkStatus:summary.unavailable?'Unavailable in review':summary.dynamic?'Official link · dynamic page':'Reviewed destination',logo:{kind:'initials',source:descriptionSource,reason:'Official logo usage and a safe local asset are not verified; initials are a fallback, not a project logo.'},actions,provider};
});
export function filterDirectory(entries:readonly DirectoryEntry[],query:string,category:string){
 const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return entries.filter(p=>(category==='All'||p.category===category)&&terms.every(term=>`${p.name} ${p.category} ${p.description} ${p.provider.roles.join(' ')}`.toLocaleLowerCase().includes(term)));
}
/** Additional official resources discovered in the reviewed sections; no provider integration is implied. */
export const directoryResources=[
 {name:'ZIGLabs',category:'Builder resources',url:'https://ziglabs.vc/',source:official,description:'Capital and founder support; outside the existing financial-provider registry.'},
 {name:'NodeStake',category:'Network tools',url:'https://explorer.nodestake.org/zigchain',source:'https://docs.zigchain.com/users/tools/block-explorers',description:'An additional mainnet explorer listed by ZIGChain. No ZIGoals detail-route or receipt integration.'},
 {name:'Stake & Relax',category:'Network tools',url:'https://explorer.stakeandrelax.net/zigchain',source:'https://docs.zigchain.com/users/tools/block-explorers',description:'An additional explorer listed by ZIGChain. Its dynamic interface was not functionally verified.'},
] as const;
