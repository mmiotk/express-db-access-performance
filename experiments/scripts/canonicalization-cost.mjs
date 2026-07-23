// Standalone microbenchmark for the shared response constructors. No database is
// touched: this quantifies normalization/copying after row decoding or hydration.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonPost, canonPosts, canonThread, canonThreadRows, canonSummary } from '../src/adapters/_canon.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, '..', 'results');
const tablesDir = join(resultsDir, 'tables');
const raw = JSON.parse(await readFile(join(resultsDir, 'raw.json'), 'utf8'));
const date = new Date('2026-07-01T12:00:00.000Z');
const post = { id: 50000n, author_id: 1000n, title: 'Post 50000',
  body: 'Body of post 50000. '.repeat(4).trim(), views: 2500n,
  published: true, created_at: date };
const author = { id: 1000n, name: 'Author 1000', email: 'author1000@example.com' };
const comments = Array.from({ length: 10 }, (_, i) => ({
  id: BigInt(500000 + i), body: ('Comment ' + (i + 1) + ' on post 50000. ').repeat(2).trim(),
  created_at: date,
  author: { id: BigInt(100 + i), name: 'Author ' + (100 + i),
    email: 'author' + (100 + i) + '@example.com' },
}));
const flatPost = { ...post, author_name: author.name, author_email: author.email };
const flatComments = comments.map((c) => ({ id: c.id, body: c.body, created_at: c.created_at,
  author_id: c.author.id, author_name: c.author.name, author_email: c.author.email }));
const posts = Array.from({ length: 20 }, (_, i) => ({ ...post, id: post.id - BigInt(i) }));
const summary = { author_id: 1000n, posts: 50n, comments: 500n, views: 125000n };

const cases = [
  ['point_read', 'Point read', 'one seven-field row', 'point_read', () => canonPost(post)],
  ['range_scan_20', 'Range scan', '20 rows', 'range_scan', () => canonPosts(posts)],
  ['deep_graph_10', 'Deep fetch (graph)', 'post + author + 10 comments', 'deep_fetch',
    () => canonThread(post, author, comments)],
  ['deep_rows_10', 'Deep fetch (flat rows)', 'post + author + 10 comments', 'deep_fetch',
    () => canonThreadRows(flatPost, flatComments)],
  ['aggregation', 'Aggregation', 'four scalar fields', 'aggregation', () => canonSummary(summary)],
].map(([id, label, fixture, endpoint, fn]) => ({ id, label, fixture, endpoint, fn }));

const ITERATIONS = Number(process.env.CANON_ITERATIONS || 50000);
const BLOCKS = Number(process.env.CANON_BLOCKS || 30);
const WARMUP = Number(process.env.CANON_WARMUP || 20000);
let sink = 0;
function consume(v) {
  if (Array.isArray(v)) sink ^= v.length;
  else if (v?.comments) sink ^= v.comments.length;
  else sink ^= Number(v?.id ?? v?.author_id ?? 0);
}
function time(fn, n) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < n; i++) consume(fn());
  return Number(process.hrtime.bigint() - start) / n;
}
for (const c of cases) time(c.fn, WARMUP);
const identity = () => post;
time(identity, WARMUP);
const samples = Object.fromEntries(cases.map((c) => [c.id, []]));
const identitySamples = [];
for (let block = 0; block < BLOCKS; block++) {
  const split = block % cases.length;
  identitySamples.push(time(identity, ITERATIONS));
  for (const c of cases.slice(split).concat(cases.slice(0, split))) {
    samples[c.id].push(time(c.fn, ITERATIONS));
  }
}
function quantile(xs, q) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}
const identityMedianNs = quantile(identitySamples, 0.5);
const fastestP50 = (endpoint) =>
  Math.min(...raw.filter((r) => r.endpoint === endpoint).map((r) => r.p50));
const measurements = cases.map((c) => {
  const net = samples[c.id].map((ns) => Math.max(0, ns - identityMedianNs));
  const medianNs = quantile(net, 0.5);
  const requestP50Ms = fastestP50(c.endpoint);
  return { id: c.id, operation: c.label, fixture: c.fixture, endpoint: c.endpoint,
    median_ns: Math.round(medianNs), p95_block_ns: Math.round(quantile(net, 0.95)),
    fastest_primary_p50_ms: requestP50Ms,
    share_of_fastest_primary_p50_pct: +(100 * medianNs / (requestP50Ms * 1e6)).toFixed(4),
    block_samples_ns: net.map(Math.round) };
});
const result = {
  description: 'Standalone shared-constructor cost; database, hydration, Express, and JSON serialization excluded.',
  generated_at: new Date().toISOString(),
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  design: { blocks: BLOCKS, iterations_per_block: ITERATIONS,
    warmup_iterations_per_case: WARMUP,
    estimator: 'median net ns/call after subtracting median identity-loop cost; p95 across blocks',
    fixture: 'seed-realistic; range=20 rows; deep fetch=10 comments; Date and BigInt conversion',
    limitation: 'single-process development-host microbenchmark; HTTP p50 is a scale reference, not causal decomposition' },
  identity_loop_median_ns: Math.round(identityMedianNs), measurements, sink,
};
await writeFile(join(resultsDir, 'canonicalization-cost.json'),
  JSON.stringify(result, null, 2) + '\n');
const rows = measurements.map((m) => '    ' + m.operation + ' & ' + m.fixture + ' & ' +
  (m.median_ns / 1000).toFixed(2) + ' & ' + (m.p95_block_ns / 1000).toFixed(2) + ' & ' +
  m.fastest_primary_p50_ms + ' & ' + m.share_of_fastest_primary_p50_pct.toFixed(3) + '\\% \\\\').join('\n');
const tex = '% auto-generated by scripts/gen-canonicalization-table.mjs\n' +
'\\begin{table}[htbp]\n\\centering\\footnotesize\n' +
'\\caption{Standalone cost of the shared canonical constructors on seed-realistic fixtures ' +
'(30 timed blocks; 50,000 calls per block; median net cost after subtracting the identity-loop median). ' +
 'The p95-block column describes between-block variation. The final columns compare the constructor ' +
 'median with the smallest median HTTP p50 in the corresponding primary-campaign pattern, only as a scale reference. ' +
 'Database access, layer hydration, Express, and JSON serialization are excluded.}\n' +
'\\label{tab:canonicalization_cost}\n\\begin{adjustbox}{max width=\\textwidth}\n' +
'\\begin{tabular}{l l r r r r}\n\\toprule\nOperation & Fixture & Median ($\\mu$s) & ' +
'p95 block ($\\mu$s) & Fastest HTTP p50 (ms) & Share \\\\\n\\midrule\n' + rows +
'\n\\bottomrule\n\\end{tabular}\n\\end{adjustbox}\n\\end{table}\n';
await writeFile(join(tablesDir, 'canonicalization_cost.tex'), tex);
console.log(JSON.stringify({ identityMedianNs: Math.round(identityMedianNs),
  measurements: measurements.map(({ block_samples_ns, ...m }) => m), sink }, null, 2));
