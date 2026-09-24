import records from './providers.json';
import {isSafeReferenceUrl,parseProvider,type EcosystemProvider} from './index';
export const directoryReviewedAt='2026-09-23';
export const directoryCategories=['All','Staking & vaults','Trading','Lending & real assets','Institutional infrastructure','Network tools','Funding rails'] as const;
export type DirectoryCategory=typeof directoryCategories[number];
export type DirectoryAction={kind:'Website'|'App'|'Docs';url:string;evidence:string};
export type DirectoryEntry={id:string;name:string;category:DirectoryCategory;description:string;descriptionSource:string;inclusion:'Official ecosystem listing'|'Existing research';inclusionSource:string;reviewedAt:string;linkStatus:'Reviewed destination'|'Official link · dynamic page'|'Unavailable in review';logo:{kind:'raster'|'initials';reason:string;source:string;path?:string};actions:DirectoryAction[];provider:EcosystemProvider};
const official='https://zigchain.com/';
// Locally re-encoded PNGs from official-site icon declarations. Attribution and use scope: docs/run10/ECOSYSTEM_LOGOS.md.
const officialLogos:Record<string,string>={
 valdora:'https://valdora.finance/favicon.ico',
 oroswap:'https://cdn.prod.website-files.com/67c08c75839e7a77900212c1/67e3e7e4249b134261fb0d35_favicon%20(1)%201.png',
 permapod:'https://www.permapod.xyz/favicon.ico',
 nawa:'https://www.nawa.finance/assets/images/nawa-icon-teal-v2.png',
 'zig-markets':'https://zig.finance/apple-touch-icon.v3.png',
 zignaly:'https://cdn.prod.website-files.com/66ec04c01fcf18d49b2fca43/6708029069397bd99de329e9_Webclip.png',
 zamanat:'https://www.zamanathq.com/hp-revamp-images/title-logo.png',
 'defa-invoicemate':'https://cdn.prod.website-files.com/68f87cc37a7594fc8a44e89b/694a7a9dd3c166d00818f628_DeFa%20Webclip_1.png',
 beehive:'https://cdn.prod.website-files.com/6899c268d0751abcf304e1e9/6979acce20303f8879541e4f_web%20clip%20256x256.webp',
 ondo:'https://ondo.finance/favicon.ico',
 taurus:'https://www.taurushq.com/favicon.ico',
 'apex-group':'https://www.apexgroup.com/media/0vmbhrjn/apex-favicon.png?width=114&height=114&v=1da96f64f503a30',
 noble:'https://framerusercontent.com/images/XdcD0abLVZF0aVw8YeT8rU7N9TE.png',
 axelar:'https://cdn.prod.website-files.com/65d241582635a0233e69af40/661c7dbaed5fb281add1d559_favicon%402x.png',
 range:'https://app.range.org/apple-touch-icon.png',
 zigscan:'https://testnet.zigscan.org/favicon.ico',
};
const logoFallback:Record<string,string>={
 wme:'The official WME documentation returned 403 during the icon review; no separate WME mark was verified.',
 'zigchain-hub':'The official Hub returned 403 and the tested network favicon path returned 404; no safe Hub icon was verified.',
};
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
 const logoSource=officialLogos[provider.id];
 return {id:provider.id,name:provider.name,category:summary.category,description:summary.description,descriptionSource,inclusion:summary.listed?'Official ecosystem listing':'Existing research',inclusionSource:summary.listed?official:provider.sources[0]!.url,reviewedAt:directoryReviewedAt,linkStatus:summary.unavailable?'Unavailable in review':summary.dynamic?'Official link · dynamic page':'Reviewed destination',logo:logoSource?{kind:'raster' as const,source:logoSource,path:`/ecosystem-logos/${provider.id}.png`,reason:'Official site icon, locally re-encoded as a bounded PNG for directory identification only.'}:{kind:'initials' as const,source:descriptionSource,reason:logoFallback[provider.id]??'No safe official icon verified; initials identify this research entry.'},actions,provider};
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
