#!/usr/bin/env bash
# new-workflow.sh — scaffold a new workflow folder with all required files
# Usage: bash scripts/new-workflow.sh <project-name>
set -euo pipefail

NAME="${1:?Usage: new-workflow.sh <project-name>}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"
TEMPLATES="$ROOT/workflows/_templates"
DEST="$ROOT/workflows/$NAME"

if [ -d "$DEST" ]; then
  echo "Error: workflows/$NAME already exists" >&2
  exit 1
fi

mkdir -p "$DEST"

# workflow.json stub
cat > "$DEST/workflow.json" <<EOF
{
  "name": "$NAME",
  "active": false,
  "nodes": [],
  "connections": {},
  "settings": {
    "executionOrder": "v1",
    "saveManualExecutions": true,
    "callerPolicy": "workflowsFromSameOwner"
  },
  "tags": []
}
EOF

# README.md
cat > "$DEST/README.md" <<EOF
# $NAME

## Purpose
<One sentence: what this workflow does and why>

## Trigger
- Type: Webhook / Schedule / Manual
- URL: \`\$N8N_WEBHOOK_BASE_URL/webhook/<path>\`
- Auth: Header auth — requires \`X-Webhook-Token\` header

## Dependencies
<!-- List any other workflows this calls via Execute Workflow, in deploy order -->
- None

## Required Credentials
- \`httpHeaderAuth\` — API key for <service>

## Required Environment Variables
- \`N8N_API_URL\`
- \`N8N_API_KEY\`
- \`N8N_WEBHOOK_BASE_URL\`

## Data Flow
<Input → transform → output>

## Security Notes
<Known risks or compensating controls>

## Deploy
\`\`\`bash
bash deploy.sh
\`\`\`

## Rollback
\`\`\`bash
bash rollback.sh <workflow-id>
\`\`\`
EOF

# .env.example
cp "$TEMPLATES/.env.example" "$DEST/.env.example"

# deploy.sh
cp "$TEMPLATES/deploy.sh" "$DEST/deploy.sh"
chmod +x "$DEST/deploy.sh"

# rollback.sh
cp "$TEMPLATES/rollback.sh" "$DEST/rollback.sh"
chmod +x "$DEST/rollback.sh"

echo "✅ Created workflows/$NAME/"
echo "   workflow.json  README.md  .env.example  deploy.sh  rollback.sh"
echo ""
echo "Next: build your workflow, then run:"
echo "  bash scripts/validate-workflows.sh"
