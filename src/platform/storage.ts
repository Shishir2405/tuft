import { validateHunt } from '../core/hunt';
import type { Hunt } from '../core/types';

const KEY_PROGRESS = 'tuft:progress:';
const KEY_CUSTOM = 'tuft:custom-hunts';

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): progress just won't survive a reload.
  }
}

export const loadProgressRaw = (huntId: string): unknown => read(KEY_PROGRESS + huntId);
export const saveProgress = (huntId: string, value: unknown): void =>
  write(KEY_PROGRESS + huntId, value);
export const clearProgress = (huntId: string): void => {
  try {
    localStorage.removeItem(KEY_PROGRESS + huntId);
  } catch {
    // ignore
  }
};

export function loadCustomHunts(): Hunt[] {
  const raw = read(KEY_CUSTOM);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const v = validateHunt(r);
    return v.ok ? [v.hunt] : [];
  });
}

export const saveCustomHunts = (hunts: Hunt[]): void => write(KEY_CUSTOM, hunts);
