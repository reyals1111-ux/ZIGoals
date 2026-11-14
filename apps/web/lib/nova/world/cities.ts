import {round2, type WorldPlace} from './record';

/**
 * Session AM (ADR-038 D14): the place without a geocoder. The cities below ship with the app (this module is loaded on
 * use); the person picks one or types coordinates, and no geocoding service is ever called. Each row is
 * `[name, country, latitude, longitude]`, the position of the city's centre at two decimals (about 1 km, the precision
 * that is stored and sent, D13). Every capital of Europe, the largest cities of every continent, and the largest cities
 * of Belgium and the Netherlands. A wrong position is a wrong forecast: a city is only here with a checked position.
 */
export type CityRow = readonly [name: string, country: string, lat: number, lon: number];
export type City = WorldPlace & {country: string};

export const CITIES: readonly CityRow[] = [
  // Belgium
  ['Brussels', 'Belgium', 50.85, 4.35], ['Antwerp', 'Belgium', 51.22, 4.40], ['Ghent', 'Belgium', 51.05, 3.72], ['Charleroi', 'Belgium', 50.41, 4.44],
  ['Liège', 'Belgium', 50.63, 5.57], ['Bruges', 'Belgium', 51.21, 3.22], ['Namur', 'Belgium', 50.47, 4.87], ['Leuven', 'Belgium', 50.88, 4.70],
  ['Mons', 'Belgium', 50.45, 3.95], ['Aalst', 'Belgium', 50.94, 4.04], ['Mechelen', 'Belgium', 51.03, 4.48], ['La Louvière', 'Belgium', 50.48, 4.19],
  ['Hasselt', 'Belgium', 50.93, 5.34], ['Kortrijk', 'Belgium', 50.83, 3.26], ['Sint-Niklaas', 'Belgium', 51.16, 4.14], ['Ostend', 'Belgium', 51.23, 2.92],
  ['Tournai', 'Belgium', 50.61, 3.39], ['Genk', 'Belgium', 50.97, 5.50],
  // The Netherlands
  ['Amsterdam', 'Netherlands', 52.37, 4.90], ['Rotterdam', 'Netherlands', 51.92, 4.48], ['The Hague', 'Netherlands', 52.08, 4.31], ['Utrecht', 'Netherlands', 52.09, 5.12],
  ['Eindhoven', 'Netherlands', 51.44, 5.48], ['Groningen', 'Netherlands', 53.22, 6.57], ['Tilburg', 'Netherlands', 51.56, 5.09], ['Almere', 'Netherlands', 52.37, 5.22],
  ['Breda', 'Netherlands', 51.59, 4.78], ['Nijmegen', 'Netherlands', 51.84, 5.86], ['Arnhem', 'Netherlands', 51.98, 5.91], ['Haarlem', 'Netherlands', 52.38, 4.64],
  ['Enschede', 'Netherlands', 52.22, 6.90], ['Apeldoorn', 'Netherlands', 52.21, 5.97], ['Amersfoort', 'Netherlands', 52.16, 5.39], ['Maastricht', 'Netherlands', 50.85, 5.69],
  ['\'s-Hertogenbosch', 'Netherlands', 51.70, 5.30], ['Zwolle', 'Netherlands', 52.52, 6.09], ['Leiden', 'Netherlands', 52.16, 4.49],
  // Europe: the other capitals
  ['Andorra la Vella', 'Andorra', 42.51, 1.52], ['Ankara', 'Türkiye', 39.93, 32.86], ['Athens', 'Greece', 37.98, 23.73], ['Baku', 'Azerbaijan', 40.38, 49.87],
  ['Belgrade', 'Serbia', 44.82, 20.46], ['Berlin', 'Germany', 52.52, 13.40], ['Bern', 'Switzerland', 46.95, 7.45], ['Bratislava', 'Slovakia', 48.15, 17.11],
  ['Bucharest', 'Romania', 44.43, 26.10], ['Budapest', 'Hungary', 47.50, 19.04], ['Chișinău', 'Moldova', 47.01, 28.86], ['Copenhagen', 'Denmark', 55.68, 12.57],
  ['Dublin', 'Ireland', 53.35, -6.26], ['Helsinki', 'Finland', 60.17, 24.94], ['Kyiv', 'Ukraine', 50.45, 30.52], ['Lisbon', 'Portugal', 38.72, -9.14],
  ['Ljubljana', 'Slovenia', 46.05, 14.51], ['London', 'United Kingdom', 51.51, -0.13], ['Luxembourg', 'Luxembourg', 49.61, 6.13], ['Madrid', 'Spain', 40.42, -3.70],
  ['Minsk', 'Belarus', 53.90, 27.57], ['Monaco', 'Monaco', 43.73, 7.42], ['Moscow', 'Russia', 55.75, 37.62], ['Nicosia', 'Cyprus', 35.17, 33.37],
  ['Oslo', 'Norway', 59.91, 10.75], ['Paris', 'France', 48.86, 2.35], ['Podgorica', 'Montenegro', 42.44, 19.26], ['Prague', 'Czechia', 50.09, 14.42],
  ['Pristina', 'Kosovo', 42.66, 21.17], ['Reykjavik', 'Iceland', 64.15, -21.94], ['Riga', 'Latvia', 56.95, 24.11], ['Rome', 'Italy', 41.90, 12.50],
  ['San Marino', 'San Marino', 43.94, 12.45], ['Sarajevo', 'Bosnia and Herzegovina', 43.86, 18.41], ['Skopje', 'North Macedonia', 42.00, 21.43], ['Sofia', 'Bulgaria', 42.70, 23.32],
  ['Stockholm', 'Sweden', 59.33, 18.07], ['Tallinn', 'Estonia', 59.44, 24.75], ['Tbilisi', 'Georgia', 41.69, 44.80], ['Tirana', 'Albania', 41.33, 19.82],
  ['Vaduz', 'Liechtenstein', 47.14, 9.52], ['Valletta', 'Malta', 35.90, 14.51], ['Vatican City', 'Vatican City', 41.90, 12.45], ['Vienna', 'Austria', 48.21, 16.37],
  ['Vilnius', 'Lithuania', 54.69, 25.28], ['Warsaw', 'Poland', 52.23, 21.01], ['Yerevan', 'Armenia', 40.18, 44.51], ['Zagreb', 'Croatia', 45.81, 15.98],
  // Europe: other large cities
  ['Barcelona', 'Spain', 41.39, 2.17], ['Valencia', 'Spain', 39.47, -0.38], ['Seville', 'Spain', 37.39, -5.98], ['Porto', 'Portugal', 41.15, -8.61],
  ['Milan', 'Italy', 45.46, 9.19], ['Naples', 'Italy', 40.85, 14.27], ['Turin', 'Italy', 45.07, 7.69], ['Florence', 'Italy', 43.77, 11.26], ['Venice', 'Italy', 45.44, 12.33],
  ['Munich', 'Germany', 48.14, 11.58], ['Hamburg', 'Germany', 53.55, 9.99], ['Frankfurt', 'Germany', 50.11, 8.68], ['Cologne', 'Germany', 50.94, 6.96],
  ['Stuttgart', 'Germany', 48.78, 9.18], ['Düsseldorf', 'Germany', 51.23, 6.78], ['Zurich', 'Switzerland', 47.37, 8.54], ['Geneva', 'Switzerland', 46.20, 6.14],
  ['Lyon', 'France', 45.76, 4.84], ['Marseille', 'France', 43.30, 5.37], ['Lille', 'France', 50.63, 3.06], ['Nice', 'France', 43.70, 7.27],
  ['Manchester', 'United Kingdom', 53.48, -2.24], ['Birmingham', 'United Kingdom', 52.48, -1.90], ['Edinburgh', 'United Kingdom', 55.95, -3.19], ['Glasgow', 'United Kingdom', 55.86, -4.25],
  ['Istanbul', 'Türkiye', 41.01, 28.98], ['Saint Petersburg', 'Russia', 59.94, 30.31], ['Kraków', 'Poland', 50.06, 19.94], ['Gothenburg', 'Sweden', 57.71, 11.97],
  ['Bergen', 'Norway', 60.39, 5.32], ['Thessaloniki', 'Greece', 40.64, 22.94], ['Kharkiv', 'Ukraine', 49.99, 36.23], ['Odesa', 'Ukraine', 46.48, 30.73],
  // North and Central America, the Caribbean
  ['New York', 'United States', 40.71, -74.01], ['Los Angeles', 'United States', 34.05, -118.24], ['Chicago', 'United States', 41.88, -87.63], ['Houston', 'United States', 29.76, -95.37],
  ['Phoenix', 'United States', 33.45, -112.07], ['Philadelphia', 'United States', 39.95, -75.17], ['San Antonio', 'United States', 29.42, -98.49], ['San Diego', 'United States', 32.72, -117.16],
  ['Dallas', 'United States', 32.78, -96.80], ['San Francisco', 'United States', 37.77, -122.42], ['Seattle', 'United States', 47.61, -122.33], ['Boston', 'United States', 42.36, -71.06],
  ['Washington', 'United States', 38.91, -77.04], ['Miami', 'United States', 25.76, -80.19], ['Atlanta', 'United States', 33.75, -84.39], ['Denver', 'United States', 39.74, -104.99],
  ['Las Vegas', 'United States', 36.17, -115.14], ['Detroit', 'United States', 42.33, -83.05], ['Minneapolis', 'United States', 44.98, -93.27], ['Austin', 'United States', 30.27, -97.74],
  ['Honolulu', 'United States', 21.31, -157.86], ['Anchorage', 'United States', 61.22, -149.90],
  ['Toronto', 'Canada', 43.65, -79.38], ['Montreal', 'Canada', 45.50, -73.57], ['Vancouver', 'Canada', 49.28, -123.12], ['Calgary', 'Canada', 51.05, -114.07],
  ['Ottawa', 'Canada', 45.42, -75.70], ['Edmonton', 'Canada', 53.55, -113.49],
  ['Mexico City', 'Mexico', 19.43, -99.13], ['Guadalajara', 'Mexico', 20.67, -103.35], ['Monterrey', 'Mexico', 25.67, -100.31], ['Havana', 'Cuba', 23.13, -82.36],
  ['Guatemala City', 'Guatemala', 14.63, -90.51], ['San José', 'Costa Rica', 9.93, -84.08], ['Panama City', 'Panama', 8.98, -79.52], ['Santo Domingo', 'Dominican Republic', 18.47, -69.90],
  ['Kingston', 'Jamaica', 18.00, -76.79], ['San Juan', 'Puerto Rico', 18.47, -66.11], ['Port-au-Prince', 'Haiti', 18.54, -72.34], ['Tegucigalpa', 'Honduras', 14.07, -87.19],
  ['San Salvador', 'El Salvador', 13.70, -89.19], ['Managua', 'Nicaragua', 12.13, -86.25],
  // South America
  ['São Paulo', 'Brazil', -23.55, -46.63], ['Rio de Janeiro', 'Brazil', -22.91, -43.17], ['Brasília', 'Brazil', -15.79, -47.88], ['Salvador', 'Brazil', -12.97, -38.50],
  ['Fortaleza', 'Brazil', -3.73, -38.53], ['Belo Horizonte', 'Brazil', -19.92, -43.94], ['Manaus', 'Brazil', -3.12, -60.02], ['Curitiba', 'Brazil', -25.43, -49.27],
  ['Recife', 'Brazil', -8.05, -34.88], ['Porto Alegre', 'Brazil', -30.03, -51.23], ['Buenos Aires', 'Argentina', -34.60, -58.38], ['Córdoba', 'Argentina', -31.42, -64.18],
  ['Rosario', 'Argentina', -32.95, -60.64], ['Lima', 'Peru', -12.05, -77.04], ['Bogotá', 'Colombia', 4.61, -74.08], ['Medellín', 'Colombia', 6.25, -75.56],
  ['Cali', 'Colombia', 3.45, -76.53], ['Santiago', 'Chile', -33.45, -70.67], ['Caracas', 'Venezuela', 10.49, -66.88], ['Quito', 'Ecuador', -0.22, -78.51],
  ['Guayaquil', 'Ecuador', -2.19, -79.89], ['La Paz', 'Bolivia', -16.50, -68.15], ['Santa Cruz de la Sierra', 'Bolivia', -17.78, -63.18], ['Montevideo', 'Uruguay', -34.90, -56.19],
  ['Asunción', 'Paraguay', -25.28, -57.64], ['Paramaribo', 'Suriname', 5.83, -55.15], ['Georgetown', 'Guyana', 6.80, -58.16],
  // Africa
  ['Cairo', 'Egypt', 30.04, 31.24], ['Alexandria', 'Egypt', 31.20, 29.92], ['Lagos', 'Nigeria', 6.45, 3.39], ['Abuja', 'Nigeria', 9.06, 7.49],
  ['Kano', 'Nigeria', 12.00, 8.52], ['Ibadan', 'Nigeria', 7.38, 3.90], ['Kinshasa', 'DR Congo', -4.33, 15.31], ['Johannesburg', 'South Africa', -26.20, 28.05],
  ['Cape Town', 'South Africa', -33.92, 18.42], ['Durban', 'South Africa', -29.86, 31.02], ['Pretoria', 'South Africa', -25.75, 28.19], ['Nairobi', 'Kenya', -1.29, 36.82],
  ['Addis Ababa', 'Ethiopia', 9.03, 38.74], ['Dar es Salaam', 'Tanzania', -6.82, 39.28], ['Khartoum', 'Sudan', 15.59, 32.53], ['Algiers', 'Algeria', 36.75, 3.06],
  ['Casablanca', 'Morocco', 33.57, -7.59], ['Rabat', 'Morocco', 34.02, -6.84], ['Marrakesh', 'Morocco', 31.63, -8.00], ['Tunis', 'Tunisia', 36.81, 10.18],
  ['Tripoli', 'Libya', 32.89, 13.19], ['Accra', 'Ghana', 5.56, -0.20], ['Abidjan', 'Côte d\'Ivoire', 5.36, -4.01], ['Dakar', 'Senegal', 14.69, -17.44],
  ['Kampala', 'Uganda', 0.32, 32.58], ['Luanda', 'Angola', -8.84, 13.23], ['Maputo', 'Mozambique', -25.97, 32.57], ['Harare', 'Zimbabwe', -17.83, 31.05],
  ['Lusaka', 'Zambia', -15.41, 28.29], ['Kigali', 'Rwanda', -1.95, 30.06], ['Antananarivo', 'Madagascar', -18.91, 47.53], ['Douala', 'Cameroon', 4.05, 9.70],
  // Asia
  ['Tokyo', 'Japan', 35.69, 139.69], ['Osaka', 'Japan', 34.69, 135.50], ['Yokohama', 'Japan', 35.44, 139.64], ['Nagoya', 'Japan', 35.18, 136.91],
  ['Sapporo', 'Japan', 43.06, 141.35], ['Fukuoka', 'Japan', 33.59, 130.40], ['Kyoto', 'Japan', 35.01, 135.77], ['Seoul', 'South Korea', 37.57, 126.98],
  ['Busan', 'South Korea', 35.18, 129.08], ['Pyongyang', 'North Korea', 39.04, 125.76], ['Beijing', 'China', 39.90, 116.41], ['Shanghai', 'China', 31.23, 121.47],
  ['Guangzhou', 'China', 23.13, 113.26], ['Shenzhen', 'China', 22.54, 114.06], ['Chengdu', 'China', 30.66, 104.07], ['Chongqing', 'China', 29.56, 106.55],
  ['Wuhan', 'China', 30.59, 114.31], ['Tianjin', 'China', 39.13, 117.20], ['Xi\'an', 'China', 34.26, 108.94], ['Hangzhou', 'China', 30.27, 120.16],
  ['Nanjing', 'China', 32.06, 118.80], ['Hong Kong', 'China', 22.28, 114.17], ['Taipei', 'Taiwan', 25.04, 121.56], ['Singapore', 'Singapore', 1.29, 103.85],
  ['Bangkok', 'Thailand', 13.76, 100.50], ['Jakarta', 'Indonesia', -6.21, 106.85], ['Surabaya', 'Indonesia', -7.26, 112.75], ['Bandung', 'Indonesia', -6.92, 107.61],
  ['Manila', 'Philippines', 14.60, 120.98], ['Cebu City', 'Philippines', 10.32, 123.89], ['Kuala Lumpur', 'Malaysia', 3.14, 101.69], ['Hanoi', 'Vietnam', 21.03, 105.85],
  ['Ho Chi Minh City', 'Vietnam', 10.82, 106.63], ['Phnom Penh', 'Cambodia', 11.56, 104.92], ['Vientiane', 'Laos', 17.97, 102.60], ['Yangon', 'Myanmar', 16.80, 96.16],
  ['Dhaka', 'Bangladesh', 23.76, 90.39], ['Delhi', 'India', 28.61, 77.21], ['Mumbai', 'India', 19.08, 72.88], ['Bengaluru', 'India', 12.97, 77.59],
  ['Chennai', 'India', 13.08, 80.27], ['Kolkata', 'India', 22.57, 88.36], ['Hyderabad', 'India', 17.39, 78.49], ['Ahmedabad', 'India', 23.02, 72.57],
  ['Pune', 'India', 18.52, 73.86], ['Karachi', 'Pakistan', 24.86, 67.01], ['Lahore', 'Pakistan', 31.55, 74.34], ['Islamabad', 'Pakistan', 33.69, 73.06],
  ['Kabul', 'Afghanistan', 34.53, 69.17], ['Kathmandu', 'Nepal', 27.72, 85.32], ['Thimphu', 'Bhutan', 27.47, 89.64], ['Colombo', 'Sri Lanka', 6.93, 79.86],
  ['Malé', 'Maldives', 4.18, 73.51], ['Tehran', 'Iran', 35.69, 51.39], ['Baghdad', 'Iraq', 33.31, 44.37], ['Riyadh', 'Saudi Arabia', 24.71, 46.68],
  ['Jeddah', 'Saudi Arabia', 21.49, 39.19], ['Dubai', 'United Arab Emirates', 25.20, 55.27], ['Abu Dhabi', 'United Arab Emirates', 24.45, 54.38], ['Doha', 'Qatar', 25.29, 51.53],
  ['Kuwait City', 'Kuwait', 29.38, 47.98], ['Muscat', 'Oman', 23.59, 58.41], ['Manama', 'Bahrain', 26.23, 50.59], ['Tel Aviv', 'Israel', 32.09, 34.78],
  ['Jerusalem', 'Israel', 31.77, 35.21], ['Amman', 'Jordan', 31.95, 35.93], ['Beirut', 'Lebanon', 33.89, 35.50], ['Damascus', 'Syria', 33.51, 36.29],
  ['Tashkent', 'Uzbekistan', 41.31, 69.28], ['Almaty', 'Kazakhstan', 43.24, 76.89], ['Astana', 'Kazakhstan', 51.17, 71.43], ['Bishkek', 'Kyrgyzstan', 42.87, 74.59],
  ['Dushanbe', 'Tajikistan', 38.56, 68.79], ['Ashgabat', 'Turkmenistan', 37.95, 58.38], ['Ulaanbaatar', 'Mongolia', 47.92, 106.92], ['Novosibirsk', 'Russia', 55.03, 82.92],
  ['Yekaterinburg', 'Russia', 56.84, 60.61], ['Vladivostok', 'Russia', 43.12, 131.89],
  // Oceania
  ['Sydney', 'Australia', -33.87, 151.21], ['Melbourne', 'Australia', -37.81, 144.96], ['Brisbane', 'Australia', -27.47, 153.03], ['Perth', 'Australia', -31.95, 115.86],
  ['Adelaide', 'Australia', -34.93, 138.60], ['Canberra', 'Australia', -35.28, 149.13], ['Hobart', 'Australia', -42.88, 147.33], ['Darwin', 'Australia', -12.46, 130.84],
  ['Gold Coast', 'Australia', -28.00, 153.43], ['Auckland', 'New Zealand', -36.85, 174.76], ['Wellington', 'New Zealand', -41.29, 174.78], ['Christchurch', 'New Zealand', -43.53, 172.64],
  ['Suva', 'Fiji', -18.14, 178.44], ['Port Moresby', 'Papua New Guinea', -9.48, 147.15], ['Nouméa', 'New Caledonia', -22.27, 166.46], ['Apia', 'Samoa', -13.83, -171.77],
  ['Nuku\'alofa', 'Tonga', -21.14, -175.20], ['Papeete', 'French Polynesia', -17.54, -149.57],
];

/**
 * Other names people type for a city above (its own language, Dutch, French): the key is folded (see `fold`), the
 * value is the row's name. Only for finding; the place is stored under the name in the list.
 */
const OTHER_NAMES: Readonly<Record<string, string>> = {
  brussel: 'Brussels', bruxelles: 'Brussels', antwerpen: 'Antwerp', anvers: 'Antwerp', gent: 'Ghent', gand: 'Ghent', luik: 'Liège', brugge: 'Bruges',
  namen: 'Namur', louvain: 'Leuven', bergen: 'Mons', alost: 'Aalst', malines: 'Mechelen', courtrai: 'Kortrijk', oostende: 'Ostend', ostende: 'Ostend', doornik: 'Tournai',
  'den haag': 'The Hague', '\'s-gravenhage': 'The Hague', 'den bosch': '\'s-Hertogenbosch', nimwegen: 'Nijmegen',
  londen: 'London', parijs: 'Paris', berlijn: 'Berlin', wenen: 'Vienna', wien: 'Vienna', roma: 'Rome', lissabon: 'Lisbon', lisboa: 'Lisbon', kopenhagen: 'Copenhagen',
  kobenhavn: 'Copenhagen', praag: 'Prague', praha: 'Prague', warschau: 'Warsaw', warszawa: 'Warsaw', athene: 'Athens', moskou: 'Moscow', boedapest: 'Budapest',
  boekarest: 'Bucharest', belgrado: 'Belgrade', keulen: 'Cologne', koln: 'Cologne', munchen: 'Munich', milaan: 'Milan', milano: 'Milan', napels: 'Naples', napoli: 'Naples',
  turijn: 'Turin', torino: 'Turin', firenze: 'Florence', venetie: 'Venice', venezia: 'Venice', geneve: 'Geneva', sevilla: 'Seville', rijsel: 'Lille', kiev: 'Kyiv',
  'sint-petersburg': 'Saint Petersburg', goteborg: 'Gothenburg', krakau: 'Kraków', istanboel: 'Istanbul', 'new york city': 'New York', 'washington dc': 'Washington',
  'mexico-stad': 'Mexico City', 'ciudad de mexico': 'Mexico City', kaapstad: 'Cape Town', kairo: 'Cairo', tokio: 'Tokyo', peking: 'Beijing',
  hongkong: 'Hong Kong', bombay: 'Mumbai', bangalore: 'Bengaluru', calcutta: 'Kolkata', 'new delhi': 'Delhi', saigon: 'Ho Chi Minh City', rangoon: 'Yangon',
  teheran: 'Tehran', bagdad: 'Baghdad', jeruzalem: 'Jerusalem', beiroet: 'Beirut', marrakech: 'Marrakesh', 'tel aviv-jaffa': 'Tel Aviv',
};

const UNFOLDED: Readonly<Record<string, string>> = {ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd', ð: 'd', þ: 'th', ı: 'i', '’': '\'', 'ʼ': '\''};
/** Lower case, no accents, single spaces, a comma always followed by one space: "São  Paulo,brazil" → "sao paulo, brazil". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[øæœßłđðþı’ʼ]/g, c => UNFOLDED[c] ?? c)
    .replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim().replace(/,$/, '').trim();
}
const toCity = ([name, country, lat, lon]: CityRow): City => ({name, country, lat, lon});
type Indexed = {city: City; name: string; label: string; others: string[]};
let index: Indexed[] | null = null;
function indexed(): Indexed[] {
  if (index) return index;
  const others = new Map<string, string[]>();
  for (const [other, name] of Object.entries(OTHER_NAMES)) others.set(name, [...(others.get(name) ?? []), fold(other)]);
  index = CITIES.map(row => ({city: toCity(row), name: fold(row[0]), label: fold(`${row[0]}, ${row[1]}`), others: others.get(row[0]) ?? []}))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : a.label < b.label ? -1 : 1);
  return index;
}

/**
 * Cities for what the person typed, accents and case ignored: first the cities whose name (or "name, country", or
 * another name of theirs such as "Antwerpen") starts with it, then the cities that contain it anywhere in
 * "name, country" (so "belgium" lists Belgium's cities). Alphabetical within each group. Nothing typed: nothing.
 */
export function searchCities(query: string, limit = 8): City[] {
  const q = fold(query);
  if (!q || !Number.isFinite(limit) || limit < 1) return [];
  const starts: City[] = [], contains: City[] = [];
  for (const entry of indexed()) {
    if (entry.label.startsWith(q) || entry.others.some(other => other.startsWith(q) || `${other}, ${entry.label.slice(entry.name.length + 2)}`.startsWith(q))) starts.push(entry.city);
    else if (entry.label.includes(q)) contains.push(entry.city);
  }
  return [...starts, ...contains].slice(0, Math.floor(limit)).map(city => ({...city}));
}

const NUMBER = String.raw`[+-]?\d{1,3}(?:[.,]\d{1,8})?`;
const PAIR_DOT = new RegExp(String.raw`^([+-]?\d{1,3}(?:\.\d{1,8})?)\s*°?\s*([NSns])?\s*[,;\s]\s*([+-]?\d{1,3}(?:\.\d{1,8})?)\s*°?\s*([EWew])?$`);
const PAIR_COMMA = new RegExp(String.raw`^(${NUMBER})\s*°?\s*([NSns])?\s*(?:;|\s)\s*(${NUMBER})\s*°?\s*([EWew])?$`);
const PAIR_COMMAS = /^([+-]?\d{1,3},\d{1,8})()\s*,\s*([+-]?\d{1,3},\d{1,8})()$/;
/** The typographic minus sign (U+2212), read as a hyphen. */
const MINUS_SIGN = new RegExp(String.fromCharCode(0x2212), 'g');
/**
 * Coordinates the person typed, as a place: "50.85, 4.35", "50.85 4.35", "50.85N 4.35E", "-33.87; 151.21", and with
 * decimal commas ("50,85 4,35", "50,85; 4,35", "50,85, 4,35"). Latitude first. Rounded to two decimals
 * (D13) and named by its own numbers. Anything else, or a position outside -90..90 and -180..180: null.
 */
export function parseCoordinates(text: string): WorldPlace | null {
  const t = text.trim().replace(MINUS_SIGN, '-');
  const m = PAIR_DOT.exec(t) ?? PAIR_COMMA.exec(t) ?? PAIR_COMMAS.exec(t);
  if (!m) return null;
  const value = (raw: string, letter: string | undefined, negative: string): number => {
    const n = Number(raw.replace(',', '.'));
    if (!letter) return n;
    return /^[+-]/.test(raw) ? Number.NaN : letter.toUpperCase() === negative ? -n : n;
  };
  const lat = value(m[1]!, m[2], 'S'), lon = value(m[3]!, m[4], 'W');
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const place = {lat: round2(lat) + 0, lon: round2(lon) + 0};
  return {name: `${place.lat.toFixed(2)}, ${place.lon.toFixed(2)}`, ...place};
}
