'use client';
import Link from 'next/link';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {PRIVACY_WORDS} from '../../../lib/nova/privacy-mode';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CardFoot, Fact, type CardProps} from '../cards/kit';
import {HoloReading} from '../holo/parts';
import {useBrain} from '../status-chips';
import '../cards/nova-cards.css';

/**
 * Session AM (ADR-038 D6): "NOVA's brain" — what answers right now, in plain words: on-device answers (no AI at all), a
 * model on this computer, the person's own key, their Hermes Agent or Chrome's on-device model, with the privacy mode
 * that decides what may leave the device. It reads the engine's own settings; it never tests or calls anything.
 */
const KIND_WORDS = {
  none: {title: 'On-device answers', text: 'Answers and widgets come from your own records on this device. No AI is used and nothing is sent.'},
  local: {title: 'A model on this computer', text: 'Your own local model answers. Nothing leaves this computer.'},
  hermes: {title: 'Your Hermes Agent', text: 'Your own agent answers, on your computer.'},
  device: {title: 'Chrome’s on-device model', text: 'The model built into this browser answers, on this device.'},
  cloud: {title: 'Your own key', text: 'The provider you chose answers, straight from this device with your key, under your privacy mode.'},
  app: {title: 'Your AI app', text: 'You carry the words to your own AI app yourself.'},
  hosted: {title: 'ZIGoals hosted', text: 'ZIGi’s hosted answers are on. NOVA itself answers with your own model or on this device.'},
} as const;
export default function NovaBrainWidget({size = 'S'}: Partial<CardProps>) {
  const {brain, loaded} = useBrain(), setup = useDeviceRecord(NOVA_SETUP);
  if (!loaded || !setup.loaded) return <HoloReading/>;
  const words = KIND_WORDS[brain.kind], mode = setup.unreadable ? null : setup.data.privacyMode ?? null;
  return <div className="nc-body nc-brain">
    <div className="nc-brain-head">
      <span className="nc-brain-dot" data-on={brain.kind !== 'none' || undefined} aria-hidden="true"/>
      <div><p className="nc-brain-title">{words.title}</p><p className="nc-brain-words">{brain.kind === 'none' ? 'No AI connected' : brain.words}</p></div>
    </div>
    {size !== 'S' && <p className="nc-brain-text">{words.text}</p>}
    <div className="nc-facts">
      <Fact label="Privacy mode" value={mode ? PRIVACY_WORDS[mode].label : 'Not chosen yet'}/>
      {size === 'L' && mode && <p className="nc-brain-text">{PRIVACY_WORDS[mode].what}</p>}
    </div>
    {brain.kind === 'none' && <Link className="nc-action" href="/app/nova/setup" prefetch={false}>Give NOVA a brain<span aria-hidden="true"> →</span></Link>}
    <CardFoot source="This device’s settings" asOf="now"/>
  </div>;
}
