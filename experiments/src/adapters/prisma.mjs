// ORM — Prisma Client. Deep fetch uses `include` (Prisma issues batched queries,
// no N+1). Aggregation uses $queryRaw for parity with the native baseline.
//
// IMPORTANT: run `npm run prisma:generate` (postgres) or with ENGINE=mysql before
// this cell — Prisma's client is engine-specific and generated ahead of time.
// BigInt ids are serialized to Number for JSON parity with the other adapters.

export default async function createAdapter({ engine, config }) {
  process.env.DATABASE_URL = (await import('../config.mjs')).connectionUrl(engine);
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  const n = (v) => (typeof v === 'bigint' ? Number(v) : v);
  const post = (p) => (p ? { ...p, id: n(p.id), author_id: n(p.author_id) } : p);

  return {
    name: 'prisma',
    category: 'orm',

    async getPost(id) {
      return post(await prisma.post.findUnique({ where: { id: BigInt(id) } }));
    },

    async listPosts({ limit, offset }) {
      const rows = await prisma.post.findMany({
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: limit, skip: offset,
      });
      return rows.map(post);
    },

    async getThread(id) {
      const p = await prisma.post.findUnique({
        where: { id: BigInt(id) },
        include: { author: true, comments: { include: { author: true }, orderBy: { id: 'asc' } } },
      });
      if (!p) return null;
      return {
        post: { id: n(p.id), title: p.title, body: p.body, views: p.views, created_at: p.created_at },
        author: { id: n(p.author.id), name: p.author.name, email: p.author.email },
        comments: p.comments.map((c) => ({
          id: n(c.id), body: c.body, created_at: c.created_at,
          author: { id: n(c.author.id), name: c.author.name, email: c.author.email },
        })),
      };
    },

    async authorSummary(id) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT a.id AS author_id,
                COUNT(p.id) AS posts,
                COALESCE(SUM(p.views),0) AS views,
                COALESCE(SUM(cc.cnt),0) AS comments
           FROM authors a
           LEFT JOIN posts p ON p.author_id = a.id
           LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM comments GROUP BY post_id) cc
                  ON cc.post_id = p.id
          WHERE a.id = ${engine === 'postgres' ? '$1' : '?'}
          GROUP BY a.id`, id);
      const r = rows[0];
      if (!r) return null;
      return { author_id: n(r.author_id), posts: Number(r.posts), comments: Number(r.comments), views: Number(r.views || 0) };
    },

    async createPost({ authorId, title, body }) {
      const row = await prisma.post.create({ data: { author_id: BigInt(authorId), title, body } });
      return { id: n(row.id) };
    },

    async close() { await prisma.$disconnect(); },
  };
}
