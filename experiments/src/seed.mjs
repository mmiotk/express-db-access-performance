// Deterministic seed via the native driver (no adapter involved). Batched multi-row
// inserts. Deterministic PRNG so every run of every engine gets identical data.
import { config } from './config.mjs';

const { authors: NA, posts: NP, commentsPerPost: NC } = config.seed;

// mulberry32 — small deterministic PRNG (no Math.random, so seeds are stable).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(42);
const pick = (n) => 1 + Math.floor(rand() * n); // 1..n inclusive

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function seedPostgres() {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool(config.postgres);

  await pool.query('TRUNCATE comments, posts, authors RESTART IDENTITY CASCADE');

  // authors
  for (const rows of chunk([...Array(NA).keys()], 500)) {
    const vals = rows.map((_, j) => `($${j * 2 + 1}, $${j * 2 + 2})`).join(',');
    const params = rows.flatMap((i) => [`Author ${i + 1}`, `author${i + 1}@bench.local`]);
    await pool.query(`INSERT INTO authors(name,email) VALUES ${vals}`, params);
  }

  // posts
  for (const rows of chunk([...Array(NP).keys()], 500)) {
    const vals = rows.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`).join(',');
    const params = rows.flatMap((i) => [pick(NA), `Post ${i + 1}`, `Body of post ${i + 1}. `.repeat(4), Math.floor(rand() * 5000)]);
    await pool.query(`INSERT INTO posts(author_id,title,body,views) VALUES ${vals}`, params);
  }

  // comments
  let cId = 0;
  const total = NP * NC;
  for (const rows of chunk([...Array(total).keys()], 500)) {
    const vals = rows.map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`).join(',');
    const params = rows.flatMap(() => { cId++; return [pick(NP), pick(NA), `Comment ${cId}`]; });
    await pool.query(`INSERT INTO comments(post_id,author_id,body) VALUES ${vals}`, params);
  }

  await pool.query('ANALYZE');
  await pool.end();
}

async function seedMysql() {
  const { default: mysql } = await import('mysql2/promise');
  const conn = await mysql.createConnection(config.mysql);

  await conn.query('SET FOREIGN_KEY_CHECKS=0');
  await conn.query('TRUNCATE comments'); await conn.query('TRUNCATE posts'); await conn.query('TRUNCATE authors');
  await conn.query('SET FOREIGN_KEY_CHECKS=1');

  for (const rows of chunk([...Array(NA).keys()], 500)) {
    const values = rows.map((i) => [`Author ${i + 1}`, `author${i + 1}@bench.local`]);
    await conn.query('INSERT INTO authors(name,email) VALUES ?', [values]);
  }
  for (const rows of chunk([...Array(NP).keys()], 500)) {
    const values = rows.map((i) => [pick(NA), `Post ${i + 1}`, `Body of post ${i + 1}. `.repeat(4), Math.floor(rand() * 5000)]);
    await conn.query('INSERT INTO posts(author_id,title,body,views) VALUES ?', [values]);
  }
  let cId = 0;
  const total = NP * NC;
  for (const rows of chunk([...Array(total).keys()], 500)) {
    const values = rows.map(() => { cId++; return [pick(NP), pick(NA), `Comment ${cId}`]; });
    await conn.query('INSERT INTO comments(post_id,author_id,body) VALUES ?', [values]);
  }
  await conn.query('ANALYZE TABLE authors, posts, comments');
  await conn.end();
}

const t0 = process.hrtime.bigint();
await (config.engine === 'postgres' ? seedPostgres() : seedMysql());
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(`[seed] ${config.engine}: ${NA} authors, ${NP} posts, ${NP * NC} comments in ${ms.toFixed(0)}ms`);
