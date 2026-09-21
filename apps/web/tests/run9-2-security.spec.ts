import {test,expect} from '@playwright/test';

test('new public market endpoints reject private payload fields, query injection and arbitrary image destinations',async({request})=>{
 const identity={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'};
 for(const body of [{requests:[identity],wallet:'fictional-private-probe'},{requests:[{...identity,quantity:'999'}]},{requests:[identity],goals:[]}]){
  const response=await request.post('/api/market-insights',{data:body});expect(response.status()).toBe(400);expect(response.headers()['cache-control']).toContain('no-store');expect(await response.text()).not.toContain('fictional-private-probe');
 }
 const query=await request.post('/api/market-insights?wallet=fictional-probe',{data:{requests:[identity]}});expect(query.status()).toBe(400);
 for(const url of ['http://127.0.0.1/private','https://example.invalid/pixel.png','https://assets.coingecko.com/coins/images/1/small/test.svg','https://assets.coingecko.com@127.0.0.1/private']){
  const response=await request.get('/api/market-logo',{params:{url}});expect(response.status()).toBe(400);expect(response.headers()['x-content-type-options']).toBe('nosniff');
 }
});
