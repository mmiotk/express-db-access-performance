#!/usr/bin/env bash
# User-space PostgreSQL + MySQL for the benchmark WITHOUT Docker/root, via a conda
# env. Mirrors docker-compose.yml (ports 5432/3306, user/pass/db = bench). This is
# the path used for the runs reported in the paper; the versions are pinned to the
# ones characterized there (PostgreSQL 18.4, MySQL 9.7.1).
#
#   conda create -y -n dbbench -c conda-forge postgresql=18.4 mysql-server=9.7.1
#   ./scripts/db-local.sh start|stop|status|init
#
# `init` wipes and recreates both data dirs + the bench role/db (first-time setup).
set -euo pipefail

ENVBIN="${DBBENCH_BIN:-$HOME/miniforge3/envs/dbbench/bin}"
ROOT="$HOME/.local/share/express-db-bench"
PGDATA="$ROOT/pg"; MYDATA="$ROOT/mysql"
MYSOCK="/tmp/mysql-bench.sock"
export PATH="$ENVBIN:$PATH"

# Durability is NOT forced here: both engines boot at their defaults (fsync on,
# flush per commit) and scripts/set-durability.mjs switches regimes explicitly.
# (The original harness pinned fsync=off etc. on the command line, which silently
# overrode ALTER SYSTEM; revision E3 measures writes under DEFAULT durability.)
pg_start() {
  pg_ctl -D "$PGDATA" -l "$ROOT/pg.log" \
    -o "-p 5432 -k /tmp -c listen_addresses=127.0.0.1 -c shared_buffers=512MB" \
    start
}
my_start() {
  nohup mysqld --datadir="$MYDATA" --socket="$MYSOCK" --port=3306 --bind-address=127.0.0.1 \
    --mysqlx=OFF --innodb-buffer-pool-size=512M \
    --max-connections=200 > "$ROOT/mysql.log" 2>&1 &
  for _ in $(seq 1 30); do [ -S "$MYSOCK" ] && break; sleep 1; done
}

case "${1:-}" in
  init)
    mkdir -p "$ROOT"; rm -rf "$PGDATA" "$MYDATA"
    initdb -D "$PGDATA" -U bench --auth-local=trust --auth-host=trust --encoding=UTF8
    pg_start; sleep 3
    psql -h 127.0.0.1 -p 5432 -U bench -d postgres -c "ALTER USER bench PASSWORD 'bench';"
    createdb -h 127.0.0.1 -p 5432 -U bench bench
    mkdir -p "$MYDATA"; mysqld --initialize-insecure --datadir="$MYDATA" --user="$(whoami)"
    my_start
    node -e "const m=require('mysql2/promise');(async()=>{const c=await m.createConnection({socketPath:'$MYSOCK',user:'root',multipleStatements:true});await c.query(\"CREATE DATABASE IF NOT EXISTS bench CHARACTER SET utf8mb4;CREATE USER IF NOT EXISTS 'bench'@'%' IDENTIFIED BY 'bench';CREATE USER IF NOT EXISTS 'bench'@'localhost' IDENTIFIED BY 'bench';GRANT ALL ON bench.* TO 'bench'@'%';GRANT ALL ON bench.* TO 'bench'@'localhost';FLUSH PRIVILEGES;\");await c.end();})()"
    echo "initialized. postgres:5432 mysql:3306 (bench/bench/bench)" ;;
  start) pg_start; my_start; echo "started" ;;
  stop)
    pg_ctl -D "$PGDATA" stop || true
    [ -S "$MYSOCK" ] && mysqladmin --socket="$MYSOCK" -u root shutdown 2>/dev/null || pkill -f "mysqld .*$MYDATA" || true
    echo "stopped" ;;
  status)
    pg_ctl -D "$PGDATA" status || true
    [ -S "$MYSOCK" ] && echo "mysql: socket up" || echo "mysql: down" ;;
  *) echo "usage: $0 init|start|stop|status"; exit 1 ;;
esac
