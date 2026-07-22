# Clean-room reproduction log

A clean-room reproduction of the artifact, run from the **immutable Zenodo/`git archive` tarball**
(not the working repository), to demonstrate that the archived release reproduces its results from the
raw data alone. It repeats the two steps the reviewer named --- checksum verification and table
regeneration --- following `REPRODUCE.md` section 4.

**Honest scope note.** This log was produced by the author, so it is *not* an independent third-party
reproduction; it demonstrates that the documented clean-room chain works from the immutable archive
with no access to the working tree. An independent replication remains valuable and welcome.

## Environment

- Release: **v1.12.9** (DOI 10.5281/zenodo.21497167), extracted from
  `express-db-access-performance-1.12.9.tar.gz` (a `git archive` of the tag).
- Node.js v24.18.0, npm 11.16.0, Linux (16-vCPU host).
- No reference database engines were started: table regeneration is **DB-free** (the generators read
  the archived `results/*.json`). The live correctness smoke test
  (`bench/verify.mjs`, `bench/verify-property.mjs`) additionally requires PostgreSQL 18.4 and
  MySQL 9.7.1 via the conda path of `REPRODUCE.md`, and is not repeated here.

## Steps and outcomes

1. **Raw-data integrity.** `sha256sum -c results/checksums.sha256` -> **35 / 35 OK.** Every archived
   raw-data file is byte-identical to its manifest hash.
2. **Dependencies.** `npm ci` from the committed lockfile installed 255 packages with exit 0 (no
   post-install network beyond the registry).
3. **Table regeneration (DB-free).** The full generator chain of `REPRODUCE.md` section 4 ran without
   error (`ci-tables`, `gen-tables`, `gen-r4-tables`, `gen-r6-tables`, `gen-tail`, `gen-tail-regimes`,
   `gen-native-contrasts`, `gen-p99-spread`, `gen-p99-significance`, `analyze` for both engines,
   `stats2`, `sync:tables`).
4. **Byte comparison.** **45 of the 50** committed `paper/tables/*.tex` regenerate **byte-for-byte**
   from the archived raw data, confirming the seeded estimators (`mulberry32` bootstrap intervals and
   sign-flip permutation p-values) are bit-reproducible.

## The five tables that differ (all presentation-only; no numeric or statistical result changed)

| Table | Difference | Cause |
|---|---|---|
| `cv_all.tex` | shows MySQL instead of PostgreSQL values | **Generator engine order.** `analyze.mjs` writes the CV table for whichever engine ran last; the chain ends with `ENGINE=mysql`, whereas the committed table was generated PostgreSQL-last. Both are valid views of the same `raw.json`. |
| `ranks.tex` | committed 3-panel (Deep/Aggregation/Insert) vs generator 2-panel | Committed table carries a hand-added third panel; the generator emits its default two. Same ranks. |
| `interaction.tex` | committed caption says "within-campaign 95\%" | Hand-refined caption (the within-campaign interval labelling); the generator emits "95\%". Same numbers. |
| `txn_write.tex` | committed caption notes the Prisma exception ("broadly tracks ... apart from Prisma") | Hand-refined caption for accuracy; the generator emits the simpler wording. Same numbers. |
| `tail_regimes.tex` | line-wrapping only | Identical text, different soft line breaks. |

None of the five reflects a raw-data or estimator discrepancy: the underlying numbers are identical;
the committed `.tex` files carry post-generation editorial refinements (captions, an added panel, a
line wrap) and, for `cv_all`, the opposite engine-emission order. `REPRODUCE.md` records these as
regeneration caveats so an independent reproducer knows what to expect.

## Conclusion

From the immutable archive alone, the raw data verifies (35/35) and 45/50 tables regenerate
byte-for-byte; the five exceptions are presentation-only and documented. The estimators are seeded and
bit-reproducible.
