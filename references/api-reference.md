# n8n REST API Reference

Authentication: all requests require `X-N8N-API-KEY: <key>` header.
Base URL: `$N8N_API_URL/api/v1`
Interactive docs: `$N8N_API_URL/api/v1/docs` (Swagger UI on self-hosted)

---

## Workflows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workflows` | List all workflows. Params: `active`, `tags`, `name`, `limit`, `cursor` |
| POST | `/workflows` | Create workflow. Body: `{name, nodes, connections, settings, tags}` |
| GET | `/workflows/:id` | Get workflow by ID |
| PUT | `/workflows/:id` | Full replace of workflow |
| DELETE | `/workflows/:id` | Delete workflow |
| POST | `/workflows/:id/activate` | Activate workflow |
| POST | `/workflows/:id/deactivate` | Deactivate workflow |

### Create workflow body

```json
{
  "name": "My Workflow",
  "nodes": [
    {
      "id": "uuid",
      "name": "Node Name",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 300],
      "parameters": {}
    }
  ],
  "connections": {
    "Node Name": {
      "main": [[{"node": "Next Node", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "saveManualExecutions": true,
    "callerPolicy": "workflowsFromSameOwner",
    "errorWorkflow": ""
  },
  "tags": []
}
```

---

## Executions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/executions` | List executions. Params: `workflowId`, `status`, `limit`, `cursor` |
| GET | `/executions/:id` | Get single execution with node data |
| DELETE | `/executions/:id` | Delete execution record |

### Execution status values
`success` | `error` | `waiting` | `running`

---

## Credentials

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/credentials` | List credentials |
| POST | `/credentials` | Create credential |
| GET | `/credentials/:id` | Get credential (data masked) |
| PUT | `/credentials/:id` | Update credential |
| DELETE | `/credentials/:id` | Delete credential |
| GET | `/credentials/schema/:credentialTypeName` | Get schema for a credential type |

### Create credential body

```json
{
  "name": "My API Key",
  "type": "httpHeaderAuth",
  "data": {
    "name": "X-API-Key",
    "value": "secret-value"
  }
}
```

Common credential types: `httpHeaderAuth`, `httpBasicAuth`, `oAuth2Api`, `postgresDb`, `mysqlDb`, `slackApi`, `githubApi`

---

## Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tags` | List all tags |
| POST | `/tags` | Create tag. Body: `{name}` |
| GET | `/tags/:id` | Get tag |
| PUT | `/tags/:id` | Update tag |
| DELETE | `/tags/:id` | Delete tag |

---

## Variables

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/variables` | List all variables |
| POST | `/variables` | Create variable. Body: `{key, value}` |
| DELETE | `/variables/:id` | Delete variable |

---

## Users (owner only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users |
| GET | `/users/:id` | Get user |
| DELETE | `/users/:id` | Delete user |

---

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/healthz` | Health check (no auth required) |
| GET | `/healthz/readiness` | Readiness check |

---

## Pagination

All list endpoints support cursor-based pagination:

```bash
# First page
curl "$BASE/workflows?limit=25" -H "$AUTH"
# Returns: {"data": [...], "nextCursor": "abc123"}

# Next page
curl "$BASE/workflows?limit=25&cursor=abc123" -H "$AUTH"
```

---

## Error responses

```json
{"code": 404, "message": "Workflow not found"}
{"code": 401, "message": "Unauthorized"}
{"code": 400, "message": "Validation error: ..."}
```

---

## Shell helper functions

```bash
#!/usr/bin/env bash
# Source this file for convenient n8n API access
# Usage: source n8n-api.sh

n8n_list_workflows() {
  curl -s "$N8N_API_URL/api/v1/workflows?limit=100" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {id, name, active}'
}

n8n_get_workflow() {
  local id="$1"
  curl -s "$N8N_API_URL/api/v1/workflows/$id" \
    -H "X-N8N-API-KEY: $N8N_API_KEY"
}

n8n_export_workflow() {
  local id="$1" outfile="$2"
  n8n_get_workflow "$id" | jq '.' > "$outfile"
  echo "Exported $id → $outfile"
}

n8n_import_workflow() {
  local file="$1"
  local name
  name=$(jq -r '.name' "$file")
  local existing_id
  existing_id=$(curl -s "$N8N_API_URL/api/v1/workflows" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    | jq -r --arg n "$name" '.data[] | select(.name==$n) | .id' | head -1)

  if [ -n "$existing_id" ]; then
    curl -s -X PUT "$N8N_API_URL/api/v1/workflows/$existing_id" \
      -H "X-N8N-API-KEY: $N8N_API_KEY" -H "Content-Type: application/json" \
      -d @"$file" | jq '{id, name, active}'
  else
    curl -s -X POST "$N8N_API_URL/api/v1/workflows" \
      -H "X-N8N-API-KEY: $N8N_API_KEY" -H "Content-Type: application/json" \
      -d @"$file" | jq '{id, name, active}'
  fi
}

n8n_activate() {
  local id="$1"
  curl -s -X POST "$N8N_API_URL/api/v1/workflows/$id/activate" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '{id, name, active}'
}

n8n_deactivate() {
  local id="$1"
  curl -s -X POST "$N8N_API_URL/api/v1/workflows/$id/deactivate" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '{id, name, active}'
}

n8n_executions() {
  local id="$1" limit="${2:-10}"
  curl -s "$N8N_API_URL/api/v1/executions?workflowId=$id&limit=$limit" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    | jq '.data[] | {id, startedAt, stoppedAt, status}'
}

n8n_health() {
  curl -s "$N8N_API_URL/healthz" | jq .
}
```
