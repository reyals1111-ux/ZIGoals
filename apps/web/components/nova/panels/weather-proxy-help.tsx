import {MET_LICENCE_URL} from '../../../lib/nova/world/met';

/**
 * Session AM-2 (owner's step 4a): Help's answer to "What does NOVA's weather send, and to whom?" in a build that asks
 * the weather through ZIGoals' weather proxy (lib/nova/world/proxy.ts). Shown instead of the direct-to-MET-Norway
 * paragraphs, which stay word for word for every build without a proxy (components/help/help-page.tsx).
 */
export function WeatherProxyHelp() {
  return <>
    <p>When it is on, and only while a weather widget is on NOVA&rsquo;s stage (or, on a phone, when you ask NOVA about the weather) and the page is visible, your browser asks ZIGoals&rsquo; weather proxy for the forecast at that place, rounded to two decimals (about 1 km), and the proxy asks MET Norway. The proxy sees your network (IP) address and that rounded place; it uses the address only to count requests for a minute and keeps no log of either. MET Norway sees the proxy&rsquo;s address and that rounded place, never yours (<a className="text-link" href="https://www.met.no/en/About-us/privacy" target="_blank" rel="noopener noreferrer">MET Norway&rsquo;s privacy statement</a>; it opens in a new tab). No account, no key, no cookie, no other data. If the proxy does not answer, the last reading stays: your browser never asks MET Norway directly instead. At most one request per place per 10 minutes, and not before the previous reading&rsquo;s expiry time.</p>
    <p>The last reading (temperatures, symbols) is kept on this device only; it is in Export everything, restore and erase, and may also sit in your browser&rsquo;s own cache until it expires. Sunrise and sunset are worked out on this device; nothing is asked for them. Credit: Data from MET Norway, licence <a className="text-link" href={MET_LICENCE_URL} target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. A connected AI model can read the reading this device already holds only through NOVA&rsquo;s weather lookup: the place&rsquo;s name and the reading, which then go to that model like the rest of the answer (to a cloud provider when the model is one and the privacy mode is Guarded or Relaxed). It can ask for the weather widget, which follows your switch and the ten-minute rule; it cannot turn weather on or choose the place.</p>
  </>;
}
