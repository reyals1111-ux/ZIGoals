'use client';
import {useCallback} from 'react';
import {localDate} from '../../../lib/local-date';
import {NOVA_SETUP, recordCheck, unmarkStep, type SetupStepId} from '../../../lib/nova/setup';
import type {CheckResult} from '../../../lib/nova/setup-checks';
import {useDeviceRecord} from '../../ai/use-device-record';

/** The guide's record in a component (`zigoals:nova-setup:v1`, read through the app storage like every ZIGi record). */
export function useSetup() {
  const record = useDeviceRecord(NOVA_SETUP);
  const save = useCallback((id: SetupStepId, result: CheckResult) => record.update(r => recordCheck(r, id, result, new Date(), localDate())), [record]);
  const reopen = useCallback((id: SetupStepId) => record.update(r => unmarkStep(r, id)), [record]);
  return {record, save, reopen};
}
export type SetupState = ReturnType<typeof useSetup>;
