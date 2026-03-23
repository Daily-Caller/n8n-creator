# n8n Environment Configuration Reference

All variables read from `.env` in the working directory.
Variables with `_FILE` suffix accept a file path whose contents are used as the value — useful with Docker secrets.

---

## Skill-level variables (used by n8n-creator)

```bash
N8N_API_URL=http://localhost:5678    # Base URL (no trailing slash)
N8N_API_KEY=your-api-key            # From Settings > n8n API > Create API key
N8N_WEBHOOK_BASE_URL=               # Public-facing URL if behind a proxy
WORKFLOWS_DIR=./workflows           # Where workflow JSON + scripts are saved
```

---

## Core identity & networking

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_HOST` | `localhost` | Hostname for generated URLs |
| `N8N_PORT` | `5678` | Internal port |
| `N8N_PROTOCOL` | `http` | `http` or `https` |
| `WEBHOOK_URL` | — | External webhook base URL override |
| `N8N_EDITOR_BASE_URL` | — | Public URL for editor and SAML redirects |
| `GENERIC_TIMEZONE` | — | e.g. `UTC`, `America/New_York` |

---

## Security (critical for production)

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_ENCRYPTION_KEY` | auto | 64-hex-char key for encrypting all credentials. **Never leave auto-generated in prod.** |
| `N8N_ENCRYPTION_KEY_FILE` | — | Path to file containing key |
| `N8N_BLOCK_ENV_ACCESS_IN_NODE` | `false` | **Set `true` in prod** — blocks `process.env` in Code nodes |
| `N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES` | — | Restricts Code node file access to .n8n dir |
| `N8N_RESTRICT_FILE_ACCESS_TO` | — | Semicolon-separated directories Code nodes may access |
| `N8N_SECURE_COOKIE` | — | Force cookies over HTTPS only |
| `N8N_SAMESITE_COOKIE` | — | `strict`, `lax`, or `none` |
| `N8N_CONTENT_SECURITY_POLICY` | — | Configures CSP headers |
| `N8N_PUBLIC_API_DISABLED` | — | Disable the REST API entirely |

---

## Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_BASIC_AUTH_ACTIVE` | `false` | Enable HTTP Basic Auth gate |
| `N8N_BASIC_AUTH_USER` | — | Basic Auth username |
| `N8N_BASIC_AUTH_PASSWORD` | — | Basic Auth password |

Enterprise: LDAP, SAML SSO (Okta, Azure AD), OIDC configured in UI Settings.

---

## Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_TYPE` | `sqlite` | `sqlite` or `postgresdb` (PostgreSQL recommended for prod) |
| `DB_POSTGRESDB_HOST` | — | PostgreSQL host |
| `DB_POSTGRESDB_PORT` | `5432` | PostgreSQL port |
| `DB_POSTGRESDB_DATABASE` | — | Database name |
| `DB_POSTGRESDB_USER` | — | Username |
| `DB_POSTGRESDB_PASSWORD` | — | Password |
| `DB_POSTGRESDB_PASSWORD_FILE` | — | Path to password file |
| `DB_POSTGRESDB_POOL_SIZE` | `2` | Max connections |
| `DB_POSTGRESDB_SSL_ENABLED` | `false` | TLS to database |

---

## Webhooks & payloads

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_PAYLOAD_SIZE_MAX` | `16` | Max webhook payload in MiB |
| `N8N_FORMDATA_FILE_SIZE_MAX` | `200` | Max file upload in form-data (MiB) |
| `N8N_ENDPOINT_WEBHOOK` | `webhook` | Webhook URL path segment |
| `N8N_ENDPOINT_WEBHOOK_TEST` | `webhook-test` | Test webhook path |

---

## Execution settings

| Variable | Default | Description |
|----------|---------|-------------|
| `EXECUTIONS_MODE` | `regular` | `regular` or `queue` (Redis-backed) |
| `EXECUTIONS_TIMEOUT` | — | Hard stop per run (seconds) |
| `EXECUTIONS_TIMEOUT_MAX` | — | Max allowed per workflow |
| `EXECUTIONS_DATA_SAVE_ON_SUCCESS` | `all` | `all` or `none` |
| `EXECUTIONS_DATA_SAVE_ON_ERROR` | `all` | `all` or `none` |
| `EXECUTIONS_DATA_PRUNE` | `false` | Auto-prune old execution data |
| `EXECUTIONS_DATA_MAX_AGE` | — | Keep data for X hours |
| `N8N_CONCURRENCY_PRODUCTION_LIMIT` | — | Max concurrent executions |

---

## Queue / Redis (when EXECUTIONS_MODE=queue)

| Variable | Default | Description |
|----------|---------|-------------|
| `QUEUE_BULL_REDIS_HOST` | — | Redis hostname |
| `QUEUE_BULL_REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | — | Redis password |
| `REDIS_PASSWORD_FILE` | — | File containing Redis password |
| `QUEUE_WORKER_CONCURRENCY` | — | Jobs per worker |

---

## Code node / runner security

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_RUNNERS_ENABLED` | `false` | Enable isolated task runners |
| `NODE_FUNCTION_ALLOW_BUILTIN` | — | Comma-separated Node.js built-ins to allow |
| `NODE_FUNCTION_ALLOW_EXTERNAL` | — | Comma-separated npm packages to allow |
| `N8N_PYTHON_ENABLED` | — | Enable Python in Code nodes |
| `N8N_RUNNERS_STDLIB_ALLOW` | — | Python stdlib modules to allow |
| `N8N_RUNNERS_EXTERNAL_ALLOW` | — | Python external packages to allow |
| `N8N_BLOCK_RUNNER_ENV_ACCESS` | — | Block env access inside runners |

---

## Security audit

| Variable | Default | Description |
|----------|---------|-------------|
| `N8N_SECURITY_AUDIT_DAYS_ABANDONED_WORKFLOW` | `90` | Days before flagging dormant workflow |

---

## Minimal production .env

```bash
# .env — DO NOT COMMIT THIS FILE
N8N_API_URL=https://n8n.yourdomain.com
N8N_API_KEY=your-api-key
N8N_WEBHOOK_BASE_URL=https://n8n.yourdomain.com

N8N_ENCRYPTION_KEY=<64-hex-chars-from-openssl-rand-hex-32>
N8N_BLOCK_ENV_ACCESS_IN_NODE=true
N8N_SECURE_COOKIE=true
N8N_PAYLOAD_SIZE_MAX=16

DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=db.internal
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=n8n
DB_POSTGRESDB_PASSWORD_FILE=/run/secrets/db_password
DB_POSTGRESDB_SSL_ENABLED=true

EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168
EXECUTIONS_TIMEOUT=300

WORKFLOWS_DIR=./workflows
```

Generate a secure encryption key:
```bash
openssl rand -hex 32
```
