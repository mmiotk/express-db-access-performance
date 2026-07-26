#!/usr/bin/env bash
# Separate same-host RQ2 validation campaign requested in the IST revision.
# Seven portable treatments × two backend stacks × three reviewer-prioritized access patterns,
# with the primary campaign's 15 s warm-up, 12 s
# measurement, and 25 randomized blocks. Engine-incompatible native drivers
# are skipped by the runner.
set -euo pipefail

DBBENCH_BIN="${DBBENCH_BIN:-$HOME/miniforge3/envs/dbbench/bin}"
DBBENCH_ROOT="${DBBENCH_ROOT:-$HOME/.local/share/express-db-bench}"
RQ2_REPLICATES="${RQ2_REPLICATES:-25}"
RQ2_DURATION="${RQ2_DURATION:-12}"
RQ2_WARMUP="${RQ2_WARMUP:-15}"
mysql_pid=""

cleanup() {
  if [[ -n "$mysql_pid" ]] && kill -0 "$mysql_pid" 2>/dev/null; then
    kill "$mysql_pid"
    wait "$mysql_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if ! "$DBBENCH_BIN/pg_isready" -h 127.0.0.1 -p 5432 -d bench >/dev/null 2>&1; then
  "$DBBENCH_BIN/pg_ctl" -D "$DBBENCH_ROOT/pg" -l "$DBBENCH_ROOT/pg.log" \
    -o "-p 5432 -k /tmp -c listen_addresses=127.0.0.1 -c shared_buffers=512MB" start
fi

if ! node -e "const m=require('mysql2/promise');m.createConnection({host:'127.0.0.1',port:3306,user:'bench',password:'bench',database:'bench'}).then(c=>c.end()).catch(()=>process.exit(1))"; then
  "$DBBENCH_BIN/mysqld" \
    --datadir="$DBBENCH_ROOT/mysql" \
    --socket=/tmp/mysql-bench.sock \
    --port=3306 \
    --bind-address=127.0.0.1 \
    --mysqlx=OFF \
    --innodb-buffer-pool-size=512M \
    --max-connections=200 \
    > results/mysql-rq2-validation-campaign.log 2>&1 &
  mysql_pid=$!
  for _ in $(seq 1 60); do
    if node -e "const m=require('mysql2/promise');m.createConnection({host:'127.0.0.1',port:3306,user:'bench',password:'bench',database:'bench'}).then(c=>c.end()).catch(()=>process.exit(1))"; then
      break
    fi
    sleep 1
  done
fi

# Repeat the complete admission chain so this later campaign does not inherit
# unverified mutable state or stale admission outputs from the primary campaign.
npm test
npm run verify:spec
npm run verify:fixed
npm run verify:property
npm run verify:writes
NORMALIZE=1 npm run verify:campaign-state
npm run verify:seed-parity
ENV_OUT=environment-rq2-validation-campaign node bench/environment.mjs
CAMPAIGN_SCRIPT=scripts/rq2-validation-campaign.sh CAMPAIGN_ID=rq2-validation-campaign node scripts/capture-measurement-source.mjs

env \
  ADAPTERS=knex,drizzle,prisma,sequelize,typeorm,objection,mikroorm \
  ENGINES=postgres,mysql \
  ENDPOINTS=deep_fetch,aggregation,write \
  INDEP=1 \
  REPLICATES="$RQ2_REPLICATES" \
  DURATION="$RQ2_DURATION" \
  WARMUP="$RQ2_WARMUP" \
  RESET_FLOOR=300000 \
  REBUILD_WRITES=1 \
  PREFLIGHT=1 \
  INDEP_OUT=rq2-validation-campaign \
  CAMPAIGN_ID=rq2-validation-campaign \
  ORDER_SEED=20260724 \
  node bench/runner.mjs

npm run verify:campaign-state
npm run verify:seed-parity
