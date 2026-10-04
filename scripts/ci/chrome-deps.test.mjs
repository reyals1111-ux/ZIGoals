import {describe,test,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Session P (1.6): scripts/ci/chrome-deps.sh keeps the runner's Chrome, installs the chrome channel only without one,
// and asks apt only for the Chrome packages dpkg reports missing. Fakes stand in for Chrome, dpkg, apt-get and the
// Playwright install; each records how it was called.
const script=fileURLToPath(new URL('./chrome-deps.sh',import.meta.url));
const RECORD=(name)=>`#!/usr/bin/env bash\necho "${name} $*" >> "$FAKE_DIR/calls"\n`;
async function run({chrome='working',installed=[],env={}}={}){
 const dir=await mkdtemp(join(tmpdir(),'zigoals-chrome-deps-'));
 const chromePath=join(dir,'chrome');
 await Promise.all([
  writeFile(chromePath,chrome==='working'?'#!/usr/bin/env bash\necho "Google Chrome 141.0.7390.37"\n':chrome==='broken'?'#!/usr/bin/env bash\nexit 127\n':'',{mode:0o755}),
  writeFile(join(dir,'install.sh'),RECORD('install'),{mode:0o755}),
  writeFile(join(dir,'ffmpeg.sh'),RECORD('ffmpeg'),{mode:0o755}),
  writeFile(join(dir,'dpkg.sh'),`#!/usr/bin/env bash\necho "dpkg $*" >> "$FAKE_DIR/calls"\ngrep -qx -- "$1" "$FAKE_DIR/installed"\n`,{mode:0o755}),
  writeFile(join(dir,'apt.sh'),RECORD('apt-get'),{mode:0o755}),
  writeFile(join(dir,'installed'),installed.join('\n')+'\n'),
 ]);
 if(chrome==='missing')await rm(chromePath);else await chmod(chromePath,0o755);
 try{
  const {code,out}=await new Promise((resolve,reject)=>{
   const child=spawn('bash',[script],{env:{...process.env,FAKE_DIR:dir,ZIGOALS_CHROME_BINARY:chromePath,ZIGOALS_CHROME_INSTALL:join(dir,'install.sh'),ZIGOALS_CHROME_FFMPEG:join(dir,'ffmpeg.sh'),ZIGOALS_CHROME_DPKG:join(dir,'dpkg.sh'),ZIGOALS_CHROME_APT:join(dir,'apt.sh'),ZIGOALS_CHROME_PACKAGES:'liba libb fonts-liberation',...env}});
   let out='';child.stdout.on('data',d=>{out+=d;});child.stderr.on('data',d=>{out+=d;});child.on('error',reject);child.on('close',code=>resolve({code,out}));
  });
  const calls=(await readFile(join(dir,'calls'),'utf8').catch(()=>'')).trim().split('\n').filter(Boolean);
  return {code,out,calls:calls.filter(c=>!c.startsWith('dpkg ')),queried:calls.filter(c=>c.startsWith('dpkg ')).map(c=>c.slice(5))};
 }finally{await rm(dir,{recursive:true,force:true});}
}

describe.skipIf(process.platform==='win32')('CI Chrome packages without the mirror',()=>{
 test('a working runner Chrome with every package present: no download, no apt, only Playwright\'s ffmpeg',async()=>{
  const r=await run({installed:['liba','libb','fonts-liberation']});
  expect(r.code).toBe(0);expect(r.out).toContain('Using the runner\'s Chrome');expect(r.out).toContain('Google Chrome 141.0.7390.37');expect(r.out).toContain('All 3 Chrome packages are installed; apt not needed.');
  expect(r.calls).toEqual(['ffmpeg ']);expect(r.queried).toEqual(['liba','libb','fonts-liberation']);
 });
 test('only the missing packages are installed, without recommends, after one apt update',async()=>{
  const r=await run({installed:['libb']});
  expect(r.code).toBe(0);expect(r.out).toContain('Installing 2 missing Chrome package(s): liba fonts-liberation');
  expect(r.calls).toEqual(['ffmpeg ','apt-get update','apt-get install -y --no-install-recommends liba fonts-liberation']);
 });
 test('no Chrome, or one that does not start: the chrome channel is installed without --with-deps, then the packages are checked',async()=>{
  for(const chrome of ['missing','broken']){
   const r=await run({chrome,installed:['liba','libb','fonts-liberation']});
   expect(r.code,chrome).toBe(0);expect(r.out).toContain('installing Playwright\'s chrome channel (no --with-deps)');expect(r.calls).toEqual(['install ','ffmpeg ']);
  }
 });
 test('a dry run only says what it would do',async()=>{
  const r=await run({chrome:'missing',installed:[],env:{ZIGOALS_CHROME_DRY_RUN:'1'}});
  expect(r.code).toBe(0);expect(r.calls).toEqual([]);
  expect(r.out).toContain('would run: ');expect(r.out).toContain('install.sh');expect(r.out).toContain('ffmpeg.sh');expect(r.out).toContain('install -y --no-install-recommends liba libb fonts-liberation');
 });
 test('a failing install stops the script with its exit code, so install-chrome.sh retries',async()=>{
  const r=await run({chrome:'missing',installed:['liba','libb','fonts-liberation'],env:{ZIGOALS_CHROME_INSTALL:'false'}});
  expect(r.code).not.toBe(0);expect(r.calls).toEqual([]);
 });
 test('the default package list is Playwright\'s Ubuntu 24.04 Chromium list plus fonts-liberation, and nothing else',async()=>{
  const text=await readFile(script,'utf8');
  const list=text.match(/ZIGOALS_CHROME_PACKAGES:-([^}]+)}/)[1].split(' ');
  expect(list).toEqual(['libasound2t64','libatk-bridge2.0-0t64','libatk1.0-0t64','libatspi2.0-0t64','libcairo2','libcups2t64','libdbus-1-3','libdrm2','libgbm1','libglib2.0-0t64','libnspr4','libnss3','libpango-1.0-0','libx11-6','libxcb1','libxcomposite1','libxdamage1','libxext6','libxfixes3','libxkbcommon0','libxrandr2','fonts-liberation']);
  expect(list.filter(p=>/^fonts-/.test(p))).toEqual(['fonts-liberation']);expect(list).not.toContain('xvfb');
 });
});
