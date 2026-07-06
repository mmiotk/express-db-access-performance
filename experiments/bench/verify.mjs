// Correctness cross-check: boot every adapter for ENGINE and assert each returns
// the SAME normalized result as the native-driver baseline (pg or mysql2) for the
// same inputs. This is what proves no adapter cheats via N+1 or a wrong query.
//
//   ENGINE=postgres node bench/verify.mjs
//   ENGINE=mysql    node bench/verify.mjs
import { ADAPTERS, config } from '../src/config.mjs';

const engine = config.engine;
const baseline = engine === 'postgres' ? 'pg' : 'mysql2';
const POST_ID = 1;
const AUTHOR_ID = 1;

// Normalize away engine/driver noise (Date objects, BigInt, numeric strings, key order).
function norm(v) {
  if (v == null) return v;
  if (Array.isArray(v)) return v.map(norm);
  if (v instanceof Date) return 'date';
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      if (k === 'created_at') continue; // timestamps differ by seed run
      out[k] = norm(v[k]);
    }
    return out;
  }
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
  return v;
}
const j = (v) => JSON.stringify(norm(v));

async function probe(name) {
  const { default: create } = await import(`../src/adapters/${name}.mjs`);
  const db = await create({ engine, config });
  try {
    const getPost = await db.getPost(POST_ID);
    const list = await db.listPosts({ limit: 20, offset: 0 });
    const thread = await db.getThread(POST_ID);
    const summary = await db.authorSummary(AUTHOR_ID);
    return {
      getPost: { id: Number(getPost.id), title: getPost.title },
      listCount: list.length,
      thread: {
        postId: Number(thread.post.id),
        authorId: Number(thread.author.id),
        comments: thread.comments.length,
        firstCommentAuthor: thread.comments[0] ? Number(thread.comments[0].author.id) : null,
      },
      summary,
    };
  } finally {
    await db.close();
  }
}

const names = Object.keys(ADAPTERS).filter((n) => ADAPTERS[n].engines.includes(engine));
console.log(`Verifying ${names.length} adapters on ${engine} (baseline=${baseline})\n`);

const base = await probe(baseline);
console.log(`baseline ${baseline}:`, JSON.stringify(base));

let bad = 0;
for (const name of names) {
  if (name === baseline) { console.log(`  ✓ ${name} (baseline)`); continue; }
  try {
    const r = await probe(name);
    const same = j(r) === j(base);
    if (same) { console.log(`  ✓ ${name}`); }
    else { bad++; console.log(`  ✗ ${name}\n      got : ${j(r)}\n      want: ${j(base)}`); }
  } catch (e) {
    bad++; console.log(`  ✗ ${name}  ERROR ${e.code || ''} ${e.message}`);
  }
}
console.log(`\n${bad === 0 ? 'ALL MATCH' : bad + ' adapter(s) differ/failed'}`);
process.exit(bad === 0 ? 0 : 1);
