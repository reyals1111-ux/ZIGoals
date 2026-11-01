'use client';
import {hermesStepCheck, hermesStepDone, type HermesStepId} from '../../../lib/nova/hermes-record';
import type {CheckResult} from '../../../lib/nova/setup-checks';
import {CheckRowBase} from '../setup/check-row';
import type {HermesState} from './use-hermes';

/** The Hermes guide's check row (`zigoals:nova-hermes:v1`). */
export function HermesCheck({id, hermes, run, label, disabled}: {id: HermesStepId; hermes: HermesState; run: () => Promise<CheckResult> | CheckResult; label?: string; disabled?: boolean}) {
  return <CheckRowBase id={`hermes-${id}`} last={hermesStepCheck(hermes.record.data, id)} done={hermesStepDone(hermes.record.data, id)} save={r => hermes.save(id, r)} reopen={() => hermes.reopen(id)} run={run} label={label} disabled={disabled}/>;
}
