// Central configuration for the harness. Everything is overridable via env so
// the benchmark matrix (bench/runner.mjs) can drive a single server binary.

const int = (v, d) => (v === undefined || v === '' ? d : Number.parseInt(v, 10));

export const ENGINES = ['postgres', 'mysql'];

// Full access-layer taxonomy under test. `category` groups them for the paper's
// tables: native driver -> query builder -> ORM.
export const ADAPTERS = {
  pg:        { category: 'native-driver', engines: ['postgres'] },
  mysql2:    { category: 'native-driver', engines: ['mysql'] },
  knex:      { category: 'query-builder', engines: ['postgres', 'mysql'] },
  drizzle:   { category: 'orm-lightweight', engines: ['postgres', 'mysql'] },
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

  // Seed sizing (rows). Kept modest so the working set fits in shared_buffers /
  // buffer pool — the benchmark targets access-layer overhead, not disk I/O.
  seed: {
    authors: int(process.env.SEED_AUTHORS, 1000),
    posts: int(process.env.SEED_POSTS, 20000),
    commentsPerPost: int(process.env.SEED_COMMENTS_PER_POST, 10),
  },
};

// Prisma consumes a single URL. Build it from the same parts so all layers agree.
export function connectionUrl(engine = config.engine) {
  if (engine === 'postgres') {
    const c = config.postgres;
    return `postgresql://${c.user}:${c.password}@${c.host}:${c.port}/${c.database}`;
  }
  const c = config.mysql;
  return `mysql://${c.user}:${c.password}@${c.host}:${c.port}/${c.database}`;
}
