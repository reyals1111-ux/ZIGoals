import {test,expect} from 'vitest';
import {foodRetryAfterSeconds,foodWaitLabel,DEFAULT_FOOD_WAIT_S,holdFoodLookup,foodLookupAvailableAt} from './food-cooldown';
// Session U Part 3: the scanner waits exactly the food Worker's retryAfter and never retries by itself.
test('the wait comes from the body, then Retry-After, else 60 s; out-of-range values are ignored',()=>{
 expect(foodRetryAfterSeconds({error:'TRY_LATER',retryAfter:42},'7')).toBe(42);
 expect(foodRetryAfterSeconds({error:'TRY_LATER'},'7')).toBe(7);
 expect(foodRetryAfterSeconds(undefined,' 120 ')).toBe(120);
 for(const [body,header] of [[{retryAfter:0},null],[{retryAfter:-5},'0'],[{retryAfter:1.5},'abc'],[{retryAfter:'30'},'1e3'],[{retryAfter:86401},'86401'],[null,null],['text',''],[[42],'99999']] as const)expect(foodRetryAfterSeconds(body,header)).toBe(DEFAULT_FOOD_WAIT_S);
 expect(foodRetryAfterSeconds({retryAfter:86400},null)).toBe(86400);
});
test('the label is calm: seconds under a minute, whole minutes rounded up after',()=>{
 expect([0.2,1,45,59.1,60,61,119,3600].map(foodWaitLabel)).toEqual(['1 s','1 s','45 s','60 s','1 min','2 min','2 min','60 min']);
});
test('a hold only ever extends',()=>{
 const start=foodLookupAvailableAt();holdFoodLookup(start+5000);expect(foodLookupAvailableAt()).toBe(start+5000);
 holdFoodLookup(start+1000);expect(foodLookupAvailableAt()).toBe(start+5000);
});
