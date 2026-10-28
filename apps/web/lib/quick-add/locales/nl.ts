import type {QuickAddLocale} from '../types';

/**
 * Session AI (J10): the Dutch grammar of the Quick-add line, the second table the parser was designed for (en.ts). The
 * stems map Dutch verbs to the English words habit titles usually carry ("gemediteerd" → meditate), so "10 minuten
 * gemediteerd" finds the habit Meditate; a Dutch habit title is matched by its own words as in English.
 */
export const nl: QuickAddLocale = {
  numbers: {een: 1, één: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17, achttien: 18, negentien: 19, twintig: 20, half: 0.5, halve: 0.5, paar: 2},
  units: {
    glas: 'glass', glazen: 'glass', glaasje: 'glass', glaasjes: 'glass', kop: 'glass', kopje: 'glass', kopjes: 'glass', bekers: 'glass', beker: 'glass',
    ml: 'ml', milliliter: 'ml', l: 'l', liter: 'l', liters: 'l',
    kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', pond: 'lb',
    stap: 'steps', stappen: 'steps',
    km: 'km', kilometer: 'km', kilometers: 'km', mijl: 'mi',
    min: 'min', minuut: 'min', minuten: 'min', minuutjes: 'min',
    u: 'h', uur: 'h', uren: 'h', uurtje: 'h',
  },
  verbs: {
    gedronken: 'water', drink: 'water', drinken: 'water', dronk: 'water', water: 'water',
    gewicht: 'weight', weeg: 'weight', woog: 'weight', gewogen: 'weight',
    gewandeld: 'walk', wandelen: 'walk', wandeling: 'walk', liep: 'walk', gelopen: 'walk', stappen: 'walk',
    hardgelopen: 'run', hardlopen: 'run', gerend: 'run', rennen: 'run', gejogd: 'run', joggen: 'run',
    gefietst: 'cycle', fietsen: 'cycle', fietste: 'cycle',
    gezwommen: 'swim', zwemmen: 'swim', zwom: 'swim',
    geslapen: 'sleep', slaap: 'sleep', sliep: 'sleep',
  },
  dayWords: {vandaag: 'today', gisteren: 'yesterday'},
  stems: {gemediteerd: 'meditate', mediteren: 'meditate', gelezen: 'read', lezen: 'read', gesport: 'exercise', sporten: 'exercise', getraind: 'exercise', gestretcht: 'stretch', rekken: 'stretch', gerekt: 'stretch', gestudeerd: 'study', studeren: 'study', geoefend: 'practice', oefenen: 'practice', gewandeld: 'walk'},
  fillers: ['van', 'voor', 'in', 'de', 'het', 'een', 'mijn', 'heb', 'ik', 'wat', 'aan', 'ben', 'gedaan'],
  conjunctions: ['en', '&', 'dan', 'plus'],
  examples: ['2 glazen water gedronken', 'gewicht 78,4', '5 km hardgelopen in 28 min'],
};
