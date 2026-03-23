#!/usr/bin/env bash
# n8n-api.sh — shell helpers for n8n REST API
# Source this file: source scripts/n8n-api.sh
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$DIR/.env" ] && { set -a; source "$DIR/.env"; set +a; }

N8N_BASE="${N8N_API_URL}/api/v1"
N8N_AUTH="X-N8N-API-KEY: ${N8N_API_KEY}"

n8n_list_workflows()   { curl -s "$N8N_BASE/workflows?limit=100" -H "$N8N_AUTH" | jq '.data[] | {id, name, active}'; }
n8n_get_workflow()     { curl -s "$N8N_BASE/workflows/$1" -H "$N8N_AUTH" | jq '.'; }
n8n_export_workflow()  { curl -s "$N8N_BASE/workflows/$1" -H "$N8N_AUTH" | jq '.' > "${2:-workflow.json}" && echo "Saved to ${2:-workflow.json}"; }
n8n_import_workflow()  { curl -s -X PUT "$N8N_BASE/workflows/$1" -H "$N8N_AUTH" -H "Content-Type: application/json" -d @"${2:-workflow.json}" | jq '{id, name}'; }
n8n_create_workflow()  { curl -s -X POST "$N8N_BASE/workflows" -H "$N8N_AUTH" -H "Content-Type: application/json" -d @"${1:-workflow.json}" | jq '{id, name}'; }
n8n_activate()         { curl -s -X POST "$N8N_BASE/workflows/$1/activate" -H "$N8N_AUTH" | jq '{id, active}'; }
n8n_deactivate()       { curl -s -X POST "$N8N_BASE/workflows/$1/deactivate" -H "$N8N_AUTH" | jq '{id, active}'; }
n8n_delete_workflow()  { curl -s -X DELETE "$N8N_BASE/workflows/$1" -H "$N8N_AUTH"; echo "Deleted $1"; }
n8n_executions()       { curl -s "$N8N_BASE/executions?workflowId=$1&limit=${2:-10}" -H "$N8N_AUTH" | jq '.data[] | {id, status, startedAt}'; }
n8n_exec_detail()      { curl -s "$N8N_BASE/executions/$1?includeData=true" -H "$N8N_AUTH" | jq '.data.resultData.runData'; }
n8n_exec_errors()      { curl -s "$N8N_BASE/executions/$1?includeData=true" -H "$N8N_AUTH" | jq '[.data.resultData.runData | to_entries[] | select(.value[0].executionStatus == "error") | {node: .key, error: .value[0].error.message}]'; }
n8n_stop_exec()        { curl -s -X DELETE "$N8N_BASE/executions/$1" -H "$N8N_AUTH"; echo "Stopped $1"; }
n8n_health()           { bash "$DIR/scripts/health-check.sh"; }

echo "n8n API helpers loaded (instance: ${N8N_API_URL})"
echo "Commands: n8n_list_workflows, n8n_get_workflow <id>, n8n_export_workflow <id> [file]"
echo "          n8n_activate <id>, n8n_deactivate <id>, n8n_executions <id> [limit]"
echo "          n8n_exec_errors <exec_id>, n8n_health"
