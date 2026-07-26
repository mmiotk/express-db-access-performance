// Preserve the exact official documentation pages used by the treatment rule.
// The latest Internet Archive capture not later than 2026-07-15 is preferred;
// a live-page fallback is explicitly marked and must not be called a freeze copy.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'documentation-snapshots');
const pageDir = join(outDir, 'pages');
await mkdir(pageDir, { recursive: true });
const freeze = '20260715';
const sources = [
  ['pg', 'https://node-postgres.com/features/queries', ['pool.query', 'parameterized']],
  ['mysql2', 'https://sidorares.github.io/node-mysql2/docs', ['Using Connection Pools', 'query']],
  ['knex', 'https://knexjs.org/guide/query-builder.html#join', ['Join Methods', 'join']],
  ['drizzle', 'https://orm.drizzle.team/docs/joins', ['Joins', 'innerJoin']],
  ['prisma', 'https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries', ['Nested reads', 'include']],
  ['sequelize', 'https://sequelize.org/docs/v6/advanced-association-concepts/eager-loading/', ['Eager Loading', 'include']],
  ['typeorm', 'https://typeorm.io/docs/working-with-entity-manager/find-options', ['relations', 'find']],
  ['objection', 'https://vincit.github.io/objection.js/guide/query-examples.html#eager-loading', ['Eager Loading', 'withGraphFetched']],
  ['mikroorm', 'https://mikro-orm.io/docs/populating-relations', ['Populating Relations', 'populate']],
];

const selectionPriority = [
  'Official documentation for the pinned stable major version.',
  'The page section dedicated to relations/eager loading controls over quick-start or marketing pages.',
  'Within that section, choose the API presented first.',
  'If equally prominent, use the declared documented-base-layer tie-break; if still unresolved, mark ambiguous and predeclare both treatments.'
];

const decisions = {
  pg: {
    tier: "native-driver", pinned_version: "8.22.0",
    selected_api: "pool.query() with two parameterized JOIN statements",
    alternatives: [], source_heading: "Queries", tie_break_applied: false,
    decision_basis: "No relation abstraction; use the documented parameterized native-query path."
  },
  mysql2: {
    tier: "native-driver", pinned_version: "3.23.0",
    selected_api: "pool.query() with two parameterized JOIN statements",
    alternatives: [], source_heading: "Using Connection Pools", tie_break_applied: false,
    decision_basis: "No relation abstraction; use the documented pooled native-query path."
  },
  knex: {
    tier: "query-builder", pinned_version: "3.3.0",
    selected_api: "builder .join() with two statements",
    alternatives: [], source_heading: "Join Methods", tie_break_applied: false,
    decision_basis: "No relation abstraction; use the documented join-builder path."
  },
  drizzle: {
    tier: "orm", pinned_version: "0.45.2",
    selected_api: "core builder .innerJoin() with two statements",
    alternatives: ["relational query API with nested with"], source_heading: "Joins",
    alternative_source_urls: ["https://orm.drizzle.team/docs/rqb", "https://orm.drizzle.team/docs/rqb-v2"],
    alternative_evidence_in_snapshot: "The preserved joins-page navigation lists Query and legacy Query V1 under Access your data.",
    tie_break_applied: true, ambiguous_after_tie_break: false,
    decision_basis: "Two co-prominent official paths; the preregistered documented-base-layer tie-break selects the core SQL-style builder and records the relation API."
  },
  prisma: {
    tier: "orm", pinned_version: "7.8.0",
    selected_api: "include nested reads with relationLoadStrategy query",
    alternatives: ["relationLoadStrategy join"], source_heading: "Nested reads",
    tie_break_applied: false, decision_basis: "The relation-query page presents nested include reads first; the join strategy is recorded as the official alternative."
  },
  sequelize: {
    tier: "orm", pinned_version: "6.37.8",
    selected_api: "include with separate false",
    alternatives: ["include with separate true"], source_heading: "Eager Loading",
    tie_break_applied: false, decision_basis: "The pinned stable-major eager-loading page leads with include; separate loading is recorded as the alternative."
  },
  typeorm: {
    tier: "orm", pinned_version: "1.1.0",
    selected_api: "find options relations with join loading",
    alternatives: ["relationLoadStrategy query"], source_heading: "Find Options",
    tie_break_applied: false, decision_basis: "The pinned documentation presents the relations find option; query loading is recorded as the alternative."
  },
  objection: {
    tier: "orm", pinned_version: "3.1.5",
    selected_api: ".withGraphFetched()",
    alternatives: [".withGraphJoined()"], source_heading: "Eager Loading",
    tie_break_applied: false, decision_basis: "The eager-loading section presents withGraphFetched before the documented joined alternative."
  },
  mikroorm: {
    tier: "orm", pinned_version: "7.1.6",
    selected_api: "populate with default joined strategy",
    alternatives: ["populate with select-in strategy"], source_heading: "Populating Relations",
    tie_break_applied: false, decision_basis: "The relations page presents populate with the default joined strategy; select-in is recorded as the alternative."
  },
};

if (process.argv.includes("--update-decisions")) {
  const manifestPath = join(outDir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.schema_version = 2;
  manifest.selection_priority = selectionPriority;
  manifest.pages = manifest.pages.map((page) => ({ ...page, decision: decisions[page.id] }));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log("Updated decision records for " + manifest.pages.length + " documentation snapshots without network access.");
  process.exit(0);
}

if (process.argv.includes('--verify')) {
  const manifest = JSON.parse(await readFile(join(outDir, 'manifest.json'), 'utf8'));
  const expected = new Map(sources.map(([id, sourceUrl, evidenceTerms]) => [id, { sourceUrl, evidenceTerms }]));
  if (manifest.schema_version !== 2) throw new Error("manifest schema_version must be 2");
  if (manifest.freeze_date !== "2026-07-15") throw new Error("manifest freeze date mismatch");
  if (JSON.stringify(manifest.selection_priority) !== JSON.stringify(selectionPriority)) {
    throw new Error("manifest selection priority mismatch");
  }
  if (!Array.isArray(manifest.pages) || manifest.pages.length !== sources.length) {
    throw new Error('manifest page count differs from the declared source list');
  }
  const seen = new Set();
  for (const page of manifest.pages) {
    if (seen.has(page.id) || !expected.has(page.id)) throw new Error('duplicate or unknown page id: ' + page.id);
    seen.add(page.id);
    const declaration = expected.get(page.id);
    if (page.source_url !== declaration.sourceUrl) throw new Error(page.id + ': source URL mismatch');
    if (JSON.stringify(page.evidence_terms) !== JSON.stringify(declaration.evidenceTerms)) throw new Error(page.id + ": evidence-term declaration mismatch");
    if (JSON.stringify(page.decision) !== JSON.stringify(decisions[page.id])) throw new Error(page.id + ": treatment-decision record mismatch");
    if (page.kind !== "wayback-capture-at-or-before-freeze") throw new Error(page.id + ": current freeze evidence must be an immutable pre-freeze Wayback capture");
    if (!/^\d{14}$/.test(page.capture_timestamp_utc)) throw new Error(page.id + ": invalid capture timestamp");
    const bytes = await readFile(join(outDir, page.file));
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== page.bytes) throw new Error(page.id + ': byte-length mismatch');
    if (digest !== page.sha256) throw new Error(page.id + ': SHA-256 mismatch');
    const lower = bytes.toString('utf8').toLowerCase();
    if (!lower.includes(page.decision.source_heading.toLowerCase())) throw new Error(page.id + ": decision source heading missing from snapshot");
    const missing = declaration.evidenceTerms.filter((term) => !lower.includes(term.toLowerCase()));
    if (missing.length) throw new Error(page.id + ': evidence terms missing: ' + missing.join(', '));
    if (page.kind === 'wayback-capture-at-or-before-freeze' && page.capture_timestamp_utc > freeze) {
      throw new Error(page.id + ': capture is after freeze');
    }
    console.log(page.id + ': OK ' + digest);
  }
  console.log('Verified ' + seen.size + ' documentation snapshots without network access.');
  process.exit(0);
}

async function get(url) {
  const response = await fetch(url, { redirect: 'follow',
    headers: { 'user-agent': 'express-db-access-performance artifact archiver/1.0' } });
  if (!response.ok) throw new Error(response.status + ' ' + response.statusText + ' for ' + url);
  return { bytes: Buffer.from(await response.arrayBuffer()), finalUrl: response.url,
    contentType: response.headers.get('content-type') };
}
async function nearestCapture(url) {
  const query = new URL('https://web.archive.org/cdx/search/cdx');
  query.searchParams.set('url', url);
  query.searchParams.set('from', '2000');
  query.searchParams.set('to', '2026');
  query.searchParams.set('filter', 'statuscode:200');
  query.searchParams.set('output', 'json');
  query.searchParams.set('fl', 'timestamp,original,digest,statuscode,mimetype');
  query.searchParams.set('collapse', 'digest');
  const { bytes } = await get(query.href);
  const rows = JSON.parse(bytes.toString('utf8')).slice(1)
    .filter((r) => r[0] <= freeze && r[4] === 'text/html')
    .sort((a, b) => a[0].localeCompare(b[0]));
  return rows.at(-1) || null;
}

const pages = [];
for (const [id, sourceUrl, evidenceTerms] of sources) {
  let capture = null;
  let retrieval;
  let provenance;
  try {
    capture = await nearestCapture(sourceUrl);
  } catch (error) {
    console.warn(id + ': CDX lookup failed: ' + error.message);
  }
  if (capture) {
    const archivedUrl = 'https://web.archive.org/web/' + capture[0] + 'id_/' + capture[1];
    try {
      retrieval = await get(archivedUrl);
      provenance = { kind: 'wayback-capture-at-or-before-freeze',
        capture_timestamp_utc: capture[0], archived_url: archivedUrl, wayback_digest: capture[2] };
    } catch (error) {
      console.warn(id + ': capture retrieval failed: ' + error.message);
    }
  }
  if (!retrieval) {
    retrieval = await get(sourceUrl);
    provenance = { kind: 'live-fallback-after-freeze',
      warning: 'Retrieved after the freeze; preserved for auditability but not evidence of freeze-date ordering.' };
  }
  const lower = retrieval.bytes.toString("utf8").toLowerCase();
  const missing = evidenceTerms.filter((term) => !lower.includes(term.toLowerCase()));
  if (missing.length) throw new Error(id + ": archived page lacks evidence terms: " + missing.join(", "));
  const filename = id + ".html";
  await writeFile(join(pageDir, filename), retrieval.bytes);
  pages.push({ id, source_url: sourceUrl, file: 'pages/' + filename,
    retrieved_at_utc: new Date().toISOString(), final_url: retrieval.finalUrl,
    content_type: retrieval.contentType, bytes: retrieval.bytes.length,
    sha256: createHash('sha256').update(retrieval.bytes).digest('hex'),
    evidence_terms: evidenceTerms, decision: decisions[id], ...provenance });
  console.log(id + ': ' + provenance.kind + ' -> ' + filename);
}
const manifest = {
  schema_version: 2,
  purpose: 'Immutable evidence for the policy-selected documented treatment assignments.',
  freeze_date: '2026-07-15',
  selection_priority: selectionPriority,
  caveat: 'A Wayback capture proves only the preserved page state at its capture timestamp. Live fallbacks are labelled and are not retroactive freeze evidence.',
  pages,
};
await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
