import {addLocalDays} from '../local-date';
import {anniversaryIn} from './on-this-day';

/**
 * Session AK (BUILD list 2 #3): the Showcase's fictional "On this day" memories — journal entries written on the
 * Showcase day one and two years earlier, labelled like the rest of the fictional journal. The lead appends them to the
 * Showcase journal (lib/journal/showcase.ts entries; ids never clash with `showcase-journal-<n>`).
 */
export function showcaseOnThisDayEntries(day: string): {id: string; date: string; text: string; createdAt: string}[] {
  const year = Number(day.slice(0, 4));
  const rows: [number, string][] = [
    [1, 'First evening of the pottery class. My bowl came out lopsided, and I loved it. Writing it down so I remember the start.'],
    [2, 'Moved into the flat today. Boxes everywhere, pizza on the floor, and a happy kind of quiet.'],
  ];
  return rows.map(([years, text]) => {
    const date = anniversaryIn(day, year - years) ?? addLocalDays(day, -365 * years);
    return {id: `showcase-on-this-day-${years}`, date, text: `${text} (SHOWCASE DATA)`, createdAt: `${date}T20:00:00.000Z`};
  });
}
