# Archived treatment-selection documentation

This directory makes the documentation-selected treatment auditable without relying
on the current documentation websites.

- manifest.json records the freeze date, exact source URL, selection priority,
  Internet Archive capture timestamp and URL, SHA-256, byte length, and evidence
  terms for every layer.
- pages/*.html are the exact responses returned by the Wayback raw replay URL.
  All nine entries are captures at or before the 2026-07-15 freeze; none is a
  post-freeze live fallback.
- ../scripts/archive-documentation.mjs regenerates the archive. A regenerated
  response must be reviewed before replacing committed evidence because replay
  headers or archive behavior can change even when the underlying capture does not.

Contradictory official pages are resolved in this order: the page matching the pinned
stable major version; the relation/eager-loading section over quick-start or marketing
material; then first presentation within that section. Equal prominence uses the
predeclared taxonomy-tier tie-break. If that still fails, the assignment is marked
ambiguous and both treatments must be predeclared; it is not resolved after observing
performance.

The preserved page state is evidence for its recorded capture timestamp, not proof that
the page was unchanged on every day through the freeze. This limitation is explicit in
manifest.json and the manuscript.
