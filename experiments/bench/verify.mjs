// Correctness cross-check (harness 2.0): boot every adapter for ENGINE and assert
// that each returns a BYTE-IDENTICAL JSON response to the native-driver baseline
// (pg or mysql2) for the same inputs, on all four non-mutating endpoints, plus the
// same-SQL control. Since every adapter funnels its output through the canonical
// constructors (src/adapters/_canon.mjs), full-payload equality — field set, key
// order, value types, serialized byte length — is required, not just a key-field
// projection. This is what proves the layers are measured on an equivalent task.
//
//   ENGINE=postgres node bench/verify.mjs
//   ENGINE=mysql    node bench/verify.mjs
import { ADAPTERS, config } from '../src/config.mjs';

const engine = config.engine;
const baseline = engine === 'postgres' ? 'pg' : 'mysql2';
// Fixed probe inputs (deterministic seed): mid-range post, mid-range author, and a
// keyset page below id=1000.
const POST_IDS = [1, 50000, 99999];
const AUTHOR_ID = 1000;

async function probe(name) {
  const { default: create } = await import(`../src/adapters/${name}.mjs`);
  const db = await create({ engine, config });
  try {
    const out = {};
    for (const id of POST_IDS) {
      out[`getPost:${id}`] = JSON.stringify(await db.getPost(id));
      out[`thread:${id}`] = JSON.stringify(await db.getThread(id));
      out[`threadRaw:${id}`] = JSON.stringify(await db.getThreadRaw(id));
    }
    out['list:1000'] = JSON.stringify(await db.listPosts({ limit: 20, before: 1000 }));
    out['list:60000'] = JSON.stringify(await db.listPosts({ limit: 20, before: 60000 }));
    out[`summary:${AUTHOR_ID}`] = JSON.stringify(await db.authorSummary(AUTHOR_ID));
    return out;
  } finally {
    await db.close();
  }
}

const names = Object.keys(ADAPTERS).filter((n) => ADAPTERS[n].engines.includes(engine));
console.log(`Verifying ${names.length} adapters on ${engine} (baseline=${baseline}, byte-level)\n`);

const base = await probe(baseline);
const keys = Object.keys(base);
console.log(`baseline ${baseline}: ${keys.length} probes, bytes: ` +
  keys.map((k) => `${k}=${Buffer.byteLength(base[k])}`).join(' '));

// internal consistency of the baseline itself: idiomatic thread === same-SQL thread
let bad = 0;
for (const id of POST_IDS) {
  if (base[`thread:${id}`] !== base[`threadRaw:${id}`]) {
    bad++; console.log(`  ✗ baseline thread(${id}) !== threadRaw(${id})`);
  }
}

for (const name of names) {
  if (name === baseline) { console.log(`  ✓ ${name} (baseline)`); continue; }
  try {
    const r = await probe(name);
    const diffs = keys.filter((k) => r[k] !== base[k]);
    if (diffs.length === 0) { console.log(`  ✓ ${name} (byte-identical on ${keys.length} probes)`); }
    else {
      bad++;
      console.log(`  ✗ ${name}: ${diffs.length} probe(s) differ`);
      for (const k of diffs.slice(0, 2)) {
        const a = r[k] ?? 'undefined', b = base[k];
        let i = 0; while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
        console.log(`      ${k}: bytes ${Buffer.byteLength(a)} vs ${Buffer.byteLength(b)}; first diff @${i}:`);
        console.log(`        got : …${a.slice(Math.max(0, i - 30), i + 40)}…`);
        console.log(`        want: …${b.slice(Math.max(0, i - 30), i + 40)}…`);
      }
    }
  } catch (e) {
    bad++; console.log(`  ✗ ${name}  ERROR ${e.code || ''} ${e.message}`);
  }
}
console.log(`\n${bad === 0 ? 'ALL BYTE-IDENTICAL' : bad + ' adapter(s) differ/failed'}`);
process.exit(bad === 0 ? 0 : 1);
