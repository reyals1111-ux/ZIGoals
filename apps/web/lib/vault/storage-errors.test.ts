import {expect,test} from 'vitest';
import {PrivateStorageError,STORAGE_ERROR_CODES,asStorageError,isQuotaError,storageErrorCode,storageErrorMessage} from './storage-errors';

// QA-03: the stable codes a UI can map, and plain messages that say what to do.
test('quota refusals are recognised in every browser form and anywhere in the cause chain',()=>{
 for(const error of [new DOMException('The quota has been exceeded.','QuotaExceededError'),new DOMException('Persistent storage maximum size reached','NS_ERROR_DOM_QUOTA_REACHED'),Object.assign(new Error('x'),{name:'QuotaExceededError'}),Error('wrapped',{cause:new DOMException('full','QuotaExceededError')})]){
  expect(isQuotaError(error)).toBe(true);expect(storageErrorCode(error)).toBe('STORAGE_FULL');
 }
 for(const error of [Error('Private data is damaged.'),new DOMException('denied','SecurityError'),new DOMException('aborted','AbortError'),null,undefined,'QuotaExceededError'])expect(isQuotaError(error)).toBe(false);
 // A DOMException's numeric code is not one of these codes.
 expect(storageErrorCode(new DOMException('denied','SecurityError'))).toBeNull();
});
test('each code has a plain message that says what to do; the code survives wrapping',()=>{
 for(const code of STORAGE_ERROR_CODES)for(const durable of [false,true]){
  const error=new PrivateStorageError(code,{durable}),message=storageErrorMessage(code,{durable});
  expect(error.code).toBe(code);expect(error.message).toBe(message);expect(message).toMatch(/nothing was changed/);expect(message).not.toMatch(/^Try again/);
  expect(storageErrorCode(Error('outer',{cause:error}))).toBe(code);
 }
 expect(storageErrorMessage('STORAGE_FULL')).toMatch(/^Your browser storage is full .*transactional storage/);
 expect(storageErrorMessage('MODULE_LIMIT')).toMatch(/2 MB/);expect(storageErrorMessage('MODULE_LIMIT',{durable:true})).toMatch(/32 MB/);
 expect(storageErrorMessage('NEWER_VERSION')).toMatch(/newer version/);expect(storageErrorMessage('CONFLICT')).toMatch(/changed on another tab or device/);
});
test('only a quota refusal is converted; every other error passes through unchanged',()=>{
 const quota=new DOMException('The quota has been exceeded.','QuotaExceededError'),converted=asStorageError(quota) as PrivateStorageError;
 expect(converted).toBeInstanceOf(PrivateStorageError);expect(converted.code).toBe('STORAGE_FULL');expect(converted.cause).toBe(quota);
 const other=Error('Private data is damaged. Original data was preserved.'),coded=new PrivateStorageError('CONFLICT');
 expect(asStorageError(other)).toBe(other);expect(asStorageError(coded)).toBe(coded);
});
