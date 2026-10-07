/// <reference lib="webworker" />
import { env } from '@huggingface/transformers';
import ortWasm from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url';
import ortFactory from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs?url';
import { InferenceError } from './engine';
import { SiglipEngine } from './siglip';
import type { WorkerRequest, WorkerResponse } from './protocol';

// Serve the ONNX runtime from our own origin instead of the library's CDN default, so the
// service worker can precache it and the app has no third-party runtime dependency.
env.backends.onnx.wasm!.wasmPaths = { wasm: ortWasm, mjs: ortFactory };
if (import.meta.env.VITE_MODEL_HOST) env.remoteHost = import.meta.env.VITE_MODEL_HOST;

// WebGPU is opt-in: the q8 weights are only tested on the WASM backend.
const engine = new SiglipEngine(import.meta.env.VITE_USE_WEBGPU === '1' ? 'webgpu' : 'wasm');
const reply = (msg: WorkerResponse, transfer: Transferable[] = []) =>
  (self as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'load') {
      await engine.loadVision((p) => reply({ id: data.id, type: 'progress', ...p }));
      reply({ id: data.id, type: 'done' });
    } else if (data.type === 'embedImage') {
      const v = await engine.embedImage(data.image);
      reply({ id: data.id, type: 'vector', vectors: [v] }, [v.buffer]);
    } else {
      const vs = await engine.embedTexts(data.texts);
      reply(
        { id: data.id, type: 'vector', vectors: vs },
        vs.map((v) => v.buffer),
      );
    }
  } catch (e) {
    const reason = e instanceof InferenceError ? e.reason : 'inference-failed';
    console.error('[tuft:worker]', e, e instanceof Error ? e.cause : undefined);
    reply({
      id: data.id,
      type: 'error',
      reason,
      message: e instanceof Error ? e.message : String(e),
    });
  }
};
