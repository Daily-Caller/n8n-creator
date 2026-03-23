# <Workflow Name>

## Purpose
<One sentence: what this workflow does and why>

## Trigger
- Type: Webhook / Schedule / Manual
- URL: `$N8N_WEBHOOK_BASE_URL/webhook/<path>`
- Auth: Header auth — requires `X-Webhook-Token` header

## Required Credentials
- `httpHeaderAuth` — API key for <service>
- `postgresDb` — read-only access to <database>

## Required Environment Variables
- `N8N_API_URL`
- `N8N_API_KEY`
- `N8N_WEBHOOK_BASE_URL`

## Data Flow
<Input → transform → output>

## Security Notes
<Known risks or compensating controls>

## Deploy
```bash
bash deploy.sh
```

## Rollback
```bash
bash rollback.sh <workflow-id>
```

## Test
```bash
# Happy path
curl -X POST "$N8N_WEBHOOK_BASE_URL/webhook-test/<path>" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: <token>" \
  -d '{"field": "value"}'
```
