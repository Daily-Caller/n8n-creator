#!/usr/bin/env bash
# health-check.sh — verify n8n instance is healthy
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$DIR/.env" ] && { set -a; source "$DIR/.env"; set +a; } || { echo "No .env found — run setup.sh first"; exit 1; }

BASE="$N8N_API_URL"
AUTH="X-N8N-API-KEY: $N8N_API_KEY"

echo "=== n8n Health Check ($BASE) ==="

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/healthz")
[ "$STATUS" = "200" ] && echo "✅ Health: OK" || echo "❌ Health: FAILED ($STATUS)"

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/workflows?limit=1" -H "$AUTH")
[ "$API_STATUS" = "200" ] && echo "✅ API Auth: OK" || echo "❌ API Auth: FAILED ($API_STATUS)"

ACTIVE=$(curl -s "$BASE/api/v1/workflows?active=true&limit=100" -H "$AUTH" | jq '.data | length' 2>/dev/null || echo "?")
echo "ℹ️  Active workflows: $ACTIVE"

ERRORS=$(curl -s "$BASE/api/v1/executions?status=error&limit=5" -H "$AUTH" | jq '.data | length' 2>/dev/null || echo "?")
[ "$ERRORS" = "0" ] && echo "✅ Recent errors: 0" || echo "⚠️  Recent errors: $ERRORS"

echo "================================"
