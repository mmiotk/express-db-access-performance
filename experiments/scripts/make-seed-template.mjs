// One-time bootstrap for the write-state rebuild: snapshot the CURRENT seeded
// `bench` database into a `bench_seed` TEMPLATE database. rebuildDb() then restores
// `bench` from it (file-level copy) before every measured write run. Re-run this
// script after any change to the seed (it re-snapshots whatever `bench` holds — run
// it only on a freshly seeded, unmodified database).
import pg from 'pg';
import { config } from '../src/config.mjs';

const admin = new pg.Client({ ...config.postgres, database: 'postgres' });
await admin.connect();
// template creation requires no active connections to the source db
const { rows } = await admin.query(
  "SELECT count(*) c FROM pg_stat_activity WHERE datname = 'bench' AND pid <> pg_backend_pid()");
if (Number(rows[0].c) > 0) {
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='bench' AND pid <> pg_backend_pid()");
}
await admin.query('DROP DATABASE IF EXISTS bench_seed');
await admin.query('CREATE DATABASE bench_seed TEMPLATE bench');
const size = await admin.query("SELECT pg_size_pretty(pg_database_size('bench_seed')) s");
console.log(`bench_seed template created (${size.rows[0].s})`);
await admin.end();
