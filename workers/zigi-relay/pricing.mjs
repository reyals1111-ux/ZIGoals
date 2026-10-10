/**
 * The relay's price table (Session Z-Cloud Part 6, ADR-019 C40): a copy of Session Z-Local's `apps/web/lib/ai/pricing.ts`
 * (`PRICES`, `PRICES_AS_OF`, `estimateCost`) at `origin/feature/session-z-local` 64ec6f6, so the relay costs a reply
 * exactly as the app's usage meter and Z-Local's ledger do (owner follow-up 2: the same accounting). Never edit one
 * without the other: `scripts/run11/zigi-relay-pricing.test.mjs` compares this copy with the app's table whenever both
 * are on the branch. Source: platform.claude.com pricing, read by Z-Local on 2026-10-10: cache writes 1.25× the input
 * price (5-minute entries), cache hits 0.05× on Claude Opus 5.5 and Claude Sonnet 5.5 and 0.1× on Claude Haiku 5.5;
 * Claude Haiku 5.5's second rate card above 100,000 prompt tokens (input + cache writes + cache reads). Thinking is billed
 * as output. USD per million tokens.
 */
export const PRICES_AS_OF='2026-10-10';
/** @typedef {{input:number,output:number,cacheWrite:number,cacheRead:number}} Price */
/** @type {readonly {id:string,label:string,usd:Price,longPrompt?:{above:number,usd:Price}}[]} */
export const PRICES=[
 {id:'claude-opus-5-5',label:'Claude Opus 5.5',usd:{input:4,output:20,cacheWrite:5,cacheRead:0.2}},
 {id:'claude-sonnet-5-5',label:'Claude Sonnet 5.5',usd:{input:2,output:10,cacheWrite:2.5,cacheRead:0.1}},
 {id:'claude-haiku-5-5',label:'Claude Haiku 5.5',usd:{input:0.1,output:0.5,cacheWrite:0.125,cacheRead:0.01},longPrompt:{above:100_000,usd:{input:0.5,output:2.5,cacheWrite:0.625,cacheRead:0.05}}},
];
/** @param {string} model */
export const priceFor=model=>PRICES.find(p=>p.id===model)??null;
/**
 * The cost of one call in USD from its own usage fields, or null when the model is not in the table; missing counts
 * count as zero. As Z-Local's `estimateCost` without the Batch API (the relay never batches).
 * @param {string} model @param {{input?:number|null,output?:number|null,cacheWrite?:number|null,cacheRead?:number|null}} usage
 */
export function estimateCost(model,usage){
 const price=priceFor(model);if(!price)return null;
 const input=usage.input??0,output=usage.output??0,cacheWrite=usage.cacheWrite??0,cacheRead=usage.cacheRead??0;
 const prompt=input+cacheWrite+cacheRead;
 const usd=price.longPrompt&&prompt>price.longPrompt.above?price.longPrompt.usd:price.usd;
 return (input*usd.input+output*usd.output+cacheWrite*usd.cacheWrite+cacheRead*usd.cacheRead)/1e6;
}
/** The same cost in whole micro-dollars, rounded up (what the budget object counts), or null. @param {string} model @param {Parameters<typeof estimateCost>[1]} usage */
export function costMicros(model,usage){const usd=estimateCost(model,usage);return usd===null?null:Math.ceil(usd*1e6-1e-9);}
/** A dollar amount from a variable ("10", "0.50") in micro-dollars, or null. @param {string|undefined} value */
export function micros(value){if(!/^\d{1,6}(\.\d{1,6})?$/.test(value??''))return null;const n=Math.round(Number(value)*1e6);return Number.isSafeInteger(n)&&n>0?n:null;}
