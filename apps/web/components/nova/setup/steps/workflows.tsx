'use client';
import {lazy, Suspense, useState} from 'react';
import {NOVA_WORKFLOWS, setupChecks} from '../../../../lib/nova/workflows/schema';
import {checkWorkflows} from '../../../../lib/nova/setup-checks';
import {LoadBoundary} from '../../../load-boundary';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {CheckRow} from '../check-row';
import type {SetupState} from '../use-setup';

const WorkflowsPanel = lazy(() => import('../../workflows/workflows-panel'));
/** Planet 9: run "Review my week" (lane ND's workflows, steps shown live, every write a confirm card) and save one of your own. */
export default function WorkflowsStep({setup}: {setup: SetupState}) {
  const record = useDeviceRecord(NOVA_WORKFLOWS), [open, setOpen] = useState(false);
  return <>
    <p>A workflow is a recipe NOVA follows step by step, on your records: you see each step as it runs, and nothing is written until you add a card. Run “Review my week”, then edit any template and save it as your own.</p>
    {!open ? <div className="ai-card-actions"><button type="button" className="primary" onClick={() => setOpen(true)}>Run “Review my week”</button></div>
      : <LoadBoundary label="Workflows"><Suspense fallback={<p className="ai-note" role="status">Opening workflows…</p>}><WorkflowsPanel start="review-week"/></Suspense></LoadBoundary>}
    <CheckRow id="workflows" setup={setup} run={() => checkWorkflows(setupChecks(record.data))} disabled={!record.loaded}/>
  </>;
}
