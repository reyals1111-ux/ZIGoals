'use client';
import {useCallback} from 'react';
import {localDate} from '../../../lib/local-date';
import {NOVA_SETUP, recordCheck, showcaseCheck, unmarkStep, type SetupStepId} from '../../../lib/nova/setup';
import type {CheckResult} from '../../../lib/nova/setup-checks';
import {isShowcase} from '../../../lib/showcase-storage';
import {useDeviceRecord} from '../../ai/use-device-record';

/** The guide's record in a component (`zigoals:nova-setup:v1`, read through the app storage like every ZIGi record). */
export function useSetup() {
  const record = useDeviceRecord(NOVA_SETUP);
  // Session AL second pass (Professor PR-028, P-PR-13): in the Showcase a check read fictional records, and it says so.
  const save = useCallback((id: SetupStepId, result: CheckResult) => record.update(r => recordCheck(r, id, isShowcase() ? showcaseCheck(result) : result, new Date(), localDate())), [record]);
  const reopen = useCallback((id: SetupStepId) => record.update(r => unmarkStep(r, id)), [record]);
  return {record, save, reopen};
}
export type SetupState = ReturnType<typeof useSetup>;
