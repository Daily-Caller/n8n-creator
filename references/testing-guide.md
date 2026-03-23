# n8n Workflow Testing Guide

## Testing Strategies

### 1. Data Pinning (safest — no real external calls)

Pin data at a node to test downstream nodes without triggering real API calls.

In the n8n UI:
1. Run the workflow manually once with real data
2. Click the node whose output you want to freeze
3. Click "Pin Data" — the output is locked for future test runs
4. Downstream nodes use the pinned data instead of live results

**When to use**: Testing transformation and logic nodes without hitting rate limits or making real DB writes.

---

### 2. Partial Execution

Run only a portion of the workflow from a specific node.

In the n8n UI:
1. Click "Execute from here" on any node
2. Provide test input manually
3. Only the selected node and downstream nodes run

**When to use**: Debugging a specific section without re-running expensive upstream steps.

---

### 3. Manual Trigger with Test Payloads

```bash
# Trigger a webhook with a test payload
curl -X POST "$N8N_WEBHOOK_BASE_URL/webhook-test/your-path" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: your-test-token" \
  -d '{"name": "Test User", "email": "test@example.com"}'

# Use webhook-test path for test executions (doesn't require activation)
# Use webhook path for production executions (requires activation)
```

---

### 4. Execution Log Analysis (REST API)

```bash
# Get recent executions for a workflow
curl -s "$N8N_API_URL/api/v1/executions?workflowId=$ID&limit=5" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  | jq '.data[] | {id, startedAt, stoppedAt, status}'

# Get detailed execution with node data
curl -s "$N8N_API_URL/api/v1/executions/$EXEC_ID?includeData=true" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  | jq '.data.resultData.runData'

# Find the failing node
curl -s "$N8N_API_URL/api/v1/executions/$EXEC_ID?includeData=true" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  | jq '[.data.resultData.runData | to_entries[] | {node: .key, status: .value[0].executionStatus, error: .value[0].error}]'
```

---

## Required Test Scenarios

Run all scenarios against every workflow before marking Stage 4 complete.

| # | Scenario | Test Method | Pass Criteria |
|---|----------|------------|---------------|
| 1 | **Happy path** | Manual trigger with valid payload | Correct output, 200 status, no errors |
| 2 | **Missing required field** | POST `{}` | Safe error response, no crash, no stack trace |
| 3 | **Malformed JSON** | POST `"not json"` | Caught at boundary, generic error returned |
| 4 | **Auth failure** | No header / wrong token | 401 response, no data leaked |
| 5 | **Oversized payload** | POST >16MB | Rejected with 413 or timeout |
| 6 | **Expression injection** | `{"field": "{{$env.N8N_ENCRYPTION_KEY}}"}` in body | Treated as literal string |
| 7 | **External service timeout** | Mock/block the external endpoint | Timeout fires, handled gracefully, alert sent |
| 8 | **Duplicate trigger** | Send same event twice | Idempotent — no duplicate side effects |
| 9 | **Empty dataset** | Trigger with 0 records | Handles gracefully, no null errors |
| 10 | **Maximum items** | Send batch at upper limit | Completes without timeout or memory error |

---

## Testing Without Real External Services

### Mock HTTP responses with a local endpoint

```bash
# Use a simple echo server for testing HTTP Request nodes
python3 -c "
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'received': json.loads(body), 'mock': True}).encode())
    def log_message(self, *args): pass

HTTPServer(('', 9999), Handler).serve_forever()
"
# Point HTTP Request nodes at http://localhost:9999 during testing
```

### Override URLs via n8n environment variable

Set test URLs in the workflow using n8n Variables (Settings > Variables):
```
PAYMENT_API_URL = http://localhost:9999   # test
PAYMENT_API_URL = https://api.stripe.com  # production
```

Reference in workflow: `={{$vars.PAYMENT_API_URL}}`

---

## Debugging Common Failures

### "Cannot read property X of undefined"

```javascript
// Problem: webhook data accessed at wrong path
const email = $json.email;  // undefined — webhook wraps under .body

// Fix
const email = $json.body.email;
// Or with guard
const email = $json?.body?.email ?? null;
```

### Expression shows as literal text

```
Problem: {{$json.field}} appears as the string "{{$json.field}}"
Fix: The field must be in "expression mode" — click the = button next to the field
     OR the field doesn't support expressions (e.g. webhook path)
```

### Validation error: "invalid_value" on operation

```javascript
// Problem: wrong operation name
{"operation": "send"}  // Wrong

// Fix: check allowed values with get_node
get_node({nodeType: "nodes-base.slack"})
// Then use the exact operation name from the list
{"operation": "post"}  // Correct
```

### Workflow validates but executes incorrectly

Use binary search debugging:
1. Add a Stop and Error node halfway through the workflow
2. Run — if it stops, the problem is in the second half
3. Move Stop and Error node to 75% mark
4. Repeat until the failing node is isolated

---

## Automated Testing Script

```bash
#!/usr/bin/env bash
# test-workflow.sh — run standard test scenarios against a workflow
set -euo pipefail
source .env

WEBHOOK_URL="${N8N_WEBHOOK_BASE_URL}/webhook-test/${WEBHOOK_PATH}"
TOKEN="${WEBHOOK_TOKEN}"
PASS=0
FAIL=0

run_test() {
  local name="$1" payload="$2" expected_status="$3"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Token: $TOKEN" \
    -d "$payload")

  if [ "$status" = "$expected_status" ]; then
    echo "✅ PASS: $name (HTTP $status)"
    ((PASS++))
  else
    echo "❌ FAIL: $name (expected $expected_status, got $status)"
    ((FAIL++))
  fi
}

echo "Testing $WEBHOOK_URL..."
run_test "Happy path"          '{"name":"Test","email":"t@example.com"}' "200"
run_test "Missing fields"      '{}'                                       "200"
run_test "Auth failure"        '{"name":"Test"}' "401"  # (no token)
# Add more test cases...

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
```
