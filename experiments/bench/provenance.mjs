// Campaign provenance for secondary-experiment records.
//
// bench/runner.mjs stamps campaign_id on every primary-matrix cell. The
// secondary experiments write their own JSON and historically carried no
// campaign field, so their provenance had to be reconstructed from repository
// history (scripts/gen-secondary-provenance.mjs). New secondary runs should
// stamp themselves instead.
//
// Usage in a secondary script, replacing a bare writeFile of the results:
//
//   import { writeResult } from '../bench/provenance.mjs';
//   await writeResult(join(here, '..', 'results', 'durability.json'), out);
//
// The payload is written unchanged when it is an array (so existing readers
// that expect a top-level array keep working); provenance then goes to a
// `<name>.provenance.json` sidecar. For object payloads the stamp is attached
// under `_provenance` and the sidecar is written as well, so either access path
// works.
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const env = (name, fallback) => process.env[name] ?? fallback;

const gitOrNull = (...args) => {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

/**
 * Provenance stamp for one secondary measurement.
 * CAMPAIGN_ID should be set by the campaign script; it defaults to the record
 * basename so an ad-hoc run is still labelled rather than silently anonymous.
 */
export function campaignStamp(recordName, extra = {}) {
  const commit = gitOrNull("rev-parse", "--short", "HEAD");
  const dirty = commit ? gitOrNull("status", "--porcelain") : null;
  return {
    campaign_id: env("CAMPAIGN_ID", `adhoc-${recordName}`),
    record: recordName,
    measured_at: new Date().toISOString(),
    git_commit: commit,
    git_dirty: dirty === null ? null : dirty.length > 0,
    node: process.version,
    // State-reset behaviour the record was measured under. Campaign scripts set
    // STATE_RESET=corrected once the MySQL AUTO_INCREMENT floor fix is active.
    state_reset: env("STATE_RESET", "unspecified"),
    ...extra,
  };
}

/** Write a secondary result together with its provenance sidecar. */
export async function writeResult(targetPath, payload, extra = {}) {
  const recordName = path.basename(targetPath);
  const stamp = campaignStamp(recordName, extra);
  const body = Array.isArray(payload) ? payload : { ...payload, _provenance: stamp };
  await writeFile(targetPath, JSON.stringify(body, null, 2));
  await writeFile(
    targetPath.replace(/\.json$/, "") + ".provenance.json",
    JSON.stringify(stamp, null, 2) + "\n",
  );
  return stamp;
}
