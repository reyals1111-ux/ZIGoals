import {readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {expect,test} from 'vitest';
import {PAGE_MARKS} from '../components/page-mark';

// Session P, PR 1 (2026-10-03): Workers Assets answers a path with `@` in it with a 307 redirect to its `%40`
// spelling (seen on the live Alpha), one extra round trip for every high-density screen. The brand files therefore
// carry `-2x`, never `@2x`, and no file under public/brand may ever carry `@` again.
const root=join(import.meta.dirname,'../public/brand');
function walk(dir:string):string[]{return readdirSync(dir).flatMap(name=>{const path=join(dir,name);return statSync(path).isDirectory()?walk(path):[path];});}
const files=walk(root).map(path=>path.slice(root.length+1));

test('no file under public/brand carries a character Workers Assets would re-spell',()=>{
 expect(files.length).toBeGreaterThan(30);
 for(const file of files)expect(file,file).toMatch(/^[a-z0-9/_.-]+$/);
});

test('every 1x mark, word and figure has its -2x twin, and the sidebar marks exist in all three forms',()=>{
 const webp=files.filter(f=>/^(marks|words|figures)\/.*\.webp$/.test(f));
 // ZIGi's placeholder (components/zigi/manifest.json) adds zigi-placeholder (1x), -2x and a documented -large frame; the large frame has no 2x twin by design.
 const ones=webp.filter(f=>!f.endsWith('-2x.webp')&&!f.endsWith('zigi-placeholder-large.webp')),twos=webp.filter(f=>f.endsWith('-2x.webp'));
 expect(twos.length).toBe(18);
 expect(ones.map(f=>f.replace(/\.webp$/,'-2x.webp')).sort()).toEqual(twos.sort());
 for(const mark of PAGE_MARKS)for(const dir of ['marks','words','figures'])expect(ones,`${dir}/${mark.name}`).toContain(`${dir}/${mark.name}.webp`);
});
