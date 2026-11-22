import {addOwnCategory, allCategories, removeOwnCategory} from './counted';
import {addSub, removeSub, subsOf} from '../money-more/quick';
import {MAX_OWN_CATEGORIES, MAX_SUBS, type MoneyEntry, type MoneyLog} from './schema';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's category template library, LEDGER #347): four written starter sets —
 * a student, a household, a freelancer and a traveller — each a list of own categories and subcategories (under the usual
 * categories or the set's own), in English and in Dutch. Previewed, then added in one tap through the money log's own
 * `addOwnCategory` and `addSub`, so the usual limits hold (30 own categories of a kind, 20 subcategories each). Nothing
 * already there is changed: a category or subcategory that exists (in any case) is skipped, and an archived one stays
 * archived. Written for ZIGoals; nothing from other people. Pure.
 */
export type StarterLang = 'en' | 'nl';
type Words = {en: string; nl: string};
type StarterCategory = {kind: MoneyEntry['kind']; name: Words; subs: Words[]; own: boolean};
export type StarterSet = {id: 'student' | 'household' | 'freelancer' | 'traveller'; title: Words; about: Words; categories: StarterCategory[]};
const w = (en: string, nl: string): Words => ({en, nl});
/** A subcategory list under one of the usual categories (the name kept in English, as the usual categories are). */
const under = (category: string, subs: Words[], kind: MoneyEntry['kind'] = 'expense'): StarterCategory => ({kind, name: w(category, category), subs, own: false});
const own = (name: Words, subs: Words[] = [], kind: MoneyEntry['kind'] = 'expense'): StarterCategory => ({kind, name, subs, own: true});

export const STARTER_SETS: readonly StarterSet[] = [
  {id: 'student', title: w('A student', 'Een student'), about: w('Study costs, a room and a side job.', 'Studiekosten, een kamer en een bijbaan.'), categories: [
    own(w('Study', 'Studie'), [w('Books', 'Boeken'), w('Tuition', 'Collegegeld'), w('Supplies', 'Spullen'), w('Printing', 'Printen')]),
    under('Home', [w('Room rent', 'Kamerhuur'), w('Furniture', 'Meubels')]),
    under('Food & drink', [w('Canteen', 'Kantine'), w('Coffee', 'Koffie'), w('Takeaway', 'Afhaal')]),
    under('Transport', [w('Bike', 'Fiets'), w('Public transport', 'Openbaar vervoer')]),
    under('Fun', [w('Going out', 'Uitgaan'), w('Sport', 'Sport')]),
    own(w('Student grant', 'Studiefinanciering'), [], 'income'), own(w('Side job', 'Bijbaan'), [], 'income'),
  ]},
  {id: 'household', title: w('A household', 'Een huishouden'), about: w('A home, children and pets, the bills that come each month.', 'Een huis, kinderen en huisdieren, de vaste lasten van elke maand.'), categories: [
    under('Home', [w('Rent or mortgage', 'Huur of hypotheek'), w('Repairs', 'Reparaties'), w('Garden', 'Tuin'), w('Furniture', 'Meubels')]),
    under('Bills', [w('Energy', 'Energie'), w('Water', 'Water'), w('Internet and phone', 'Internet en telefoon'), w('Insurance', 'Verzekeringen'), w('Local taxes', 'Gemeentelijke belastingen')]),
    under('Groceries', [w('Supermarket', 'Supermarkt'), w('Market', 'Markt'), w('Drugstore', 'Drogist')]),
    own(w('Children', 'Kinderen'), [w('Childcare', 'Opvang'), w('School', 'School'), w('Clothes', 'Kleding'), w('Pocket money', 'Zakgeld')]),
    own(w('Pets', 'Huisdieren'), [w('Food', 'Voer'), w('Vet', 'Dierenarts')]),
    own(w('Car', 'Auto'), [w('Fuel', 'Brandstof'), w('Service', 'Onderhoud'), w('Parking', 'Parkeren')]),
    own(w('Child benefit', 'Kinderbijslag'), [], 'income'),
  ]},
  {id: 'freelancer', title: w('A freelancer', 'Een zzp’er'), about: w('Work costs kept apart from your own, and income by client.', 'Werkkosten apart van je eigen uitgaven, en inkomsten per opdracht.'), categories: [
    own(w('Work costs', 'Werkkosten'), [w('Software', 'Software'), w('Equipment', 'Apparatuur'), w('Workspace', 'Werkplek'), w('Work travel', 'Zakelijke reizen'), w('Courses', 'Cursussen')]),
    own(w('Taxes and fees', 'Belastingen en heffingen'), [w('Income tax', 'Inkomstenbelasting'), w('VAT', 'Btw'), w('Accountant', 'Boekhouder')]),
    own(w('Business insurance', 'Zakelijke verzekeringen'), [w('Liability', 'Aansprakelijkheid'), w('Disability', 'Arbeidsongeschiktheid')]),
    under('Freelance', [w('Projects', 'Projecten'), w('Retainers', 'Vaste opdrachten')], 'income'),
    own(w('Royalties', 'Royalty’s'), [], 'income'),
  ]},
  {id: 'traveller', title: w('A traveller', 'Een reiziger'), about: w('Trips as their own categories: getting there, staying and doing.', 'Reizen als eigen categorieën: erheen, verblijven en doen.'), categories: [
    own(w('Travel', 'Reizen'), [w('Flights', 'Vluchten'), w('Trains and buses', 'Treinen en bussen'), w('Stays', 'Verblijf'), w('Tours and tickets', 'Tours en kaartjes')]),
    own(w('Travel admin', 'Reispapieren'), [w('Visas', 'Visa'), w('Travel insurance', 'Reisverzekering'), w('Bank fees abroad', 'Bankkosten in het buitenland')]),
    under('Food & drink', [w('Street food', 'Straatvoedsel'), w('Restaurants', 'Restaurants')]),
    under('Transport', [w('Local transport', 'Lokaal vervoer'), w('Car hire', 'Huurauto')]),
    under('Shopping', [w('Souvenirs', 'Souvenirs')]),
  ]},
];
export const starterSet = (id: string) => STARTER_SETS.find(s => s.id === id) ?? null;

export type StarterAdded = {own: {kind: MoneyEntry['kind']; name: string}[]; subs: {category: string; name: string}[]};
export type StarterResult = {log: MoneyLog; categories: number; subs: number; skipped: number; full: number; added: StarterAdded};
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
/**
 * The set added to the log in one language: its own categories first, then each subcategory under its category. A name
 * that is already there (as a category, an archived one, or a subcategory) is skipped; one past a limit is counted in
 * `full`. Returns the log and the counts, so the page says what was added.
 */
export function applyStarterSet(log: MoneyLog, set: StarterSet, lang: StarterLang): StarterResult {
  let next = log, categories = 0, subs = 0, skipped = 0, full = 0;
  const added: StarterAdded = {own: [], subs: []};
  for (const c of set.categories) {
    const name = c.name[lang], kind = c.kind;
    const there = allCategories(next, kind).find(x => same(x, name));
    if (!there) {
      const count = ((kind === 'expense' ? next.own?.expense : next.own?.income) ?? []).length;
      if (count >= MAX_OWN_CATEGORIES) { full += 1 + c.subs.length; continue; }
      next = addOwnCategory(next, kind, name); categories++; added.own.push({kind, name});
    } else if (c.own) skipped++;
    const parent = allCategories(next, kind).find(x => same(x, name)) ?? name;
    for (const sub of c.subs) {
      const sn = sub[lang];
      if (subsOf(next, parent).some(x => same(x, sn))) { skipped++; continue; }
      if (subsOf(next, parent).length >= MAX_SUBS) { full++; continue; }
      try { next = addSub(next, parent, sn); subs++; added.subs.push({category: parent, name: sn}); } catch { full++; }
    }
  }
  return {log: next, categories, subs, skipped, full, added};
}
/** Undo of a set: takes out exactly what it added (a name added or changed since stays as it is now). */
export function removeStarterAdds(log: MoneyLog, added: StarterAdded): MoneyLog {
  let next = log;
  for (const s of added.subs) next = removeSub(next, s.category, s.name);
  for (const c of added.own) next = removeOwnCategory(next, c.kind, c.name);
  return next;
}
/** What the preview lists: each category of the set, whether it is new here, and its subcategories that are new. */
export function previewStarterSet(log: MoneyLog, set: StarterSet, lang: StarterLang): {name: string; kind: MoneyEntry['kind']; isNew: boolean; subs: {name: string; isNew: boolean}[]}[] {
  return set.categories.map(c => {
    const name = c.name[lang], parent = allCategories(log, c.kind).find(x => same(x, name));
    return {name, kind: c.kind, isNew: !parent, subs: c.subs.map(s => ({name: s[lang], isNew: !parent || !subsOf(log, parent).some(x => same(x, s[lang]))}))};
  });
}
