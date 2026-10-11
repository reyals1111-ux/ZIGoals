import {test,expect} from 'vitest';
import {emptyPlatform,platformSchema} from './positions';
import {ownedWealthChanges} from './wealth-changes';
const start='2026-01-01T00:00:00.000Z',end='2026-02-01T00:00:00.000Z',middle='2026-01-15T00:00:00.000Z';
function fixture(){return platformSchema.parse({...emptyPlatform(),positions:[{id:'cash',providerId:'Cash',sourceType:'MANUAL',network:'manual',account:'local',asset:'USD',assetClass:'Cash',denom:'USD',quantity:'12000',decimals:2,valuation:{value:'12000',decimals:2,currency:'USD',source:'MANUAL',observedAt:end},liquidity:'LIQUID',verification:'MANUAL',sync:'MANUAL',observedAt:end,provenance:'Fixture',notes:'',risk:'',executionAuthority:'NONE'}],valuationSnapshots:[{id:'a',positionId:'cash',quantity:'10000',quantityDecimals:2,value:'10000',decimals:2,currency:'USD',source:'MANUAL',capturedAt:start},{id:'b',positionId:'cash',quantity:'12000',quantityDecimals:2,value:'12000',decimals:2,currency:'USD',source:'MANUAL',capturedAt:end}],financialPortfolios:[{id:'statement',name:'Fixture',currency:'USD',createdAt:start}]});}
test('whole-owned bridge separates dated linked inflows, fees and remaining gaps without inferring income',()=>{
 const s=fixture(),common={portfolioId:'statement',source:'MANUAL' as const,sourceLabel:'Fixture',recordedAt:end,occurredAt:middle,note:'',relatedPositionId:'cash'};
 const data=platformSchema.parse({...s,financialEvents:[{...common,id:'deposit',kind:'external_flow',direction:'IN',amount:{value:'2100',decimals:2,currency:'USD'}},{...common,id:'fee',kind:'fee',amount:{value:'100',decimals:2,currency:'USD'}}]});
 const result=ownedWealthChanges(data,'USD',start,end);expect(result.change).toBe('2000');expect(result.totals).toMatchObject({contributions:'2100',fees:'-100',valuation:'0'});expect(result.gap).toBe('0');expect(result.records.map(r=>r.id)).toEqual(['deposit','fee']);
 expect(ownedWealthChanges(s,'USD',start,end).gap).toBe('2000');expect(()=>ownedWealthChanges(data,'EUR',start,end)).toThrow('complete');
});
test('allocation does not change wealth, unlinked records are excluded and values exceed Number precision exactly',()=>{
 const s=fixture(),large='900719925474099300';s.valuationSnapshots[0]!.value=large;s.valuationSnapshots[1]!.value=(BigInt(large)+1n).toString();s.valuationSnapshots[0]!.quantity=large;s.valuationSnapshots[1]!.quantity=(BigInt(large)+1n).toString();s.positions[0]!.quantity=(BigInt(large)+1n).toString();
 expect(ownedWealthChanges(s,'USD',start,end).change).toBe('1');const result=ownedWealthChanges({...s,financialEvents:[{id:'unlinked',portfolioId:'statement',source:'MANUAL',sourceLabel:'Fixture',recordedAt:end,occurredAt:middle,note:'',kind:'income',amount:{value:'999',decimals:2,currency:'USD'}}]},'USD',start,end);expect(result.totals.income).toBe('0');expect(result.warnings.join(' ')).toContain('unlinked');
});
test('transfers require two exact opposite same-currency legs, not rounded-cent equality',()=>{
 const s=fixture();s.positions.push({...s.positions[0]!,id:'other'});s.valuationSnapshots.push(...s.valuationSnapshots.map(v=>({...v,id:v.id+'other',positionId:'other'})));
 const common={portfolioId:'statement',source:'MANUAL' as const,sourceLabel:'Transfer fixture',recordedAt:end,occurredAt:middle,note:'',kind:'transfer' as const,transferGroupId:'move'},out={...common,id:'out',relatedPositionId:'cash',changeDirection:'OUT' as const,amount:{value:'1001',decimals:3,currency:'USD'}},incoming={...common,id:'in',relatedPositionId:'other',changeDirection:'IN' as const,amount:{value:'1001',decimals:3,currency:'USD'}};
 const matched=ownedWealthChanges({...s,financialEvents:[out,incoming]},'USD',start,end);expect(matched.totals.transfers).toBe('0');expect(matched.records).toHaveLength(2);
 const mismatch=ownedWealthChanges({...s,financialEvents:[out,{...incoming,amount:{...incoming.amount,value:'1009'}}]},'USD',start,end);expect(mismatch.records).toHaveLength(0);expect(mismatch.warnings.join(' ')).toContain('incompatible transfer');expect(ownedWealthChanges({...s,financialEvents:[out]},'USD',start,end).records).toHaveLength(0);
});
test('funding and its statement reference count once; explicit corrections remain separate',()=>{
 const s=fixture(),contribution={id:'fund',goalId:'81',goalScope:'private' as const,positionId:'cash',direction:'IN' as const,quantity:'1000',asset:'USD',decimals:2,occurredAt:middle,provenance:'MANUAL_ATTRIBUTION' as const,fundingMode:'FUND_GOAL' as const};
 const common={portfolioId:'statement',source:'MANUAL' as const,sourceLabel:'Fixture',recordedAt:end,occurredAt:middle,note:'',relatedPositionId:'cash',amount:{value:'1000',decimals:2,currency:'USD'}};
 const result=ownedWealthChanges({...s,contributions:[contribution],financialEvents:[{...common,id:'linked',kind:'external_flow',direction:'IN',relatedContributionId:'fund'},{...common,id:'correct',kind:'quantity_correction',changeDirection:'IN'}]},'USD',start,end);expect(result.totals).toMatchObject({contributions:'1000',corrections:'1000'});expect(result.gap).toBe('0');expect(result.records.map(v=>v.id)).toEqual(['correct','fund']);
});
test('valuation movement needs retained provider identity and unchanged quantity throughout the period',()=>{
 const s=fixture();s.valuationSnapshots=s.valuationSnapshots.map(v=>({...v,quantity:'10000',source:'COINGECKO',marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},price:v.value,priceDecimals:2}));
 expect(ownedWealthChanges(s,'USD',start,end).totals.valuation).toBe('2000');expect(ownedWealthChanges({...s,valuationSnapshots:s.valuationSnapshots.map(v=>({...v,marketRef:undefined}))},'USD',start,end).totals.valuation).toBe('0');
 s.valuationSnapshots.push({...s.valuationSnapshots[0]!,id:'interim',quantity:'9000',capturedAt:middle});expect(ownedWealthChanges(s,'USD',start,end).totals.valuation).toBe('0');
});
test('different immutable device snapshots at one instant cannot be arbitrarily promoted to a total',()=>{
 const s=fixture();s.valuationSnapshots.push({...s.valuationSnapshots[1]!,id:'other-device',value:'13000'});expect(()=>ownedWealthChanges(s,'USD',start,end)).toThrow('complete');
});
