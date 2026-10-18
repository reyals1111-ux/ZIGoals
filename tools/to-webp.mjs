// to-webp.mjs <dir>: full-page PNGs over 1 MB become WebP quality 90 (AE's convention); crops stay lossless PNG.
import {createRequire} from 'node:module'; import {readdirSync,statSync,unlinkSync} from 'node:fs'; import {join} from 'node:path';
const require=createRequire('/Users/AIUSER/Documents/ZIGoals-Claude/apps/web/package.json'); const sharp=require('sharp');
const dir=process.argv[2]; let n=0;
for(const f of readdirSync(dir)){ if(!f.endsWith('.png')) continue; const p=join(dir,f); if(statSync(p).size<1_000_000) continue;
  await sharp(p,{limitInputPixels:false}).webp({quality:90}).toFile(p.replace(/\.png$/,'.webp')); unlinkSync(p); n++; }
console.log('converted',n);
