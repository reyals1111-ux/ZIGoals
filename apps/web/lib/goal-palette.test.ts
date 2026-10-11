import {expect,it} from 'vitest';
import {goalPalette} from '../components/goal-palette';
it('uses stable, varied nebula palettes for different Goal identities',()=>{const ids=['1','81','82','83'];const palettes=ids.map(goalPalette);expect(new Set(palettes.map(p=>p.join(':'))).size).toBe(4);expect(ids.map(id=>goalPalette(JSON.parse(JSON.stringify(id))))).toEqual(palettes);});
it('hashes the entire identity, including IDs sharing the last digit',()=>{expect(goalPalette('10000001')).not.toEqual(goalPalette('20000001'));});
