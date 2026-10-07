import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { BUILT_IN_HUNTS } from '../src/hunts';
import { promptsForTarget } from '../src/core/prompts';
import { encodeVector, type EmbeddingBundle } from '../src/inference/embeddings';
import { MODEL } from '../src/inference/model';
import { SiglipEngine } from '../src/inference/siglip';

const OUT = 'public/embeddings.json';

const prompts = [
  ...new Set(BUILT_IN_HUNTS.flatMap((h) => h.targets.flatMap((t) => promptsForTarget(t)))),
].sort();

const engine = new SiglipEngine('cpu');
const vectors = await engine.embedTexts(prompts);

const bundle: EmbeddingBundle = {
  model: MODEL.id,
  dim: vectors[0]!.length,
  entries: Object.fromEntries(prompts.map((p, i) => [p, encodeVector(vectors[i]!)])),
};
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(bundle));
console.log(`Wrote ${prompts.length} embeddings (${bundle.dim} dims) for ${MODEL.id} to ${OUT}`);
