# n8n Workflow Design Patterns

## The 5 Core n8n Patterns

### 1. Webhook Processing (most common — 35% of workflows)

```
Webhook → Validate Input → Transform → Action → Respond to Webhook
                                     ↘ Error Trigger → Alert
```

**When to use**: Receiving events from Stripe, GitHub, Slack, forms, any HTTP push.

**Security requirements**: Always authenticate webhook. Validate all body fields. Return generic response.

**Gotcha**: Webhook data is under `$json.body.field`, NOT `$json.field`.

---

### 2. HTTP API Integration

```
Trigger → HTTP Request → Handle Pagination → Transform → Store/Notify
        ↘ Error Trigger → Alert
```

**When to use**: Syncing data from REST APIs, polling for changes, fetching reports.

**Pagination pattern**:
```
HTTP Request → Code (extract next_cursor) → IF (has more?) → loop back / continue
```

---

### 3. Database Operations

```
Schedule → Query DB → IF (records exist?) → Transform → Write → Verify
         ↘ Error → Rollback / Alert
```

**When to use**: ETL, cross-database sync, data pipelines, reporting.

**Safety**: Always use parameterized queries. Never build SQL from `$json` fields directly.

---

### 4. AI Agent Workflow

```
Webhook/Chat → AI Agent ← Language Model (ai_languageModel)
                        ← Tools: HTTP Request, DB, Code (ai_tool)
                        ← Memory: Window Buffer (ai_memory)
              → Response
```

**When to use**: Chatbots, document Q&A, multi-step reasoning, tool-using agents.

**Security**: Validate AI output before using in downstream actions. Apply output length limits.

---

### 5. Scheduled Tasks

```
Schedule → Fetch Data → Process → Deliver (Email/Slack) → Log
         ↘ Error → Alert
```

**When to use**: Daily reports, digests, maintenance, health checks.

---

## Advanced Patterns

### Saga / Compensating Transactions

Use when a multi-step operation must be atomic — if step N fails, steps 1..N-1 must be reversed.

```
Step 1: Reserve inventory  →  Step 2: Charge payment  →  Step 3: Fulfill order
   ↓ on fail: (nothing)       ↓ on fail: release inv       ↓ on fail: refund + release

Implementation in n8n:
  IF node after each step → on error branch → compensation nodes (in reverse)
  Use Stop and Error to halt after compensation
```

**Rules**:
- Register compensation BEFORE executing the step (store state with Set node)
- Compensations must be idempotent
- Run compensations in reverse order (LIFO)

---

### Fan-Out / Fan-In (Parallel Processing)

```
Trigger → Split In Batches → [Process batch] → Merge → Aggregate → Output
```

**Or for independent parallel branches**:
```
Trigger → Item A processing ↘
        → Item B processing  → Merge (Wait for All)
        → Item C processing ↗
```

**Use when**: Processing multiple independent items, calling multiple APIs simultaneously.

**n8n implementation**: Use Split Out node to create parallel items, Merge node to collect results. Set Merge mode to "Wait for All Inputs".

---

### Fan-Out at Scale

For very large datasets (10K+ items):

```
Schedule → DB Query (all IDs) → Split in Batches (100 each) → Execute Sub-workflow
                                                               ↑ (processes one batch)
```

**Sub-workflow pattern**: Create a separate workflow triggered by Execute Sub-workflow. Pass the batch as input. This keeps individual workflow execution small.

---

### Async Callback / Human-in-the-Loop

```
Trigger → Send request (email/Slack with approval link) → Wait node (hours/days)
        → Resume on callback webhook → Branch on approval/rejection
```

**n8n implementation**: Use the Wait node — it pauses execution until a webhook callback is received or a timeout expires.

---

### Entity Workflow (Long-Lived)

One workflow instance per entity (order, account, document):

```
Create Trigger → Initialize state → Wait for events → Update state → Wait...
                                   ↑__________________________|
```

**n8n approach**: Use a persistent store (DB or n8n variables) keyed by entity ID. Each event webhook looks up the entity state and updates it.

---

## Workflow Design Principles

### From workflow-orchestration-patterns:

1. **Single responsibility** — one workflow does one thing. Split complex flows into sub-workflows.
2. **Idempotency** — every node that writes data should be safe to run twice (upsert, not insert).
3. **Explicit error paths** — every external call has an error branch.
4. **Bounded execution** — always set `EXECUTIONS_TIMEOUT`. Long-running loops use Split in Batches.
5. **Test locally first** — use Manual trigger and pinned data before activating.

### Data flow rules:

- **Validate at entry** — sanitize all external inputs at the first node after the trigger.
- **Transform once** — use a single Code or Set node to normalize data before it branches.
- **Log at boundaries** — record input and output at integration boundaries for debugging.
- **Fail fast** — use Stop and Error for unrecoverable conditions. Don't silently continue with bad data.

### Node naming conventions:

```
✅ "Validate Webhook Payload"       — purpose + context
✅ "Fetch GitHub Issues"            — verb + service + resource
✅ "Transform to Jira Format"       — verb + target format
✅ "Notify Slack #alerts"           — verb + destination

❌ "Code"                           — no meaning
❌ "HTTP Request2"                  — n8n default, no purpose
❌ "IF1"                            — what condition?
```

---

## Workflow Complexity Guide

| Size | Nodes | Pattern | Recommended approach |
|------|-------|---------|---------------------|
| Simple | 3-5 | Linear | Single workflow |
| Medium | 6-10 | Branching | Single workflow + Error Trigger |
| Complex | 11-20 | Multiple branches | Main + 1-2 sub-workflows |
| Large | 20+ | Orchestrator + workers | Orchestrator calls sub-workflows via Execute Sub-workflow |

**Rule**: If a workflow needs more than 20 nodes, split it. Large workflows are hard to debug and test.

---

## Connections Reference

```json
// Standard node → node connection
"connections": {
  "Source Node": {
    "main": [[{"node": "Target Node", "type": "main", "index": 0}]]
  }
}

// IF node — true branch (index 0) and false branch (index 1)
"IF Node": {
  "main": [
    [{"node": "True Handler", "type": "main", "index": 0}],
    [{"node": "False Handler", "type": "main", "index": 0}]
  ]
}

// AI node connections (special types)
"AI Agent": {
  "ai_languageModel": [[{"node": "OpenAI Chat Model", "type": "ai_languageModel", "index": 0}]],
  "ai_tool": [[{"node": "HTTP Request Tool", "type": "ai_tool", "index": 0}]],
  "ai_memory": [[{"node": "Window Buffer Memory", "type": "ai_memory", "index": 0}]]
}
```
