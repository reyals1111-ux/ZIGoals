import {expect,test} from 'vitest';
import {smoothConicGradient} from './visual-gradients';

test('decorative blends preserve exact segment endpoints and a visible tiny middle category',()=>{
 const gradient=smoothConicGradient([{color:'#aabbcc',offset:0,size:45},{color:'#ddeeff',offset:45,size:.4},{color:'#223344',offset:45.4,size:19.6}]);
 expect(gradient).toContain('#aabbcc 44.9%');
 expect(gradient).toContain('#ddeeff 45.1%');
 expect(gradient).toContain('#ddeeff 45.3%');
 expect(gradient).toContain('#223344 45.5%');
 expect(gradient).toContain('#223344 65%');
 expect(gradient).toContain('#213650 65% 100%');
});
