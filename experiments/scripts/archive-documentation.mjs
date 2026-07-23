// Preserve the exact official documentation pages used by the treatment rule.
// The latest Internet Archive capture not later than 2026-07-15 is preferred;
// a live-page fallback is explicitly marked and must not be called a freeze copy.
import { mkdir, writeFile } from 'node:fs/promises';
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
    evidence_terms: evidenceTerms, ...provenance });
  console.log(id + ': ' + provenance.kind + ' -> ' + filename);
}
const manifest = {
  purpose: 'Immutable evidence for the documentation-selected treatment assignments.',
  freeze_date: '2026-07-15',
  selection_priority: [
    'Official documentation for the pinned stable major version.',
    'The page section dedicated to relations/eager loading controls over quick-start or marketing pages.',
    'Within that section, choose the API presented first.',
    'If equally prominent, use the declared taxonomy-tier tie-break; if still unresolved, mark ambiguous and predeclare both treatments.'
  ],
  caveat: 'A Wayback capture proves only the preserved page state at its capture timestamp. Live fallbacks are labelled and are not retroactive freeze evidence.',
  pages,
};
await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
