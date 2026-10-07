import { validateHunt } from '../core/hunt';
import type { Hunt } from '../core/types';
import autumn from './autumn.json';
import neighbourhood from './neighbourhood.json';

/** Built-in packs are validated at load so a bad contribution fails CI, not the player. */
export const BUILT_IN_HUNTS: Hunt[] = [neighbourhood, autumn].map((raw) => {
  const result = validateHunt(raw);
  if (!result.ok) throw new Error(`Invalid built-in hunt: ${result.errors.join('; ')}`);
  return result.hunt;
});
