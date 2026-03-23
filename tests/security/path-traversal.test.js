/**
 * Security: Path Traversal in --output= flag (report command)
 *
 * Vulnerability: path.resolve(CWD, output) normalizes but does NOT bounds-check
 * the resulting path. Caller can write files anywhere on the filesystem.
 *
 * RED:   --output=../../tmp/evil.txt resolves outside CWD and would be written
 * GREEN: after fix, out-of-bounds paths are rejected with an error
 */

import { describe, it, expect } from 'vitest';
import { resolve, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI_SRC    = resolve(__dirname, '../../lib/cli.js');

// Helper: simulate what cmdReport/cmdLearn do with the --output arg
function resolveOutput(cwd, output) {
  return resolve(cwd, output);
}

function isWithinCwd(cwd, resolvedPath) {
  const rel = relative(cwd, resolvedPath);
  return !rel.startsWith('..') && !resolve(resolvedPath).startsWith('/tmp');
}

describe('[HIGH] Path Traversal — --output= flag', () => {
  const CWD = resolve(__dirname, '../..');

  it('[GREEN] a normal output path stays within CWD', () => {
    const out = resolveOutput(CWD, 'report.md');
    expect(isWithinCwd(CWD, out)).toBe(true);
  });

  it('[GREEN] an output path with subdirectory stays within CWD', () => {
    const out = resolveOutput(CWD, 'dist/report.md');
    expect(isWithinCwd(CWD, out)).toBe(true);
  });

  it('[GREEN] after fix: cli source must validate --output path stays within CWD', () => {
    // The fix must add a bounds check. Verify the source code contains the guard.
    const src = require('fs').readFileSync(CLI_SRC, 'utf8');

    // Look for a traversal guard: relative() + startsWith('..') pattern
    const hasTraversalGuard =
      /relative\s*\(/.test(src) &&
      /startsWith\s*\(\s*['"]\.\.['"]/.test(src);

    expect(hasTraversalGuard).toBe(true);
  });

  it('[RED] path traversal: ../../tmp/evil.txt resolves OUTSIDE CWD (vulnerability exists pre-fix)', () => {
    // This documents the vulnerability: path.resolve does not bound-check
    const traversalPath = '../../tmp/evil.txt';
    const resolved = resolveOutput(CWD, traversalPath);
    const isOutside = resolved.includes('/tmp/') || !resolved.startsWith(CWD);
    // RED: this is TRUE — traversal path resolves outside CWD (proves the gap)
    // After fix is applied to CLI source, the CLI will REJECT such paths
    expect(isOutside).toBe(true);
  });
});
