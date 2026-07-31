// Paired TOST for the closest adjacent policy-selected pair on the deep fetch.
//
// Methods promise an equivalence test "for the closest pair". stats2.mjs hardcoded
// the pg/prisma contrast instead, which spans 3.10x and is the pair a +-5% margin
// tells you least about. This computes the test the manuscript describes, from the
// same archived 25 paired replicates, and writes its own result file rather than
// rewriting analysis2.json (results are append-only).
//
// The tuned baselines are excluded: the paper defines them as disclosed reference
// points, not selected treatments, so "closest pair" ranges over the nine
// policy-selected layers only.
//
// Everything is seeded and deterministic; the seed matches stats2.mjs.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pairedTOST } from '../bench/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const RAW = process.env.RAW_FILE || 'current-primary.json';
const OUT = process.env.TOST_OUT || 'tost-closest-pair.json';
const MARGIN = 0.05;
const B = 20000;
const TUNED = new Set(['pg-tuned', 'mysql2-tuned']);

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const raw = JSON.parse(await readFile(join(here, '..', 'results', RAW), 'utf8'));
const cells = Array.isArray(raw) ? raw : (raw.cells || raw.results || []);
const pattern = (c) => c.endpoint || c.pattern;

const out = { seed: '0x57a75', margin: MARGIN, B, raw_file: RAW, engines: {} };

for (const engine of ['postgres', 'mysql']) {
  const rows = cells
    .filter((c) => c.engine === engine && pattern(c) === 'deep_fetch' && !TUNED.has(c.adapter))
    .map((c) => ({ adapter: c.adapter, rps: c.rps, samples: c.rps_samples }))
    .filter((r) => Array.isArray(r.samples) && r.samples.length)
    .sort((a, b) => b.rps - a.rps);

  // Closest adjacent pair by ratio of cell medians, chosen from the data rather
  // than named in advance, so the choice is reproducible from the archive.
  let best = null;
  for (let i = 0; i < rows.length - 1; i++) {
    const ratio = rows[i].rps / rows[i + 1].rps;
    if (!best || ratio < best.ratio) best = { ratio, hi: rows[i], lo: rows[i + 1] };
  }
  if (!best) continue;

  const t = pairedTOST(best.hi.samples, best.lo.samples,
    { margin: MARGIN, B, rand: mulberry32(0x57a75) });

  out.engines[engine] = {
    pair: `${best.hi.adapter} / ${best.lo.adapter}`,
    medianRatio: +best.ratio.toFixed(4),
    n: best.hi.samples.length,
    ...t,
  };
  const e = out.engines[engine];
  console.log(`${engine}: ${e.pair} ratio ${e.geomRatio} CI90 [${e.ci90}] +-${MARGIN * 100}% equivalent=${e.equivalent}`);
}

await writeFile(join(here, '..', 'results', OUT), JSON.stringify(out, null, 2) + '\n');
console.log(`wrote results/${OUT}`);
