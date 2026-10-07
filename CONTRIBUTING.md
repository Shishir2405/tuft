# Contributing to Tuft

Thanks for helping people get outside. The easiest and most useful contribution is a **hunt pack**.

## Setup

```bash
npm ci
npm run dev        # http://localhost:5173
npm run validate   # typecheck, lint, format check, unit tests, build
npm run test:e2e   # browser tests against the deterministic engine
```

Node 20 or newer. No API keys are needed anywhere.

## Adding a hunt pack

1. Copy `src/hunts/neighbourhood.json` and edit it. Schema and limits live in `src/core/hunt.ts` and `src/core/config.ts`.
2. Register it in `src/hunts/index.ts`.
3. Run `npm run embed` to precompute label embeddings into `public/embeddings.json` (downloads the model once). A unit test fails if you forget.
4. Test every target with real photos, including photos that should **not** match. Describe what you tried in the PR.

Good targets are things a phone camera can frame from a metre away. Clues must make sense when only heard, so avoid "the thing in the picture above". Add `contrast` labels for realistic look-alikes ("a cat" for "a dog").

## Code changes

- Keep the model behind `InferenceEngine` (`src/inference/engine.ts`). UI and core code must not import `@huggingface/transformers`.
- Tests are required for behaviour changes. CI never loads the real model; use `MockEngine`.
- If you change thresholds in `src/core/config.ts`, include `npm run eval` output in the PR.
- Conventional commit messages (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## Reporting problems

Use the issue templates. For wrong verdicts, say what the photo showed and which target it was tried against.
