/**
 * Smoke evaluation of the real model on a small set of Wikipedia lead images.
 * Not a benchmark: the sample is tiny and the images are encyclopedic, not phone photos.
 * Usage: npm run eval            (downloads images into .cache/eval on first run)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import { BUILT_IN_HUNTS } from '../src/hunts';
import { judge } from '../src/core/scoring';
import { promptsForTarget } from '../src/core/prompts';
import { resolveEmbeddings, type EmbeddingBundle } from '../src/inference/embeddings';
import { SiglipEngine } from '../src/inference/siglip';

const CACHE = '.cache/eval';

/** target id -> Wikipedia article whose lead image shows it. `null` target = should match nothing. */
const SAMPLES: { article: string; target: string | null }[] = [
  { article: 'Tree', target: 'tree-trunk' },
  { article: 'Oak', target: 'tree-trunk' },
  { article: 'Daisy', target: 'flower' },
  { article: 'Dandelion', target: 'flower' },
  { article: 'European_robin', target: 'bird' },
  { article: 'Blue_tit', target: 'bird' },
  { article: 'Cloud', target: 'sky' },
  { article: 'Cumulus_cloud', target: 'sky' },
  { article: 'Dog', target: 'dog' },
  { article: 'Labrador_Retriever', target: 'dog' },
  { article: 'Autumn_leaf_color', target: 'fallen-leaves' },
  { article: 'Mushroom', target: 'mushroom' },
  { article: 'Amanita_muscaria', target: 'mushroom' },
  { article: 'Conifer_cone', target: 'pine-cone' },
  { article: 'Eastern_gray_squirrel', target: 'squirrel' },
  { article: 'Spider_web', target: 'spider-web' },
  { article: 'Laptop', target: null },
  { article: 'Living_room', target: null },
  { article: 'Pizza', target: null },
  { article: 'Office', target: null },
];

async function fetchImage(article: string): Promise<Blob> {
  const path = `${CACHE}/${article}.jpg`;
  if (!existsSync(path)) {
    await new Promise((r) => setTimeout(r, 1500));
    const meta = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${article}`, {
      headers: { 'User-Agent': 'tuft-eval/0.1 (open-source smoke test)' },
    }).then((r) => {
      if (!r.ok) throw new Error(`Summary request failed: ${r.status}`);
      return r.json() as Promise<{ thumbnail?: { source: string } }>;
    });
    if (!meta.thumbnail) throw new Error(`No lead image for ${article}`);
    const res = await fetch(meta.thumbnail.source, { headers: { 'User-Agent': 'tuft-eval/0.1' } });
    if (!res.ok) throw new Error(`Download failed for ${article}: ${res.status}`);
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
  }
  return new Blob([await readFile(path)]);
}

await mkdir(CACHE, { recursive: true });
const bundle = JSON.parse(await readFile('public/embeddings.json', 'utf8')) as EmbeddingBundle;
const engine = new SiglipEngine('cpu');
await engine.loadVision(() => {});

const targets = BUILT_IN_HUNTS.flatMap((h) => h.targets);
const compiled = await Promise.all(
  targets.map(async (t) => {
    const prompts = promptsForTarget(t);
    return { id: t.id, prompts, vectors: await resolveEmbeddings(prompts, bundle, engine) };
  }),
);

let maxWrongShare = 0;
let positives = 0,
  hits = 0,
  closes = 0,
  wrongPairs = 0,
  falseAccepts = 0;
const times: number[] = [];
for (const s of SAMPLES) {
  let image: Blob;
  try {
    image = await fetchImage(s.article);
  } catch (e) {
    console.warn(`skip ${s.article}: ${(e as Error).message}`);
    continue;
  }
  const t0 = performance.now();
  const emb = await engine.embedImage(image);
  times.push(performance.now() - t0);
  const row: string[] = [];
  for (const c of compiled) {
    const j = judge(emb, c.prompts, c.vectors, engine.calibration);
    if (c.id === s.target) {
      positives++;
      if (j.verdict === 'found') hits++;
      if (j.verdict === 'close') closes++;
      row.push(
        `${c.id} share=${j.share.toFixed(2)} p=${j.probability.toExponential(1)} ${j.verdict}`,
      );
    } else {
      wrongPairs++;
      maxWrongShare = Math.max(maxWrongShare, j.share);
      if (j.share >= 0.5) {
        row.push(
          `wrong-pair ${c.id} share=${j.share.toFixed(2)} p=${j.probability.toExponential(1)} ${j.verdict}`,
        );
      }
      if (j.verdict === 'found') {
        falseAccepts++;
        row.push(`FALSE-ACCEPT ${c.id} share=${j.share.toFixed(2)}`);
      }
    }
  }
  console.log(`${s.article.padEnd(24)} [${s.target ?? 'none'}] ${row.join(' | ')}`);
}

times.sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)] ?? 0;
console.log('\n--- summary ---');
console.log(
  `images: ${times.length}, model: ${engine.modelId} (${process.versions.node}, ${os.cpus()[0]?.model}, cpu/onnxruntime-node)`,
);
console.log(`true positives found: ${hits}/${positives}  (close: ${closes})`);
console.log(`false accepts: ${falseAccepts}/${wrongPairs} wrong image/target pairs`);
console.log(`highest share on any wrong pair: ${maxWrongShare.toFixed(2)}`);
console.log(`image embedding median: ${median.toFixed(0)} ms (excl. load)`);
