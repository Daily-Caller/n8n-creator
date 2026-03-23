#!/usr/bin/env bash
# rollback.sh — deactivate workflow and restore previous git version
# Usage: bash rollback.sh <workflow-id>
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
[ -f "$ROOT/.env" ] && { set -a; source "$ROOT/.env"; set +a; } || { echo "No .env — run setup.sh first"; exit 1; }

WORKFLOW_ID="${1:?Usage: rollback.sh <workflow-id>}"
BASE="$N8N_API_URL/api/v1"
AUTH="X-N8N-API-KEY: $N8N_API_KEY"

echo "Rolling back workflow $WORKFLOW_ID..."

# Deactivate
curl -s -X POST "$BASE/workflows/$WORKFLOW_ID/deactivate" -H "$AUTH" > /dev/null
echo "  Deactivated"

# Restore previous git version of workflow.json
git -C "$ROOT" checkout HEAD~1 -- "$DIR/workflow.json"
echo "  Restored workflow.json from HEAD~1"

# Re-import
curl -s -X PUT "$BASE/workflows/$WORKFLOW_ID" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d @"$DIR/workflow.json" > /dev/null

# Re-activate
curl -s -X POST "$BASE/workflows/$WORKFLOW_ID/activate" -H "$AUTH" > /dev/null
echo "  ✅ Rolled back and re-activated $WORKFLOW_ID"
