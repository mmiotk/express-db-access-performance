// Multi-worker launcher (review 4, §6.5). Forks WORKERS copies of the UNCHANGED
// src/server.mjs via node:cluster; the workers share the listening socket, so the
// same benchmark hits an N-worker deployment. Used by scripts/cluster.mjs to test
// whether Prisma's single-core-pool parity survives once the other layers scale out
// to consume the idle cores. WORKERS defaults to 1 (identical to the single-process
// server), so nothing else in the harness changes.
import cluster from 'node:cluster';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const WORKERS = Number(process.env.WORKERS || 1);
cluster.setupPrimary({ exec: join(here, '..', 'src', 'server.mjs') });
for (let i = 0; i < WORKERS; i++) cluster.fork();
cluster.on('exit', (w, code, sig) => { if (code && code !== 0) console.error(`[cluster] worker ${w.process.pid} exited code=${code} sig=${sig}`); });
