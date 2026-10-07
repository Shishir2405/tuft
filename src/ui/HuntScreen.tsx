import { useCallback, useEffect, useId, useState } from 'react';
import { currentIndex, record, restoreProgress, startProgress, summarize } from '../core/progress';
import type { Hunt } from '../core/types';
import { InferenceError } from '../inference/engine';
import { verifyPhoto, type Verification } from '../inference/verify';
import { buzz, keepAwake, speak, stopSpeaking, type WakeLockHandle } from '../platform/speech';
import { clearProgress, loadProgressRaw, saveProgress } from '../platform/storage';
import { useEngine } from './engineContext';
import { ModelStatus } from './ModelStatus';
import { Summary } from './Summary';

type Phase =
  | { name: 'ready' }
  | { name: 'checking' }
  | { name: 'result'; result: Verification }
  | { name: 'error'; message: string };

const MESSAGES = {
  found: 'Found it.',
  close: 'Close. Get nearer, fill the frame, and try again.',
  miss: 'That does not look like it yet. Try another angle.',
} as const;

export function HuntScreen({ hunt, onExit }: { hunt: Hunt; onExit: () => void }) {
  const { engine, bundle, state, load } = useEngine();
  const [progress, setProgress] = useState(
    () => restoreProgress(hunt, loadProgressRaw(hunt.id)) ?? startProgress(hunt, Date.now()),
  );
  const [phase, setPhase] = useState<Phase>({ name: 'ready' });
  const photoId = useId();
  const index = currentIndex(hunt, progress);
  const target = hunt.targets[index];

  useEffect(() => {
    if (state.status === 'idle') load();
  }, [state.status, load]);

  useEffect(() => {
    let lock: WakeLockHandle | null = null;
    void keepAwake().then((l) => (lock = l));
    return () => {
      stopSpeaking();
      void lock?.release();
    };
  }, []);

  useEffect(() => {
    if (target) speak(target.clue);
  }, [target]);

  const advance = useCallback(
    (outcome: 'found' | 'skipped') => {
      const next = record(hunt, progress, outcome, Date.now());
      setProgress(next);
      saveProgress(hunt.id, next);
      setPhase({ name: 'ready' });
    },
    [hunt, progress],
  );

  const onPhoto = async (file: File | undefined) => {
    if (!file || !target) return;
    setPhase({ name: 'checking' });
    try {
      const result = await verifyPhoto(engine, bundle, target, file);
      setPhase({ name: 'result', result });
      speak(MESSAGES[result.verdict]);
      buzz(result.verdict === 'found' ? [80, 60, 80] : 200);
    } catch (e) {
      const bad = e instanceof InferenceError && e.reason === 'bad-image';
      const message = bad
        ? 'That photo could not be read. Please take another one.'
        : 'Something went wrong while checking the photo. Please try again.';
      console.error('[tuft] verification failed', e);
      setPhase({ name: 'error', message });
      speak(message);
    }
  };

  const restart = () => {
    clearProgress(hunt.id);
    setProgress(startProgress(hunt, Date.now()));
    setPhase({ name: 'ready' });
  };

  if (!target) {
    return (
      <Summary hunt={hunt} stats={summarize(hunt, progress)} onAgain={restart} onExit={onExit} />
    );
  }

  const ready = state.status === 'ready';
  const found = phase.name === 'result' && phase.result.verdict === 'found';

  return (
    <main className="page hunt-screen">
      <header className="hunt-header">
        <button type="button" className="link" onClick={onExit}>
          ← Hunts
        </button>
        <p>
          Find {index + 1} of {hunt.targets.length}
        </p>
      </header>

      <h1 className="clue" tabIndex={-1}>
        {target.clue}
      </h1>

      {!ready && <ModelStatus />}

      <div className="live" role="status" aria-live="polite">
        {phase.name === 'checking' && <p>Checking your photo…</p>}
        {phase.name === 'result' && (
          <p className={`result ${phase.result.verdict}`}>
            {MESSAGES[phase.result.verdict]}{' '}
            <small>Checked on this device in {phase.result.ms} ms.</small>
          </p>
        )}
        {phase.name === 'error' && <p className="result miss">{phase.message}</p>}
      </div>

      <div className="actions">
        {found ? (
          <button type="button" className="primary" onClick={() => advance('found')} autoFocus>
            Next clue
          </button>
        ) : (
          <>
            <label
              htmlFor={photoId}
              className={`primary ${!ready || phase.name === 'checking' ? 'disabled' : ''}`}
              aria-disabled={!ready || phase.name === 'checking'}
            >
              Take photo
            </label>
            <input
              id={photoId}
              className="visually-hidden"
              type="file"
              accept="image/*"
              capture="environment"
              disabled={!ready || phase.name === 'checking'}
              onChange={(e) => {
                void onPhoto(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </>
        )}
        <div className="row">
          <button type="button" className="secondary" onClick={() => speak(target.clue)}>
            Repeat clue
          </button>
          {!found && (
            <button type="button" className="secondary" onClick={() => advance('skipped')}>
              Skip
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
