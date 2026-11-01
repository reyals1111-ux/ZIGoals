'use client';
import {useCallback} from 'react';
import {localDate} from '../../../lib/local-date';
import {NOVA_HERMES, recordHermesCheck, unmarkHermesStep, type HermesStepId} from '../../../lib/nova/hermes-record';
import type {CheckResult} from '../../../lib/nova/setup-checks';
import {useDeviceRecord} from '../../ai/use-device-record';

/** The Hermes guide's record in a component (`zigoals:nova-hermes:v1`). */
export function useHermes() {
  const record = useDeviceRecord(NOVA_HERMES);
  const save = useCallback((id: HermesStepId, result: CheckResult) => record.update(r => recordHermesCheck(r, id, result, new Date(), localDate())), [record]);
  const reopen = useCallback((id: HermesStepId) => record.update(r => unmarkHermesStep(r, id)), [record]);
  return {record, save, reopen};
}
export type HermesState = ReturnType<typeof useHermes>;
