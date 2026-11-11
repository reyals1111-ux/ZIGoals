'use client';
import Link from 'next/link';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {PRIVACY_WORDS} from '../../../lib/nova/privacy-mode';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CardFoot, Fact, Gauge, type CardProps} from '../cards/kit';
import {HoloReading} from '../holo/parts';
import {useBrain} from '../status-chips';
import '../cards/nova-cards.css';

/**
 * Session AM (ADR-038 D6): "NOVA's brain" — what answers right now, in plain words: on-device answers (no AI at all), a
 * model on this computer, the person's own key, their Hermes Agent or Chrome's on-device model, with the privacy mode
 * that decides what may leave the device. It reads the engine's own settings; it never tests or calls anything.
 * AM-2: a status read-out — a core lamp inside a ring (lit and slowly orbited while a model is connected; an unlit,
 * dashed ring with a hollow lamp for on-device answers), the state in words, and the privacy mode as a row.
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
  // Design review AM-D20: each size holds what fits its box — S: what answers, in one line; M: its words and the privacy
  // mode; L: the privacy mode in words and the way to the setup guide (at S and M the head's own link opens it).
  return <div className="nc-body nc-brain" data-size={size}>
    <div className="nc-brain-head">
      <Gauge share={brain.kind === 'none' ? null : 1} size={size === 'S' ? 36 : size === 'L' ? 76 : 60} bezel={size !== 'S'} spin={brain.kind !== 'none'} decor className="nc-brain-core"><span className="nc-brain-dot" data-on={brain.kind !== 'none' || undefined}/></Gauge>
      <div><p className="nc-brain-title">{words.title}</p>{size !== 'S' && <p className="nc-brain-words">{brain.kind === 'none' ? 'No AI connected' : brain.words}</p>}</div>
    </div>
    {size !== 'S' && <p className="nc-brain-text">{words.text}</p>}
    {size !== 'S' && <div className="nc-facts">
      <Fact label="Privacy mode" value={mode ? PRIVACY_WORDS[mode].label : 'Not chosen yet'}/>
      {size === 'L' && mode && <p className="nc-brain-text">{PRIVACY_WORDS[mode].what}</p>}
    </div>}
    {size === 'L' && brain.kind === 'none' && <Link className="nc-action" href="/app/nova/setup" prefetch={false}>Give NOVA a brain<span aria-hidden="true"> →</span></Link>}
    <CardFoot source="This device’s settings" asOf="now"/>
  </div>;
}
