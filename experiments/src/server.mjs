// Layer-agnostic Express server. Picks one adapter (ADAPTER env) against one
// engine (ENGINE env), mounts the five workload endpoints, and serves JSON.
// The benchmark runner boots one server process per (adapter, engine) cell.

import express from 'express';
import { config } from './config.mjs';

const adapterName = config.adapter;
const engine = config.engine;

const { default: createAdapter } = await import(`./adapters/${adapterName}.mjs`);
const db = await createAdapter({ engine, config });

const app = express();
app.use(express.json());

// tiny async wrapper so a rejected query becomes a 500 instead of a hang
const h = (fn) => (req, res) => fn(req, res).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: String(err && err.message || err) });
});

app.get('/health', (_req, res) => res.json({ ok: true, adapter: db.name, engine }));

// 1. point read
app.get('/posts/:id', h(async (req, res) => {
  const post = await db.getPost(Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'not found' });
  res.json(post);
}));

// 3. deep/nested fetch — declared before the ':id' range route is fine because
//    Express matches '/posts/:id/thread' distinctly.
app.get('/posts/:id/thread', h(async (req, res) => {
  const thread = await db.getThread(Number(req.params.id));
  if (!thread) return res.status(404).json({ error: 'not found' });
  res.json(thread);
}));

// 3b. same-plan deep-fetch control: the IDENTICAL two-statement plan and identical
//     row mapping executed through this layer's raw-SQL facility (adapters/_threadraw)
//     — isolates raw execution path from eager-loading strategy + hydration.
app.get('/posts/:id/thread-raw', h(async (req, res) => {
  const thread = await db.getThreadRaw(Number(req.params.id));
  if (!thread) return res.status(404).json({ error: 'not found' });
  res.json(thread);
}));

// 0. no-DB baseline: a fixed, representative thread-shaped payload (post + author +
//    10 comments, seed-realistic field sizes). Measures the Express + JSON floor of
//    the request round trip with the database untouched.
const BASELINE = {
  post: { id: 50000, title: 'Post 50000', body: 'Body of post 50000. '.repeat(4).trim(), views: 2500, created_at: '2026-07-01T12:00:00.000Z' },
  author: { id: 1000, name: 'Author 1000', email: 'author1000@example.com' },
  comments: Array.from({ length: 10 }, (_, i) => ({
    id: 500000 + i, body: `Comment ${i + 1} on post 50000. `.repeat(2).trim(), created_at: '2026-07-01T13:00:00.000Z',
    author: { id: 100 + i, name: `Author ${100 + i}`, email: `author${100 + i}@example.com` },
  })),
};
app.get('/baseline', (_req, res) => res.json(BASELINE));

// 2. range scan — keyset pagination by primary key (WHERE id < before). Uses the
//    PK index and is O(limit) regardless of depth, unlike large-OFFSET scans.
app.get('/posts', h(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const before = req.query.before ? Number(req.query.before) : Number.MAX_SAFE_INTEGER;
  res.json(await db.listPosts({ limit, before }));
}));

// 4. aggregation
app.get('/authors/:id/summary', h(async (req, res) => {
  const summary = await db.authorSummary(Number(req.params.id));
  if (!summary) return res.status(404).json({ error: 'not found' });
  res.json(summary);
}));

// 5. write
app.post('/posts', h(async (req, res) => {
  const { authorId, title, body } = req.body || {};
  const created = await db.createPost({
    authorId: Number(authorId) || 1,
    title: title || 'benchmark post',
    body: body || 'lorem ipsum',
  });
  res.status(201).json(created);
}));

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] adapter=${db.name} engine=${engine} pool=${config.pool.max} :${config.port}`);
});

async function shutdown() {
  server.close();
  await db.close();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
