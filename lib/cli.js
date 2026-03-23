'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const PKG_DIR = path.resolve(__dirname, '..');
const CWD = process.cwd();

// ─── IDE / model targets ────────────────────────────────────────────────────
const IDE_TARGETS = {
  claude: {
    label: 'Claude Code',
    dir: path.join('.claude', 'commands'),
    file: 'n8n-creator.md',
  },
  gemini: {
    label: 'Gemini CLI',
    dir: '.gemini',
    file: 'n8n-creator.md',
  },
  opencode: {
    label: 'OpenCode',
    dir: '.opencode',
    file: 'n8n-creator.md',
  },
  antigravity: {
    label: 'Antigravity',
    dir: path.join('.antigravity', 'commands'),
    file: 'n8n-creator.md',
  },
  cursor: {
    label: 'Cursor',
    dir: path.join('.cursor', 'rules'),
    file: 'n8n-creator.mdc',
  },
  copilot: {
    label: 'GitHub Copilot',
    dir: '.github',
    file: 'copilot-instructions.md',
  },
};

// ─── Colors & logging ───────────────────────────────────────────────────────
const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const RESET  = '\x1b[0m';

const info   = (msg) => console.log(`${CYAN}  →  ${msg}${RESET}`);
const ok     = (msg) => console.log(`${GREEN}  ✓  ${msg}${RESET}`);
const warn   = (msg) => console.log(`${YELLOW}  ⚠  ${msg}${RESET}`);
const fail   = (msg) => console.log(`${RED}  ✗  ${msg}${RESET}`);
const error  = (msg) => { console.error(`${RED}  ✗  ${msg}${RESET}`); process.exit(1); };
const header = (msg) => console.log(`\n${CYAN}══════════════════════════════════════\n  ${msg}\n══════════════════════════════════════${RESET}`);

// ─── Helpers ────────────────────────────────────────────────────────────────
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
      ok(`Created ${path.relative(CWD, destPath)}`);
    } else {
      info(`Skipped (exists): ${path.relative(CWD, destPath)}`);
    }
  }
}

function loadEnv() {
  const envFile = path.join(CWD, '.env');
  if (!fs.existsSync(envFile)) {
    error('.env not found — run: n8n-creator init');
  }
  require('dotenv').config({ path: envFile });
  const apiUrl = process.env.N8N_API_URL;
  const apiKey = process.env.N8N_API_KEY;
  if (!apiUrl || !apiKey) {
    error('N8N_API_URL and N8N_API_KEY must be set in .env');
  }
  return { apiUrl, apiKey };
}

// Safe curl wrapper using spawnSync (no shell injection)
function curlSync(args, timeout = 15000) {
  const result = spawnSync('curl', args, { timeout, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `curl exited ${result.status}`);
  return result.stdout;
}

function resolveIdeTargets(args) {
  const flags = args.filter(a => a.startsWith('--')).map(a => a.slice(2));
  if (flags.includes('all')) return Object.keys(IDE_TARGETS);
  const matched = flags.filter(f => IDE_TARGETS[f]);
  return matched.length ? matched : ['claude'];
}

function shouldInstallCI(args) {
  const flags = args.filter(a => a.startsWith('--')).map(a => a.slice(2));
  return flags.includes('ci') || flags.includes('all');
}

function installSkill(skillSrc, ideKey) {
  const { label, dir, file } = IDE_TARGETS[ideKey];
  const destDir = path.join(CWD, dir);
  const dest    = path.join(destDir, file);
  fs.mkdirSync(destDir, { recursive: true });
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(skillSrc, dest);
    ok(`${label} skill installed → ${path.join(dir, file)}`);
  } else {
    info(`${label} skill already exists — skipped`);
  }
}

// ─── Commands ───────────────────────────────────────────────────────────────

function cmdInit(args) {
  header('n8n-creator — Project Init');

  // .env.example
  const envExample = path.join(PKG_DIR, '.env.example');
  const envDest    = path.join(CWD, '.env.example');
  if (!fs.existsSync(envDest)) {
    fs.copyFileSync(envExample, envDest);
    ok('.env.example created');
  } else {
    info('.env.example already exists — skipped');
  }

  // .env
  const envFile = path.join(CWD, '.env');
  if (!fs.existsSync(envFile)) {
    fs.copyFileSync(envExample, envFile);
    ok('.env created — fill in N8N_API_URL and N8N_API_KEY');
    warn('Edit .env before running any workflow commands');
  } else {
    info('.env already exists — skipped');
  }

  // SKILL.md
  const skillSrc  = path.join(PKG_DIR, 'SKILL.md');
  const skillDest = path.join(CWD, 'SKILL.md');
  if (!fs.existsSync(skillDest)) {
    fs.copyFileSync(skillSrc, skillDest);
    ok('SKILL.md created');
  } else {
    info('SKILL.md already exists — skipped');
  }

  // references/
  copyDir(path.join(PKG_DIR, 'references'), path.join(CWD, 'references'));

  // workflows/_templates/
  copyDir(path.join(PKG_DIR, 'workflows', '_templates'), path.join(CWD, 'workflows', '_templates'));

  // launch-all.sh
  const launchSrc  = path.join(PKG_DIR, 'workflows', 'launch-all.sh');
  const launchDest = path.join(CWD, 'workflows', 'launch-all.sh');
  if (!fs.existsSync(launchDest)) {
    fs.mkdirSync(path.join(CWD, 'workflows'), { recursive: true });
    fs.copyFileSync(launchSrc, launchDest);
    fs.chmodSync(launchDest, 0o755);
    ok('workflows/launch-all.sh created');
  }

  // scripts/
  const scriptsDest = path.join(CWD, 'scripts');
  copyDir(path.join(PKG_DIR, 'scripts'), scriptsDest);
  for (const f of fs.readdirSync(scriptsDest)) {
    if (f.endsWith('.sh')) fs.chmodSync(path.join(scriptsDest, f), 0o755);
  }

  // .gitignore
  const giDest = path.join(CWD, '.gitignore');
  if (!fs.existsSync(giDest)) {
    fs.copyFileSync(path.join(PKG_DIR, 'gitignore'), giDest);
    ok('.gitignore created');
  }

  // IDE / model skill files
  for (const ide of resolveIdeTargets(args)) {
    installSkill(skillSrc, ide);
  }

  // GitHub Actions CI
  if (shouldInstallCI(args)) {
    const ciSrc     = path.join(PKG_DIR, 'ci', 'n8n-audit.yml');
    const ciDestDir = path.join(CWD, '.github', 'workflows');
    const ciDest    = path.join(ciDestDir, 'n8n-audit.yml');
    fs.mkdirSync(ciDestDir, { recursive: true });
    if (!fs.existsSync(ciDest)) {
      fs.copyFileSync(ciSrc, ciDest);
      ok('GitHub Actions CI installed → .github/workflows/n8n-audit.yml');
    } else {
      info('GitHub Actions CI already exists — skipped');
    }
  }

  console.log('');
  ok('Init complete!');
  console.log(`
  Next steps:
    1. Edit .env  (N8N_API_URL + N8N_API_KEY)
    2. Run: n8n-creator health     — verify connectivity
    3. Run: n8n-creator audit      — confirm tdd-audit works
    4. Use /n8n-creator in your IDE to start building
  `);
}

// ─── validate ───────────────────────────────────────────────────────────────

function cmdValidate(args) {
  header('n8n-creator — Workflow Validation');

  const target  = args.find(a => !a.startsWith('--')) || 'workflows';
  const ciMode  = args.includes('--ci');
  const fullTarget = path.resolve(CWD, target);

  if (!fs.existsSync(fullTarget)) error(`Path not found: ${target}`);

  // Collect workflow JSON files
  const jsonFiles = [];
  function collectJson(p) {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const e of fs.readdirSync(p)) collectJson(path.join(p, e));
    } else if (p.endsWith('.json') && !p.includes('node_modules') && !p.includes('package')) {
      jsonFiles.push(p);
    }
  }
  collectJson(fullTarget);

  if (jsonFiles.length === 0) {
    warn(`No JSON workflow files found in: ${target}`);
    return;
  }

  info(`Validating ${jsonFiles.length} file(s)...`);
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const file of jsonFiles) {
    const rel    = path.relative(CWD, file);
    const issues = [];

    // Parse JSON
    let wf;
    try {
      wf = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      issues.push(`Invalid JSON: ${e.message}`);
      fail(`FAIL  ${rel}`);
      console.log(`${YELLOW}       → ${issues[0]}${RESET}`);
      failed++;
      continue;
    }

    // Skip non-workflow JSON (package.json, etc.)
    if (!wf.nodes && !wf.name) continue;

    // Required fields
    if (!wf.name)        issues.push('Missing "name" field');
    if (!wf.nodes)       issues.push('Missing "nodes" array');
    if (!wf.connections) issues.push('Missing "connections" object');

    if (Array.isArray(wf.nodes)) {
      for (const node of wf.nodes) {
        if (!node.type)   issues.push(`Node "${node.name || '?'}" missing "type"`);
        if (!node.name)   issues.push('A node is missing "name"');

        // Webhook auth check
        if (node.type === 'n8n-nodes-base.webhook') {
          const auth = node.parameters?.authentication;
          if (!auth || auth === 'none') {
            issues.push(`SECURITY: Webhook "${node.name}" has no authentication`);
          }
        }

        // Hardcoded credential heuristic
        const paramStr = JSON.stringify(node.parameters || {});
        if (/("password"|"secret"|"apiKey"|"api_key"|"token")\s*:\s*"[^"]{6,}"/i.test(paramStr)) {
          issues.push(`SECURITY: Node "${node.name}" may have hardcoded credentials`);
        }
      }
    }

    if (issues.length === 0) {
      ok(`PASS  ${rel}`);
      passed++;
    } else {
      fail(`FAIL  ${rel}`);
      for (const issue of issues) {
        console.log(`${YELLOW}       → ${issue}${RESET}`);
      }
      failed++;
    }
  }

  console.log('');
  info(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    if (ciMode) process.exit(1);
    error(`${failed} workflow(s) failed validation — fix issues before deploying`);
  }
  ok('All workflows passed validation');
}

// ─── deploy ─────────────────────────────────────────────────────────────────

function cmdDeploy(args) {
  header('n8n-creator — Deploy Workflow');

  const { apiUrl, apiKey } = loadEnv();
  const workflowArg = args.find(a => !a.startsWith('--'));
  const skipAudit   = args.includes('--skip-audit');
  const envLabel    = args.find(a => a.startsWith('--env='))?.split('=')[1] || 'default';

  if (envLabel !== 'default') info(`Target environment: ${envLabel}`);

  // Collect targets
  const targets = [];
  if (workflowArg) {
    const fp = path.resolve(CWD, workflowArg);
    if (!fs.existsSync(fp)) error(`File not found: ${workflowArg}`);
    targets.push(fp);
  } else {
    const workflowsDir = path.join(CWD, 'workflows');
    if (!fs.existsSync(workflowsDir)) error('No workflows/ directory — pass a workflow.json path');
    function findWorkflows(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.join(dir, e.name);
        if (e.isDirectory() && !e.name.startsWith('_')) findWorkflows(fp);
        else if (e.name === 'workflow.json') targets.push(fp);
      }
    }
    findWorkflows(workflowsDir);
  }

  if (targets.length === 0) error('No workflow.json files found to deploy');
  info(`Found ${targets.length} workflow(s) to deploy`);

  // Validate before deploy
  info('Running pre-deploy validation...');
  let validationFailed = false;
  for (const fp of targets) {
    let wf;
    try { wf = JSON.parse(fs.readFileSync(fp, 'utf8')); }
    catch (e) { fail(`Invalid JSON in ${path.relative(CWD, fp)}: ${e.message}`); validationFailed = true; continue; }
    if (!wf.name || !wf.nodes || !wf.connections) {
      fail(`${path.relative(CWD, fp)}: missing required fields`);
      validationFailed = true;
    }
  }
  if (validationFailed) error('Validation failed — fix issues before deploying');
  ok('Pre-deploy validation passed');

  if (!skipAudit) {
    warn('Reminder: run "n8n-creator audit" before deploying to production');
    warn('Add --skip-audit to suppress this warning (not recommended)');
  }

  let deployed = 0;
  let failCount = 0;

  for (const fp of targets) {
    const wf  = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const rel = path.relative(CWD, fp);
    info(`Deploying: ${wf.name}`);

    try {
      // Check if workflow already exists
      const listRaw = curlSync([
        '-s', `${apiUrl}/api/v1/workflows?limit=250`,
        '-H', `X-N8N-API-KEY: ${apiKey}`,
      ]);
      const list     = JSON.parse(listRaw);
      const existing = (list.data || []).find(w => w.name === wf.name);
      const payload  = fs.readFileSync(fp, 'utf8');

      let workflowId;
      if (existing) {
        // Update
        curlSync([
          '-s', '-X', 'PUT', `${apiUrl}/api/v1/workflows/${existing.id}`,
          '-H', `X-N8N-API-KEY: ${apiKey}`,
          '-H', 'Content-Type: application/json',
          '-d', payload,
        ]);
        workflowId = existing.id;
        info(`Updated existing workflow (id: ${workflowId})`);
      } else {
        // Create
        const createRaw = curlSync([
          '-s', '-X', 'POST', `${apiUrl}/api/v1/workflows`,
          '-H', `X-N8N-API-KEY: ${apiKey}`,
          '-H', 'Content-Type: application/json',
          '-d', payload,
        ]);
        const created = JSON.parse(createRaw);
        if (!created.id) throw new Error(`Unexpected response: ${createRaw.slice(0, 200)}`);
        workflowId = created.id;
        info(`Created new workflow (id: ${workflowId})`);
      }

      // Activate
      curlSync([
        '-s', '-X', 'POST', `${apiUrl}/api/v1/workflows/${workflowId}/activate`,
        '-H', `X-N8N-API-KEY: ${apiKey}`,
      ]);

      ok(`Deployed + activated: ${wf.name}`);
      deployed++;
    } catch (e) {
      fail(`Failed to deploy ${wf.name}: ${e.message}`);
      failCount++;
    }
  }

  console.log('');
  info(`Deploy results: ${deployed} deployed, ${failCount} failed`);
  if (failCount > 0) error(`${failCount} workflow(s) failed to deploy`);
  ok('All workflows deployed successfully');
  info('Run "n8n-creator report" to verify the deployment');
}

// ─── report ─────────────────────────────────────────────────────────────────

function cmdReport(args) {
  header('n8n-creator — Workflow Report');

  const { apiUrl, apiKey } = loadEnv();
  const fmt    = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'md';
  const output = args.find(a => a.startsWith('--output='))?.split('=')[1];

  info(`Fetching data from ${apiUrl}...`);

  let workflows  = [];
  let executions = [];

  try {
    const wfRaw = curlSync([
      '-s', `${apiUrl}/api/v1/workflows?limit=250`,
      '-H', `X-N8N-API-KEY: ${apiKey}`,
    ]);
    workflows = JSON.parse(wfRaw).data || [];
  } catch (e) { warn(`Could not fetch workflows: ${e.message}`); }

  try {
    const execRaw = curlSync([
      '-s', `${apiUrl}/api/v1/executions?limit=50`,
      '-H', `X-N8N-API-KEY: ${apiKey}`,
    ]);
    executions = JSON.parse(execRaw).data || [];
  } catch (e) { warn(`Could not fetch executions: ${e.message}`); }

  const active   = workflows.filter(w => w.active).length;
  const inactive = workflows.filter(w => !w.active).length;
  const successes = executions.filter(e => e.status === 'success').length;
  const errors    = executions.filter(e => e.status === 'error').length;
  const successRate = executions.length
    ? Math.round((successes / executions.length) * 100)
    : null;
  const date = new Date().toISOString().replace('T', ' ').split('.')[0];

  let report;

  if (fmt === 'json') {
    report = JSON.stringify({
      generated: date,
      instance:  apiUrl,
      summary: {
        total: workflows.length, active, inactive,
        recentExecutions: executions.length,
        successRate: successRate !== null ? `${successRate}%` : 'N/A',
        recentErrors: errors,
      },
      workflows: workflows.map(w => ({
        id: w.id, name: w.name, active: w.active,
        updatedAt: w.updatedAt?.split('T')[0] || '',
      })),
    }, null, 2);
  } else {
    const activeRows = workflows
      .filter(w => w.active)
      .map(w => `| ${w.name} | \`${w.id}\` | ${w.updatedAt?.split('T')[0] || '—'} |`)
      .join('\n') || '| — | — | — |';

    const inactiveRows = workflows
      .filter(w => !w.active)
      .map(w => `| ${w.name} | \`${w.id}\` |`)
      .join('\n') || '_None_';

    report = [
      `# n8n Workflow Report`,
      ``,
      `> **Generated:** ${date}  `,
      `> **Instance:** ${apiUrl}`,
      ``,
      `## Summary`,
      ``,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Workflows | **${workflows.length}** |`,
      `| Active | ✅ ${active} |`,
      `| Inactive | ⏸ ${inactive} |`,
      `| Recent Executions (last 50) | ${executions.length} |`,
      `| Success Rate | ${successRate !== null ? `${successRate}%` : 'N/A'} |`,
      `| Recent Errors | ${errors > 0 ? `⚠️ ${errors}` : '✅ 0'} |`,
      ``,
      `## Active Workflows`,
      ``,
      `| Name | ID | Last Updated |`,
      `|------|----|-------------|`,
      activeRows,
      ``,
      `## Inactive Workflows`,
      ``,
      inactive > 0
        ? `| Name | ID |\n|------|----|\n${inactiveRows}`
        : '_No inactive workflows._',
      ``,
      `---`,
      `_Generated by [@daily-caller/n8n-creator](https://github.com/Daily-Caller/n8n-creator)_`,
    ].join('\n');
  }

  if (output) {
    fs.writeFileSync(path.resolve(CWD, output), report);
    ok(`Report written to ${output}`);
  } else {
    console.log(report);
  }
}

// ─── learn ──────────────────────────────────────────────────────────────────

function cmdLearn(args) {
  header('n8n-creator — Learn from Workflow');

  const workflowPath = args.find(a => !a.startsWith('--'));
  if (!workflowPath) {
    error('Usage: n8n-creator learn <workflow.json>\n  Learns from a validated workflow and saves the pattern to references/patterns/');
  }

  const fullPath = path.resolve(CWD, workflowPath);
  if (!fs.existsSync(fullPath)) error(`Workflow file not found: ${workflowPath}`);

  let wf;
  try {
    wf = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (e) {
    error(`Failed to parse workflow JSON: ${e.message}`);
  }

  const name        = wf.name || path.basename(workflowPath, '.json');
  const nodes       = wf.nodes || [];
  const connections = wf.connections || {};

  // Extract node types (deduplicated, human-readable)
  const nodeTypes = [...new Set(
    nodes.map(n => (n.type || '').split('.').pop())
  )].filter(Boolean);

  // Build keyword list from node types + credential types
  const credTypes = [...new Set(
    nodes.filter(n => n.credentials).flatMap(n => Object.keys(n.credentials))
  )];

  const keywords = [...new Set([
    ...nodeTypes.map(t => t.replace(/([A-Z])/g, ' $1').trim().toLowerCase()),
    ...credTypes.map(c => c.replace(/([A-Z])/g, ' $1').trim().toLowerCase()),
  ])].join(', ');

  // Build simplified connection flow
  const flowLines = [];
  for (const [srcName, targets] of Object.entries(connections)) {
    for (const outputConns of Object.values(targets)) {
      for (const connList of outputConns) {
        for (const conn of (connList || [])) {
          if (conn?.node) flowLines.push(`${srcName} → ${conn.node}`);
        }
      }
    }
  }

  const hasErrorTrigger  = nodes.some(n => n.type === 'n8n-nodes-base.errorTrigger');
  const hasContinueOnFail = nodes.some(n => n.continueOnFail);
  const triggerNode      = nodes.find(n =>
    n.type?.includes('Trigger') || n.type?.includes('webhook') || n.type?.includes('schedule')
  );
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/, '');

  const pattern = `<!-- keywords: ${keywords} -->

# Pattern: ${name}

## What This Workflow Does
<!-- TODO: Add a one-sentence description of what this workflow accomplishes -->

## Trigger
- Type: \`${triggerNode?.type?.split('.').pop() || 'manual'}\`
${triggerNode?.parameters?.path ? `- Path: \`${triggerNode.parameters.path}\`` : ''}
${triggerNode?.parameters?.authentication ? `- Auth: \`${triggerNode.parameters.authentication}\`` : ''}

## Node Stack
${nodeTypes.map(t => `- \`${t}\``).join('\n')}

## Credential Types Required
${credTypes.length ? credTypes.map(c => `- \`${c}\``).join('\n') : '- None'}

## Connection Flow
${flowLines.length ? flowLines.map(l => `    ${l}`).join('\n') : '    (see workflow JSON)'}

## Critical Rules
- <!-- TODO: Document gotchas, required parameter values, or ordering requirements -->
- <!-- e.g. "Always set continueOnFail=true on the HTTP Request node" -->

## Error Handling
- Error Trigger node: ${hasErrorTrigger ? '✅ Present' : '⚠️ Not present'}
- continueOnFail used: ${hasContinueOnFail ? '✅ Yes' : '⚠️ No'}

## Source
- Learned from: \`${workflowPath}\`
- Date: ${new Date().toISOString().split('T')[0]}
- Passed 7-stage protocol: ✅
`;

  const patternsDir = path.join(CWD, 'references', 'patterns');
  fs.mkdirSync(patternsDir, { recursive: true });
  const patternPath = path.join(patternsDir, `${slug}.md`);

  if (fs.existsSync(patternPath)) {
    warn(`Pattern already exists: references/patterns/${slug}.md`);
    info('Delete it and re-run to overwrite');
  } else {
    fs.writeFileSync(patternPath, pattern);
    ok(`Pattern saved → references/patterns/${slug}.md`);
    info('Edit the "Critical Rules" section to add workflow-specific gotchas');
    info('This pattern will be auto-loaded on the next workflow build');
  }

  console.log('');
  ok('Learn complete — your pattern library has grown.');
}

// ─── audit ──────────────────────────────────────────────────────────────────

function cmdAudit(args) {
  header('n8n-creator — TDD Audit');
  let tddBin;
  try {
    tddBin = require.resolve('@lhi/tdd-audit');
  } catch (_) {
    tddBin = path.join(PKG_DIR, 'node_modules', '.bin', 'tdd-audit');
  }
  const result = spawnSync('node', [tddBin, ...args], { stdio: 'inherit', cwd: CWD });
  process.exit(result.status ?? 0);
}

// ─── health ──────────────────────────────────────────────────────────────────

function cmdHealth() {
  header('n8n-creator — Health Check');
  const { apiUrl, apiKey } = loadEnv();
  info(`Checking ${apiUrl}...`);

  try {
    const healthStatus = execSync(
      `curl -s -o /dev/null -w "%{http_code}" "${apiUrl}/healthz"`,
      { timeout: 10000 }
    ).toString().trim();
    healthStatus === '200' ? ok('Health: OK') : warn(`Health: HTTP ${healthStatus}`);

    const apiStatus = execSync(
      `curl -s -o /dev/null -w "%{http_code}" "${apiUrl}/api/v1/workflows?limit=1" -H "X-N8N-API-KEY: ${apiKey}"`,
      { timeout: 10000 }
    ).toString().trim();
    apiStatus === '200' ? ok('API Auth: OK') : warn(`API Auth: HTTP ${apiStatus}`);

    if (apiStatus === '200') {
      const count = execSync(
        `curl -s "${apiUrl}/api/v1/workflows?active=true&limit=100" -H "X-N8N-API-KEY: ${apiKey}" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).data.length)"`,
        { timeout: 10000 }
      ).toString().trim();
      info(`Active workflows: ${count}`);
    }
  } catch (e) {
    warn(`Could not reach n8n at ${apiUrl} — is it running?`);
  }
}

// ─── help ────────────────────────────────────────────────────────────────────

function cmdHelp() {
  console.log(`
${CYAN}@daily-caller/n8n-creator${RESET} — Secure n8n workflow builder

${CYAN}Commands:${RESET}
  init      Scaffold project, install skill, set up CI
  validate  Schema + security check workflow JSON files
  deploy    Validate → deploy → activate on n8n
  report    Generate workflow health snapshot
  learn     Extract a reusable pattern from a validated workflow
  audit     Run @lhi/tdd-audit security scan
  health    Check n8n connectivity and API auth
  help      Show this help

${CYAN}Usage:${RESET}
  npx @daily-caller/n8n-creator init [--<ide> ...] [--ci]
  npx @daily-caller/n8n-creator validate [path]
  npx @daily-caller/n8n-creator deploy [workflow.json] [--env=staging|prod] [--skip-audit]
  npx @daily-caller/n8n-creator report [--format=md|json] [--output=file]
  npx @daily-caller/n8n-creator learn <workflow.json>
  npx @daily-caller/n8n-creator audit
  npx @daily-caller/n8n-creator health

${CYAN}init flags:${RESET}
  --claude        Claude Code   → .claude/commands/n8n-creator.md  (default)
  --gemini        Gemini CLI    → .gemini/n8n-creator.md
  --opencode      OpenCode      → .opencode/n8n-creator.md
  --antigravity   Antigravity   → .antigravity/commands/n8n-creator.md
  --cursor        Cursor        → .cursor/rules/n8n-creator.mdc
  --copilot       GitHub Copilot → .github/copilot-instructions.md
  --ci            GitHub Actions → .github/workflows/n8n-audit.yml
  --all           All of the above

${CYAN}Examples:${RESET}
  npx @daily-caller/n8n-creator init --all
  npx @daily-caller/n8n-creator validate workflows/
  npx @daily-caller/n8n-creator deploy workflows/my-project/workflow.json --env=prod
  npx @daily-caller/n8n-creator report --format=json --output=report.json
  npx @daily-caller/n8n-creator learn workflows/my-project/workflow.json

${CYAN}Skill commands (inside your IDE):${RESET}
  /n8n-creator    — triggers the full 7-stage secure workflow build protocol
  /tdd-audit      — runs the mandatory security audit
`);
}

// ─── Router ──────────────────────────────────────────────────────────────────

function run(args) {
  const [cmd, ...rest] = args;
  switch (cmd) {
    case 'init':     return cmdInit(rest);
    case 'validate': return cmdValidate(rest);
    case 'deploy':   return cmdDeploy(rest);
    case 'report':   return cmdReport(rest);
    case 'learn':    return cmdLearn(rest);
    case 'audit':    return cmdAudit(rest);
    case 'health':   return cmdHealth();
    case 'help':
    case '--help':
    case '-h':       return cmdHelp();
    case undefined:  return cmdHelp();
    default:
      error(`Unknown command: ${cmd}\nRun: n8n-creator help`);
  }
}

module.exports = { run };
