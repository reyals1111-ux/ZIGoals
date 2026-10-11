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
 return platformSchema.parse({...next,assetEvents:[...s.assetEvents,{id:crypto.randomUUID(),positionId:p.id,name:p.providerId,assetClass:assetClassOf(p),kind:old?'edited':'added',at:p.observedAt,provenance:'PRIVATE_EDIT'}]});
}
export function archiveAsset(s:Platform,id:string,release=false,now=Date.now()):Platform {
 const p=s.positions.find(x=>x.id===id);if(!p||p.sourceType!=='MANUAL')throw Error('Only manually tracked assets can be archived here.');
 if(p.archivedAt)return s;
 const owners=s.allocations.filter(a=>a.positionId===id);
 if(owners.length&&!release)throw Error('Release Goal allocations before archiving.');
 if(owners.some(a=>s.goals.find(g=>g.id===a.goalId)?.locked))throw Error('Unlock linked Goals before releasing allocations.');
 const at=new Date(now).toISOString(),retained=membership(s,p);
 return platformSchema.parse({...s,positions:s.positions.map(x=>x.id===id?{...x,...retained,archivePeriods:[...retained.archivePeriods??[],{from:at}],archivedAt:at}:x),allocations:s.allocations.filter(a=>a.positionId!==id),assetEvents:[...s.assetEvents,{id:crypto.randomUUID(),positionId:id,name:p.providerId,assetClass:assetClassOf(p),kind:'archived',at,provenance:'PRIVATE_EDIT'}]});
}
export function restoreAsset(s:Platform,id:string,now=Date.now()):Platform {
 const p=s.positions.find(p=>p.id===id);if(!p?.archivedAt)return s;
 const {archivedAt,...rest}=p,at=new Date(now).toISOString(),retained=membership(s,p);
 return platformSchema.parse({...s,positions:s.positions.map(p=>p.id===id?{...rest,...retained,archivePeriods:retained.archivePeriods!.map(period=>Date.parse(period.from)===Date.parse(archivedAt)&&!period.to?{...period,to:at}:period)}:p),assetEvents:[...s.assetEvents,{id:crypto.randomUUID(),positionId:id,name:p.providerId,assetClass:assetClassOf(p),kind:'restored',at,provenance:'PRIVATE_EDIT'}]});
}
export function addFavourite(s:Platform,asset:MarketCatalogAsset):Platform {
 if(s.watchlist.some(a=>marketRefKey(a.ref)===marketRefKey(asset.ref)))return s;
 if(s.watchlist.length>=8)throw Error('Your watchlist holds up to 8 favourites. Remove one to make room.');
 return platformSchema.parse({...s,watchlist:[...s.watchlist,{ref:asset.ref,name:asset.name,symbol:asset.symbol}]});
}
export function removeFavourite(s:Platform,key:string):Platform{return platformSchema.parse({...s,watchlist:s.watchlist.filter(a=>marketRefKey(a.ref)!==key)});}
export function moveFavourite(s:Platform,key:string,direction:-1|1):Platform {const list=[...s.watchlist],i=list.findIndex(a=>marketRefKey(a.ref)===key),next=i+direction;if(i<0||next<0||next>=list.length)return s;[list[i],list[next]]=[list[next]!,list[i]!];return platformSchema.parse({...s,watchlist:list});}
/**
 * Session Y Part 8 (owner-approved; ADR-018 Y26): a precious metal's weight unit can change, in the safest subset. The
 * unit is part of the asset's identity (`asset` "Gold grams", `denom` "manual:Gold grams"), and Goals, funding events,
 * valuation records and the quantity history all count in it, so the change is allowed only while nothing stored would
 * be re-labelled: a manual metal with no market link, not archived, never allocated to a Goal or named by a funding
 * event or a valuation record, and with no quantity on record but the one it was added with (which the new quantity
 * replaces). Otherwise the reason is returned and the unit stays as it is. Nothing new is stored: the same schema, so
 * #32–#34 read the result.
 */
export const METAL_UNITS=['grams','kilograms','troy ounces'] as const;
export type MetalUnit=typeof METAL_UNITS[number];
export function metalUnitOf(p:Position):{metal:string;unit:MetalUnit}|null{
 if(p.assetClass!=='Precious Metals')return null;
 const unit=METAL_UNITS.find(u=>p.asset.endsWith(` ${u}`));return unit&&p.asset.length>unit.length+1?{metal:p.asset.slice(0,-unit.length-1),unit}:null;
}
/** Why this asset's unit cannot change now, in plain words; null when it can. */
export function unitLocked(s:Platform,p:Position):string|null{
 if(!metalUnitOf(p))return 'Only a precious metal’s weight unit can change.';
 if(p.marketRef||p.sourceType!=='MANUAL'||p.network!=='manual')return 'Linked assets follow their market, so their unit stays as it is.';
 if(p.archivedAt)return 'Restore this asset before editing.';
 if(s.allocations.some(a=>a.positionId===p.id))return 'This asset funds a Goal, so its unit stays as it is.';
 if(s.goals.some(g=>g.asset===p.asset&&g.denom===p.denom))return 'A Goal counts in this asset’s unit, so its unit stays as it is.';
 // Funding, valuation and financial-evidence records name an asset by its id or its denom; any mention keeps the unit.
 const mentions=JSON.stringify([s.contributions,s.valuationSnapshots,s.financialEvents??[],s.financialPortfolios??[],s.performanceReviews??[]]);
 if(mentions.includes(p.id)||mentions.includes(JSON.stringify(p.denom).slice(1,-1)))return 'This asset has funding or valuation records in its unit, so its unit stays as it is.';
 if(s.snapshots.filter(x=>x.positionId===p.id).length>1)return 'This asset already has a quantity history in its unit, so its unit stays as it is. Add a new asset to count in another unit.';
 return null;
}
/** Changes a precious metal's weight unit with its quantity in the new unit; refuses outside the safest subset. */
export function changeManualUnit(raw:Platform,positionId:string,unit:MetalUnit,quantity:string,now=new Date().toISOString()):Platform{
 const s=platformSchema.parse(raw),p=s.positions.find(x=>x.id===positionId);if(!p)throw Error('Asset unavailable.');
 const locked=unitLocked(s,p);if(locked)throw Error(locked);
 if(!METAL_UNITS.includes(unit))throw Error('Choose grams, kilograms or troy ounces.');
 const current=metalUnitOf(p)!;if(current.unit===unit)throw Error('This is already the asset’s unit.');
 if(!/^[1-9]\d*$/.test(quantity))throw Error('Enter a positive quantity.');
 const asset=`${current.metal} ${unit}`,next={...p,asset,denom:`manual:${asset}`,quantity,observedAt:now};
 return platformSchema.parse({...s,positions:s.positions.map(x=>x.id===p.id?next:x),snapshots:[...s.snapshots.filter(x=>x.positionId!==p.id),{positionId:p.id,quantity,observedAt:now}],
  assetEvents:[...s.assetEvents,{id:crypto.randomUUID(),positionId:p.id,name:p.providerId,assetClass:assetClassOf(p),kind:'edited',at:now,provenance:'PRIVATE_EDIT'}]});
}
