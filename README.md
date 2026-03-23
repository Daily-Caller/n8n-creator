# @lhi/n8n-creator

Secure, production-ready n8n workflow builder with a mandatory TDD security audit on every build.

Works with **MCP tools or direct REST API**. Reads all config from `.env`. Auto-saves workflows to a git-tracked folder structure for rollback. Enforces a 7-stage build protocol — threat model through security audit — for every workflow, every time.

---

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [npx Commands](#npx-commands)
- [Configuration](#configuration)
- [The 7-Stage Build Protocol](#the-7-stage-build-protocol)
- [TDD Audit](#tdd-audit)
- [Workflow Management](#workflow-management)
- [Shell API Helpers](#shell-api-helpers)
- [Saved Workflow Structure](#saved-workflow-structure)
- [Reference Docs](#reference-docs)
- [Publishing](#publishing)

---

## Install

### Option A — npx (no clone required)

```bash
npx @lhi/n8n-creator init
```

Scaffolds the full project into your current directory:

| File / Dir | Purpose |
|---|---|
| `SKILL.md` | Claude Code skill — triggers the 7-stage build protocol |
| `.env` / `.env.example` | n8n connection config |
| `references/` | API reference, security checklist, design patterns |
| `workflows/_templates/` | deploy + rollback script templates |
| `scripts/` | shell health check and API helpers |

### Option B — Clone

```bash
git clone https://github.com/lcanady/n8n-creator
cd n8n-creator
bash setup.sh
```

`setup.sh` checks prerequisites (Node ≥18, curl, git, jq), runs `npm install`, creates `.env`, makes all scripts executable, and tests n8n connectivity.

---

## Quick Start

```bash
# 1. Scaffold
npx @lhi/n8n-creator init

# 2. Configure your n8n instance
#    Edit .env: set N8N_API_URL and N8N_API_KEY
nano .env

# 3. Verify connectivity
npx @lhi/n8n-creator health

# 4. Open Claude Code in this directory and use the skill
#    /n8n-creator
```

---

## npx Commands

```bash
npx @lhi/n8n-creator init     # scaffold project files into current directory
npx @lhi/n8n-creator audit    # run @lhi/tdd-audit security scan
npx @lhi/n8n-creator health   # check n8n instance connectivity + API auth
npx @lhi/n8n-creator help     # show all commands
```

---

## Configuration

Edit `.env` after init:

```bash
# Required
N8N_API_URL=http://localhost:5678          # Base URL of your n8n instance (no trailing slash)
N8N_API_KEY=your-api-key-here             # Settings > n8n API > Create API key

# Required for production webhooks
N8N_WEBHOOK_BASE_URL=https://n8n.yourdomain.com
```

### Full `.env` Reference

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
| `DB_POSTGRESDB_SSL_ENABLED` | Self-hosted | `true` | Enable SSL for DB connection |
| `EXECUTIONS_DATA_PRUNE` | Optional | `true` | Auto-prune old execution data |
| `EXECUTIONS_DATA_MAX_AGE` | Optional | `168` | Hours to retain execution data (7 days) |
| `EXECUTIONS_TIMEOUT` | Optional | `300` | Execution timeout in seconds |
| `WORKFLOWS_DIR` | Optional | `./workflows` | Where workflow JSON + scripts are saved |

---

## The 7-Stage Build Protocol

Every build — new workflow, patch, or modification — goes through all seven stages. No skipping.

| Stage | Name | Gate |
|---|---|---|
| 0 | **Load .env & detect mode** | Config confirmed, MCP or REST path chosen |
| 1 | **Threat model & design** | User approves Design Plan |
| 2 | **Build** | Working workflow JSON in n8n |
| 3 | **Security audit** | All CRITICAL + HIGH checks = PASS |
| 4 | **Validate & test** | 7 test scenarios documented and passed |
| 5 | **Harden & git save** | Hardened workflow committed to `./workflows/` |
| 6 | **tdd-audit** | Clean audit — mandatory, no exceptions |

Start any build with the `/n8n-creator` Claude Code skill. The SKILL.md in your project directory contains the full protocol and is automatically loaded by Claude Code.

### Build modes

The skill auto-detects which path to use:

- **MCP path** — uses `search_nodes`, `validate_node`, `n8n_update_partial_workflow` for in-editor workflow construction
- **REST API path** — uses `curl` against `$N8N_API_URL/api/v1` for any environment

Both paths produce the same workflow JSON and go through all security stages.

---

## TDD Audit

`@lhi/tdd-audit` is a hard dependency. It scans for:

> injection · IDOR · XSS · path traversal · broken auth · hardcoded secrets · SSRF · insecure deserialization · prototype pollution · unvalidated input

and runs a **Red → Green → Refactor** cycle for each finding.

### Run manually

```bash
npx @lhi/n8n-creator audit          # via npx
npm run tdd-audit                    # from cloned repo
npm run audit                        # alias
```

### Audit flags (passed through to tdd-audit)

```bash
npx @lhi/n8n-creator audit --scan-only    # print findings, no skill install
npx @lhi/n8n-creator audit --skip-scan    # install skill files only
npx @lhi/n8n-creator audit --local        # install to ./  instead of ~/
npx @lhi/n8n-creator audit --claude       # write to ~/.claude/ instead of ~/.agents/
npx @lhi/n8n-creator audit --with-hooks   # install pre-commit security gate
```

Do not mark any workflow task complete until `tdd-audit` returns clean.

---

## Workflow Management

```bash
# From cloned repo
npm run launch-all    # activate all saved workflows
npm run health        # check n8n instance health
```

---

## Shell API Helpers

Source `scripts/n8n-api.sh` for shell functions that wrap the n8n REST API:

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

## Saved Workflow Structure

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

To deploy a saved workflow:

```bash
bash workflows/<project-name>/deploy.sh
```

To roll back to the previous git version:

```bash
bash workflows/<project-name>/rollback.sh <workflow-id>
```

---

## Reference Docs

| File | Contents |
|---|---|
| `references/api-reference.md` | Complete n8n REST API endpoint catalog |
| `references/env-config.md` | All n8n environment variables with descriptions |
| `references/security-checklist.md` | 10-check security audit with remediation steps |
| `references/workflow-design-patterns.md` | Core + advanced workflow patterns |
| `references/testing-guide.md` | Test scenarios, data pinning, mock servers |
| `references/troubleshooting-guide.md` | Error catalog + recovery procedures |

---

## Publishing

Releases are published to npm automatically via GitHub Actions on any `v*` tag:

```bash
# bump version
npm version patch   # or minor / major

# push tag to trigger publish workflow
git push && git push --tags
```

The workflow at `.github/workflows/publish.yml` runs `npm publish --access public --provenance` using `NPM_TOKEN` from repository secrets.

---

## License

MIT
