---
name: coding-standards
domain: coding-standards
purpose: Enforce code patterns specific to this TypeScript/Python GTM integration codebase
applies_to: All code in this repo — CRM sync services, API connectors, data pipelines
stack: "TypeScript (Node.js services), Python (data pipeline scripts), tested with Vitest/pytest"
version: 2.0
---

### The Core Insight

This codebase is **integration-heavy**: most code moves data between Apollo, HubSpot, Clay, and internal APIs. The failure modes are not about algorithm complexity — they are about silent data corruption, partial sync failures, and untraceable state mutations. Every standard below exists to prevent one of those three failure modes.

---

### Non-Negotiable Standards

**Async/Await — CRM API calls**
- All external API calls wrapped in a typed Result, never bare try/catch at call site:
```typescript
// BAD — error disappears into void or crashes untraceably
async function syncContact(id: string) {
  const contact = await hubspot.getContact(id)  // throws on 404, 429, 500
  await apollo.enrich(contact)
}

// GOOD — caller decides how to handle each failure mode
type Result<T> = { ok: true; data: T } | { ok: false; error: SyncError }

async function syncContact(id: string): Promise<Result<Contact>> {
  const hsResult = await fetchFromHubSpot(id)
  if (!hsResult.ok) return hsResult
  const enrichResult = await enrichViaApollo(hsResult.data)
  return enrichResult
}
```
- Never `await` inside a `forEach` — use `Promise.all` for parallel, `for...of` for sequential
- Rate-limited API calls use the shared `RateLimitedClient`, never roll your own retry

**Data Transformation — mapping between systems**
- Every field mapping is explicit. No spread operators across system boundaries:
```typescript
// BAD — silently passes unknown HubSpot fields into Apollo payload
const apolloPayload = { ...hubspotContact, source: 'hubspot' }

// GOOD — explicit contract, reviewable, testable
const apolloPayload: ApolloContactInput = {
  email: hubspotContact.properties.email,
  firstName: hubspotContact.properties.firstname,
  lastName: hubspotContact.properties.lastname,
  organizationName: hubspotContact.properties.company,
}
```
- Input types and output types for every transform function are different named types — never `any`, never reusing the same type for "before" and "after"
- Transformations are pure functions (no API calls, no DB writes inside a mapper)

**Null/Undefined handling — CRM data is always partial**
- Use nullish coalescing `??` not `||` for CRM fields (empty string `""` is valid data)
- Never assume a CRM field exists — destructure with defaults:
```typescript
// BAD
const name = contact.properties.firstname + ' ' + contact.properties.lastname

// GOOD
const { firstname = '', lastname = '' } = contact.properties ?? {}
const name = [firstname, lastname].filter(Boolean).join(' ')
```
- If a field is required for the operation to proceed, validate at the entry point and return early with a typed error — not mid-function

**Python data pipeline scripts**
- All scripts accept input via stdin or file path arg — never hardcoded paths
- Use `dataclasses` or `pydantic` models for CRM record types — no raw dicts passed between functions
- DataFrame operations: always validate column existence before `.apply()` or column access
- Log row counts before and after every transform step — silent row drops are the #1 data pipeline bug

**Logging — integration code must be traceable**
- Every external API call logs: system name, operation, record ID, duration, status code
- Log at DEBUG for success, WARN for retries, ERROR for failures with full context
- Never log raw API response bodies (may contain PII — emails, names, phone numbers)
- Correlation ID (`requestId` / `syncJobId`) must appear in every log line within a sync operation

**Testing — what must be tested**
- Every field mapping function has a unit test with a real fixture (copy-pasted from actual API response, PII scrubbed)
- Every sync function has an integration test that hits a sandbox/test environment — mocking the HTTP client is forbidden for integration tests
- Tests for null/missing fields are required for every external data mapper (CRM data is always partial)
- Test file name mirrors source file: `contactMapper.ts` → `contactMapper.test.ts`

---

### TypeScript-Specific Standards

**Naming conventions**
- Functions: verb phrase. `syncContact`, `fetchFromHubSpot`, `toApolloInput`. Never `contactHandler`, `doStuff`, `process`.
- Variables: noun phrase. `contactList`, `syncResult`, `retryCount`. Never `data`, `result`, `temp`.
- Booleans: `is`, `has`, or `can` prefix. `isActive`, `hasEmail`, `canRetry`. Never `active`, `emailExists`, `retryable`.
- Types and interfaces: PascalCase noun. `HubSpotContact`, `SyncResult`, `ApolloContactInput`.
- Constants: SCREAMING_SNAKE_CASE for module-level magic values. `MAX_RETRY_COUNT`, `APOLLO_ID_PROP`.

**Function length and complexity**
- Maximum function length: 30 lines (excluding blank lines and comments). If a function exceeds 30 lines, extract a named helper.
- Cyclomatic complexity threshold: if a function has more than 10 distinct paths (branches + loops), refactor it. Use `eslint-plugin-complexity` to enforce this automatically.
- Exception: orchestrator functions that sequence steps may be longer, but each step must be a named function call — no inline logic blocks.

**Comment rules**
- Never comment what the code does. Comment why the code does it.
- Never leave commented-out code in a PR. Delete it. Git history preserves it.
- Required comment situations: non-obvious business rules, workarounds for third-party bugs (with a link to the issue), performance decisions that look naive but are intentional.

```typescript
// BAD — explains what, which is already obvious from the code
// Loop through contacts and sync each one
for (const contact of contacts) {
  await syncContact(contact.id)
}

// GOOD — explains why, which the code cannot express
// HubSpot's batch API throttles at 100/s; sequential sync avoids 429s on large imports
for (const contact of contacts) {
  await syncContact(contact.id)
}
```

**Magic number elimination**
- Every numeric or string literal that encodes a business rule is a named constant.
```typescript
// BAD
if (retryCount > 3) throw new Error('too many retries')
await sleep(1000 * Math.pow(2, attempt))

// GOOD
const MAX_RETRY_COUNT = 3
const BASE_BACKOFF_MS = 1_000
if (retryCount > MAX_RETRY_COUNT) throw new SyncError('MAX_RETRIES_EXCEEDED', { retryCount })
await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt))
```

**Dead code policy**
- Dead code does not survive a PR review. No unused functions, unused exports, unused types, commented-out blocks.
- If code is temporarily disabled for a known reason → it gets a `// TODO(JIRA-123): re-enable when X` comment with a ticket reference. No ticket = delete the code.
- Use `ts-prune` or `knip` in CI to catch unused exports automatically.

---

### Python-Specific Standards

**Naming conventions**
- Functions: snake_case verb phrase. `sync_contact`, `fetch_from_hubspot`, `to_apollo_input`.
- Variables: snake_case noun phrase. `contact_list`, `sync_result`, `retry_count`.
- Booleans: `is_`, `has_`, or `can_` prefix. `is_active`, `has_email`, `can_retry`.
- Classes: PascalCase noun. `HubSpotContact`, `SyncResult`, `ApolloContactInput`.
- Constants: SCREAMING_SNAKE_CASE. `MAX_RETRY_COUNT`, `APOLLO_ID_PROP`.

**Function length and complexity**
- Maximum function length: 25 lines. Python functions tend toward nesting; keep them short and flat.
- Cyclomatic complexity: use `flake8-cognitive-complexity` with a threshold of 10. Functions above 10 are required to be split before merge.
- Prefer early returns over nested `if` blocks:

```python
# BAD — three levels of nesting
def process_contact(contact):
    if contact:
        if contact.get('email'):
            if validate_email(contact['email']):
                return sync_to_hubspot(contact)

# GOOD — early returns keep nesting flat
def process_contact(contact):
    if not contact:
        return Err('MISSING_CONTACT')
    if not contact.get('email'):
        return Err('MISSING_EMAIL')
    if not validate_email(contact['email']):
        return Err('INVALID_EMAIL')
    return sync_to_hubspot(contact)
```

**Type hints are required**
- All function signatures have type hints for parameters and return values. No exceptions.
- Use `pydantic` for data models that cross system boundaries (API inputs/outputs, pipeline records).
- Use `dataclasses` for internal-only value objects that don't need validation.

---

### Decision Rules

IF writing a function that calls an external API → return `Result<T>`, never throw
IF mapping fields between two systems → define explicit input type AND explicit output type
IF a field from a CRM could be null/undefined/empty → handle all three cases explicitly
IF running parallel API calls → use `Promise.all` with settled variant for partial failure handling
IF a sync job processes >1 record → log count before, count after, count failed
IF a script has a hardcoded file path or URL → reject the PR
IF two mappers share logic → extract only if the types are genuinely the same shape
IF a function exceeds 30 lines (TS) or 25 lines (Python) → split before requesting review
IF cyclomatic complexity >10 → refactor before merge; this is a CI gate, not a suggestion
IF a numeric or string literal appears twice → it is a named constant
NEVER use `||` to default CRM string fields (empty string is valid)
NEVER spread `...` across a system boundary (Apollo → HubSpot, HubSpot → DB)
NEVER swallow a rate limit error — surface it so the job scheduler can back off
NEVER log raw API payloads — they contain PII
NEVER write a sync function that is not idempotent (running it twice = running it once)
NEVER leave dead code in a merged PR — delete it or add a ticket reference

---

### Code Review Checklist

Before approving any PR in this codebase, verify:

- [ ] No `any` types in TypeScript; no untyped function signatures in Python
- [ ] All external API calls return `Result<T>` or equivalent — no bare throws
- [ ] No spread across system boundaries
- [ ] All CRM field access uses `??` with defaults or explicit null checks
- [ ] No hardcoded paths, URLs, or API keys
- [ ] Every new function has a corresponding test with at least one null/missing field case
- [ ] No raw API response bodies in log statements
- [ ] Correlation ID (`syncJobId` / `requestId`) present in all log lines within sync scope
- [ ] No function exceeds the line limit (30 TS / 25 Python)
- [ ] No magic numbers or string literals without named constants
- [ ] No commented-out code without a ticket reference

---

### Common Mistakes Specific to This Codebase

**Mistake**: Silent row loss in Python pipeline
```python
# BAD — rows with missing email silently dropped, no one notices
df_clean = df[df['email'].notna()]

# GOOD
dropped = df['email'].isna().sum()
if dropped > 0:
    logger.warning(f"Dropping {dropped} rows with missing email (total={len(df)})")
df_clean = df[df['email'].notna()]
```

**Mistake**: Assuming HubSpot property keys are stable
```typescript
// BAD — breaks if HubSpot property is renamed in the portal
contact.properties.custom_apollo_id

// GOOD — use named constants, fail loudly if missing
const APOLLO_ID_PROP = 'custom_apollo_id' as const
const apolloId = contact.properties[APOLLO_ID_PROP]
if (!apolloId) throw new SyncError('MISSING_APOLLO_ID', { contactId: contact.id })
```

**Mistake**: `Promise.all` masking partial failures
```typescript
// BAD — one failure rejects all, you lose partial progress
await Promise.all(contacts.map(c => syncContact(c.id)))

// GOOD — continue on partial failure, report what failed
const results = await Promise.allSettled(contacts.map(c => syncContact(c.id)))
const failed = results.filter(r => r.status === 'rejected')
if (failed.length) logger.error(`${failed.length}/${contacts.length} contacts failed sync`)
```

**Mistake**: Transformation function with a side effect
```typescript
// BAD — mapper makes an API call, untestable without mocks, untraceable failures
async function toApolloContact(contact: HubSpotContact): Promise<ApolloInput> {
  const enriched = await apollo.enrich(contact.email)  // SIDE EFFECT
  return { email: contact.email, title: enriched.title }
}

// GOOD — pure mapper, API calls happen in orchestrating layer
function toApolloContact(contact: HubSpotContact): ApolloInput {
  return { email: contact.properties.email, firstName: contact.properties.firstname }
}
```

---

### Good Output vs Bad Output

**Bad**: Generic sync function
```typescript
async function sync(data: any) {
  try {
    const result = await api.post('/contacts', data)
    console.log('done')
    return result
  } catch(e) {
    console.error(e)
  }
}
```

**Good**: Typed, traceable, idempotent sync function
```typescript
async function upsertHubSpotContact(
  input: ApolloEnrichedContact,
  ctx: SyncContext
): Promise<Result<HubSpotContactId>> {
  const payload = toHubSpotContactInput(input)  // pure mapper, tested separately

  logger.debug('hubspot.upsert_contact', { email: input.email, syncJobId: ctx.jobId })

  const existing = await findHubSpotContactByEmail(input.email, ctx)
  if (!existing.ok) return existing

  const operation = existing.data ? 'update' : 'create'
  const result = existing.data
    ? await hubspotClient.updateContact(existing.data.id, payload)
    : await hubspotClient.createContact(payload)

  logger.info('hubspot.upsert_contact.done', {
    operation, email: input.email, syncJobId: ctx.jobId
  })

  return result
}
```

---

### Mental Models Experts Use in This Codebase

- **Integration code fails at boundaries**: The bug is almost always in the mapping layer or the error handling, not the business logic
- **CRM data is dirty by definition**: Assume every field is missing until proven otherwise
- **Idempotency is a contract**: Any sync function must be safe to run twice. If it isn't, it will run twice.
- **Observability first**: If you can't answer "which records failed and why?" from your logs alone, the code isn't done
- **Explicit over implicit**: In integration code, magic and inference cause data corruption. Spell out every field, every mapping, every condition.
- **Short functions are not style, they are architecture**: A 30-line function has one reason to change. A 200-line function has twenty.
- **Complexity is compounding debt**: A function with cyclomatic complexity 15 is not 15x harder to test than complexity 1 — it is 2^15 harder (each branch doubles the test matrix).

---

### Vocabulary

| Term | Meaning in this codebase |
|------|--------------------------|
| Result type | `{ ok: true; data: T } \| { ok: false; error: SyncError }` — our error monad |
| Sync context | `{ jobId, userId, dryRun }` — passed through all sync functions for tracing |
| Mapper | Pure function transforming one system's type to another's — no side effects |
| Upsert | Create-or-update based on dedup key — all sync functions must use this pattern |
| Partial failure | Some records succeeded, some failed — must be handled, never collapsed to all-fail |
| Settled | `Promise.allSettled` — use this, not `Promise.all`, for batch operations |
| Cyclomatic complexity | Number of linearly independent paths through a function; threshold of 10 in this codebase |
| Magic number | A numeric or string literal with no named constant — forbidden in production code |
| Dead code | Unreachable or unused code — must be deleted before merge, not commented out |
