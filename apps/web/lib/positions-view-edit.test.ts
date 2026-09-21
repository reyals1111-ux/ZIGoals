import {expect,it} from 'vitest';
import {automaticSourcePosition} from '../components/platform/asset-search';
import {manualPositionFromEditor} from '../components/platform/positions-view';

const automatic=automaticSourcePosition({asset:{ref:{provider:'coingecko',kind:'coin',id:'bitcoin'},name:'Bitcoin',symbol:'BTC'},assetClass:'Crypto',quantity:'1',currency:'EUR',notes:'Keep this note'},'editable-auto','2026-09-20T10:00:00.000Z');

it('preserves automatic identity, mode, currency and classification during an ordinary Position edit',()=>{
 const edited=manualPositionFromEditor(automatic,{name:'My Bitcoin',quantity:'2',value:'',currency:'USD',notes:'Updated note'},'2026-09-20T11:00:00.000Z');
 expect(edited).toMatchObject({id:automatic.id,providerId:'My Bitcoin',quantity:'2000000000000000000',marketRef:automatic.marketRef,valuationMode:'automatic',quoteCurrency:'EUR',assetClass:'Crypto',provenance:automatic.provenance,notes:'Updated note'});
 expect(edited).not.toHaveProperty('valuation');
});

it('keeps the market identity while an entered total explicitly changes valuation to manual',()=>{
 const edited=manualPositionFromEditor(automatic,{name:'Bitcoin',quantity:'1',value:'50000',currency:'USD',notes:''},'2026-09-20T11:00:00.000Z');
 expect(edited).toMatchObject({marketRef:automatic.marketRef,quoteCurrency:'EUR',valuationMode:'manual',valuation:{value:'5000000',decimals:2,currency:'USD',source:'MANUAL'}});
});
