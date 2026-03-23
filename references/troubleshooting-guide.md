# n8n Troubleshooting Guide

## Diagnosing Failures

### Step 1: Check execution logs

```bash
# Most recent executions
curl -s "$N8N_API_URL/api/v1/executions?workflowId=$ID&limit=5" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {id, status, startedAt}'

# Full execution detail
curl -s "$N8N_API_URL/api/v1/executions/$EXEC_ID?includeData=true" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  | jq '.data.resultData.runData | keys'
```

### Step 2: Identify the failing node

```bash
curl -s "$N8N_API_URL/api/v1/executions/$EXEC_ID?includeData=true" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  | jq '[.data.resultData.runData | to_entries[] |
         select(.value[0].executionStatus == "error") |
         {node: .key, error: .value[0].error.message}]'
```

### Step 3: Inspect node output

In n8n UI: click the failed node after execution to see input/output data.

---

## Error Catalog

### Data & Expression Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read property 'X' of undefined` | Accessing nested path on null | Use optional chaining: `$json?.body?.field` |
| Expression shows as literal text | Missing `{{}}` or field not in expression mode | Wrap in `{{}}`, toggle expression mode (= button) |
| `Invalid expression: $json.name` | Missing braces | Use `={{$json.name}}` |
| `Node 'X' does not exist` in expression | Typo in node name | Check exact case: `$node["HTTP Request"]` |
| `$json is undefined` in Code node | Wrong data access pattern | Use `$input.first().json` not `$json` |

### Node Configuration Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Node not found` in validate_node | Wrong nodeType prefix | Use `nodes-base.X` not `n8n-nodes-base.X` |
| `Operation must be one of...` | Invalid operation value | Check allowed values with `get_node()` |
| `Missing required field: channel` | Required field not set | Add field — check `get_node()` for requirements |
| `Expected number, got string` | Type mismatch | Convert: `parseInt(value, 10)` or `Number(value)` |

### Webhook Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | No auth token or wrong header name | Check `X-Webhook-Token` header matches credential |
| 404 Not Found | Wrong path or workflow not active | Check path, ensure workflow is activated |
| 413 Payload Too Large | Body exceeds N8N_PAYLOAD_SIZE_MAX | Increase limit or reduce payload |
| No response / timeout | responseMode misconfigured | Check `responseMode` — use `lastNode` and add Respond to Webhook |
| Webhook receives data but workflow doesn't run | Wrong webhook URL (test vs production) | Use `/webhook/` for production, `/webhook-test/` for testing |

### Connection & Network Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Connection refused` | Service not reachable | Check URL, port, firewall, service status |
| `ECONNREFUSED 127.0.0.1:5678` | n8n not running | Start n8n: `npx n8n` or `docker start n8n` |
| `SSL certificate error` | Self-signed cert | Add CA cert or set `N8N_NODE_TLS_REJECT_UNAUTHORIZED=0` (dev only) |
| `API key rejected` | Wrong header name | Must be `X-N8N-API-KEY` not `Authorization` |
| `CORS error` in browser | n8n CORS not configured | Set `N8N_CORS_ORIGIN` env var |

### Execution Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Workflow executes but no output | Missing Respond to Webhook | Add Respond to Webhook as final node |
| Broken connection error | Stale node reference | Run `cleanStaleConnections` operation |
| Circular dependency detected | Loop in connections | Restructure — use Wait node for callbacks |
| Multiple trigger nodes warning | Two triggers in one workflow | Remove extra trigger or split into workflows |
| Disconnected node warning | Node not connected | Connect or delete the orphan node |

### Code Node Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `return value is not an array` | Missing array wrapper | Return `[{json: {...}}]` not `{json: {...}}` |
| `items[0].json is undefined` | Empty input | Check `if (!items.length) return []` |
| `$helpers is not defined` | Wrong code version | Use `$helpers.httpRequest()` — available in JS Code nodes |
| `require is not defined` | Node.js require blocked | Use `NODE_FUNCTION_ALLOW_EXTERNAL` env var |

### Community Node Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Instance crashes on startup | Incompatible community node | Disable all community nodes via Cloud Admin Panel > Manage |
| `Cannot find module` | Missing npm package | Re-install community node |
| Node appears but doesn't work | Wrong version | Check version compatibility with n8n version |

---

## Recovery Procedures

### Stuck execution

```bash
# Get running executions
curl -s "$N8N_API_URL/api/v1/executions?status=running" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {id, startedAt}'

# Stop execution (delete it)
curl -s -X DELETE "$N8N_API_URL/api/v1/executions/$EXEC_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

### Workflow in bad state — restore from git

```bash
# Rollback to previous version
bash ./workflows/<project-name>/rollback.sh <workflow-id>

# Or manually restore
git show HEAD~1:./workflows/<project-name>/workflow.json > /tmp/previous.json
curl -s -X PUT "$N8N_API_URL/api/v1/workflows/$ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/previous.json
```

### Database connection lost

```bash
# Check database connectivity
curl -s "$N8N_API_URL/healthz/readiness" | jq .
# If unhealthy, check DB_POSTGRESDB_* env vars and network
```

### n8n won't start after config change

```bash
# Test configuration
N8N_LOG_LEVEL=debug npx n8n start 2>&1 | head -50

# Common causes:
# - N8N_ENCRYPTION_KEY changed (can't decrypt existing credentials)
# - DB_POSTGRESDB_* connection refused
# - Port already in use (N8N_PORT)
# - Invalid SSL certificate path
```

---

## Health Check Script

```bash
#!/usr/bin/env bash
# health-check.sh — verify n8n instance is healthy
source .env

BASE="$N8N_API_URL"
AUTH="X-N8N-API-KEY: $N8N_API_KEY"

echo "=== n8n Health Check ==="

# Basic health
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/healthz")
[ "$STATUS" = "200" ] && echo "✅ Health: OK" || echo "❌ Health: FAILED ($STATUS)"

# API auth
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/workflows?limit=1" -H "$AUTH")
[ "$API_STATUS" = "200" ] && echo "✅ API Auth: OK" || echo "❌ API Auth: FAILED ($API_STATUS)"

# Active workflows
ACTIVE=$(curl -s "$BASE/api/v1/workflows?active=true&limit=100" -H "$AUTH" \
  | jq '.data | length')
echo "ℹ️  Active workflows: $ACTIVE"

# Recent errors
ERRORS=$(curl -s "$BASE/api/v1/executions?status=error&limit=5" -H "$AUTH" \
  | jq '.data | length')
[ "$ERRORS" = "0" ] && echo "✅ Recent errors: 0" || echo "⚠️  Recent errors: $ERRORS"

echo "========================"
```
