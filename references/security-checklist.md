# n8n Security Audit Checklist

Run all 10 checks for every workflow. Report each as ✅ PASS / ⚠️ WARN / ❌ FAIL.
Do not proceed past Stage 3 until all CRITICAL and HIGH are PASS.

---

## Check 1 — Webhook Authentication (CRITICAL)

**Fail if**: `authentication: "none"` on any production-facing webhook.

**Required**:
```json
{"authentication": "headerAuth"}    // Preferred
{"authentication": "basicAuth"}     // Acceptable
{"authentication": "jwtAuth"}       // Acceptable for JWT flows
```

**Remediation**: Set `authentication` to `headerAuth` and create a Header Auth credential with a strong random token (min 32 chars). Document the expected header name and value in the workflow README.

**Acceptable None**: Internal-only webhooks on a private network with compensating network-level controls. Must be explicitly documented.

---

## Check 2 — No Hardcoded Credentials (CRITICAL)

**Fail if**: Any API key, password, token, or secret appears in:
- Node parameters (`parameters.headers`, `parameters.body`, etc.)
- Expression fields (`={{...}}`)
- Code node strings
- Workflow JSON committed to version control

**Remediation**: Move all secrets to the n8n credential system. Reference via:
```json
{"credentials": {"httpHeaderAuth": {"id": "cred-id", "name": "My Service"}}}
```

In Code nodes, never read `process.env.SECRET` — use pre-configured credentials via the credential system or pass via Set node from a credential-backed node.

---

## Check 3 — Input Validation (HIGH)

**Fail if**: Webhook body fields or API response fields are used directly in:
- Database queries without parameterization
- HTTP Request URLs or bodies without allowlisting
- File paths
- Shell commands (Execute Command node)

**Required pattern**:
```javascript
// In Code node — always validate and sanitize
const raw = ($input.first().json?.body?.field ?? '').toString().trim();

// Type check
if (typeof raw !== 'string') return [{json: {error: 'invalid_type'}}];

// Length limit
const safe = raw.slice(0, 256);

// Allowlist for known-format fields
if (!/^[a-zA-Z0-9_-]+$/.test(safe)) return [{json: {error: 'invalid_chars'}}];
```

**For numeric IDs**:
```javascript
const id = parseInt($input.first().json?.body?.id, 10);
if (!Number.isInteger(id) || id <= 0) return [{json: {error: 'invalid_id'}}];
```

---

## Check 4 — SSRF Protection (HIGH)

**Fail if**: An HTTP Request node URL is derived from user-controlled input without URL allowlisting.

```javascript
// ❌ SSRF risk
{"url": "={{$json.body.target_url}}"}

// ✅ Safe — allowlisted domains only
const url = $input.first().json?.body?.target_url ?? '';
const allowed = ['https://api.service.com', 'https://hooks.slack.com'];
if (!allowed.some(base => url.startsWith(base))) {
  return [{json: {error: 'url_not_allowed'}}];
}
```

**Server-side**: Set `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` and configure SSRF protection via environment — n8n has built-in SSRF protection that can block private IP ranges.

---

## Check 5 — Expression Injection (HIGH)

**Fail if**: User-supplied data can embed n8n expressions (`{{...}}`) or JavaScript that gets evaluated.

n8n expressions are evaluated at runtime. If a user submits `{{$env.N8N_ENCRYPTION_KEY}}` and this string is stored then re-injected into an expression field, it will be evaluated.

**Prevention**:
- Never store user input that will later be used as an expression template
- Treat all `$json.body.*` values as untrusted strings — sanitize before use
- Set `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`

---

## Check 6 — Error Response Sanitization (HIGH)

**Fail if**: A Respond to Webhook node, HTTP Request response, or Code node return value includes:
- Error stack traces
- Internal file paths
- Database error messages
- Environment variable names or values
- Node names or workflow structure

**Required**:
```json
{
  "respondWith": "json",
  "responseBody": "={\"status\": \"error\", \"message\": \"Request failed\"}"
}
```

**In Code nodes**:
```javascript
try {
  // ... processing
} catch (err) {
  // ❌ return [{json: {error: err.stack}}];
  // ✅ Log internally, return generic message
  console.error('Processing failed:', err.message); // Internal log only
  return [{json: {status: 'error', message: 'Processing failed'}}];
}
```

---

## Check 7 — Sensitive Data in Execution Logs (MEDIUM)

**Fail if**: Execution data (visible in the n8n UI or API) contains passwords, tokens, PII, or secrets.

**Prevention**:
- Set `EXECUTIONS_DATA_SAVE_ON_SUCCESS=none` if executions don't need debugging
- Use a Set node to strip sensitive fields before they flow to output nodes
- In Code nodes: never `console.log` sensitive values
- Use `EXECUTIONS_DATA_PRUNE=true` and `EXECUTIONS_DATA_MAX_AGE` in production

---

## Check 8 — Rate Limiting & Retry (MEDIUM)

**Warn if**: HTTP Request nodes calling external APIs have no retry or timeout configuration.

**Required for production**:
```json
{
  "timeout": 30000,
  "retryOnFail": true,
  "maxTries": 3,
  "waitBetweenTries": 1000
}
```

**For high-volume workflows**: Add a Wait node or Split in Batches to avoid hitting API rate limits.

---

## Check 9 — Least-Privilege Credentials (MEDIUM)

**Warn if**: A credential with broad permissions (admin, write-all) is used where a narrower scope would suffice.

**Examples**:
- Use a read-only database credential for query-only workflows
- Use scoped API tokens (e.g. GitHub token with only `contents:read`)
- Use separate credentials per workflow — never share admin credentials

**Review**: For each credential used, ask: "What is the minimum permission this workflow needs?"

---

## Check 10 — Error Handling Completeness (MEDIUM)

**Warn if**: The workflow has no error handling strategy — no Error Trigger, no `continueOnFail`, no Stop and Error node.

**Minimum for production**:
1. Add an Error Trigger workflow that sends alerts (Slack, email) on failure
2. Set `errorWorkflow` in workflow settings to the Error Trigger workflow ID
3. On HTTP Request nodes calling flaky services: `"onError": "continueRegularOutput"`
4. On critical validation failures: use Stop and Error node

```json
// Workflow settings
{"errorWorkflow": "error-handler-workflow-id"}

// Per-node for external calls
{"onError": "continueRegularOutput", "retryOnFail": true}
```

---

## Audit Report Template

```markdown
## Security Audit: <Workflow Name> — <Date>

| # | Check | Status | Finding | Remediation | Owner |
|---|-------|--------|---------|-------------|-------|
| 1 | Webhook auth | ✅ PASS | Header auth set | — | |
| 2 | Hardcoded creds | ❌ FAIL | API key in HTTP node header | Move to credential | |
| 3 | Input validation | ⚠️ WARN | No length check on name field | Add slice(0,256) | |
| 4 | SSRF | ✅ PASS | No user-controlled URLs | — | |
| 5 | Expression injection | ✅ PASS | No stored expressions | — | |
| 6 | Error sanitization | ❌ FAIL | Stack trace in webhook response | Return generic message | |
| 7 | Sensitive logs | ✅ PASS | No secrets in exec data | — | |
| 8 | Rate limiting | ⚠️ WARN | No timeout on Slack node | Add timeout: 30000 | |
| 9 | Least privilege | ✅ PASS | Read-only DB credential | — | |
| 10 | Error handling | ✅ PASS | Error Trigger workflow set | — | |

**Summary**: 2 CRITICAL  0 HIGH (resolved above)  2 MEDIUM
**Status**: ❌ NOT READY — resolve FAIL items before proceeding
```
