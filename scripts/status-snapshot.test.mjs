import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {recordedLiveWorker} from './status-snapshot.mjs';

// The snapshot once matched `Worker \`zigoals-alpha\`: new version`, but deploy entries now write a comma there, so the
// first match was a 2026-09-28 record far down the file. The current record is "## Release identity".
test('the live Worker comes from the current Release identity, not an older entry lower in the file',()=>{
 const status=['# Alpha deploy — newest','- **Live Alpha:** Worker `zigoals-alpha`, new version `be41026f-1be9-423e-b4d8-71d4be54aea0`.','',
  '# Current accepted baseline','','## Release identity','Updated for the newest deploy.','- Alpha Worker `zigoals-alpha`: live version `be41026f-1be9-423e-b4d8-71d4be54aea0`; rollback `f00a117f-a283-4b6e-a8f7-ab0bfed248af`.','',
  'Previous release identity:','- Alpha Worker `zigoals-alpha`: live version `f00a117f-a283-4b6e-a8f7-ab0bfed248af`.','','## PR #22 changes','',
  '# Old record','- Worker `zigoals-alpha`: new version `05de2b25-1ff8-4b5b-a867-e1f685e1f2bb` (also the observed live version).'].join('\n');
 expect(recordedLiveWorker(status)).toBe('be41026f-1be9-423e-b4d8-71d4be54aea0');
 expect(recordedLiveWorker(status.replace('## Release identity','## Something else'))).toBeNull();
});
test('the real docs/STATUS.md names its Release identity version, never the stale 2026-09-28 one',()=>{
 const status=readFileSync(new URL('../docs/STATUS.md',import.meta.url),'utf8'),version=recordedLiveWorker(status);
 expect(version).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
 expect(version).not.toBe('05de2b25-1ff8-4b5b-a867-e1f685e1f2bb');
 const identity=status.slice(status.indexOf('\n## Release identity\n'));expect(identity.indexOf(version)).toBeLessThan(identity.indexOf('Previous release identity'));
});
