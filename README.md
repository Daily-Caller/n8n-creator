# n8n-creator

Secure, production-ready n8n workflow builder with mandatory TDD security audit on every build.

Works with **MCP tools or direct REST API**. Reads all config from `.env`. Auto-saves workflows
to a git-tracked folder structure for easy rollback.

---

## First-time setup

```bash
bash setup.sh
```

This will:
- Check prerequisites (Node ≥18, curl, git, jq)
- Run `npm install` — installs `@lhi/tdd-audit` and `dotenv`
- Create `.env` from `.env.example`
- Make all scripts executable
- Initialize git and test n8n connectivity

---

## Configuration

Edit `.env` after setup:

```bash
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your-api-key-here
N8N_WEBHOOK_BASE_URL=https://n8n.yourdomain.com
```

See `.env.example` for all available variables.

---

## Usage

Start any workflow build with the `/n8n-creator` Claude Code skill.

Every build automatically goes through 7 mandatory stages:

| Stage | Name | Gate |
|-------|------|------|
| 0 | Load .env & detect mode | Config confirmed |
| 1 | Threat model & design | User approves design plan |
| 2 | Build | Working workflow JSON |
| 3 | Security audit | All CRITICAL + HIGH = PASS |
| 4 | Validate & test | 10 test scenarios pass |
| 5 | Harden & git save | Committed to `./workflows/` |
| 6 | **tdd-audit** | **Clean audit — mandatory** |

---

## TDD Audit (mandatory after every build)

`@lhi/tdd-audit` runs automatically at Stage 6. To run manually:

```bash
npm run tdd-audit
# or
npx tdd-audit
```

---

## Workflow management

```bash
# Deploy all workflows
npm run launch-all

# Check n8n health
npm run health

# Use API helpers (source in your shell)
source scripts/n8n-api.sh
n8n_list_workflows
n8n_export_workflow <id> ./workflows/my-project/workflow.json
```

---

## Saved workflow structure

```
workflows/
  <project-name>/
    workflow.json     ← exported from n8n API
    README.md         ← purpose, trigger URL, credentials, env vars
    deploy.sh         ← import + activate
    rollback.sh       ← deactivate + restore previous git version
  launch-all.sh       ← deploy everything at once
  _templates/         ← copy these to start a new project
```

---

## Reference docs

| File | Contents |
|------|----------|
| `references/api-reference.md` | Complete n8n REST API endpoint catalog |
| `references/env-config.md` | All n8n environment variables |
| `references/security-checklist.md` | 10-check security audit with remediation |
| `references/workflow-design-patterns.md` | Core patterns + advanced patterns |
| `references/testing-guide.md` | Test scenarios, data pinning, mock servers |
| `references/troubleshooting-guide.md` | Error catalog + recovery procedures |
