import type {CardArt} from '../card-art/catalog';

/**
 * Session AB-Design (owner request 17): the Showcase's goal cards use six different artworks (the owner's "more than
 * three"), assigned by goal key here so no field is written into the Showcase's extras record (AB-Cloud's schema).
 */
export const SHOWCASE_CARD_ART: Readonly<Record<string, CardArt>> = {
  'private:9201': 'garden',    // Emergency fund
  'private:9202': 'home',      // First home deposit
  'private:9203': 'skyline',   // Japan adventure
  'private:9204': 'treasure',  // ZIG reward reserve
  'private:9205': 'studio',    // Launch my creative studio
  'private:9206': 'telescope', // the sixth goal
};
