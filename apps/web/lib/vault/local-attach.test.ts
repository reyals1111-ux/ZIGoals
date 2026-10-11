import {test,expect} from 'vitest';
import {planLocalAttach,assertAttachSourceUnchanged} from './local-attach';
import {modules} from './account-data';
import {presetSettings} from '../dashboard-settings';
import {createEmptyHealth} from '../health';
import {addWater} from '../health-daily';
import {encryptBackup,decryptBackup} from './backup';
const prefs=JSON.stringify(presetSettings('health'));
const emptyPrefs=JSON.stringify(modules.settings.schema.parse(modules.settings.empty()));
const health=JSON.stringify(addWater(createEmptyHealth(),{id:`health_${crypto.randomUUID()}`,date:'2026-09-23',amountMilli:250000,unit:'ml'},'2026-09-23T12:00:00Z'));
test('explicit selected sections preserve complete values and make a decryptable pre-attach snapshot',async()=>{
 const local={settings:prefs,health};
 const plan=planLocalAttach(local,{settings:emptyPrefs},{settings:emptyPrefs},['settings'],false);
 expect(plan.data).toEqual({settings:prefs});expect(plan.inventory[0]?.collections.widgets).toBe(4);
 const copy=await encryptBackup(plan.data);expect(await decryptBackup(copy.file,copy.recovery)).toEqual(plan.data);expect(copy.file).not.toContain('preset-health');expect(local).toEqual({settings:prefs,health});
});
test('a populated account or cloud section is never replaced even if the other is empty',()=>{
 for(const [account,remote]of [[{settings:prefs},{}],[{}, {settings:prefs}]] as const)expect(()=>planLocalAttach({settings:prefs},account,remote,['settings'],false)).toThrow('already contains');
 expect(()=>planLocalAttach({settings:prefs},{},{},[],false)).toThrow('Choose');
});
test('Health has separate opt-in and unselected domains are not read into the plan',()=>{
 expect(()=>planLocalAttach({health},{},{},['health'],false)).toThrow('Health');
 expect(planLocalAttach({health},{},{},['health'],true).data).toEqual({health});
 expect(planLocalAttach({settings:prefs,health:'not read'},{},{},['settings'],false).data).toEqual({settings:prefs});
});
test('late local edits cancel the reviewed copy without touching the original or preview',()=>{
 const plan=planLocalAttach({settings:prefs},{},{},['settings'],false);
 expect(()=>assertAttachSourceUnchanged(plan,{settings:emptyPrefs})).toThrow('changed');
 expect(()=>assertAttachSourceUnchanged(plan,{settings:prefs,health})).not.toThrow();
 expect(plan.data.settings).toBe(prefs);
});
