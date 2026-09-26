import {z} from 'zod';
import {CATALOG_FRESH_MS,marketAssetRefSchema,type MarketCatalogAsset} from '../market-assets';
import {verifiedMarketHistory,historyIsStale} from '../market-history';
import {verifiedMarketInsight,insightIsStale} from '../market-insights';
import {verifiedMarketQuote,quoteIsStale} from '../market-quotes';
import type {PublicMarketWork} from './market-coordinator';
const assets=z.array(z.object({ref:marketAssetRefSchema,name:z.string().min(1).max(300),symbol:z.string().max(100),platforms:z.record(z.string().max(150),z.string().max(250)).optional()}).strict()).max(50000);
const catalog=z.object({assets,fetchedAt:z.iso.datetime()}).strict();
export type CatalogEvidence={assets:MarketCatalogAsset[];fetchedAt:string};
/** Validate again at the durable publication boundary, independently of adapters. */
export function validateWorkEvidence(work:PublicMarketWork,value:unknown,now:number):unknown{
 if(work.operation==='quote'){const quote=verifiedMarketQuote(value,now);if(!quote.marketRef||quote.marketRef.kind!==work.pair.marketRef.kind||quote.providerAssetId!==work.pair.marketRef.id||quote.currency!==work.pair.currency||work.pair.marketRef.kind==='rwa'&&(quote.marketRef.kind!=='rwa'||quote.marketRef.assetType!==work.pair.marketRef.assetType))throw Error('Wrong quote identity.');return quote;}
 if(work.operation==='history')return verifiedMarketHistory(value,{...work.pair,range:work.range},now);
 if(work.operation==='insights')return verifiedMarketInsight(value,work.pair,now);
 const parsed=catalog.parse(value);if(Date.parse(parsed.fetchedAt)>now+60000||parsed.assets.some(a=>a.ref.kind!==work.kind)||new Set(parsed.assets.map(a=>a.ref.id)).size!==parsed.assets.length)throw Error('Invalid catalog evidence.');return parsed;
}
export function workEvidenceTime(value:unknown):number {const row=value as {observedAt?:string;fetchedAt?:string};return Date.parse(row.observedAt??row.fetchedAt??'');}
export function workEvidenceStale(work:PublicMarketWork,value:unknown,now:number):boolean{
 if(work.operation==='quote')return quoteIsStale(value as Parameters<typeof quoteIsStale>[0],now);
 if(work.operation==='history')return historyIsStale(value as Parameters<typeof historyIsStale>[0],now);
 if(work.operation==='insights')return insightIsStale(value as Parameters<typeof insightIsStale>[0],now);
 return now-workEvidenceTime(value)>=CATALOG_FRESH_MS;
}
