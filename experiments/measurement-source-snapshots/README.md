# Accepted-campaign measurement-source snapshots

These archives preserve the exact 42 source, schema, configuration, and
pre-campaign admission-evidence files hashed by each accepted campaign's source
manifest. They prevent later artifact maintenance from being mistaken for the
code that produced an already completed measurement campaign.

- `rq2-campaign2-corrected-state-source.tar.gz` corresponds to
  `results/source-manifest-rq2-campaign2-corrected-state.json`.
- `rq2-validation-campaign-source.tar.gz` corresponds to
  `results/source-manifest-rq2-validation-campaign.json`.

Verify the archive bytes, then extract and verify every member:

```bash
cd experiments/measurement-source-snapshots
sha256sum -c checksums.sha256
tmpdir=$(mktemp -d)
tar -xzf rq2-campaign2-corrected-state-source.tar.gz -C "$tmpdir"
node ../scripts/verify-source-snapshot.mjs "$tmpdir"
```

Repeat with the validation archive. Both embedded manifests verify 42/42 files.
These are author-preserved provenance snapshots, not independent reproduction.
