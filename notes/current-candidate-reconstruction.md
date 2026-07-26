# Current revision-candidate computational reconstruction

Date: 26 July 2026.

This is an author-run, same-host reconstruction of the current revision
candidate from archived measurements. It is not an independent third-party
reproduction and does not re-execute any database benchmark.

## Isolation and inputs

The candidate file set was obtained with `git ls-files --cached --others
--exclude-standard`, while excluding Git metadata, `experiments/rejected/`,
PDF/ZIP build products, and installed dependencies. The 396-file set was
written to a tar archive and extracted into a fresh `/tmp` directory. The
installed dependency tree was copied separately. No PostgreSQL or MySQL server
was started, and no source or data file was read from the development checkout
during regeneration.

## Results

1. `sha256sum -c results/checksums.sha256` verified **60/60** candidate JSON
   inputs.
2. The complete no-database command chain in `REPRODUCE.md` exited with status
   zero.
3. It rewrote 33 distinct `experiments/results/tables/*.tex` outputs, two
   additional tables rendered directly under `paper/tables/`, and four derived
   analysis JSON files.
4. Recursive byte comparison of both table directories against the frozen
   candidate produced no differences. Direct `cmp` checks for
   `analysis2.json`, `rq2-campaign-comparison.json`,
   `rq2-corrected-full.json`, and
   `rq2-corrected-interaction-tests.json` also produced no differences.

Therefore the current candidate's standalone analytical outputs are
bit-reconstructible from the archived measurements and committed generators.
The seven run-coupled outputs, the statement-log-derived query-count table,
and authored analytical tables retain the distinct status labels defined in
`experiments/MANIFEST.md`.
