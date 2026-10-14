/**
 * Session AB-Design (owner request 17): the catalogue of goal card artworks — the five drawn scenes the cards always had
 * and ten new ones in the same style (components/scene-art.tsx). An id is what a goal's extras may hold as `cardArt`
 * (AB-Cloud's field; read here through lib/card-art/mirror.ts) and what the Showcase assigns (lib/showcase/card-art.ts).
 */
export const CARD_ARTS = [
  {id: 'horizon', label: 'Planet horizon'}, {id: 'mountains', label: 'Mountains'}, {id: 'home', label: 'Home'}, {id: 'garden', label: 'Garden'}, {id: 'aurora', label: 'Aurora'},
  {id: 'skyline', label: 'City skyline'}, {id: 'sailboat', label: 'Sailboat'}, {id: 'library', label: 'Library'}, {id: 'studio', label: 'Studio'}, {id: 'track', label: 'Running track'},
  {id: 'path', label: 'Garden path'}, {id: 'telescope', label: 'Telescope'}, {id: 'bicycle', label: 'Bicycle'}, {id: 'kitchen', label: 'Kitchen'}, {id: 'treasure', label: 'Treasure'},
] as const;
export type CardArt = (typeof CARD_ARTS)[number]['id'];
export const isCardArt = (value: unknown): value is CardArt => typeof value === 'string' && CARD_ARTS.some(a => a.id === value);
