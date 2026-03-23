#!/usr/bin/env bash
# n8n-api.sh — shell helpers for n8n REST API
# Source this file: source scripts/n8n-api.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$DIR/.env" ] && { set -a; source "$DIR/.env"; set +a; }

# Validate required env vars are set and non-empty
: "${N8N_API_URL:?N8N_API_URL must be set in .env}"
: "${N8N_API_KEY:?N8N_API_KEY must be set in .env}"

N8N_BASE="${N8N_API_URL}/api/v1"
N8N_AUTH="X-N8N-API-KEY: ${N8N_API_KEY}"

# Validate that a required argument is a non-empty numeric-or-uuid ID
_n8n_require_id() {
  local arg="${1:-}"
  if [ -z "$arg" ]; then
    echo "Error: workflow/execution ID required" >&2
    return 1
  fi
  # Reject values that look like path traversal or shell injection
  if [[ "$arg" =~ [[:space:]/\\;|&\`\$\(\)] ]]; then
    echo "Error: invalid ID '$arg'" >&2
    return 1
  fi
}

n8n_list_workflows()   { curl -s "$N8N_BASE/workflows?limit=100" -H "$N8N_AUTH" | jq '.data[] | {id, name, active}'; }

n8n_get_workflow() {
  _n8n_require_id "${1:-}" || return 1
  curl -s "$N8N_BASE/workflows/$1" -H "$N8N_AUTH" | jq '.';
}

n8n_export_workflow() {
  _n8n_require_id "${1:-}" || return 1
  local outfile="${2:-workflow.json}"
  curl -s "$N8N_BASE/workflows/$1" -H "$N8N_AUTH" | jq '.' > "$outfile"
  echo "Saved to $outfile"
}

n8n_import_workflow() {
  _n8n_require_id "${1:-}" || return 1
  local infile="${2:-workflow.json}"
  [ -f "$infile" ] || { echo "File not found: $infile" >&2; return 1; }
  curl -s -X PUT "$N8N_BASE/workflows/$1" \
    -H "$N8N_AUTH" -H "Content-Type: application/json" \
    -d @"$infile" | jq '{id, name}'
}

n8n_create_workflow() {
  local infile="${1:-workflow.json}"
  [ -f "$infile" ] || { echo "File not found: $infile" >&2; return 1; }
  curl -s -X POST "$N8N_BASE/workflows" \
    -H "$N8N_AUTH" -H "Content-Type: application/json" \
    -d @"$infile" | jq '{id, name}'
}

n8n_activate() {
  _n8n_require_id "${1:-}" || return 1
  curl -s -X POST "$N8N_BASE/workflows/$1/activate" -H "$N8N_AUTH" | jq '{id, active}'
}

n8n_deactivate() {
  _n8n_require_id "${1:-}" || return 1
  curl -s -X POST "$N8N_BASE/workflows/$1/deactivate" -H "$N8N_AUTH" | jq '{id, active}'
}

n8n_delete_workflow() {
  _n8n_require_id "${1:-}" || return 1
  curl -s -X DELETE "$N8N_BASE/workflows/$1" -H "$N8N_AUTH"
  echo "Deleted $1"
}

n8n_executions() {
  _n8n_require_id "${1:-}" || return 1
  local limit="${2:-10}"
  curl -s "$N8N_BASE/executions?workflowId=$1&limit=$limit" \
    -H "$N8N_AUTH" | jq '.data[] | {id, status, startedAt}'
}

n8n_exec_detail() {
  _n8n_require_id "${1:-}" || return 1
  curl -s "$N8N_BASE/executions/$1?includeData=true" \
    -H "$N8N_AUTH" | jq '.data.resultData.runData'
}

n8n_exec_errors() {
  _n8n_require_id "${1:-}" || return 1
  curl -s "$N8N_BASE/executions/$1?includeData=true" -H "$N8N_AUTH" \
    | jq '[.data.resultData.runData | to_entries[]
           | select(.value[0].executionStatus == "error")
           | {node: .key, error: .value[0].error.message}]'
}

n8n_stop_exec() {
  _n8n_require_id "${1:-}" || return 1
  curl -s -X DELETE "$N8N_BASE/executions/$1" -H "$N8N_AUTH"
  echo "Stopped $1"
}

n8n_health() { bash "$DIR/scripts/health-check.sh"; }

echo "n8n API helpers loaded (instance: ${N8N_API_URL})"
echo "Commands: n8n_list_workflows, n8n_get_workflow <id>, n8n_export_workflow <id> [file]"
echo "          n8n_activate <id>, n8n_deactivate <id>, n8n_executions <id> [limit]"
echo "          n8n_exec_errors <exec_id>, n8n_health"
