import { useEffect } from 'react';
import type { Hunt } from '../core/types';
import { speak } from '../platform/speech';

interface Props {
  hunt: Hunt;
  stats: { found: number; skipped: number; total: number; minutes: number };
  onAgain: () => void;
  onExit: () => void;
}

export function Summary({ hunt, stats, onAgain, onExit }: Props) {
  const line = `You found ${stats.found} of ${stats.total} in about ${stats.minutes} ${
    stats.minutes === 1 ? 'minute' : 'minutes'
  }.`;
  useEffect(() => speak(`Hunt complete. ${line}`), [line]);

  return (
    <main className="page">
      <h1>{hunt.title}: done</h1>
      <p className="lede">{line}</p>
      <p>Put the phone away. The rest of the walk is yours.</p>
      <div className="actions">
        <button type="button" className="primary" onClick={onExit}>
          Back to hunts
        </button>
        <button type="button" className="secondary" onClick={onAgain}>
          Play again
        </button>
      </div>
    </main>
  );
}
