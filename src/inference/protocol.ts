export type WorkerRequest =
  | { id: number; type: 'load' }
  | { id: number; type: 'embedImage'; image: Blob }
  | { id: number; type: 'embedTexts'; texts: string[] };

export type WorkerResponse =
  | { id: number; type: 'progress'; fraction: number | null; file: string }
  | { id: number; type: 'done' }
  | { id: number; type: 'vector'; vectors: Float32Array[] }
  | {
      id: number;
      type: 'error';
      reason: 'load-failed' | 'bad-image' | 'inference-failed';
      message: string;
    };
