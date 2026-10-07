/** Prompt wrapped around every label before it is embedded; matches how the model was trained. */
export const PROMPT_TEMPLATE = 'a photo of {label}';

/**
 * Scenes that should never count as a find. Photographing a screen, a room or a hand is
 * the cheapest way to cheat a hunt, so these compete with the target label.
 */
export const GLOBAL_DISTRACTORS: readonly string[] = [
  'a computer screen',
  'a room indoors',
  'a person',
  'a hand',
  'a blurry photo',
  'a wall',
  'a street',
];

export const FOUND_SHARE = 0.5;
export const FOUND_MIN_PROBABILITY = 0.001;
/** Between this and FOUND_SHARE the player is told to get closer and retry. */
export const CLOSE_SHARE = 0.25;

export const HUNT_LIMITS = {
  maxTargets: 30,
  maxTitle: 80,
  maxSummary: 240,
  maxClue: 240,
  maxLabel: 80,
  maxContrast: 6,
  maxFileBytes: 64 * 1024,
} as const;
