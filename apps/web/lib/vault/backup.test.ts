import {test,expect} from 'vitest';
import {encryptBackup,decryptBackup} from './backup';
test('large encrypted backup preserves exact original strings and verifies every chunk',async()=>{
 const data={health:JSON.stringify({marker:'FICTIONAL_HEALTH',values:'a'.repeat(2_100_000)}),finance:' {"quantity":"123.456789012345678901"} '};
 const backup=await encryptBackup(data);expect(backup.file).not.toContain('FICTIONAL_HEALTH');expect(backup.file).not.toContain(backup.recovery);
 expect(await decryptBackup(backup.file,backup.recovery)).toEqual(data);
 const altered=JSON.parse(backup.file);altered.chunks.pop();await expect(decryptBackup(JSON.stringify(altered),backup.recovery)).rejects.toThrow();
 const reordered=JSON.parse(backup.file);reordered.chunks.reverse();expect(await decryptBackup(JSON.stringify(reordered),backup.recovery)).toEqual(data);
});
test('wrong recovery and unsupported backup leave caller data untouched',async()=>{
 const a=await encryptBackup({health:'{"private":"fictional"}'}),b=await encryptBackup({health:'{}'});
 await expect(decryptBackup(a.file,b.recovery)).rejects.toThrow();await expect(decryptBackup('{"version":99}',a.recovery)).rejects.toThrow();
});
