'use client';
import {COMPARE_ROWS, DEFA_TAGS, NATIVE_TAGS, NAWA_TAGS, OROSWAP_TAGS, PERMAPOD_TAGS, ZIGNALY_TAGS, valdoraTags, vaultsTags, type CompareId, type GlanceTag} from '../../lib/earn/glance';
import type {FamilyData, LiveState} from '../../lib/earn/client';
import {SectionHeading} from '../ui/section-heading';
import {VALDORA_VAULTS} from './vaults-section';

type Live<K extends 'valdora' | 'vaults'> = LiveState<FamilyData[K]>;
/**
 * Session AL fifth pass (C-BN-07): the ways to earn that Earn lists, side by side in one table, in the page's own order
 * (the network's, never by rate): what each is, its "At a glance" labels (the same words and colours as its section,
 * from lib/earn/glance.ts, with Valdora's and the vaults' paused state from the same live reads), and where its risks are
 * read from, with a link to the section that has every risk and its source. Information, not advice: no column ranks, no
 * rate is compared here (rates move; each section has its own, with its source and time).
 */
export function CompareTable({valdora, vaults}: {valdora: Live<'valdora'>; vaults: Live<'vaults'>}) {
  const valdoraData = valdora.phase === 'ok' ? valdora.answer.data : null;
  const vaultRows = vaults.phase === 'ok' ? VALDORA_VAULTS.map(id => vaults.answer.data.vaults[id]) : [];
  const paused = vaultRows.some(v => v?.status === 'ok' && v.paused);
  const tags: Record<CompareId, readonly GlanceTag[]> = {
    'native-staking': NATIVE_TAGS, valdora: valdoraTags(valdoraData), 'valdora-vaults': vaultsTags(paused), oroswap: OROSWAP_TAGS,
    nawa: NAWA_TAGS, defa: DEFA_TAGS, permapod: PERMAPOD_TAGS, zignaly: ZIGNALY_TAGS,
  };
  return <section id="compare" className="earn-compare panel" aria-labelledby="compare-title">
    <SectionHeading id="compare-title" eyebrow="Side by side" title="The ways to earn, compared"
      lede="Each way to earn on this page in one table, in the network’s order, not by how much it pays: what it is, its labels, and where its risks are read from. Information, not advice; each section below has every risk with its source."/>
    {/* (The validators table's own look: a table on a computer, one card per way to earn on a phone.) */}
    <div className="earn-table-wrap" role="region" aria-label="The ways to earn side by side" tabIndex={0}>
      <table className="earn-table earn-compare-table" aria-labelledby="compare-title">
        <thead><tr><th scope="col">Way to earn</th><th scope="col">At a glance</th><th scope="col">Risks read from</th></tr></thead>
        <tbody>{COMPARE_ROWS.map(row => <tr key={row.id} data-compare={row.id}>
          <th scope="row" data-label="Way to earn"><a className="text-link" href={`#${row.id}`}>{row.name}</a><small>{row.what}</small></th>
          <td data-label="At a glance"><ul className="earn-tags" aria-label={`${row.name} at a glance`}>{tags[row.id].map(t => <li key={t.text} className="earn-tag" data-tone={t.tone}>{t.text}</li>)}</ul></td>
          <td data-label="Risks read from">{row.sources}. <a className="text-link" href={`#${row.id}`} aria-label={`Every risk of ${row.name}, with its source`}>Every risk</a></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
