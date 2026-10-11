import {expect,test} from '@playwright/test';

/**
 * Session P, PR 1 (2026-10-03): every brand mark, word and figure is served as a WebP image at 1x and at 2x, directly,
 * with no redirect. The high-density files are `<name>-2x.webp`: Workers Assets answers a path with `@` in it with a
 * 307 redirect to its `%40` spelling, which cost one extra round trip per high-density screen on the live Alpha.
 */
const NAMES=['today-swan','goals-lotus','habits-butterfly','health-heart','wealth-bull'];
const FILES=[...['marks','words','figures'].flatMap(dir=>NAMES.map(name=>`/brand/${dir}/${name}`)),'/brand/marks/zigoals-lockup','/brand/figures/zigoals-z'];

test('every mark, word and figure answers 200 image/webp at 1x and at 2x, without a redirect',async({request,isMobile})=>{
 test.skip(isMobile,'The files are the same on every device; one project is enough.');
 for(const file of FILES)for(const density of ['','-2x']){
  const path=`${file}${density}.webp`,response=await request.get(path,{maxRedirects:0});
  expect(response.status(),path).toBe(200);
  expect(response.headers()['content-type'],path).toMatch(/^image\/webp/);
  const bytes=await response.body();
  expect(bytes.length,path).toBeGreaterThan(200);
  // RIFF....WEBP: the file is a WebP container, not an error page with an image header.
  expect(bytes.subarray(0,4).toString('latin1'),path).toBe('RIFF');expect(bytes.subarray(8,12).toString('latin1'),path).toBe('WEBP');
 }
 for(const path of ['/brand/marks/today-swan@2x.webp','/brand/words/today-swan@2x.webp','/brand/figures/zigoals-z@2x.webp']){
  expect((await request.get(path,{maxRedirects:0})).status(),path).not.toBe(200);
 }
});
