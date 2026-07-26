// Timed-path diagnostic gate for the benchmark runner.
//
// R7 (implementation-waste evidence) asks for evidence against
// correct-but-needlessly-slow adapter code. One sub-class needs no human: work
// that is wasteful *and* announces itself on stderr/stdout — driver warnings,
// deprecation notices, ignored-option messages.
//
// Scope, stated precisely. Of the two defects the result-blind self-audit found,
// this gate catches one. ASA-01 (Knex passing a PostgreSQL-style `returning` on
// MySQL) emitted 44,907 warnings inside two pilot repetitions and would now fail
// the first measured run. ASA-02 (MikroORM acquiring and discarding an unused
// Knex handle per request) was silent and would NOT be caught: it wasted work
// without saying so. Silent waste still requires review, so this narrows the R7
// residual rather than discharging it.
//
// The counter distinguishes windows. Startup and warm-up output is recorded but
// tolerated (engines and drivers legitimately chatter while connecting). Output
// during a *measured* run is not: at that point every byte written is work the
// treatment is doing per request and the cell is rejected, exactly as it is for
// errors, timeouts, and non-2xx responses.
export function attachDiagnosticCounter(child, { forward = (c) => process.stderr.write(c) } = {}) {
  const state = { window: 'startup', lines: 0, bytes: 0, samples: [], byWindow: {} };
  const note = (stream, chunk) => {
    const text = chunk.toString();
    const lines = text.split('\n').filter((l) => l.trim() !== '').length;
    state.lines += lines;
    state.bytes += chunk.length;
    const w = (state.byWindow[state.window] ??= { lines: 0, bytes: 0 });
    w.lines += lines; w.bytes += chunk.length;
    if (state.samples.length < 5) {
      const first = text.split('\n').find((l) => l.trim() !== '');
      if (first) state.samples.push(`[${state.window}/${stream}] ${first.slice(0, 200)}`);
    }
    // Still surface it, so piping does not hide anything from an operator.
    forward(chunk);
  };
  child.stdout?.on('data', (c) => note('stdout', c));
  child.stderr?.on('data', (c) => note('stderr', c));
  return {
    enter(window) { state.window = window; },
    snapshot() { return { lines: state.lines, bytes: state.bytes, byWindow: { ...state.byWindow } }; },
    // Node delivers stream data asynchronously; give it a turn to flush before reading.
    async settle() { await new Promise((r) => setTimeout(r, 50)); },
    measuredLines() { return state.byWindow.measured?.lines ?? 0; },
    samples() { return [...state.samples]; },
  };
}
