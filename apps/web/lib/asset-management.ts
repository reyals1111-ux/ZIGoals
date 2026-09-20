import {marketRefKey,type MarketCatalogAsset} from './market-assets';
import {platformSchema,saveManualPosition,type Platform,type Position} from './positions';
import {assetClassOf} from './wealth';
export function isCryptoPosition(p:Position){return !p.archivedAt&&['Crypto','Stablecoins'].includes(assetClassOf(p));}
/** Durable membership is independent of the bounded Activity presentation feed. */
function membership(s:Platform,p:Position):Pick<Position,'trackingStartedAt'|'archivePeriods'> {
 const events=s.assetEvents.filter(e=>e.positionId===p.id).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 const trackingStartedAt=p.trackingStartedAt??events.find(e=>e.kind==='added')?.at;
 if(p.archivePeriods)return {trackingStartedAt,archivePeriods:p.archivePeriods};
 const archivePeriods:NonNullable<Position['archivePeriods']>=[];
 for(const e of events){if(e.kind==='archived'&&!archivePeriods.at(-1)?.to&&archivePeriods.length)continue;if(e.kind==='archived')archivePeriods.push({from:e.at});else if(e.kind==='restored'&&archivePeriods.at(-1)&&!archivePeriods.at(-1)!.to)archivePeriods.at(-1)!.to=e.at;}
 if(p.archivedAt&&!archivePeriods.some(period=>Date.parse(period.from)===Date.parse(p.archivedAt!)&&!period.to))archivePeriods.push({from:p.archivedAt});
 return {trackingStartedAt,archivePeriods};
}
export function saveAsset(s:Platform,p:Position):Platform {
 const old=s.positions.find(x=>x.id===p.id);
 if(old?.archivedAt)throw Error('Restore this asset before editing.');
 if(old&&JSON.stringify(old.marketRef)!==JSON.stringify(p.marketRef))throw Error('Create a replacement asset for a different market identity.');
 const next=saveManualPosition(s,{...p,...(old?membership(s,old):{trackingStartedAt:p.trackingStartedAt??p.observedAt,archivePeriods:[]})});
 return platformSchema.parse({...next,assetEvents:[...s.assetEvents,{id:crypto.randomUUID(),positionId:p.id,name:p.providerId,assetClass:assetClassOf(p),kind:old?'edited':'added',at:p.observedAt,provenance:'PRIVATE_EDIT'}].slice(-240)});
}
export function archiveAsset(s:Platform,id:string,release=false,now=Date.now()):Platform {
 const p=s.positions.find(x=>x.id===id);if(!p||p.sourceType!=='MANUAL')throw Error('Only manually tracked assets can be archived here.');
 if(p.archivedAt)return s;
 const owners=s.allocations.filter(a=>a.positionId===id);
 if(owners.length&&!release)throw Error('Release Goal allocations before archiving.');
 if(owners.some(a=>s.goals.find(g=>g.id===a.goalId)?.locked))throw Error('Unlock linked Goals before releasing allocations.');
 const at=new Date(now).toISOString(),retained=membership(s,p);
 return platformSchema.parse({...s,positions:s.positions.map(x=>x.id===id?{...x,...retained,archivePeriods:[...retained.archivePeriods??[],{from:at}],archivedAt:at}:x),allocations:s.allocations.filter(a=>a.positionId!==id),assetEvents:[...s.assetEvents,{id:crypto.randomUUID(),positionId:id,name:p.providerId,assetClass:assetClassOf(p),kind:'archived',at,provenance:'PRIVATE_EDIT'}].slice(-240)});
}
export function restoreAsset(s:Platform,id:string,now=Date.now()):Platform {
 const p=s.positions.find(p=>p.id===id);if(!p?.archivedAt)return s;
 const {archivedAt,...rest}=p,at=new Date(now).toISOString(),retained=membership(s,p);
 return platformSchema.parse({...s,positions:s.positions.map(p=>p.id===id?{...rest,...retained,archivePeriods:retained.archivePeriods!.map(period=>Date.parse(period.from)===Date.parse(archivedAt)&&!period.to?{...period,to:at}:period)}:p),assetEvents:[...s.assetEvents,{id:crypto.randomUUID(),positionId:id,name:p.providerId,assetClass:assetClassOf(p),kind:'restored',at,provenance:'PRIVATE_EDIT'}].slice(-240)});
}
export function addFavourite(s:Platform,asset:MarketCatalogAsset):Platform {
 if(s.watchlist.some(a=>marketRefKey(a.ref)===marketRefKey(asset.ref)))return s;
 if(s.watchlist.length>=8)throw Error('Your watchlist holds up to 8 favourites. Remove one to make room.');
 return platformSchema.parse({...s,watchlist:[...s.watchlist,{ref:asset.ref,name:asset.name,symbol:asset.symbol}]});
}
export function removeFavourite(s:Platform,key:string):Platform{return platformSchema.parse({...s,watchlist:s.watchlist.filter(a=>marketRefKey(a.ref)!==key)});}
export function moveFavourite(s:Platform,key:string,direction:-1|1):Platform {const list=[...s.watchlist],i=list.findIndex(a=>marketRefKey(a.ref)===key),next=i+direction;if(i<0||next<0||next>=list.length)return s;[list[i],list[next]]=[list[next]!,list[i]!];return platformSchema.parse({...s,watchlist:list});}
