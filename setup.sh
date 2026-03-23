#!/usr/bin/env bash
# setup.sh — First-run setup for n8n-creator
# Run once: bash setup.sh
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

info()  { echo -e "${CYAN}  →  $*${NC}"; }
ok()    { echo -e "${GREEN}  ✓  $*${NC}"; }
warn()  { echo -e "${YELLOW}  ⚠  $*${NC}"; }
error() { echo -e "${RED}  ✗  $*${NC}"; exit 1; }
header(){ echo -e "\n${CYAN}══════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}══════════════════════════════════════${NC}"; }

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

header "n8n-creator — First Run Setup"

# ── 1. Check prerequisites ────────────────────────────────────────────────────
header "1/5  Checking prerequisites"

command -v node  >/dev/null 2>&1 && ok "node  $(node -v)" || error "Node.js not found — install from https://nodejs.org (>=18)"
command -v npm   >/dev/null 2>&1 && ok "npm   $(npm -v)"  || error "npm not found"
command -v curl  >/dev/null 2>&1 && ok "curl  found"      || error "curl not found — required for REST API calls"
command -v git   >/dev/null 2>&1 && ok "git   $(git --version | cut -d' ' -f3)" || warn "git not found — workflow versioning will be disabled"
command -v jq    >/dev/null 2>&1 && ok "jq    $(jq --version)" || warn "jq not found — install for pretty API output: brew install jq"

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if (( NODE_MAJOR < 18 )); then
  error "Node.js >=18 required (found $(node -v))"
fi

# ── 2. Install npm dependencies (includes @lhi/tdd-audit) ────────────────────
header "2/5  Installing dependencies"
cd "$DIR"

if [ -d node_modules ] && [ -f node_modules/.bin/tdd-audit ]; then
  ok "@lhi/tdd-audit already installed"
else
  info "Running npm install..."
  npm install
  ok "Dependencies installed"
fi

# Verify tdd-audit is runnable
if [ -f "$DIR/node_modules/.bin/tdd-audit" ]; then
  ok "@lhi/tdd-audit $(node -e "console.log(require('./node_modules/@lhi/tdd-audit/package.json').version)") ready"
else
  error "@lhi/tdd-audit binary not found after install — check npm output above"
fi

# ── 3. Environment file ───────────────────────────────────────────────────────
header "3/5  Environment configuration"

if [ -f "$DIR/.env" ]; then
  ok ".env already exists — skipping"
else
  cp "$DIR/.env.example" "$DIR/.env"
  ok ".env created from .env.example"
  warn "Edit .env now with your n8n API URL and key before running workflows"
  echo ""
  echo "  Required fields to fill in:"
  echo "    N8N_API_URL      — your n8n instance URL  (e.g. http://localhost:5678)"
  echo "    N8N_API_KEY      — Settings > n8n API > Create API key"
  echo ""
fi

# ── 4. Make scripts executable ────────────────────────────────────────────────
header "4/5  Making scripts executable"

find "$DIR" -name "*.sh" -exec chmod +x {} \;
ok "All .sh scripts are executable"

# ── 5. Git init & connectivity check ─────────────────────────────────────────
header "5/5  Final checks"

# Git
if command -v git >/dev/null 2>&1; then
  if [ ! -d "$DIR/.git" ]; then
    git -C "$DIR" init -q
    git -C "$DIR" add .gitignore .env.example package.json setup.sh scripts/ references/ workflows/ SKILL.md README.md 2>/dev/null || true
    git -C "$DIR" commit -q -m "chore: initial n8n-creator project setup" 2>/dev/null || true
    ok "Git repository initialized"
  else
    ok "Git repository already exists"
  fi
fi

# n8n connectivity (only if .env has real values)
if [ -f "$DIR/.env" ]; then
  set -a; source "$DIR/.env"; set +a
  if [ -n "${N8N_API_URL:-}" ] && [ "${N8N_API_URL}" != "http://localhost:5678" ] || [ -n "${N8N_API_KEY:-}" ]; then
    info "Testing n8n connection at $N8N_API_URL..."
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      "${N8N_API_URL}/api/v1/workflows?limit=1" \
      -H "X-N8N-API-KEY: ${N8N_API_KEY}" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
      ok "n8n API connection successful"
    elif [ "$HTTP_STATUS" = "000" ]; then
      warn "n8n not reachable at $N8N_API_URL — update .env when your instance is running"
    elif [ "$HTTP_STATUS" = "401" ]; then
      warn "n8n reachable but API key rejected — check N8N_API_KEY in .env"
    else
      warn "n8n returned HTTP $HTTP_STATUS — check N8N_API_URL in .env"
    fi
  else
    warn "n8n not configured yet — edit .env to add N8N_API_URL and N8N_API_KEY"
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
echo "  Next steps:"
echo "    1. Edit .env with your n8n server URL and API key"
echo "    2. Run \`npm run tdd-audit\` to verify the audit tool works"
echo "    3. Start a workflow build with the /n8n-creator skill in Claude"
echo ""
echo "  Useful commands:"
echo "    npm run tdd-audit    — run security audit (mandatory after every build)"
echo "    npm run health       — check n8n instance health"
echo "    npm run launch-all   — deploy all saved workflows"
echo ""
