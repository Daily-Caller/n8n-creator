#!/usr/bin/env bash
# deploy.sh — import and activate this workflow
# Copy to workflows/<project-name>/deploy.sh and commit with workflow.json
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
[ -f "$ROOT/.env" ] && { set -a; source "$ROOT/.env"; set +a; } || { echo "No .env — run setup.sh first"; exit 1; }

WORKFLOW_FILE="$DIR/workflow.json"
BASE="$N8N_API_URL/api/v1"
AUTH="X-N8N-API-KEY: $N8N_API_KEY"

[ -f "$WORKFLOW_FILE" ] || { echo "workflow.json not found at $WORKFLOW_FILE"; exit 1; }

NAME=$(jq -r '.name' "$WORKFLOW_FILE")
echo "Deploying: $NAME"

EXISTING_ID=$(curl -s "$BASE/workflows?limit=200" -H "$AUTH" \
  | jq -r --arg n "$NAME" '.data[] | select(.name==$n) | .id' | head -1)

if [ -n "$EXISTING_ID" ]; then
  echo "  Updating existing workflow $EXISTING_ID..."
  curl -s -X PUT "$BASE/workflows/$EXISTING_ID" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d @"$WORKFLOW_FILE" > /dev/null
  curl -s -X POST "$BASE/workflows/$EXISTING_ID/activate" -H "$AUTH" > /dev/null
  echo "  ✅ Updated and activated ($EXISTING_ID)"
else
  echo "  Creating new workflow..."
  NEW_ID=$(curl -s -X POST "$BASE/workflows" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d @"$WORKFLOW_FILE" | jq -r '.id')
  curl -s -X POST "$BASE/workflows/$NEW_ID/activate" -H "$AUTH" > /dev/null
  echo "  ✅ Created and activated ($NEW_ID)"
fi
