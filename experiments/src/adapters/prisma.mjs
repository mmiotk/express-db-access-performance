// ORM — Prisma Client. Deep fetch uses `include` (Prisma issues batched queries,
// no N+1). Aggregation uses $queryRaw for parity with the native baseline.
//
// IMPORTANT: run `npm run prisma:generate` (postgres) or with ENGINE=mysql before
// this cell — Prisma's client is engine-specific and generated ahead of time.
// BigInt ids are serialized to Number for JSON parity with the other adapters.

import { THREAD_Q1, THREAD_Q2, mapThread } from './_threadraw.mjs';
import { canonPost, canonPosts, canonThread, canonThreadRows, canonSummary } from './_canon.mjs';

export default async function createAdapter({ engine, config }) {
  const c = engine === 'postgres' ? config.postgres : config.mysql;
  const { PrismaClient } = await import('@prisma/client');
  // Prisma 7 is Rust-free: the runtime connects through an official JS driver
  // adapter (pg for PostgreSQL, mariadb for MySQL — Prisma ships no mysql2
  // adapter), with the pool pinned to the shared size (Prisma would otherwise
  // default to num_cpus*2+1, silently giving it a larger pool).
  let adapter;
  if (engine === 'postgres') {
    const { PrismaPg } = await import('@prisma/adapter-pg');
    // Force the session to UTC so Prisma reads TIMESTAMPTZ with an unambiguous
    // +00 offset (matches the native pg baseline; otherwise the driver mislabels
    // the server-local rendering as UTC — a 2 h shift the cross-check catches).
    adapter = new PrismaPg({ host: c.host, port: c.port, user: c.user, password: c.password, database: c.database, max: config.pool.max, options: '-c timezone=UTC' });
  } else {
    const { PrismaMariaDb } = await import('@prisma/adapter-mariadb');
    adapter = new PrismaMariaDb({ host: c.host, port: c.port, user: c.user, password: c.password, database: c.database, connectionLimit: config.pool.max });
  }
  const prisma = new PrismaClient({ adapter });

  const n = (v) => (typeof v === 'bigint' ? Number(v) : v);
  const post = (p) => (p ? { ...p, id: n(p.id), author_id: n(p.author_id) } : p);

  return {
    name: 'prisma',
    category: 'orm',

    async getPost(id) {
      return canonPost(await prisma.post.findUnique({ where: { id: BigInt(id) } }));
    },

    async listPosts({ limit, before }) {
      const rows = await prisma.post.findMany({
        where: { id: { lt: BigInt(before) } }, orderBy: { id: 'desc' }, take: limit,
      });
      return canonPosts(rows);
    },

    async getThread(id) {
      const p = await prisma.post.findUnique({
        where: { id: BigInt(id) },
        include: { author: true, comments: { include: { author: true }, orderBy: { id: 'asc' } } },
      });
      return p ? canonThread(p, p.author, p.comments) : null;
    },

    // Same-plan control: identical SQL + identical mapping via $queryRawUnsafe.
    // Prisma's raw rows surface BIGSERIAL/BIGINT columns as JS BigInt, which
    // JSON.stringify rejects; coerce to Number (safe: ids < 2^53), matching the
    // JSON-compatible types every other layer hands to Express.
    async getThreadRaw(id) {
      const ph = engine === 'postgres' ? '$1' : '?';
      const fix = (r) => { const o = { ...r }; for (const k in o) if (typeof o[k] === 'bigint') o[k] = Number(o[k]); return o; };
      const postRows = await prisma.$queryRawUnsafe(THREAD_Q1(ph), id);
      if (!postRows[0]) return null;
      const commentRows = await prisma.$queryRawUnsafe(THREAD_Q2(ph), id);
      return mapThread(fix(postRows[0]), commentRows.map(fix));
    },

    async authorSummary(id) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT a.id AS author_id,
                (SELECT COUNT(*)               FROM posts p WHERE p.author_id = a.id) AS posts,
                (SELECT COALESCE(SUM(p.views),0) FROM posts p WHERE p.author_id = a.id) AS views,
                (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id
                   WHERE p.author_id = a.id) AS comments
           FROM authors a
          WHERE a.id = ${engine === 'postgres' ? '$1' : '?'}`, id);
      return canonSummary(rows[0]);
    },

    async createPost({ authorId, title, body }) {
      const row = await prisma.post.create({ data: { author_id: BigInt(authorId), title, body } });
      return { id: n(row.id) };
    },

    // Transactional multi-statement write (review 6.7): post + comments in one
    // interactive transaction, through Prisma's transaction facility.
    async createThread({ authorId, title, body, comments }) {
      return prisma.$transaction(async (tx) => {
        const post = await tx.post.create({ data: { author_id: BigInt(authorId), title, body } });
        await tx.comment.createMany({
          data: comments.map((c) => ({ post_id: post.id, author_id: BigInt(c.authorId), body: c.body })),
        });
        return { post_id: n(post.id), comments: comments.length };
      });
    },

    async close() { await prisma.$disconnect(); },
  };
}
