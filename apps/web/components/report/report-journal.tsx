import type {JournalReportSection} from '../../lib/journal/report';
import {ENERGY_WORDS} from '../../lib/energy/schema';
import {formatDate} from '../../lib/visual-format';

/**
 * Session AV lane 2 (journal; LEDGER #177, Daylio's PDF export): the report's Journal section — each entry's day, its
 * words as written, its tags and journal, and that day's feeling word and energy. Shown only when the person included it.
 */
export function ReportJournal({section: s}: {section: JournalReportSection}) {
  return <section className="report-section" aria-labelledby="report-journal"><h2 id="report-journal">Journal</h2>
    {s.rows.length ? <>
      <p>The person&rsquo;s own journal entries in these dates ({s.days === 1 ? '1 day' : `${s.days} days`}), as written, included by their choice. With each, that day&rsquo;s feeling word and energy (1–5) from their check-in.</p>
      <ol className="report-journal-list">{s.rows.map((r, i) => <li key={`${r.date}-${i}`}>
        <p className="report-journal-head"><strong>{formatDate(r.date, {weekday: true})}</strong>{r.journal ? ` · ${r.journal}` : ''}{r.feeling ? ` · feeling: ${r.feeling}` : ''}{r.energy ? ` · energy ${r.energy} of 5 (${ENERGY_WORDS.en[r.energy - 1]})` : ''}{r.tags.length ? ` · ${r.tags.map(t => `#${t}`).join(' ')}` : ''}</p>
        <p className="report-note report-journal-text">{r.text}</p>
      </li>)}</ol>
      {s.more > 0 && <p className="report-more">{s.more} more journal entries in these dates are not listed here.</p>}
    </> : <p className="report-none">No journal entry in these dates.</p>}
  </section>;
}
