// Static detector for dead work on the timed path.
//
// R7 asks for evidence against correct-but-needlessly-slow adapter code. The
// diagnostic gate (diagnostics.mjs) catches waste that announces itself. This
// catches the silent counterpart that is visible in the source: a value acquired
// and then never read.
//
// It exists because that defect really occurred here. Before the corrected-state
// campaign, MikroORM's aggregation contained
//
//     const knex = em.getConnection().getKnex?.();
//
// whose binding was never read — a per-request handle acquisition that changed no
// SQL, no semantics and no round-trip count, and cost time on every timed request
// (finding ASA-02, notes/adapter-self-audit.md). A human found it. This finds it
// mechanically, and is validated against that exact source in dead-work.test.mjs.
//
// Deliberately narrow. It reports single-identifier `const`/`let` bindings that are
// never read again inside their enclosing block. It does NOT do full scope
// analysis: destructuring patterns are skipped (they bind names that are often
// intentionally partial), and shadowing is not modelled. The adapter contract is
// small and flat, which is what makes a lexical rule sufficient here; on arbitrary
// code it would not be. Its limits are stated rather than papered over, and a
// finding is a prompt to look, not a proof of waste.

const DECL = /(^|[^\w$.])(?<!export\s)(const|let)\s+([A-Za-z_$][\w$]*)\s*=/g;
// `void x;` is a discard marker: a value was acquired, found unnecessary, and
// silenced rather than removed. ASA-02 carried exactly this.
const VOID_DISCARD = /\bvoid\s+([A-Za-z_$][\w$]*)\s*;/g;

// Replace comments and string/template literal bodies with spaces, preserving
// offsets and newlines so reported line numbers stay true. Without this, an
// identifier mentioned only in a comment would count as a use.
export function maskLiterals(src) {
  const out = src.split('');
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); const end = e === -1 ? src.length : e; blank(i, end); i = end; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const end = e === -1 ? src.length : e + 2; blank(i, end); i = end; continue; }
    if (c === '"' || c === "'") {
      let k = i + 1;
      while (k < src.length) {
        if (src[k] === '\\') { k += 2; continue; }
        if (src[k] === c) break;
        k++;
      }
      blank(i + 1, k); i = k + 1; continue;
    }
    if (c === '`') {
      // Template literal: blank the text but KEEP ${...} substitutions, which are
      // real code. Masking them made an interpolated-only variable look unused.
      let k = i + 1, seg = i + 1;
      while (k < src.length) {
        if (src[k] === '\\') { k += 2; continue; }
        if (src[k] === '`') break;
        if (src[k] === '$' && src[k + 1] === '{') {
          blank(seg, k);
          let depth = 1; k += 2;
          while (k < src.length && depth > 0) {
            if (src[k] === '{') depth++;
            else if (src[k] === '}') depth--;
            k++;
          }
          seg = k; continue;
        }
        k++;
      }
      blank(seg, k); i = k + 1; continue;
    }
    i++;
  }
  return out.join('');
}

// End offset of the block enclosing `pos`, by brace matching forward.
function enclosingBlockEnd(masked, pos) {
  let depth = 0;
  for (let i = pos; i < masked.length; i++) {
    const c = masked[i];
    if (c === '{') depth++;
    else if (c === '}') { if (depth === 0) return i; depth--; }
  }
  return masked.length;
}

// Start offset of that same block, by brace matching backward.
function enclosingBlockStart(masked, pos) {
  let depth = 0;
  for (let i = pos; i >= 0; i--) {
    const c = masked[i];
    if (c === '}') depth++;
    else if (c === '{') { if (depth === 0) return i; depth--; }
  }
  return 0;
}

const lineOf = (src, offset) => src.slice(0, offset).split('\n').length;

/**
 * Report bindings that are assigned and never read within their enclosing block.
 * @returns {{name:string,line:number,snippet:string}[]}
 */
export function findDeadWork(source, { filename = '<source>' } = {}) {
  const masked = maskLiterals(source);
  const findings = [];
  DECL.lastIndex = 0;
  let m;
  while ((m = DECL.exec(masked)) !== null) {
    const name = m[3];
    if (/\bexport\s*$/.test(masked.slice(Math.max(0, m.index - 12), m.index + m[1].length))) continue;
    const declEnd = m.index + m[0].length;
    const blockEnd = enclosingBlockEnd(masked, declEnd);
    const blockStart = enclosingBlockStart(masked, m.index);
    // Search the whole enclosing block except the declaration's own identifier, so
    // a use in a closure defined earlier still counts.
    const before = masked.slice(blockStart, m.index);
    const after = masked.slice(declEnd, blockEnd);
    const word = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`);
    if (word.test(before) || word.test(after)) continue;
    findings.push({
      name,
      filename,
      line: lineOf(source, m.index),
      snippet: source.slice(m.index, Math.min(m.index + 90, source.length)).split('\n')[0].trim(),
    });
  }
  // A `void x;` statement is not a use: it is a discard. If the only reference to a
  // binding is that suppression, the acquisition is dead work that was silenced
  // rather than removed — the exact shape of ASA-02.
  VOID_DISCARD.lastIndex = 0;
  let v;
  while ((v = VOID_DISCARD.exec(masked)) !== null) {
    const name = v[1];
    const word = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`, 'g');
    const uses = (masked.match(word) ?? []).length;
    // declaration + the void statement itself = 2; anything more is a genuine use.
    if (uses > 2) continue;
    if (findings.some((f) => f.name === name)) continue;
    findings.push({
      name,
      filename,
      line: lineOf(source, v.index),
      kind: 'void-discard',
      snippet: source.slice(v.index, Math.min(v.index + 90, source.length)).split('\n')[0].trim(),
    });
  }
  return findings;
}
