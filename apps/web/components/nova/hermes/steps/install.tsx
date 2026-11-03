'use client';
import {useState} from 'react';
import {INSTALL_NOTE, installSteps} from '../../../../lib/nova/hermes-guide';
import {hermesVersionIn} from '../../../../lib/nova/hermes-record';
import {GuideSteps} from '../../setup/steps/brain';
import {HermesCheck} from '../hermes-check';
import {OsChoice, useOs} from '../os-choice';
import type {HermesState} from '../use-hermes';

/** Planet 2: install Hermes per OS; the check reads what `hermes --version` printed (pasted by the person; nothing else is read). */
export default function InstallStep({hermes}: {hermes: HermesState}) {
  const [os, setOs] = useOs(), [output, setOutput] = useState('');
  return <>
    <OsChoice os={os} onChange={setOs}/>
    {os === 'mac' && <p className="fine">Hermes’s installer is for Macs with Apple silicon.</p>}
    <GuideSteps steps={installSteps(os)}/>
    <p className="fine">{INSTALL_NOTE}</p>
    <label className="field">Paste what “hermes --version” printed<textarea rows={2} value={output} maxLength={2000} onChange={e => setOutput(e.target.value)} spellCheck={false}/></label>
    <HermesCheck id="install" hermes={hermes} disabled={!output.trim()} label="Check the version"
      run={() => { const v = hermesVersionIn(output); return v ? {ok: true, note: `Hermes Agent ${v} is installed.`} : {ok: false, note: 'That is not the output of “hermes --version”. Open a new terminal window and run it again.'}; }}/>
  </>;
}
