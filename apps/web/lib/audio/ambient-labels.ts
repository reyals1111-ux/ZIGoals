import type {AmbientSound} from '../music/schema';

/** The ambient sounds' names (Session W Part 6), shared by the player and the shell's Stop pill without loading the player. */
export const AMBIENT_LABELS: Record<AmbientSound, string> = {white: 'White noise', pink: 'Pink noise', brown: 'Brown noise', rain: 'Rain-like', ocean: 'Ocean-like', drone: 'Soft drone'};
