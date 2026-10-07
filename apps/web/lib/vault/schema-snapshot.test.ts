import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import {z} from 'zod';
import {healthV1Schema,healthV2Schema,healthV3Schema,healthV4Schema} from '../health';
import {dashboardSettingsV1Schema,dashboardSettingsV2Schema,dashboardSettingsV3Schema} from '../dashboard-settings';
import {platformR4Schema,platformSchema} from '../positions';
import {W_DEVICE_RECORDS} from '../w-device-records';
import {linkTokensSchema,sealedTokensSchema} from '../links/token-store';

// Session W ([TIER 3] (data formats)): a stored format, once a build has shipped it, is never edited in place: a newer
// version gets its own variant and an older build's reader stays exactly as it was (the "old reads new" proofs depend on
// it). Each format's JSON Schema (zod's own, of what it accepts) is pinned here by digest, so an in-place edit of a shared
// sub-schema (a widget kind, a milestone, a Health measure) fails this test and must be made as a new variant instead.
// Refinements are not part of a JSON Schema; read-support.test.ts and w-formats.test.ts prove those. Session W's own
// formats are pinned too: frozen once this release ships. A deliberate change updates the digest with the reason.
const digest=(schema:z.ZodType)=>createHash('sha256').update(JSON.stringify(z.toJSONSchema(schema,{io:'input',unrepresentable:'any'}))).digest('hex').slice(0,16);
const formats=()=>({
 // Read by builds #29–#31 (and written by them): frozen.
 healthV1:healthV1Schema,healthV2:healthV2Schema,healthV3:healthV3Schema,settingsV1:dashboardSettingsV1Schema,settingsV2:dashboardSettingsV2Schema,financeUpToV4:platformR4Schema,
 // Session W: Health v4 and settings v3 (written lazily), finance up to v5 (v5 read only), the new device keys and the sealed sign-ins.
 healthV4:healthV4Schema,settingsV3:dashboardSettingsV3Schema,financeUpToV5:platformSchema,
 ...Object.fromEntries(W_DEVICE_RECORDS.map(r=>[r.key,r.schema as z.ZodType])),sealedTokens:sealedTokensSchema,linkTokens:linkTokensSchema,
});
test('every stored format keeps its exact shape: frozen formats are never edited in place',()=>{
 const digests=Object.fromEntries(Object.entries(formats()).map(([name,schema])=>[name,digest(schema)]));
 expect(digests).toEqual(PINNED);
});
// The six frozen digests were computed on main 1063765 (build #31's source) and match it exactly.
const PINNED:Record<string,string>={
 healthV1:'4f012554ab06cc2d',healthV2:'f1fc52b81e051a32',healthV3:'c0e99e92466900b4',settingsV1:'23fcddab107b3562',settingsV2:'877b0320b09fb45c',financeUpToV4:'eb9f65f69e79116f',
 // settingsV3 changed once before release (Part 2): the start page may be null, "the first visible page", so going back
 // to the default is a stamped choice and never a removed field.
 healthV4:'455f6da054cb6283',settingsV3:'56015aeff797bcfd',financeUpToV5:'50bcf2649624cc9a',
 'zigoals:accounts:v1':'21a5e54328d5723e','zigoals:milestone-dates:v1':'74b8ea8b146676ba','zigoals:import-batches:v1':'1f0a78c0ed1e727a','zigoals:w-reminders:v1':'702e9ab316452c5d','zigoals:chess-cache:v1':'ff4262623e661fdb',
 'zigoals:celebrations:v1':'53b29196b9f2d565','zigoals:meditation-run:v1':'5576a01e3663dd5d','zigoals:music:v1':'ea64d4e5de4d9bc5','zigoals:pages-view:v1':'4bda2bc62ed77a00',
 sealedTokens:'a6b6e1969c31ae6e',linkTokens:'b1786a60879c3742',
};
