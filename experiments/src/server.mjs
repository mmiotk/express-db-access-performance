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

// 2. range scan / pagination
app.get('/posts', h(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  res.json(await db.listPosts({ limit, offset }));
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
