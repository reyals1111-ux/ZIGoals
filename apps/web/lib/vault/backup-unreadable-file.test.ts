import {expect,test} from 'vitest';
import {encryptBackup,decryptBackup} from './backup';
import {emptyHabitData} from '../habits';

// Settings shows this error text as is. A truncated download or the wrong file must get a plain
// reason, not a JSON parser position or a schema dump, and nothing is restored.
const MESSAGE=/not a complete ZIGoals encrypted backup/;
test.each([
 ['a truncated encrypted backup',async()=>{const {file}=await encryptBackup({habits:JSON.stringify(emptyHabitData())});return file.slice(0,Math.floor(file.length/2));}],
 ['a plaintext Habits backup',async()=>JSON.stringify(emptyHabitData())],
 ['a file that is not JSON',async()=>'PK\u0003\u0004 not a backup'],
 ['an empty file',async()=>''],
])('%s is refused with a plain reason',async(_label,file)=>{
 await expect(decryptBackup(await file(),'any recovery secret')).rejects.toThrow(MESSAGE);
});
test('a complete backup still decrypts',async()=>{
 const habits=JSON.stringify(emptyHabitData()),backup=await encryptBackup({habits});
 expect(await decryptBackup(backup.file,backup.recovery)).toEqual({habits});
});
