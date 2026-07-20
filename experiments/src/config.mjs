// Central configuration for the harness. Everything is overridable via env so
// the benchmark matrix (bench/runner.mjs) can drive a single server binary.
//
// Timezone: the whole harness runs in UTC. Drivers disagree on whether a
// timestamp-without-time-zone / DATETIME value is local or UTC time; pinning
// TZ=UTC before any driver is imported makes every client's interpretation
// coincide, so canonical timestamps are byte-identical across layers (enforced
// by bench/verify.mjs).
process.env.TZ = process.env.TZ || 'UTC';

const int = (v, d) => (v === undefined || v === '' ? d : Number.parseInt(v, 10));

export const ENGINES = ['postgres', 'mysql'];

// Full access-layer taxonomy under test. `category` groups them for the paper's
// tables: native driver -> query builder -> ORM.
export const ADAPTERS = {
  pg:        { category: 'native-driver', engines: ['postgres'] },
  mysql2:    { category: 'native-driver', engines: ['mysql'] },
  'pg-tuned':     { category: 'native-tuned', engines: ['postgres'] }, // named prepared statements
  'mysql2-tuned': { category: 'native-tuned', engines: ['mysql'] },    // binary protocol, execute()
  knex:      { category: 'query-builder', engines: ['postgres', 'mysql'] },
  drizzle:   { category: 'orm', engines: ['postgres', 'mysql'] },
  prisma:    { category: 'orm',            engines: ['postgres', 'mysql'] },
  sequelize: { category: 'orm',            engines: ['postgres', 'mysql'] },
  typeorm:   { category: 'orm',            engines: ['postgres', 'mysql'] },
  objection: { category: 'orm',            engines: ['postgres', 'mysql'] }, // built on knex
  mikroorm:  { category: 'orm',            engines: ['postgres', 'mysql'] },
};

export const config = {
  engine: process.env.ENGINE || 'postgres',
  adapter: process.env.ADAPTER || 'pg',
  port: int(process.env.PORT, 3000),

  // Connection pool — held constant across adapters so the comparison isolates
  // the access layer, not pool tuning. See METHODOLOGY / paper threats section.
  pool: {
    min: int(process.env.POOL_MIN, 10),
    max: int(process.env.POOL_MAX, 10),
  },

  postgres: {
    host: process.env.PGHOST || '127.0.0.1',
    port: int(process.env.PGPORT, 5432),
    user: process.env.PGUSER || 'bench',
    password: process.env.PGPASSWORD || 'bench',
    database: process.env.PGDATABASE || 'bench',
  },
  mysql: {
    host: process.env.MYSQLHOST || '127.0.0.1',
    port: int(process.env.MYSQLPORT, 3306),
    user: process.env.MYSQLUSER || 'bench',
    password: process.env.MYSQLPASSWORD || 'bench',
    database: process.env.MYSQLDATABASE || 'bench',
  },

  // Seed sizing (rows). Kept so the working set fits in shared_buffers / buffer
  // pool — the benchmark targets access-layer overhead, not disk I/O.
  seed: {
    authors: int(process.env.SEED_AUTHORS, 2000),
    posts: int(process.env.SEED_POSTS, 100000),
    commentsPerPost: int(process.env.SEED_COMMENTS_PER_POST, 10),
  },
};

// Prisma consumes a single URL. Build it from the same parts so all layers agree,
// and pin Prisma's pool to the same size as every other adapter (`connection_limit`);
// without this, Prisma defaults to num_cpus*2+1, silently giving it a larger pool.
export function connectionUrl(engine = config.engine) {
  const q = `?connection_limit=${config.pool.max}`;
  if (engine === 'postgres') {
    const c = config.postgres;
    return `postgresql://${c.user}:${c.password}@${c.host}:${c.port}/${c.database}${q}`;
  }
  const c = config.mysql;
  return `mysql://${c.user}:${c.password}@${c.host}:${c.port}/${c.database}${q}`;
}
