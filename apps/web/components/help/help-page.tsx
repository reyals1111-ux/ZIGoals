import Link from 'next/link';
import {PageHeader} from '../page-header';
import {InstallGuide} from './install-guide';
import {KeepData} from './keep-data';
import './help.css';

/**
 * Help (Session L): plain answers for the friends Alpha. Static text plus two small client parts (the install guide
 * and "Keep my data on this device"). It makes no request and writes nothing on view.
 */
export function HelpPage() {
  return <div className="help-page">
    <PageHeader titleId="help-title" eyebrow="Help & guides" title="Help." lede="How ZIGoals keeps your plans, and how to get the most out of the Alpha."/>
    <p className="help-back"><Link className="text-link" href="/app/settings">← Back to Settings</Link></p>
    <nav className="help-topics" aria-label="Help topics">
      <a href="#install">Install on iPhone</a>
    </nav>
    <section className="panel help-section" id="install" aria-labelledby="help-install">
      <p className="eyebrow">INSTALL ON IPHONE</p>
      <h2 id="help-install">Install ZIGoals on your iPhone</h2>
      <InstallGuide/>
      <h3>Before accounts open</h3>
      <p>Today your data lives only on this device. Installing ZIGoals and keeping its data on this device protect it. Accounts with encrypted sync are coming: you&rsquo;ll turn sync on once, and every device you unlock stays up to date automatically. A backup is only an optional extra safety net.</p>
      <h3>Keep my data on this device</h3>
      <KeepData/>
    </section>
  </div>;
}
