import { HUNT_LIMITS } from './config';
import type { Hunt, HuntTarget } from './types';

export type ValidationResult = { ok: true; hunt: Hunt } | { ok: false; errors: string[] };

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function text(v: unknown, field: string, max: number, errors: string[]): string {
  if (typeof v !== 'string' || v.trim() === '') {
    errors.push(`${field} must be a non-empty string`);
    return '';
  }
  const trimmed = v.trim();
  if (trimmed.length > max) errors.push(`${field} must be at most ${max} characters`);
  return trimmed;
}

function parseTarget(raw: unknown, index: number, errors: string[]): HuntTarget | null {
  const where = `targets[${index}]`;
  if (!isRecord(raw)) {
    errors.push(`${where} must be an object`);
    return null;
  }
  const id = raw.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    errors.push(`${where}.id must be lowercase letters, digits and dashes`);
  }
  const contrast: string[] = [];
  if (raw.contrast !== undefined) {
    if (!Array.isArray(raw.contrast) || raw.contrast.length > HUNT_LIMITS.maxContrast) {
      errors.push(`${where}.contrast must be a list of at most ${HUNT_LIMITS.maxContrast} labels`);
    } else {
      raw.contrast.forEach((c, i) =>
        contrast.push(text(c, `${where}.contrast[${i}]`, HUNT_LIMITS.maxLabel, errors)),
      );
    }
  }
  return {
    id: typeof id === 'string' ? id : '',
    clue: text(raw.clue, `${where}.clue`, HUNT_LIMITS.maxClue, errors),
    label: text(raw.label, `${where}.label`, HUNT_LIMITS.maxLabel, errors),
    contrast,
  };
}

/** Validates untrusted input (imported files, shared links, stored state) into a `Hunt`. */
export function validateHunt(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['Hunt must be a JSON object'] };

  const id = input.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    errors.push('id must be lowercase letters, digits and dashes');
  }
  const title = text(input.title, 'title', HUNT_LIMITS.maxTitle, errors);
  const summary = text(input.summary, 'summary', HUNT_LIMITS.maxSummary, errors);
  const minutes = input.minutes;
  if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
    errors.push('minutes must be a whole number between 1 and 240');
  }

  const targets: HuntTarget[] = [];
  const rawTargets = input.targets;
  if (
    !Array.isArray(rawTargets) ||
    rawTargets.length === 0 ||
    rawTargets.length > HUNT_LIMITS.maxTargets
  ) {
    errors.push(`targets must be a list of 1 to ${HUNT_LIMITS.maxTargets} items`);
  } else {
    rawTargets.forEach((raw, i) => {
      const t = parseTarget(raw, i, errors);
      if (t) targets.push(t);
    });
    const ids = targets.map((t) => t.id);
    if (new Set(ids).size !== ids.length) errors.push('target ids must be unique');
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    hunt: { id: id as string, title, summary, minutes: minutes as number, targets },
  };
}

export function parseHuntJson(source: string): ValidationResult {
  if (new TextEncoder().encode(source).length > HUNT_LIMITS.maxFileBytes) {
    return { ok: false, errors: [`File is larger than ${HUNT_LIMITS.maxFileBytes / 1024} KB`] };
  }
  try {
    return validateHunt(JSON.parse(source));
  } catch {
    return { ok: false, errors: ['File is not valid JSON'] };
  }
}
