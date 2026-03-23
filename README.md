# @daily-caller/n8n-creator

Secure, production-ready n8n workflow builder for [The Daily Caller](https://dailycaller.com) with a mandatory TDD security audit baked into every build.

Works with **MCP tools or direct REST API**. Reads all config from `.env`. Auto-saves workflows to a git-tracked folder structure. Enforces a 7-stage build protocol — threat model through security audit — for every workflow, every time. Installs the `/n8n-creator` Claude Code skill automatically on first run.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Install](#install)
- [npx Commands](#npx-commands)
- [Claude Code Skill](#claude-code-skill)
- [The 7-Stage Build Protocol](#the-7-stage-build-protocol)
- [Configuration](#configuration)
- [TDD Audit](#tdd-audit)
- [Shell API Helpers](#shell-api-helpers)
- [Workflow File Structure](#workflow-file-structure)
- [Reference Docs](#reference-docs)
- [Publishing](#publishing)

---

## Quick Start

```bash
# 1. Scaffold into your project directory
npx @daily-caller/n8n-creator init

# 2. Fill in your n8n connection details
nano .env   # set N8N_API_URL and N8N_API_KEY

# 3. Verify connectivity
npx @daily-caller/n8n-creator health

# 4. Open Claude Code — /n8n-creator is ready
```

After `init`, the `/n8n-creator` Claude Code skill is installed to `.claude/commands/n8n-creator.md` in your project directory automatically.

---

## Install

### Option A — npx (recommended, no clone required)

```bash
npx @daily-caller/n8n-creator init
```

Scaffolds the following into the current directory (skips any file that already exists — safe to re-run):

| Path | Purpose |
|---|---|
| `.claude/commands/n8n-creator.md` | Claude Code skill — activates `/n8n-creator` command |
| `SKILL.md` | Skill source file |
| `.env` / `.env.example` | n8n connection config |
| `references/` | API reference, security checklist, design patterns, testing guide |
| `workflows/_templates/` | `deploy.sh`, `rollback.sh`, `README.md` starter templates |
| `workflows/launch-all.sh` | Deploy all saved workflows at once |
| `scripts/health-check.sh` | Shell health check script |
| `scripts/n8n-api.sh` | Shell functions wrapping the n8n REST API |
| `.gitignore` | Ignores `.env`, `node_modules/`, logs |

**Expected output:**

```
══════════════════════════════════════
  n8n-creator — Project Init
══════════════════════════════════════
  ✓  .env.example created
  ✓  .env created — fill in N8N_API_URL and N8N_API_KEY
  ⚠  Edit .env before running any workflow commands
  ✓  SKILL.md created
  →  Copying references/...
  ✓  Created references/api-reference.md
  ...
  ✓  Claude Code skill installed → .claude/commands/n8n-creator.md

  ✓  Init complete!

  Next steps:
    1. Edit .env  (N8N_API_URL + N8N_API_KEY)
    2. Run: npx @daily-caller/n8n-creator audit      — verify tdd-audit works
    3. Run: npx @daily-caller/n8n-creator health     — check n8n connectivity
    4. Use /n8n-creator inside Claude Code to start building
```

### Option B — Clone (for contributors)

```bash
git clone https://github.com/daily-caller/n8n-creator
cd n8n-creator
bash setup.sh
```

`setup.sh` runs 5 steps:

1. **Prerequisites check** — Node ≥18, npm, curl (required), git, jq (recommended)
2. **npm install** — installs `dotenv` and `@lhi/tdd-audit`
3. **Environment file** — copies `.env.example` → `.env` if not present
4. **Make scripts executable** — `chmod +x` all `.sh` files
5. **Final checks** — initializes git repo if needed, tests n8n connectivity

**Prerequisites:**

| Tool | Required | Notes |
|---|---|---|
| Node.js ≥18 | Yes | |
| npm | Yes | Bundled with Node |
| curl | Yes | Required for all REST API calls |
| git | Recommended | Workflow versioning |
| jq | Recommended | Pretty API output — `brew install jq` |

---

## npx Commands

```bash
npx @daily-caller/n8n-creator init     # scaffold project files + install Claude Code skill
npx @daily-caller/n8n-creator audit    # run @lhi/tdd-audit security scan
npx @daily-caller/n8n-creator health   # check n8n instance connectivity + API auth
npx @daily-caller/n8n-creator help     # show all commands
```

### `init`

Copies all project files into the current working directory. Skips any file that already exists. Installs the `/n8n-creator` skill to `.claude/commands/n8n-creator.md`.

### `audit`

Runs `@lhi/tdd-audit`. All arguments are passed through:

```bash
npx @daily-caller/n8n-creator audit --scan-only    # print findings, no skill install
npx @daily-caller/n8n-creator audit --skip-scan    # install skill files only
npx @daily-caller/n8n-creator audit --local        # install to ./ instead of ~/
npx @daily-caller/n8n-creator audit --claude       # write to ~/.claude/ instead of ~/.agents/
npx @daily-caller/n8n-creator audit --with-hooks   # install pre-commit security gate
```

### `health`

Reads `.env`, hits `$N8N_API_URL/healthz` and `$N8N_API_URL/api/v1/workflows?limit=1`, and reports:

```
  ✓  Health: OK
  ✓  API Auth: OK
  →  Active workflows: 3
```

### `help`

Prints available commands and usage.

---

## Claude Code Skill

After `init`, the `/n8n-creator` slash command is available inside Claude Code:

```
/n8n-creator
```

This triggers the full 7-stage secure workflow build protocol. The skill auto-detects whether MCP tools are available and routes accordingly — no configuration needed.

The skill file lives at `.claude/commands/n8n-creator.md` in your project. Claude Code loads it automatically when you open the directory.

---

## The 7-Stage Build Protocol

Every build — new workflow, single-node patch, or structural change — goes through all seven stages. No skipping.

| Stage | Name | Gate |
|---|---|---|
| 0 | **Load .env & detect mode** | Config confirmed, MCP or REST path chosen |
| 1 | **Threat model & design** | User approves Design Plan before any code |
| 2 | **Build** | Working workflow JSON pushed to n8n |
| 3 | **Security audit** | All CRITICAL + HIGH checks = PASS |
| 4 | **Validate & test** | 7 test scenarios documented and passed |
| 5 | **Harden & git save** | Hardened workflow committed to `./workflows/` |
| 6 | **tdd-audit** | `@lhi/tdd-audit` returns clean — mandatory, no exceptions |

### Build modes

The skill auto-detects which path to use at Stage 0:

**MCP path** — used when MCP tools respond without error:
- `search_nodes` — find nodes by keyword
- `validate_node` — validate config before adding
- `n8n_update_partial_workflow` — targeted node operations

**REST API path** — used in any environment via `curl`:
- All operations against `$N8N_API_URL/api/v1`
- Create, update, activate, deactivate, export workflows
- Query executions and logs

Both paths produce the same workflow JSON and go through all security stages.

### Security checks (Stage 3)

| # | Check | Severity |
|---|---|---|
| 1 | Webhook authentication | CRITICAL |
| 2 | No hardcoded credentials | CRITICAL |
| 3 | Input validation | HIGH |
| 4 | SSRF protection | HIGH |
| 5 | Expression injection | HIGH |
| 6 | Error response sanitization | HIGH |
| 7 | Sensitive data in logs | MEDIUM |
| 8 | Rate limiting & retry | MEDIUM |
| 9 | Least-privilege credentials | MEDIUM |
| 10 | Error handling completeness | MEDIUM |

---

## Configuration

Edit `.env` after init. The only required fields are `N8N_API_URL` and `N8N_API_KEY`.

```bash
# Required
N8N_API_URL=http://localhost:5678          # Base URL (no trailing slash)
N8N_API_KEY=your-api-key-here             # Settings > n8n API > Create API key

# Required for production webhooks
N8N_WEBHOOK_BASE_URL=https://n8n.yourdomain.com
```

### Full `.env` reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `N8N_API_URL` | Yes | — | Base URL of your n8n instance |
| `N8N_API_KEY` | Yes | — | n8n API key (Settings → n8n API → Create) |
| `N8N_WEBHOOK_BASE_URL` | Prod | — | Public URL for webhook triggers |
| `N8N_ENCRYPTION_KEY` | Self-hosted | — | 64-hex-char key — `openssl rand -hex 32` |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | Recommended | `true` | Block `process.env` in Code nodes |
| `N8N_SECURE_COOKIE` | Recommended | `true` | Secure flag on session cookie |
| `N8N_PAYLOAD_SIZE_MAX` | Optional | `16` | Max payload size in MiB |
| `DB_TYPE` | Self-hosted | `postgresdb` | Database type |
| `DB_POSTGRESDB_HOST` | Self-hosted | `localhost` | PostgreSQL host |
| `DB_POSTGRESDB_PORT` | Self-hosted | `5432` | PostgreSQL port |
| `DB_POSTGRESDB_DATABASE` | Self-hosted | `n8n` | Database name |
| `DB_POSTGRESDB_USER` | Self-hosted | `n8n` | Database user |
| `DB_POSTGRESDB_PASSWORD` | Self-hosted | — | Database password |
| `DB_POSTGRESDB_SSL_ENABLED` | Self-hosted | `true` | SSL for DB connection |
| `EXECUTIONS_DATA_PRUNE` | Optional | `true` | Auto-prune old execution data |
| `EXECUTIONS_DATA_MAX_AGE` | Optional | `168` | Hours to retain execution data (7 days) |
| `EXECUTIONS_TIMEOUT` | Optional | `300` | Execution timeout in seconds |
| `WORKFLOWS_DIR` | Optional | `./workflows` | Where workflow JSON + scripts are saved |

---

## TDD Audit

`@lhi/tdd-audit` is a hard dependency installed automatically. It must run after every workflow build, patch, or modification. The `/n8n-creator` skill runs it automatically at Stage 6.

**What it scans:**

> injection · IDOR · XSS · path traversal · broken auth · hardcoded secrets · SSRF · insecure deserialization · prototype pollution · unvalidated input

Runs a **Red → Green → Refactor** cycle for each finding. Does not mark the task complete until the audit is clean.

```bash
npx @daily-caller/n8n-creator audit    # via npx (any directory)
npm run tdd-audit                       # from cloned repo
npm run audit                           # alias
```

---

## Shell API Helpers

Source `scripts/n8n-api.sh` for shell functions wrapping the n8n REST API:

```bash
source scripts/n8n-api.sh
```

| Command | Description |
|---|---|
| `n8n_list_workflows` | List all workflows (id, name, active) |
| `n8n_get_workflow <id>` | Get full workflow JSON |
| `n8n_export_workflow <id> [file]` | Export workflow to file |
| `n8n_import_workflow <id> [file]` | Import/update workflow from file |
| `n8n_create_workflow [file]` | Create new workflow from file |
| `n8n_activate <id>` | Activate workflow |
| `n8n_deactivate <id>` | Deactivate workflow |
| `n8n_delete_workflow <id>` | Delete workflow |
| `n8n_executions <id> [limit]` | List recent executions |
| `n8n_exec_detail <exec_id>` | Get full execution data |
| `n8n_exec_errors <exec_id>` | Show only error nodes from an execution |
| `n8n_stop_exec <exec_id>` | Stop a running execution |
| `n8n_health` | Run health check |

---

## Workflow File Structure

Every workflow built with this tool is saved as:

```
workflows/
  <project-name>/
    workflow.json     ← exported workflow JSON from n8n API
    README.md         ← purpose, trigger URL, required credentials, env vars
    deploy.sh         ← import + activate script
    rollback.sh       ← deactivate + restore previous git version
  launch-all.sh       ← deploy all projects at once
  _templates/         ← copy to start a new project
    deploy.sh
    rollback.sh
    README.md
```

```bash
# Deploy a workflow
bash workflows/<project-name>/deploy.sh

# Roll back to previous git version
bash workflows/<project-name>/rollback.sh <workflow-id>

# Deploy all workflows
bash workflows/launch-all.sh
```

---

## Reference Docs

Copied to `references/` on `init`:

| File | Contents |
|---|---|
| `references/api-reference.md` | Complete n8n REST API endpoint catalog |
| `references/env-config.md` | All n8n environment variables with descriptions |
| `references/security-checklist.md` | 10-check audit with remediation steps |
| `references/workflow-design-patterns.md` | Core + advanced workflow patterns |
| `references/testing-guide.md` | Test scenarios, data pinning, mock servers |
| `references/troubleshooting-guide.md` | Error catalog + recovery procedures |

---

## Publishing

On any `v*` tag push, GitHub Actions publishes to **both** registries in parallel:

| Registry | Install from |
|---|---|
| [npm](https://www.npmjs.com/package/@daily-caller/n8n-creator) | `npm install @daily-caller/n8n-creator` |
| [GitHub Packages](https://github.com/daily-caller/n8n-creator/pkgs/npm/n8n-creator) | `npm install @daily-caller/n8n-creator --registry https://npm.pkg.github.com` |

**To release:**

```bash
npm version patch   # or minor / major
git push && git push --tags
```

**Required secrets** in the `daily-caller/n8n-creator` repository settings:

| Secret | Used by | How to get |
|---|---|---|
| `NPM_TOKEN` | npm publish | npmjs.com → Access Tokens → Automation token |
| `GITHUB_TOKEN` | GitHub Packages publish | Automatically provided by Actions — no setup needed |

**Installing from GitHub Packages** requires a GitHub token with `read:packages` scope:

```bash
# .npmrc in consuming project
@daily-caller:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

---

## License

MIT — [The Daily Caller](https://dailycaller.com)
