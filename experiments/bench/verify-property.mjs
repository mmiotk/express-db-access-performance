// Property-based (randomized differential) semantic-equivalence gate.
//
// The fixed-probe gate (bench/verify.mjs) checks 12 hand-picked inputs. This
// gate strengthens that finite conformance test toward a probabilistic one: it
// draws a large, deterministically-seeded sample of inputs across the full ID
// range, plus an explicit edge-case set (nonexistent, boundary, negative, and
// overflow IDs; empty and boundary keyset pages), and asserts that every
// adapter returns a BYTE-IDENTICAL JSON response to the native-driver baseline
// on every one of them. It is differential property-based testing: the property
// is `adapter(input) === baseline(input)` and the native driver is the oracle.
// Because the dataset is deterministic and finite, testing thousands of inputs
// is inexpensive relative to the measurement campaign.
//
//   ENGINE=postgres node bench/verify-property.mjs
//   ENGINE=mysql    node bench/verify-property.mjs
//
// Tunables: PROP_N (random inputs per type, default 1000), PROP_SEED.
// Writes a coverage summary to experiments/semantic-equivalence.json (merged
// per engine). Exits non-zero on any divergence, so it can gate a run.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { ADAPTERS, config } from '../src/config.mjs';

const engine = config.engine;
const baseline = engine === 'postgres' ? 'pg' : 'mysql2';
const NP = config.seed.posts;    // seeded posts   (id range 1..NP)
const NA = config.seed.authors;  // seeded authors (id range 1..NA)
const N = Number(process.env.PROP_N ?? 1000);
const SEED = Number(process.env.PROP_SEED ?? 99005011);

// mulberry32 — the same deterministic PRNG family the seed uses, so the
// generated input set is stable across machines and re-runs (no Math.random).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);
const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// --- input generators -------------------------------------------------------
// Explicit edge cases first (so a failure names a meaningful boundary), then a
// large seeded-random sample spanning the whole key space.
const edgePostIds = [0, -1, 1, 2, NP - 1, NP, NP + 1, NP + 1000, 2147483647];
const edgeAuthorIds = [0, -1, 1, NA - 1, NA, NA + 1, NA + 1000];
const randPostIds = Array.from({ length: N }, () => randInt(1, NP));
const randAuthorIds = Array.from({ length: N }, () => randInt(1, NA));
const postIds = [...edgePostIds, ...randPostIds];
const authorIds = [...edgeAuthorIds, ...randAuthorIds];
// Keyset (range-scan) params: empty page (nothing below id 1), boundary pages,
// zero/one/large limits, first and last page.
const listParams = [
  { limit: 20, before: 1 }, { limit: 20, before: 2 }, { limit: 20, before: NP + 1 },
  { limit: 0, before: 1000 }, { limit: 1, before: 1000 }, { limit: 100, before: 60000 },
  { limit: 20, before: NP }, { limit: 50, before: 0 },
];

async function probeAll(name) {
  const { default: create } = await import(`../src/adapters/${name}.mjs`);
  const db = await create({ engine, config });
  const out = {};
  // Any thrown error is captured as a comparable string, so an input-dependent
  // crash in one layer but not the baseline surfaces as a divergence.
  const call = async (key, fn) => {
    try { out[key] = JSON.stringify(await fn()); }
    catch (e) { out[key] = `ERROR:${e.message}`; }
  };
  try {
    for (const id of postIds) {
      await call(`getPost:${id}`, () => db.getPost(id));
      await call(`thread:${id}`, () => db.getThread(id));
      await call(`threadRaw:${id}`, () => db.getThreadRaw(id));
    }
    for (const id of authorIds) await call(`summary:${id}`, () => db.authorSummary(id));
    for (const p of listParams) await call(`list:${p.limit}:${p.before}`, () => db.listPosts(p));
    return out;
  } finally {
    await db.close();
  }
}

const names = Object.keys(ADAPTERS).filter((n) => ADAPTERS[n].engines.includes(engine));
console.log(
  `Property gate on ${engine}: baseline=${baseline}; ` +
  `${postIds.length} post ids (${edgePostIds.length} edge + ${N} random), ` +
  `${authorIds.length} author ids (${edgeAuthorIds.length} edge + ${N} random), ` +
  `${listParams.length} keyset params; ${names.length} adapters\n`);

const base = await probeAll(baseline);
const keys = Object.keys(base);
console.log(`baseline ${baseline}: ${keys.length} inputs/adapter`);

let bad = 0;
const perAdapter = [];
for (const name of names) {
  if (name === baseline) { console.log(`  ✓ ${name} (baseline)`); perAdapter.push({ name, divergences: 0, baseline: true }); continue; }
  const r = await probeAll(name);
  const diffs = keys.filter((k) => r[k] !== base[k]);
  perAdapter.push({ name, divergences: diffs.length });
  if (diffs.length === 0) {
    console.log(`  ✓ ${name} (byte-identical on ${keys.length} inputs)`);
  } else {
    bad++;
    console.log(`  ✗ ${name}: ${diffs.length}/${keys.length} inputs differ`);
    for (const k of diffs.slice(0, 3)) {
      const a = r[k] ?? '(missing)', b = base[k];
      console.log(`      ${k}: got ${a.slice(0, 70)} | want ${b.slice(0, 70)}`);
    }
  }
}

const totalComparisons = (names.length - 1) * keys.length;
console.log(`\n${bad === 0 ? 'ALL BYTE-IDENTICAL' : bad + ' adapter(s) differ'} — ` +
  `${totalComparisons} adapter×input comparisons on ${engine}`);

// Merge a coverage summary keyed by engine (run both engines to populate both).
// Top-level fields reflect the current run; the `engines` map accumulates so
// running postgres then mysql leaves one file describing both.
const OUT = new URL('../semantic-equivalence.json', import.meta.url);
let engines = {};
try { if (existsSync(OUT)) engines = JSON.parse(readFileSync(OUT, 'utf8')).engines || {}; } catch { /* start fresh */ }
const summary = {
  note: 'Randomized differential semantic-equivalence gate (bench/verify-property.mjs). '
    + 'Regenerated by re-running the gate against the seeded database; not derived from results/raw.json.',
  seed: SEED, randomPerType: N,
  edgePostIds, edgeAuthorIds, listParams,
  methods: ['getPost', 'getThread', 'getThreadRaw', 'authorSummary', 'listPosts'],
  engines,
};
summary.engines[engine] = {
  baseline,
  adapters: names.length,
  inputsPerAdapter: keys.length,
  postIdsTested: postIds.length,
  authorIdsTested: authorIds.length,
  keysetParamsTested: listParams.length,
  totalComparisons,
  divergences: bad,
  perAdapter,
  status: bad === 0 ? 'ALL BYTE-IDENTICAL' : `${bad} adapter(s) differ`,
};
writeFileSync(OUT, JSON.stringify(summary, null, 2) + '\n');
console.log(`coverage summary -> experiments/semantic-equivalence.json (${engine})`);
process.exit(bad === 0 ? 0 : 1);
