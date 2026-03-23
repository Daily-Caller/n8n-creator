'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const PKG_DIR = path.resolve(__dirname, '..');
const CWD = process.cwd();

// IDE/model targets — each defines where the skill file gets installed
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

const CYAN  = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED   = '\x1b[31m';
const RESET = '\x1b[0m';

const info  = (msg) => console.log(`${CYAN}  →  ${msg}${RESET}`);
const ok    = (msg) => console.log(`${GREEN}  ✓  ${msg}${RESET}`);
const warn  = (msg) => console.log(`${YELLOW}  ⚠  ${msg}${RESET}`);
const error = (msg) => { console.error(`${RED}  ✗  ${msg}${RESET}`); process.exit(1); };
const header = (msg) => console.log(`\n${CYAN}══════════════════════════════════════\n  ${msg}\n══════════════════════════════════════${RESET}`);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
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

function resolveIdeTargets(args) {
  const flags = args.filter(a => a.startsWith('--')).map(a => a.slice(2));
  if (flags.includes('all')) return Object.keys(IDE_TARGETS);
  const matched = flags.filter(f => IDE_TARGETS[f]);
  return matched.length ? matched : ['claude']; // default: claude only
}

function installSkill(skillSrc, ideKey) {
  const { label, dir, file } = IDE_TARGETS[ideKey];
  const destDir = path.join(CWD, dir);
  const dest = path.join(destDir, file);
  fs.mkdirSync(destDir, { recursive: true });
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(skillSrc, dest);
    ok(`${label} skill installed → ${path.join(dir, file)}`);
  } else {
    info(`${label} skill already exists — skipped`);
  }
}

function cmdInit(args) {
  header('n8n-creator — Project Init');

  // .env.example
  const envExample = path.join(PKG_DIR, '.env.example');
  const envDest = path.join(CWD, '.env.example');
  if (!fs.existsSync(envDest)) {
    fs.copyFileSync(envExample, envDest);
    ok('.env.example created');
  } else {
    info('.env.example already exists — skipped');
  }

  // .env (from example if not present)
  const envFile = path.join(CWD, '.env');
  if (!fs.existsSync(envFile)) {
    fs.copyFileSync(envExample, envFile);
    ok('.env created — fill in N8N_API_URL and N8N_API_KEY');
    warn('Edit .env before running any workflow commands');
  } else {
    info('.env already exists — skipped');
  }

  // SKILL.md
  const skillSrc = path.join(PKG_DIR, 'SKILL.md');
  const skillDest = path.join(CWD, 'SKILL.md');
  if (!fs.existsSync(skillDest)) {
    fs.copyFileSync(skillSrc, skillDest);
    ok('SKILL.md created');
  } else {
    info('SKILL.md already exists — skipped');
  }

  // references/
  const refSrc = path.join(PKG_DIR, 'references');
  const refDest = path.join(CWD, 'references');
  info('Copying references/...');
  copyDir(refSrc, refDest);

  // workflows/_templates/
  const tplSrc = path.join(PKG_DIR, 'workflows', '_templates');
  const tplDest = path.join(CWD, 'workflows', '_templates');
  info('Copying workflow templates...');
  copyDir(tplSrc, tplDest);

  // launch-all.sh
  const launchSrc = path.join(PKG_DIR, 'workflows', 'launch-all.sh');
  const launchDest = path.join(CWD, 'workflows', 'launch-all.sh');
  if (!fs.existsSync(launchDest)) {
    fs.mkdirSync(path.join(CWD, 'workflows'), { recursive: true });
    fs.copyFileSync(launchSrc, launchDest);
    fs.chmodSync(launchDest, 0o755);
    ok('workflows/launch-all.sh created');
  }

  // scripts/
  const scriptsSrc = path.join(PKG_DIR, 'scripts');
  const scriptsDest = path.join(CWD, 'scripts');
  info('Copying scripts/...');
  copyDir(scriptsSrc, scriptsDest);
  // make scripts executable
  for (const f of fs.readdirSync(scriptsDest)) {
    if (f.endsWith('.sh')) fs.chmodSync(path.join(scriptsDest, f), 0o755);
  }

  // .gitignore
  const giSrc = path.join(PKG_DIR, 'gitignore');
  const giDest = path.join(CWD, '.gitignore');
  if (!fs.existsSync(giDest)) {
    fs.copyFileSync(giSrc, giDest);
    ok('.gitignore created');
  }

  // IDE/model skill files
  const ides = resolveIdeTargets(args);
  for (const ide of ides) {
    installSkill(skillSrc, ide);
  }

  console.log('');
  ok('Init complete!');
  console.log(`
  Next steps:
    1. Edit .env  (N8N_API_URL + N8N_API_KEY)
    2. Run: npx @daily-caller/n8n-creator audit      — verify tdd-audit works
    3. Run: npx @daily-caller/n8n-creator health     — check n8n connectivity
    4. Use /n8n-creator inside Claude Code to start building
  `);
}

function cmdAudit(args) {
  header('n8n-creator — TDD Audit');
  let tddBin;
  try {
    tddBin = require.resolve('@lhi/tdd-audit');
  } catch (_) {
    tddBin = path.join(PKG_DIR, 'node_modules', '.bin', 'tdd-audit');
  }
  const result = spawnSync('node', [tddBin, ...args], {
    stdio: 'inherit',
    cwd: CWD,
  });
  process.exit(result.status ?? 0);
}

function cmdHealth() {
  header('n8n-creator — Health Check');

  // Load .env
  const envFile = path.join(CWD, '.env');
  if (!fs.existsSync(envFile)) {
    error('.env not found — run: npx @daily-caller/n8n-creator init');
  }
  require('dotenv').config({ path: envFile });

  const apiUrl = process.env.N8N_API_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!apiUrl || !apiKey) {
    error('N8N_API_URL and N8N_API_KEY must be set in .env');
  }

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
      const activeCount = execSync(
        `curl -s "${apiUrl}/api/v1/workflows?active=true&limit=100" -H "X-N8N-API-KEY: ${apiKey}" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); console.log(JSON.parse(d).data.length)"`,
        { timeout: 10000 }
      ).toString().trim();
      info(`Active workflows: ${activeCount}`);
    }
  } catch (e) {
    warn(`Could not reach n8n at ${apiUrl} — is it running?`);
  }
}

function cmdHelp() {
  console.log(`
${CYAN}@daily-caller/n8n-creator${RESET} — Secure n8n workflow builder

${CYAN}Commands:${RESET}
  init      Copy SKILL.md, references, templates, and .env into current directory
  audit     Run @lhi/tdd-audit security scan (mandatory after every build)
  health    Check n8n instance connectivity and API auth
  help      Show this help

${CYAN}Usage:${RESET}
  npx @daily-caller/n8n-creator init [--<ide> ...]
  npx @daily-caller/n8n-creator audit
  npx @daily-caller/n8n-creator health

${CYAN}IDE / model flags (init):${RESET}
  --claude        Claude Code   → .claude/commands/n8n-creator.md  (default)
  --gemini        Gemini CLI    → .gemini/n8n-creator.md
  --opencode      OpenCode      → .opencode/n8n-creator.md
  --antigravity   Antigravity   → .antigravity/commands/n8n-creator.md
  --cursor        Cursor        → .cursor/rules/n8n-creator.mdc
  --copilot       GitHub Copilot → .github/copilot-instructions.md
  --all           Install for all of the above

${CYAN}Examples:${RESET}
  npx @daily-caller/n8n-creator init
  npx @daily-caller/n8n-creator init --all
  npx @daily-caller/n8n-creator init --gemini --opencode

${CYAN}Skill commands (inside supported IDEs):${RESET}
  /n8n-creator    — triggers the full 7-stage secure workflow build protocol
  /tdd-audit      — runs the mandatory security audit (Stage 6)
`);
}

function run(args) {
  const [cmd, ...rest] = args;
  switch (cmd) {
    case 'init':    return cmdInit(rest);
    case 'audit':   return cmdAudit(rest);
    case 'health':  return cmdHealth();
    case 'help':
    case '--help':
    case '-h':      return cmdHelp();
    case undefined: return cmdHelp();
    default:
      error(`Unknown command: ${cmd}\nRun: npx @daily-caller/n8n-creator help`);
  }
}

module.exports = { run };
