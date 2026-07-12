// Fan-out seeding (revision E1.12 / review 6.10): adds six dedicated posts with
// EXACT comment counts [0, 1, 10, 50, 100, 500] at fixed ids 250001..250006 on BOTH
// engines, then bumps the posts id sequence/AUTO_INCREMENT to 300000 so benchmark
// inserts stay above a clean floor. After running this: (1) re-run
// make-seed-template.mjs so PG write-rebuilds retain the fan-out rows, and
// (2) run campaigns with RESET_FLOOR=300000.
import pg from 'pg';
import mysql from 'mysql2/promise';
import { config } from '../src/config.mjs';

const FANOUT = [0, 1, 10, 50, 100, 500];
const BASE_ID = 250001;
const AUTHOR = 1000;
const NA = config.seed.authors;

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd = mulberry32(0xfa0);
const pick = () => 1 + Math.floor(rnd() * NA);

// PostgreSQL
{
  const c = new pg.Client(config.postgres); await c.connect();
  await c.query('DELETE FROM comments WHERE post_id >= $1', [BASE_ID]);
  await c.query('DELETE FROM posts WHERE id >= $1', [BASE_ID]);
  for (let i = 0; i < FANOUT.length; i++) {
    const id = BASE_ID + i, n = FANOUT[i];
    await c.query('INSERT INTO posts(id, author_id, title, body, views) VALUES ($1,$2,$3,$4,0)',
      [id, AUTHOR, `Fanout post ${n}`, `Body of fanout post with ${n} comments. `.repeat(2)]);
    for (let batch = 0; batch < n; batch += 100) {
      const m = Math.min(100, n - batch);
      const vals = Array.from({ length: m }, (_, k) => `($1, ${pick()}, 'Fanout comment ${batch + k + 1}. ')`).join(',');
      await c.query(`INSERT INTO comments(post_id, author_id, body) VALUES ${vals}`.replaceAll('$1', String(id)));
    }
  }
  await c.query("SELECT setval('posts_id_seq', 300000)");
  const { rows } = await c.query('SELECT p.id, count(c.id) n FROM posts p LEFT JOIN comments c ON c.post_id=p.id WHERE p.id>=$1 GROUP BY p.id ORDER BY p.id', [BASE_ID]);
  console.log('PG fanout:', rows.map((r) => `${r.id}=${r.n}`).join(' '));
  await c.end();
}
// MySQL
{
  const c = await mysql.createConnection(config.mysql);
  await c.query('DELETE FROM comments WHERE post_id >= ?', [BASE_ID]);
  await c.query('DELETE FROM posts WHERE id >= ?', [BASE_ID]);
  for (let i = 0; i < FANOUT.length; i++) {
    const id = BASE_ID + i, n = FANOUT[i];
    await c.query('INSERT INTO posts(id, author_id, title, body, views) VALUES (?,?,?,?,0)',
      [id, AUTHOR, `Fanout post ${n}`, `Body of fanout post with ${n} comments. `.repeat(2)]);
    for (let batch = 0; batch < n; batch += 100) {
      const m = Math.min(100, n - batch);
      const vals = Array.from({ length: m }, (_, k) => [id, pick(), `Fanout comment ${batch + k + 1}. `]);
      await c.query('INSERT INTO comments(post_id, author_id, body) VALUES ?', [vals]);
    }
  }
  await c.query('ALTER TABLE posts AUTO_INCREMENT = 300001');
  const [rows] = await c.query('SELECT p.id, count(c.id) n FROM posts p LEFT JOIN comments c ON c.post_id=p.id WHERE p.id>=? GROUP BY p.id ORDER BY p.id', [BASE_ID]);
  console.log('MySQL fanout:', rows.map((r) => `${r.id}=${r.n}`).join(' '));
  await c.end();
}
console.log('NOTE: re-run scripts/make-seed-template.mjs (PG) and use RESET_FLOOR=300000 in campaigns.');
