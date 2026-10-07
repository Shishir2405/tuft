import type { InferenceEngine } from './engine';
import { MockEngine } from './mock';
import { WorkerEngine } from './workerEngine';

/** `vite build --mode e2e` swaps in the deterministic engine; production always uses the model. */
export function createEngine(): InferenceEngine {
  return import.meta.env.MODE === 'e2e' ? new MockEngine() : new WorkerEngine();
}
