/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Optional mirror for model files, e.g. https://models.example.com/ */
  readonly VITE_MODEL_HOST?: string;
  /** Set to "1" to try the WebGPU backend instead of WASM (experimental). */
  readonly VITE_USE_WEBGPU?: string;
}
