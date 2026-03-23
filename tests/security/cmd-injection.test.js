/**
 * Security: Command Injection in cmdHealth() via execSync
 *
 * Vulnerability: cmdHealth() uses execSync with template-literal interpolation
 * of N8N_API_URL and N8N_API_KEY — shell metacharacters execute arbitrary commands.
 *
 * RED:   proves execSync template-literal pattern exists in cmdHealth source
 * GREEN: after fix, cmdHealth source uses only spawnSync with args arrays (no execSync)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI_SRC = resolve(__dirname, '../../lib/cli.js');

function getCmdHealthBody() {
  const src = readFileSync(CLI_SRC, 'utf8');
  // Extract just the cmdHealth function body
  const match = src.match(/function cmdHealth\(\)([\s\S]*?)^}/m);
  return match ? match[0] : src;
}

describe('[CRITICAL] Command Injection — cmdHealth()', () => {
  it('[GREEN] cmdHealth must NOT use execSync with template literals (injectable pattern)', () => {
    // RED before fix: this assertion FAILS — execSync WAS used with template literals
    // GREEN after fix: this assertion PASSES — execSync removed from cmdHealth
    const body = getCmdHealthBody();
    const hasExecSyncWithInterpolation = /execSync\s*\(\s*`/.test(body);
    expect(hasExecSyncWithInterpolation).toBe(false);
  });

  it('[GREEN] After fix: cmdHealth body uses curlSync/spawnSync args arrays, not execSync', () => {
    const body = getCmdHealthBody();

    // After fix: execSync must not appear in cmdHealth
    const stillUsesExecSync = /execSync\s*\(\s*`/.test(body);
    expect(stillUsesExecSync).toBe(false);

    // spawnSync or curlSync (which wraps spawnSync) must be present
    const usesSafeWrapper = /curlSync\s*\(|spawnSync\s*\(/.test(body);
    expect(usesSafeWrapper).toBe(true);
  });
});
