# @daily-caller/n8n-creator

**Ship n8n workflows with confidence. Every build audited. Every deployment tracked. Nothing reaches production until it passes.**

[![npm version](https://img.shields.io/npm/v/@daily-caller/n8n-creator)](https://www.npmjs.com/package/@daily-caller/n8n-creator)
[![CI](https://github.com/Daily-Caller/n8n-creator/actions/workflows/publish.yml/badge.svg)](https://github.com/Daily-Caller/n8n-creator/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Table of Contents

- [The Problem](#the-problem)
- [Who This Is For](#who-this-is-for)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [CI/CD Integration](#cicd-integration)
- [The Learning System](#the-learning-system)
- [Commands](#commands)
- [The 7-Stage Security Protocol](#the-7-stage-security-protocol)
- [Environment Variables](#environment-variables)
- [What's Included After init](#whats-included-after-init)
- [Publishing](#publishing)

---

## The Problem

Your team builds n8n automation workflows. They work in dev. Then they break in
production — unauthenticated webhooks, hardcoded API keys, no error handling,
SSRF vulnerabilities that passed code review because nobody knew what to look for.

Or worse: a senior engineer built the perfect Stripe integration three months ago.
Now they're gone, and the next engineer is starting from scratch.

**n8n-creator closes both gaps.** Every workflow goes through a mandatory 7-stage
protocol before it ships. Every validated workflow feeds a pattern library that makes
the next build faster and safer. And the whole thing drops into your existing CI
pipeline in 60 seconds.

---

## Who This Is For

| Role | What You Get |
|------|-------------|
| **Engineering managers** | A CI gate that blocks insecure workflows from merging. Audit results posted on every PR. One command to see the health of your entire automation stack. |
| **Automation engineers** | Scaffolding, proven patterns, shell helpers, and a 10-point security checklist — so you can ship fast without cutting corners. |
| **DevOps / platform teams** | n8n workflows treated like first-class code: versioned, reviewed, deployed via API, rollback-ready. |

---

## Quick Start

```bash
# Scaffold a new project — installs Claude Code skill by default
npx @daily-caller/n8n-creator init

# Install for every AI coding tool + set up GitHub Actions CI in one shot
npx @daily-caller/n8n-creator init --all

# Or pick exactly what you need
npx @daily-caller/n8n-creator init --gemini --opencode --ci
```

After `init`, edit `.env` with your n8n connection details:

```bash
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your-api-key-here
```

Verify everything is working:

```bash
npx @daily-caller/n8n-creator health
```

Then open your AI coding tool and run `/n8n-creator` to start building.

---

## How It Works

Every workflow build follows a mandatory 7-stage pipeline. No stage can be skipped,
no matter how small the change.

```
┌─────────────────────────────────────────────────────────────────┐
│  Pattern Library Check                                          │
│  Search references/patterns/ for proven matching patterns       │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  Stage 0 │ Load .env & detect mode (MCP or REST API)           │
│  Stage 1 │ Threat model & design — confirmed by user           │
│  Stage 2 │ Build — workflow created in n8n                     │
│  Stage 3 │ Security audit — all 10 checks must pass           │
│  Stage 4 │ Validate & test — 7 required test scenarios        │
│  Stage 5 │ Harden & git save — versioned in ./workflows/      │
│  Stage 6 │ /tdd-audit — clean scan required to ship           │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n-creator deploy  — validate → push to n8n → activate       │
│  n8n-creator learn   — extract pattern → references/patterns/  │
└─────────────────────────────────────────────────────────────────┘
```

Your AI coding assistant (Claude, Gemini, Cursor, Copilot, OpenCode, Antigravity)
follows this protocol when you run `/n8n-creator` inside your IDE.
The CLI enforces it in CI.

---

## CI/CD Integration

Drop a GitHub Actions audit gate into any repo in 60 seconds:

```bash
npx @daily-caller/n8n-creator init --ci
```

This installs `.github/workflows/n8n-audit.yml`, which:

- **Runs on every PR** that touches workflow JSON files
- **Validates** workflow structure and catches security anti-patterns
  (unauthenticated webhooks, hardcoded credentials, missing node fields)
- **Runs the full tdd-audit** security scan
- **Posts results as a PR comment** — updates in place on each push, no spam
- **Blocks merge** if any check fails

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ n8n Workflow Audit — All checks passed                     │
│                                                                 │
│  Schema Validation ✅                                          │
│  ▸ PASS  workflows/stripe-webhook/workflow.json                │
│  ▸ PASS  workflows/slack-notifier/workflow.json                │
│                                                                 │
│  Security Audit ✅                                             │
│  ▸ No issues found                                             │
│                                                                 │
│  Powered by @daily-caller/n8n-creator                          │
└─────────────────────────────────────────────────────────────────┘
```

**For PMs:** No workflow with an unauthenticated webhook, hardcoded secret, or
missing error handler can reach production without someone manually overriding the
CI check. The gate is always on. You see it on every PR.

---

## The Learning System

The best engineers on your team know things that aren't in any docs. n8n-creator
captures that knowledge and makes it available to everyone automatically.

After every successful build, run:

```bash
npx @daily-caller/n8n-creator learn workflows/my-project/workflow.json
```

This extracts a keyword-tagged pattern and saves it to `references/patterns/`:

```
references/patterns/
├── stripe-webhook-payment-handler.md    ← keywords: stripe, webhook, payment
├── bigquery-http-insert.md              ← keywords: bigquery, http, insert
└── slack-error-notifier.md              ← keywords: slack, error, notification
```

On the next build, your AI coding assistant searches those patterns by keyword and
applies the matching ones as its starting scaffold — including the "Critical Rules"
section that captures production-verified gotchas.

**For PMs:** Every workflow your team ships makes the next one faster and safer.
An engineer who joined last week automatically benefits from every pattern your
senior engineers have built over the last year. The system compounds.

---

## Commands

### `init` — Scaffold a project

```bash
npx @daily-caller/n8n-creator init [--flags]
```

Copies SKILL.md, all reference docs, workflow templates, shell helpers, and `.env`
into your project. Installs the `/n8n-creator` skill for your IDE(s).

| Flag | Target | Installs To |
|------|--------|-------------|
| *(none)* | Claude Code (default) | `.claude/commands/n8n-creator.md` |
| `--claude` | Claude Code | `.claude/commands/n8n-creator.md` |
| `--gemini` | Gemini CLI | `.gemini/n8n-creator.md` |
| `--opencode` | OpenCode | `.opencode/n8n-creator.md` |
| `--antigravity` | Antigravity | `.antigravity/commands/n8n-creator.md` |
| `--cursor` | Cursor | `.cursor/rules/n8n-creator.mdc` |
| `--copilot` | GitHub Copilot | `.github/copilot-instructions.md` |
| `--ci` | GitHub Actions | `.github/workflows/n8n-audit.yml` |
| `--all` | All of the above | — |

---

### `validate` — Check workflow JSON

```bash
npx @daily-caller/n8n-creator validate [path]
npx @daily-caller/n8n-creator validate workflows/ --ci
```

Validates workflow JSON against the n8n schema and catches common security issues
before the deploy stage. Safe to run early and often.

**Catches:**
- Missing required fields (`name`, `nodes`, `connections`)
- Nodes missing `type` or `name`
- Webhooks with no authentication configured *(security)*
- Potential hardcoded credentials in node parameters *(security)*

The `--ci` flag exits with code `1` on failure (for GitHub Actions / other CI).

---

### `deploy` — Push to n8n

```bash
npx @daily-caller/n8n-creator deploy [workflow.json]
npx @daily-caller/n8n-creator deploy workflows/stripe/workflow.json --env=prod
```

Validates the workflow, then creates or updates it on your n8n instance via the REST
API, and activates it. Idempotent — safe to run multiple times.

```
→  Found 1 workflow(s) to deploy
✓  Pre-deploy validation passed
→  Deploying: Stripe Payment Handler
→  Updated existing workflow (id: 42)
✓  Deployed + activated: Stripe Payment Handler
✓  All workflows deployed successfully
→  Run "n8n-creator report" to verify the deployment
```

**Flags:**
- `--env=staging|prod` — label for logging (use separate `.env` files per environment)
- `--skip-audit` — suppress the pre-deploy audit reminder

---

### `report` — Workflow health snapshot

```bash
npx @daily-caller/n8n-creator report
npx @daily-caller/n8n-creator report --format=json
npx @daily-caller/n8n-creator report --format=md --output=report.md
```

Queries your n8n instance and generates a summary of all workflows, their active
status, and recent execution health.

**Sample output:**

```
# n8n Workflow Report

> Generated: 2026-03-23 14:30:00 | Instance: https://n8n.example.com

## Summary

| Metric                      | Value  |
|-----------------------------|--------|
| Total Workflows             | 12     |
| Active                      | ✅ 9   |
| Inactive                    | ⏸ 3   |
| Recent Executions (last 50) | 50     |
| Success Rate                | 94%    |
| Recent Errors               | ⚠️ 3   |
```

**For PMs:** Use `--output=report.md` to write a file you can attach to a weekly
review, commit to the repo as a snapshot, or post to Slack.

---

### `learn` — Capture a pattern

```bash
npx @daily-caller/n8n-creator learn workflows/my-project/workflow.json
```

Extracts a keyword-tagged reusable pattern from a validated workflow and saves it to
`references/patterns/`. See [The Learning System](#the-learning-system).

---

### `audit` — Run tdd-audit

```bash
npx @daily-caller/n8n-creator audit
```

Runs `@lhi/tdd-audit` — a security-focused static analysis scan for n8n workflow code.
Mandatory after every build. Also runs automatically in CI.

---

### `health` — Check connectivity

```bash
npx @daily-caller/n8n-creator health
```

Verifies your n8n instance is reachable, your API key is valid, and reports the count
of active workflows.

---

## The 7-Stage Security Protocol

All 7 stages are enforced by the `/n8n-creator` skill inside your IDE. A patch to a
single node still requires stages 3–6.

| Stage | Name | What Happens |
|-------|------|-------------|
| 0 | Load & Detect | `.env` loaded, MCP or REST mode confirmed |
| 1 | Threat Model | Requirements documented, pattern selected, design locked |
| 2 | Build | Workflow created in n8n via MCP tools or REST API |
| 3 | Security Audit | All 10 security checks run (see below) |
| 4 | Validate & Test | Node validation + 7 test scenarios executed |
| 5 | Harden & Save | Hardened workflow committed to `./workflows/<project>/` |
| 6 | tdd-audit | `@lhi/tdd-audit` scan must return clean |

### The 10 Security Checks

| # | Check | Severity |
|---|-------|----------|
| 1 | Webhook authentication — never `none` in production | CRITICAL |
| 2 | No hardcoded credentials in workflow JSON | CRITICAL |
| 3 | Input validation on all user-controlled fields | HIGH |
| 4 | SSRF protection — no user-controlled URLs | HIGH |
| 5 | Expression injection prevention | HIGH |
| 6 | Error responses sanitized — no stack traces to caller | HIGH |
| 7 | No PII or secrets in execution logs | MEDIUM |
| 8 | Rate limiting and retry logic on external calls | MEDIUM |
| 9 | Least-privilege credentials | MEDIUM |
| 10 | Error handling completeness — Error Trigger node present | MEDIUM |

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `N8N_API_URL` | Base URL of your n8n instance (e.g. `http://localhost:5678`) |
| `N8N_API_KEY` | API key — n8n Settings → API → Create API Key |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `N8N_WEBHOOK_BASE_URL` | Public URL for webhooks if behind a proxy | — |
| `N8N_ENCRYPTION_KEY` | 64-hex-char encryption key (self-hosted prod) | auto |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | Block `$env` access in Code nodes | `false` |
| `N8N_PAYLOAD_SIZE_MAX` | Max webhook payload in MiB | `16` |
| `WORKFLOWS_DIR` | Where to save workflow JSON | `./workflows` |

See `references/env-config.md` for the full reference including database, auth,
queue mode, and execution settings.

---

## What's Included After `init`

```
your-project/
├── .env                              ← n8n connection config (fill this in)
├── .env.example                      ← committed template
├── SKILL.md                          ← the full 7-stage build protocol
├── .github/workflows/
│   └── n8n-audit.yml                 ← CI gate (with --ci or --all)
├── .claude/commands/
│   └── n8n-creator.md                ← /n8n-creator skill for Claude Code
├── references/
│   ├── api-reference.md              ← n8n REST API endpoints + examples
│   ├── env-config.md                 ← all environment variables
│   ├── security-checklist.md         ← 10-check audit framework with remediation
│   ├── testing-guide.md              ← test scenarios + mock server setup
│   ├── troubleshooting-guide.md      ← 35+ error patterns with step-by-step fixes
│   ├── workflow-design-patterns.md   ← 9 architectural patterns with diagrams
│   └── patterns/                     ← your team's learned patterns (grows over time)
├── scripts/
│   ├── n8n-api.sh                    ← 12 shell functions for the n8n REST API
│   └── health-check.sh               ← connectivity + error diagnostics
└── workflows/
    ├── launch-all.sh                 ← deploy all workflows at once
    └── _templates/
        ├── README.md                 ← workflow documentation template
        ├── deploy.sh                 ← idempotent create-or-update deploy script
        └── rollback.sh               ← git-based rollback to previous version
```

---

## The Full Story for Your PM

```
Developer opens PR with new workflow JSON
        ↓
GitHub Actions runs: validate + tdd-audit
        ↓
PR comment shows pass/fail with full output (updates in place, no spam)
        ↓
Merge is blocked until all checks pass
        ↓
Engineer merges → runs: n8n-creator deploy --env=prod
        ↓
Workflow is live on n8n, activated, tracked in git
        ↓
Engineer runs: n8n-creator learn workflow.json
        ↓
Pattern saved → references/patterns/
        ↓
Next engineer building a similar workflow gets this pattern automatically
        ↓
n8n-creator report → weekly health snapshot in one command
```

Every team member builds on what the last one learned.
Every workflow is audited before it ships.
Your PM can see the state of every automation in one command.

---

## Shell API Helpers

After `source scripts/n8n-api.sh`, you have 12 ready-to-use functions:

```bash
n8n_list_workflows               # List all workflows (id, name, active)
n8n_get_workflow <id>            # Get full workflow JSON
n8n_export_workflow <id> [file]  # Export to file
n8n_activate <id>                # Activate a workflow
n8n_deactivate <id>              # Deactivate a workflow
n8n_executions <id> [limit]      # List recent executions
n8n_exec_errors <exec_id>        # Show only error nodes from an execution
n8n_stop_exec <exec_id>          # Stop a running execution
```

---

## Publishing (for maintainers)

Releases publish automatically to npm and GitHub Packages on version tags:

```bash
npm version patch   # or minor / major
git push && git push --tags
```

New releases are tagged `next` on npm until manually promoted to `latest`:

```bash
npm dist-tag add @daily-caller/n8n-creator@<version> latest
```

---

## License

MIT © [The Daily Caller](https://github.com/Daily-Caller)
