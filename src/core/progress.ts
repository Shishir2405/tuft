import type { Hunt } from './types';

export type Outcome = 'found' | 'skipped';

export interface Progress {
  huntId: string;
  startedAt: number;
  finishedAt: number | null;
  outcomes: Record<string, Outcome>;
}

export const startProgress = (hunt: Hunt, now: number): Progress => ({
  huntId: hunt.id,
  startedAt: now,
  finishedAt: null,
  outcomes: {},
});

/** Index of the first target without an outcome, or `hunt.targets.length` when done. */
export const currentIndex = (hunt: Hunt, p: Progress): number => {
  const i = hunt.targets.findIndex((t) => p.outcomes[t.id] === undefined);
  return i === -1 ? hunt.targets.length : i;
};

export function record(hunt: Hunt, p: Progress, outcome: Outcome, now: number): Progress {
  const target = hunt.targets[currentIndex(hunt, p)];
  if (!target) return p;
  const next: Progress = { ...p, outcomes: { ...p.outcomes, [target.id]: outcome } };
  if (currentIndex(hunt, next) === hunt.targets.length) next.finishedAt = now;
  return next;
}

export const summarize = (hunt: Hunt, p: Progress) => {
  const outcomes = Object.values(p.outcomes);
  const end = p.finishedAt ?? p.startedAt;
  return {
    found: outcomes.filter((o) => o === 'found').length,
    skipped: outcomes.filter((o) => o === 'skipped').length,
    total: hunt.targets.length,
    minutes: Math.max(1, Math.round((end - p.startedAt) / 60_000)),
  };
};

/** Stored state is untrusted: drop it unless it matches the hunt it claims to belong to. */
export function restoreProgress(hunt: Hunt, raw: unknown): Progress | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Partial<Progress>;
  if (r.huntId !== hunt.id || typeof r.startedAt !== 'number') return null;
  if (typeof r.outcomes !== 'object' || r.outcomes === null) return null;
  const ids = new Set(hunt.targets.map((t) => t.id));
  const outcomes: Record<string, Outcome> = {};
  for (const [k, v] of Object.entries(r.outcomes)) {
    if (ids.has(k) && (v === 'found' || v === 'skipped')) outcomes[k] = v;
  }
  const finishedAt = typeof r.finishedAt === 'number' ? r.finishedAt : null;
  return { huntId: hunt.id, startedAt: r.startedAt, finishedAt, outcomes };
}
