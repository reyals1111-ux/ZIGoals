import {describe,test,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(new URL('./install-chrome.sh',import.meta.url));
// The fake installer plays one action per attempt from FAKE_PLAN: ok, fail, hang,
// apt (refuses like apt-get while the lock is held) and orphan:<seconds> (leaves a
// detached process holding the lock, as a timed-out apt-get did, then fails).
const FAKE=String.raw`#!/usr/bin/env bash
n=$(( $(cat "$FAKE_DIR/count" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$FAKE_DIR/count"
action=$(echo "$FAKE_PLAN" | cut -d, -f"$n")
case "$action" in
  ok) exit 0 ;;
  fail) exit 1 ;;
  hang) exec sleep 60 ;;
  apt) if python3 "$FAKE_DIR/probe.py" "$FAKE_LOCK"; then exit 0; fi
       echo "E: Could not get lock $FAKE_LOCK"; exit 100 ;;
  orphan:*) seconds=$(echo "$action" | cut -d: -f2)
       setsid python3 "$FAKE_DIR/hold.py" "$FAKE_LOCK" "$seconds" "$FAKE_DIR/orphan.pid" </dev/null >/dev/null 2>&1 &
       for _ in $(seq 1 200); do [ -s "$FAKE_DIR/orphan.pid" ] && break; sleep 0.05; done
       exit 1 ;;
esac
`;
// A POSIX (fcntl) lock, the kind dpkg and apt take.
const HOLD=`import fcntl,os,sys,time
f=open(sys.argv[1],'a');fcntl.lockf(f,fcntl.LOCK_EX)
open(sys.argv[3],'w').write(str(os.getpid()))
time.sleep(float(sys.argv[2]))
`;
const PROBE=`import fcntl,sys
f=open(sys.argv[1],'a')
try: fcntl.lockf(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
except OSError: sys.exit(1)
`;
const FAST={ZIGOALS_CHROME_ATTEMPTS:'3',ZIGOALS_CHROME_ATTEMPT_SECONDS:'5',ZIGOALS_CHROME_KILL_AFTER_SECONDS:'1',ZIGOALS_CHROME_BACKOFF_SECONDS:'0 0',ZIGOALS_CHROME_LOCK_WAIT_SECONDS:'6',ZIGOALS_CHROME_LOCK_POLL_SECONDS:'1',ZIGOALS_CHROME_LOCK_REPORT_SECONDS:'1',ZIGOALS_CHROME_STEP_SECONDS:'60'};

async function install(plan,env={},args){
 const dir=await mkdtemp(join(tmpdir(),'zigoals-install-chrome-')),lock=join(dir,'lock-frontend');
 await Promise.all([writeFile(join(dir,'fake.sh'),FAKE,{mode:0o755}),writeFile(join(dir,'hold.py'),HOLD),writeFile(join(dir,'probe.py'),PROBE),writeFile(lock,'')]);
 const started=Date.now();
 try{
  const {code,out}=await new Promise((resolve,reject)=>{
   const child=spawn('bash',[script,...(args??[join(dir,'fake.sh')])],{env:{...process.env,...FAST,ZIGOALS_CHROME_LOCK_FILES:`${join(dir,'missing-lock')} ${lock}`,...env,FAKE_DIR:dir,FAKE_PLAN:plan,FAKE_LOCK:lock}});
   let out='';child.stdout.on('data',d=>{out+=d;});child.stderr.on('data',d=>{out+=d;});child.on('error',reject);child.on('close',code=>resolve({code,out}));
  });
  const read=name=>readFile(join(dir,name),'utf8').then(v=>v.trim(),()=>'');
  return {code,out,attempts:Number(await read('count')||0),orphan:await read('orphan.pid'),seconds:(Date.now()-started)/1000};
 }finally{
  const pid=Number(await readFile(join(dir,'orphan.pid'),'utf8').catch(()=>''));if(pid)try{process.kill(pid);}catch{/* already gone */}
  await rm(dir,{recursive:true,force:true});
 }
}

// Reads /proc/locks, so it runs on Linux only (CI's ubuntu-24.04 and Linux checkouts).
describe.skipIf(process.platform!=='linux').concurrent('CI Chrome install retries',()=>{
 test('a first-attempt success needs no wait',async()=>{
  const r=await install('ok');expect(r.code).toBe(0);expect(r.attempts).toBe(1);expect(r.out).not.toContain('Waiting');
 },20_000);
 test('a failed attempt is retried after its backoff, as before',async()=>{
  const r=await install('fail,ok',{ZIGOALS_CHROME_BACKOFF_SECONDS:'1 1'});
  expect(r.code).toBe(0);expect(r.attempts).toBe(2);expect(r.out).toContain('Chrome install attempt 1 of 3 failed.');expect(r.out).not.toContain('Waiting');expect(r.seconds).toBeGreaterThanOrEqual(1);
 },20_000);
 test('an apt-get left holding the dpkg lock is waited for, then the retry succeeds',async()=>{
  const r=await install('orphan:2,apt');
  expect(r.code).toBe(0);expect(r.attempts).toBe(2);expect(r.orphan).toMatch(/^\d+$/);
  const failed=r.out.indexOf('Chrome install attempt 1 of 3 failed.'),waiting=r.out.indexOf(`Waiting for the apt/dpkg lock held by PID ${r.orphan} (python3 `),released=r.out.search(/apt\/dpkg locks released after \d+ s\./);
  expect(failed).toBeGreaterThanOrEqual(0);expect(waiting).toBeGreaterThan(failed);expect(released).toBeGreaterThan(waiting);expect(r.out).not.toContain('Could not get lock');
 },20_000);
 test('negative control: with the lock undetected, the retries fail at once as in run 36875302540',async()=>{
  const r=await install('orphan:20,apt,apt',{ZIGOALS_CHROME_LOCK_FILES:'/nonexistent/zigoals-lock'});
  expect(r.code).toBe(1);expect(r.attempts).toBe(3);expect(r.out.match(/E: Could not get lock/g)).toHaveLength(2);expect(r.out).toContain('::error::Chrome install failed after 3 attempts');
 },20_000);
 test('a lock held past the bound fails clearly, naming its holder, without another attempt',async()=>{
  const r=await install('orphan:30,ok',{ZIGOALS_CHROME_LOCK_WAIT_SECONDS:'2'});
  expect(r.code).toBe(1);expect(r.attempts).toBe(1);
  expect(r.out).toMatch(new RegExp(`::error::An apt/dpkg lock is still held after [23] s by PID ${r.orphan} \\(python3 .*hold\\.py`));
  expect(r.out).toContain('Re-run the job once; if it fails again, investigate.');
 },20_000);
 test('an attempt over its time limit is stopped and retried',async()=>{
  const r=await install('hang,ok',{ZIGOALS_CHROME_ATTEMPT_SECONDS:'1'});
  expect(r.code).toBe(0);expect(r.attempts).toBe(2);expect(r.out).toContain('Chrome install attempt 1 of 3 failed.');expect(r.seconds).toBeLessThan(10);
 },20_000);
 test('three failed attempts end with the existing error',async()=>{
  const r=await install('fail,fail,fail');
  expect(r.code).toBe(1);expect(r.attempts).toBe(3);expect(r.out).toContain('::error::Chrome install failed after 3 attempts (infrastructure: dl.google.com or playwright install). Re-run the job once; if it fails again, investigate.');
 },20_000);
 test('no attempt starts that could not finish within the step limit',async()=>{
  const r=await install('hang,ok',{ZIGOALS_CHROME_ATTEMPT_SECONDS:'2',ZIGOALS_CHROME_STEP_SECONDS:'4'});
  expect(r.code).toBe(1);expect(r.attempts).toBe(1);expect(r.out).toContain('::error::Chrome install stopped before attempt 2 of 3: it could not finish within the step\'s 4 s limit.');
 },20_000);
 test('the lock wait shrinks to fit the step limit',async()=>{
  const r=await install('orphan:30,ok',{ZIGOALS_CHROME_LOCK_WAIT_SECONDS:'240',ZIGOALS_CHROME_ATTEMPT_SECONDS:'2',ZIGOALS_CHROME_STEP_SECONDS:'7'});
  expect(r.code).toBe(1);expect(r.attempts).toBe(1);expect(r.out).toContain('::error::An apt/dpkg lock is still held after');expect(r.out).toMatch(/of at most [1-4] s\./);expect(r.seconds).toBeLessThan(7);
 },20_000);
 test('a missing install command is a usage error',async()=>{
  const r=await install('ok',{},[]);expect(r.code).toBe(2);expect(r.out).toContain('usage:');expect(r.attempts).toBe(0);
 },20_000);
});
