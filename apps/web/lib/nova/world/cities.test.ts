import {describe, expect, test} from 'vitest';
import {CITIES, fold, parseCoordinates, searchCities} from './cities';
import {forecastUrl} from './met';
import {placeSchema, round2} from './record';

// Session AM (ADR-038 D14): the list of cities that ships with the app, and coordinates typed by hand. No geocoder.
const names = (query: string, limit?: number) => searchCities(query, limit).map(c => c.name);
const of = (country: string) => CITIES.filter(row => row[1] === country).map(row => row[0]);

describe('the list', () => {
  test('every position is on the globe, at two decimals at most, and a valid place for the record', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(220);
    for (const [name, country, lat, lon] of CITIES) {
      const label = `${name}, ${country}`;
      expect(name.trim(), label).toBe(name); expect(name.length, label).toBeGreaterThan(1); expect(country.length, label).toBeGreaterThan(2);
      expect(Math.abs(lat), label).toBeLessThanOrEqual(90); expect(Math.abs(lon), label).toBeLessThanOrEqual(180);
      expect(round2(lat), label).toBe(lat); expect(round2(lon), label).toBe(lon);
      expect(String(lat), label).toMatch(/^-?\d{1,2}(\.\d{1,2})?$/); expect(String(lon), label).toMatch(/^-?\d{1,3}(\.\d{1,2})?$/);
      expect(placeSchema.safeParse({name, lat, lon}).success, label).toBe(true);
      expect(forecastUrl({lat, lon}), label).toMatch(/\?lat=-?\d{1,2}\.\d{2}&lon=-?\d{1,3}\.\d{2}$/);
    }
  });
  test('no city twice, no two cities on one spot', () => {
    const labels = CITIES.map(([name, country]) => fold(`${name}, ${country}`));
    expect(new Set(labels).size).toBe(labels.length);
    const spots = CITIES.map(([, , lat, lon]) => `${lat},${lon}`);
    expect(new Set(spots).size).toBe(spots.length);
  });
  test('the cities are where they are: a few positions known by heart, and each city inside its part of the world', () => {
    const at = (name: string) => { const row = CITIES.find(r => r[0] === name)!; return [row[2], row[3]]; };
    expect(at('Brussels')).toEqual([50.85, 4.35]); expect(at('Amsterdam')).toEqual([52.37, 4.9]); expect(at('New York')).toEqual([40.71, -74.01]);
    expect(at('Tokyo')).toEqual([35.69, 139.69]); expect(at('Sydney')).toEqual([-33.87, 151.21]); expect(at('São Paulo')).toEqual([-23.55, -46.63]);
    expect(at('London')).toEqual([51.51, -0.13]); expect(at('Paris')).toEqual([48.86, 2.35]); expect(at('Cape Town')).toEqual([-33.92, 18.42]);
    // A swapped sign or swapped latitude and longitude would leave these boxes.
    const box: Record<string, [south: number, north: number, west: number, east: number]> = {
      Belgium: [49.4, 51.6, 2.5, 6.5], Netherlands: [50.7, 53.6, 3.3, 7.3], 'United Kingdom': [49.9, 59, -8.2, 1.8], 'United States': [18, 72, -170, -66], Canada: [41, 84, -141, -52],
      Brazil: [-34, 6, -74, -34], Argentina: [-56, -21, -74, -53], Australia: [-44, -10, 112, 154], 'New Zealand': [-48, -34, 166, 179], Japan: [24, 46, 122, 146], China: [18, 54, 73, 135],
      India: [6, 36, 68, 98], 'South Africa': [-35, -22, 16, 33], Germany: [47, 55.2, 5.8, 15.1], France: [41.3, 51.2, -5.2, 9.6], Spain: [35.9, 43.9, -9.4, 4.4], Italy: [36.6, 47.2, 6.6, 18.6],
      Russia: [41, 82, 19, 180], Nigeria: [4, 14, 2.6, 14.7], Mexico: [14.5, 32.8, -118.5, -86.7], Indonesia: [-11, 6, 95, 141],
    };
    for (const [name, country, lat, lon] of CITIES) {
      const b = box[country];
      if (!b) continue;
      expect(lat >= b[0] && lat <= b[1] && lon >= b[2] && lon <= b[3], `${name}, ${country}: ${lat}, ${lon}`).toBe(true);
    }
  });
  test('Belgium and the Netherlands: the twelve largest cities of each, and more', () => {
    for (const city of ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven', 'Mons', 'Aalst', 'Mechelen', 'La Louvière']) expect(of('Belgium'), city).toContain(city);
    for (const city of ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen', 'Arnhem', 'Haarlem']) expect(of('Netherlands'), city).toContain(city);
  });
  test('every capital of Europe', () => {
    const capitals = ['Amsterdam', 'Andorra la Vella', 'Ankara', 'Athens', 'Baku', 'Belgrade', 'Berlin', 'Bern', 'Bratislava', 'Brussels', 'Bucharest', 'Budapest', 'Chișinău', 'Copenhagen', 'Dublin',
      'Helsinki', 'Kyiv', 'Lisbon', 'Ljubljana', 'London', 'Luxembourg', 'Madrid', 'Minsk', 'Monaco', 'Moscow', 'Nicosia', 'Oslo', 'Paris', 'Podgorica', 'Prague', 'Pristina', 'Reykjavik', 'Riga', 'Rome',
      'San Marino', 'Sarajevo', 'Skopje', 'Sofia', 'Stockholm', 'Tallinn', 'Tbilisi', 'Tirana', 'Vaduz', 'Valletta', 'Vatican City', 'Vienna', 'Vilnius', 'Warsaw', 'Yerevan', 'Zagreb'];
    const all = new Set(CITIES.map(row => row[0]));
    for (const capital of capitals) expect(all.has(capital), capital).toBe(true);
  });
});

describe('finding a city', () => {
  test('the cities people look for are found, with their position', () => {
    expect(searchCities('Brussels')[0]).toEqual({name: 'Brussels', country: 'Belgium', lat: 50.85, lon: 4.35});
    expect(searchCities('Amsterdam')[0]).toEqual({name: 'Amsterdam', country: 'Netherlands', lat: 52.37, lon: 4.9});
    expect(searchCities('New York')[0]).toEqual({name: 'New York', country: 'United States', lat: 40.71, lon: -74.01});
    expect(searchCities('Tokyo')[0]).toEqual({name: 'Tokyo', country: 'Japan', lat: 35.69, lon: 139.69});
    expect(searchCities('Sydney')[0]).toEqual({name: 'Sydney', country: 'Australia', lat: -33.87, lon: 151.21});
    expect(searchCities('São Paulo')[0]).toEqual({name: 'São Paulo', country: 'Brazil', lat: -23.55, lon: -46.63});
    // Every city is found by its own name, first.
    for (const [name, country] of CITIES) expect(searchCities(`${name}, ${country}`, 1)[0], name).toMatchObject({name, country});
  });
  test('accents, case and spacing do not matter', () => {
    expect(names('sao paulo')).toEqual(['São Paulo']); expect(names('SÃO PAULO')).toEqual(['São Paulo']); expect(names('  são   paulo ')).toEqual(['São Paulo']);
    expect(names('liege')).toEqual(['Liège']); expect(names('LIÈGE')).toEqual(['Liège']); expect(names('dusseldorf')).toEqual(['Düsseldorf']);
    expect(names('krakow')).toEqual(['Kraków']); expect(names('chisinau')).toEqual(['Chișinău']); expect(names('bogota')).toEqual(['Bogotá']); expect(names('male')).toEqual(['Malé']);
    expect(fold('  São  Paulo ,BRAZIL ')).toBe('sao paulo, brazil'); expect(fold('Kraków')).toBe('krakow'); expect(fold('Ærø Straße')).toBe('aero strasse');
  });
  test('the start of a name first, then names and countries that contain it; alphabetical in each group', () => {
    expect(names('bru')).toEqual(['Bruges', 'Brussels']);
    // "Mons" is "Bergen" in Dutch: found by that name too. Then the names that only contain it.
    expect(names('ber')).toEqual(['Bergen', 'Berlin', 'Bern', 'Mons', 'Canberra']);
    expect(names('new')).toEqual(['Delhi', 'New York', 'Auckland', 'Christchurch', 'Nouméa', 'Port Moresby', 'Wellington']);
    expect(names('york')).toEqual(['New York']);
    expect(names('belgium', 30)).toEqual(of('Belgium').sort((a, b) => fold(a) < fold(b) ? -1 : 1));
    expect(names('netherlands', 30)).toHaveLength(of('Netherlands').length);
  });
  test('"name, country" finds the one city', () => {
    expect(names('Brussels, Belgium')).toEqual(['Brussels']); expect(names('brussels,be')).toEqual(['Brussels']); expect(names('amsterdam, neth')).toEqual(['Amsterdam']);
    expect(names('Córdoba, Argentina')).toEqual(['Córdoba']); expect(names('brussel, belgium')).toEqual(['Brussels']);
    expect(names('brussels, france')).toEqual([]);
  });
  test('a city answers to its other names: Dutch, French and its own', () => {
    const first: Record<string, string> = {Brussel: 'Brussels', Bruxelles: 'Brussels', Antwerpen: 'Antwerp', Anvers: 'Antwerp', Gent: 'Ghent', Luik: 'Liège', Brugge: 'Bruges', Namen: 'Namur', Oostende: 'Ostend',
      'Den Haag': 'The Hague', 'den bosch': '\'s-Hertogenbosch', Parijs: 'Paris', Londen: 'London', Wenen: 'Vienna', München: 'Munich', Köln: 'Cologne', Keulen: 'Cologne', Lissabon: 'Lisbon',
      Tokio: 'Tokyo', Peking: 'Beijing', Kaapstad: 'Cape Town', Bombay: 'Mumbai', 'New Delhi': 'Delhi'};
    for (const [typed, name] of Object.entries(first)) expect(names(typed)[0], typed).toBe(name);
    expect(names('Brussel')).toEqual(['Brussels']); expect(names('Antwerpen')).toEqual(['Antwerp']); expect(names('Den Haag')).toEqual(['The Hague']);
    // After the city itself come the names that only contain what was typed ("Gent" is in "Argentina").
    expect(names('Gent')).toEqual(['Ghent', 'Buenos Aires', 'Córdoba', 'Rosario']);
  });
  test('at most the limit (eight unless said); nothing typed, or nothing known, finds nothing', () => {
    expect(searchCities('a')).toHaveLength(8); expect(searchCities('a', 3)).toHaveLength(3); expect(searchCities('a', 500).length).toBeGreaterThan(100);
    for (const query of ['', '   ', ',', 'zzzz', 'Atlantis']) expect(searchCities(query), query).toEqual([]);
    expect(searchCities('a', 0)).toEqual([]); expect(searchCities('a', Number.NaN)).toEqual([]);
    // A result is a copy: changing it changes nothing in the list.
    searchCities('Brussels')[0]!.lat = 0;
    expect(searchCities('Brussels')[0]!.lat).toBe(50.85);
  });
});

describe('coordinates typed by hand', () => {
  test('latitude then longitude, as a place at two decimals named by its numbers', () => {
    expect(parseCoordinates('50.85, 4.35')).toEqual({name: '50.85, 4.35', lat: 50.85, lon: 4.35});
    expect(parseCoordinates('50.85 4.35')).toEqual({name: '50.85, 4.35', lat: 50.85, lon: 4.35});
    expect(parseCoordinates(' 50.8503396 ,4.3517103 ')).toEqual({name: '50.85, 4.35', lat: 50.85, lon: 4.35});
    expect(parseCoordinates('-33.8688; 151.2093')).toEqual({name: '-33.87, 151.21', lat: -33.87, lon: 151.21});
    expect(parseCoordinates('40.7128,-74.0060')).toEqual({name: '40.71, -74.01', lat: 40.71, lon: -74.01});
    expect(parseCoordinates('52, 5')).toEqual({name: '52.00, 5.00', lat: 52, lon: 5});
    expect(parseCoordinates('+51.5, -0.13')).toEqual({name: '51.50, -0.13', lat: 51.5, lon: -0.13});
    expect(parseCoordinates('-0.001, 0.004')).toEqual({name: '0.00, 0.00', lat: 0, lon: 0});
    expect(parseCoordinates('90, 180')).toEqual({name: '90.00, 180.00', lat: 90, lon: 180}); expect(parseCoordinates('-90 -180')).toEqual({name: '-90.00, -180.00', lat: -90, lon: -180});
  });
  test('compass letters, degree signs, the typographic minus and decimal commas are read', () => {
    expect(parseCoordinates('50.85N 4.35E')).toEqual({name: '50.85, 4.35', lat: 50.85, lon: 4.35});
    expect(parseCoordinates('33.87° S, 151.21° E')).toEqual({name: '-33.87, 151.21', lat: -33.87, lon: 151.21});
    expect(parseCoordinates('40.71 n 74.01 w')).toEqual({name: '40.71, -74.01', lat: 40.71, lon: -74.01});
    expect(parseCoordinates(`${String.fromCharCode(0x2212)}23.55, ${String.fromCharCode(0x2212)}46.63`)).toEqual({name: '-23.55, -46.63', lat: -23.55, lon: -46.63});
    expect(parseCoordinates('50,85 4,35')).toEqual({name: '50.85, 4.35', lat: 50.85, lon: 4.35});
    expect(parseCoordinates('50,85; 4,35')).toEqual({name: '50.85, 4.35', lat: 50.85, lon: 4.35});
    expect(parseCoordinates('50,85, 4,35')).toEqual({name: '50.85, 4.35', lat: 50.85, lon: 4.35});
  });
  test('what is off the globe, or not two numbers, is refused', () => {
    for (const text of ['90.01, 0', '-91, 4', '50.85, 180.5', '50.85, -181', '4.35, 250', '', '   ', '50.85', '50.85,', 'Brussels', '50.85, 4.35, 12', 'fifty, four', '50.85N 4.35N', '-33.87S 151.21E',
      '50.85E 4.35N', '1e2, 4', '50..85, 4.35', '5085, 435', 'NaN, NaN', 'Infinity, 0', '0x10, 4'])
      expect(parseCoordinates(text), JSON.stringify(text)).toBeNull();
  });
  test('a typed place is a valid place for the record and for the service', () => {
    for (const text of ['50.85, 4.35', '-33.8688; 151.2093', '89.999 -179.999', '0 0']) {
      const place = parseCoordinates(text)!;
      expect(placeSchema.safeParse(place).success, text).toBe(true);
      expect(forecastUrl(place), text).toMatch(/\?lat=-?\d{1,2}\.\d{2}&lon=-?\d{1,3}\.\d{2}$/);
    }
  });
});
