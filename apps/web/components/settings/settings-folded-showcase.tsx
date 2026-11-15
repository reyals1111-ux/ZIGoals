'use client';
import {useState} from 'react';

/** Session AP (D20): while "Your app" is folded, its summary carries Load Showcase Demo (only one is ever visible). */
export default function FoldedShowcase() {
  const [loading, setLoading] = useState(false);
  return <p className="settings-fold-quick"><button type="button" className="secondary" disabled={loading} onClick={() => { setLoading(true); void import('../../lib/showcase').then(m => m.loadShowcase()).then(() => import('../../lib/showcase-storage')).then(m => m.clearShowcasePhotos()).then(() => window.location.assign('/app'), () => setLoading(false)); }}>Load Showcase Demo</button></p>;
}
