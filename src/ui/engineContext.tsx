import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { EmbeddingBundle } from '../inference/embeddings';
import { createEngine } from '../inference';
import type { InferenceEngine, LoadProgress } from '../inference/engine';

export type ModelState =
  | { status: 'idle' }
  | { status: 'loading'; fraction: number | null }
  | { status: 'ready' }
  | { status: 'error'; message: string };

interface EngineContextValue {
  engine: InferenceEngine;
  bundle: EmbeddingBundle | null;
  state: ModelState;
  load: () => void;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({
  children,
  engine: injected,
}: {
  children: ReactNode;
  engine?: InferenceEngine;
}) {
  const engine = useMemo(() => injected ?? createEngine(), [injected]);
  const [bundle, setBundle] = useState<EmbeddingBundle | null>(null);
  const [state, setState] = useState<ModelState>({ status: 'idle' });
  const loading = useRef(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}embeddings.json`)
      .then((r) => (r.ok ? (r.json() as Promise<EmbeddingBundle>) : null))
      .then(setBundle)
      .catch(() => setBundle(null));
  }, []);

  const load = () => {
    if (loading.current) return;
    loading.current = true;
    setState({ status: 'loading', fraction: null });
    engine
      .loadVision((p: LoadProgress) => setState({ status: 'loading', fraction: p.fraction }))
      .then(() => setState({ status: 'ready' }))
      .catch((e: unknown) => {
        loading.current = false;
        setState({
          status: 'error',
          message: navigator.onLine
            ? 'The vision model could not be loaded.'
            : 'You are offline and the model has not been downloaded yet. Connect once to download it.',
        });
        console.error('[tuft] model load failed', e);
      });
  };

  return (
    <EngineContext.Provider value={{ engine, bundle, state, load }}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine(): EngineContextValue {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error('useEngine must be used inside EngineProvider');
  return ctx;
}
