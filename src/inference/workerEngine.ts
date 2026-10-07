import { InferenceError, type InferenceEngine, type LoadProgress } from './engine';
import { MODEL } from './model';
import type { WorkerRequest, WorkerResponse } from './protocol';

type RequestBody = WorkerRequest extends infer R
  ? R extends { id: number }
    ? Omit<R, 'id'>
    : never
  : never;

type Pending = {
  resolve: (r: WorkerResponse) => void;
  onProgress?: (p: LoadProgress) => void;
};

/** Main-thread proxy so the model never blocks scrolling or button presses. */
export class WorkerEngine implements InferenceEngine {
  readonly modelId = MODEL.id;
  readonly calibration = MODEL.calibration;

  private worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private loaded = false;

  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      const p = this.pending.get(data.id);
      if (!p) return;
      if (data.type === 'progress')
        return p.onProgress?.({ fraction: data.fraction, file: data.file });
      this.pending.delete(data.id);
      p.resolve(data);
    };
  }

  private call(req: RequestBody, onProgress?: Pending['onProgress']) {
    const id = this.nextId++;
    return new Promise<WorkerResponse>((resolve) => {
      this.pending.set(id, { resolve, onProgress });
      this.worker.postMessage({ ...req, id } as WorkerRequest);
    });
  }

  private static unwrap(r: WorkerResponse): WorkerResponse {
    if (r.type === 'error') throw new InferenceError(r.message, r.reason);
    return r;
  }

  async loadVision(onProgress: (p: LoadProgress) => void) {
    if (this.loaded) return;
    WorkerEngine.unwrap(await this.call({ type: 'load' }, onProgress));
    this.loaded = true;
  }

  async embedImage(image: Blob) {
    const r = WorkerEngine.unwrap(await this.call({ type: 'embedImage', image }));
    return r.type === 'vector' ? r.vectors[0]! : new Float32Array();
  }

  async embedTexts(texts: readonly string[]) {
    const r = WorkerEngine.unwrap(await this.call({ type: 'embedTexts', texts: [...texts] }));
    return r.type === 'vector' ? r.vectors : [];
  }
}
