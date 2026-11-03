import {rewardsShelfSchema, type RewardsShelf} from './store';

/**
 * Session AK (COMPETITORS item 19): the Showcase's rewards shelf, on beside its game layer (lib/game/showcase.ts), with two
 * fictional treats and no claims, so Journey shows the shelf as a person would set it up. The names say SHOWCASE DATA.
 */
export function showcaseRewardsShelf(day: string): RewardsShelf {
  const at = `${day}T09:00:00.000Z`;
  return rewardsShelfSchema.parse({version: 1, on: true, rewards: [
    {id: 'showcase-treat-film', name: 'Film night · SHOWCASE DATA', price: 200, createdAt: at},
    {id: 'showcase-treat-book', name: 'A new book · SHOWCASE DATA', price: 500, createdAt: at},
  ]});
}
