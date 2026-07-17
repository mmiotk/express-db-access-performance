# R5 final numbers (auto-dumped from results/)

## Per-pattern rankings + spreads (rps, n=25)

### postgres
- **point_read**: native-rel 2.78x, max/min 2.78x | pg 6835 > knex 4942 > drizzle 4199 > typeorm 4185 > objection 3977 > sequelize 3518 > prisma 3255 > mikroorm 2455
- **range_scan**: native-rel 4.21x, max/min 4.21x | pg 3811 > knex 3220 > drizzle 2780 > objection 2686 > typeorm 2564 > sequelize 2478 > prisma 2443 > mikroorm 905
- **deep_fetch**: native-rel 7.15x, max/min 7.15x | pg 3687 > knex 2487 > drizzle 1865 > typeorm 1204 > prisma 1186 > objection 1028 > sequelize 991 > mikroorm 516
- **aggregation**: native-rel 1.83x, max/min 1.83x | pg 6978 > drizzle 6280 > typeorm 6098 > mikroorm 5745 > knex 5666 > sequelize 4813 > prisma 4408 > objection 3812
- **write**: native-rel 3.23x, max/min 3.23x | pg 6402 > knex 4841 > drizzle 4085 > objection 3907 > prisma 2774 > sequelize 2732 > typeorm 2648 > mikroorm 1979

### mysql
- **point_read**: native-rel 2.11x, max/min 2.11x | mysql2 4368 > knex 3814 > objection 3275 > typeorm 3059 > drizzle 2928 > sequelize 2764 > prisma 2074 > mikroorm 2067
- **range_scan**: native-rel 3.85x, max/min 3.85x | mysql2 3295 > knex 2995 > objection 2582 > typeorm 2262 > drizzle 2165 > sequelize 2105 > prisma 1538 > mikroorm 856
- **deep_fetch**: native-rel 4.96x, max/min 4.96x | mysql2 2382 > knex 2007 > drizzle 1318 > typeorm 1017 > sequelize 886 > objection 834 > prisma 634 > mikroorm 480
- **aggregation**: native-rel 1.72x, max/min 1.72x | mysql2 3994 > knex 3842 > typeorm 3767 > mikroorm 3741 > drizzle 3520 > sequelize 3216 > objection 2763 > prisma 2328
- **write**: native-rel 1.98x, max/min 1.98x | mysql2 1753 > drizzle 1730 > objection 1728 > knex 1670 > sequelize 1478 > typeorm 1345 > mikroorm 1257 > prisma 886

## CPU (app %, n=25) — the key change (was Prisma ~498%)
- MAX app-CPU across all 90 cells: 110%
- postgres deep_fetch: prisma cpu=105% (db 60%), native cpu=100% (db 355%)
- mysql deep_fetch: prisma cpu=105% (db 60%), native cpu=105% (db 85%)

## Read-vs-write engine transfer (Spearman rho over 7 portable layers)
- point_read: rho=0.86
- range_scan: rho=0.89
- deep_fetch: rho=0.86
- aggregation: rho=0.64
- write: rho=0.68

## Equal-CPU control (rps at 1/2/4 cores) — was Prisma 896->3025
- pg: 1core 3689, 2core 3688, 4core 3687
- prisma: 1core 1079, 2core 1052, 4core 1219
- mikroorm: 1core 446, 2core 495, 4core 522

## Utilization (deep-fetch p99 ms at 50/70/85/95% of own capacity)

### postgres
- pg: 50%->3.9ms 70%->3.1ms 85%->4ms 95%->5.9ms
- knex: 50%->2.4ms 70%->3.2ms 85%->3.5ms 95%->54ms
- drizzle: 50%->3.8ms 70%->8.8ms 85%->30.9ms 95%->7.4ms
- prisma: 50%->4.2ms 70%->7.8ms 85%->18.8ms 95%->77.5ms
- sequelize: 50%->2.5ms 70%->4.3ms 85%->7.7ms 95%->11.8ms
- typeorm: 50%->3.1ms 70%->3.7ms 85%->7.9ms 95%->37.1ms
- objection: 50%->3.1ms 70%->3.1ms 85%->6.2ms 95%->284.6ms
- mikroorm: 50%->3.9ms 70%->4.9ms 85%->5.5ms 95%->7.5ms

### mysql
- mysql2: 50%->4.2ms 70%->7.7ms 85%->20.9ms 95%->39.7ms
- knex: 50%->1.9ms 70%->2.7ms 85%->13.7ms 95%->4.1ms
- drizzle: 50%->3.7ms 70%->6.1ms 85%->14.9ms 95%->17.6ms
- prisma: 50%->5.2ms 70%->5.6ms 85%->11.9ms 95%->51.4ms
- sequelize: 50%->2.5ms 70%->3.2ms 85%->6.8ms 95%->21ms
- typeorm: 50%->2.8ms 70%->3.6ms 85%->3ms 95%->36.5ms
- objection: 50%->2.9ms 70%->3.2ms 85%->3.7ms 95%->32.9ms
- mikroorm: 50%->4ms 70%->4.2ms 85%->8.7ms 95%->31.2ms

## Same-SQL control (sameplan.json: idiomatic vs raw)
  {"cells":[{"adapter":"pg","engine":"postgres","rps":3625,"p99":21,"idiomatic":3687,"agree":true,"rps_samples":[3692,3610,3467,3639,3566,3589,3668,3670,3580,3715],"reps":10},{"adapter":"pg-tuned","engine":"postgres","rps":3741,"p99":19,"idiomatic":3746,"agree":true,"rps_samples":[3730,3502,3622,3751,3497,3801,3612,3807,3797,3821],"reps":10},{"adapter":"knex","engine":"postgres","rps":2926,"p99":25,"idiomatic":2487,"agree":true,"rps_samples":[2796,3026,2922,2940,2934,2930,2909,2952,2910,2909],"reps":10},{"adapter":"drizzle","engine":"postgres","rps":3237,"p99":23,"idiomatic":1865,"agree":true,"rps_samples":[3169,3043,3171,3289,3228,3340,3312,3447,3193,3245],"reps":10},{"adapter":"prisma","engine":"postgres","rps":2155,"p99":32,"idiomatic":1186,"agree":true,"rps_samples":[1898,1925,2198,2190,

## Cluster (multi-worker; was: native overtakes Prisma once cores used)
  [{"engine":"postgres","adapter":"pg","workers":1,"rps_med":3299,"p99_med":18,"rps_samples":[3299,3299,3223]},{"engine":"postgres","adapter":"pg","workers":2,"rps_med":4055,"p99_med":19,"rps_samples":[4053,4055,4062]},{"engine":"postgres","adapter":"pg","workers":4,"rps_med":3961,"p99_med":26,"rps_samples":[3914,3961,3979]},{"engine":"postgres","adapter":"prisma","workers":1,"rps_med":1117,"p99_med":54,"rps_samples":[1111,1138,1117]},{"engine":"postgres","adapter":"prisma","workers":2,"rps_med":2275,"p99_med":28,"rps_samples":[2235,2285,2275]},{"engine":"postgres","adapter":"prisma","workers":4,"rps_med":4449,"p99_med":20,"rps_samples":[4362,4473,4449]},{"engine":"postgres","adapter":"mikroor

## Fan-out (deep-fetch spread vs comment count)
  [{"adapter":"pg","engine":"postgres","fanout":0,"rps":4702,"p99":15,"rps_samples":[4661,4943,4702]},{"adapter":"pg","engine":"postgres","fanout":1,"rps":4806,"p99":16,"rps_samples":[4809,4629,4806]},{"adapter":"pg","engine":"postgres","fanout":10,"rps":3867,"p99":15,"rps_samples":[3989,3688,3867]},{"adapter":"pg","engine":"postgres","fanout":50,"rps":2145,"p99":29,"rps_samples":[2145,2153,2118]},{"adapter":"pg","engine":"postgres","fanout":100,"rps":1351,"p99":48,"rps_samples":[1351,1328,1371]},
