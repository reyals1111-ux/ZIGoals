import {expect,test} from 'vitest';
import {createBarcodeConfirmation} from './barcode-confirmation';

test('missing or invalid frames break a consecutive product-code confirmation',()=>{
 const confirm=createBarcodeConfirmation();
 expect(confirm('00000000')).toBeNull();
 expect(confirm('')).toBeNull();
 expect(confirm('00000000')).toBeNull();
 expect(confirm('https://example.test/qr')).toBeNull();
 expect(confirm('00000000')).toBeNull();
 expect(confirm('00000000')).toBe('00000000');
});
