---
name: api-design-patterns
domain: api-design-patterns
purpose: Design APIs that are predictable, evolvable, and impossible to misuse
applies_to: "REST APIs, internal service interfaces, SDK design"
---

### Non-Negotiable Standards

**URLs**
- Resources are nouns, plural: `/contacts`, `/accounts`, `/deals`
- Hierarchy reflects ownership: `/accounts/{id}/contacts` not `/contacts?accountId={id}`
- No verbs in URLs. HTTP method IS the verb.
- Kebab-case for multi-word: `/email-campaigns` not `/emailCampaigns`
- Max 3 levels deep: `/accounts/{id}/contacts/{id}` — deeper = redesign

**HTTP Methods**
- GET: idempotent, no side effects, cacheable
- POST: create OR non-idempotent actions (e.g. `/contacts/search` for complex queries)
- PUT: full replace (idempotent)
- PATCH: partial update (idempotent)
- DELETE: remove (idempotent)
- Never use GET for mutations. Never use POST when PUT/PATCH applies.

**Request/Response Shape**
```json
// Success envelope
{
  "data": { ... },
  "meta": { "total": 100, "page": 1, "perPage": 25 }
}

// Error envelope
{
  "error": {
    "code": "CONTACT_NOT_FOUND",
    "message": "Contact with id=42 not found",
    "details": { "id": 42 },
    "requestId": "req_abc123"
  }
}
```
- Never return raw arrays at top-level — always wrapped in `data`
- Never return 200 with `{ "success": false }` — use proper HTTP status codes
- Always include `requestId` for traceability

**Status Codes**
```
200 OK           — GET success, PUT/PATCH success
201 Created      — POST that created a resource (include Location header)
204 No Content   — DELETE success, POST with no response body
400 Bad Request  — Client sent invalid data (validation errors)
401 Unauthorized — Missing/invalid auth
403 Forbidden    — Auth valid but insufficient permissions
404 Not Found    — Resource doesn't exist
409 Conflict     — Resource state conflict (duplicate, optimistic lock)
422 Unprocessable— Valid format, invalid semantics
429 Too Many Req — Rate limited
500 Server Error — Our fault (never expose stack traces)
```

**Versioning**
- Version in URL: `/api/v1/`, `/api/v2/` — not headers, not query params
- Never remove fields from a response (additive-only changes are non-breaking)
- Deprecate with `Deprecation` and `Sunset` headers before removing
- Maintain N-1 versions at minimum

---

### Decision Rules

IF a GET endpoint needs a body → use POST with `/resource/search`
IF a response field might be null → document it as nullable, never omit it
IF pagination applies → always return `meta.total` and `meta.hasMore`
IF an operation takes >500ms → make it async: return 202 + job ID + polling endpoint
IF a client needs to poll → provide a `/jobs/{id}` endpoint, never use webhooks as the only option
IF adding a field to response → safe (non-breaking). Removing or renaming → major version bump
NEVER use custom error codes that duplicate HTTP semantics
NEVER return different shapes from the same endpoint based on a query param
NEVER design endpoints around your database schema (expose domain, not tables)
NEVER use 200 + error body — misleads monitoring tools

---

### Common Mistakes and Fixes

**Mistake**: Verb-based URLs
```
# BAD
POST /createContact
GET  /getContactById?id=42
POST /deleteContact

# GOOD
POST   /contacts
GET    /contacts/42
DELETE /contacts/42
```

**Mistake**: Inconsistent error shapes
```json
// BAD — different shapes in different endpoints
{ "message": "not found" }
{ "error": true, "code": 404 }
{ "err": "Contact missing" }

// GOOD — always same shape
{ "error": { "code": "CONTACT_NOT_FOUND", "message": "...", "requestId": "..." } }
```

**Mistake**: Over-fetching / Under-fetching
```
# BAD: return entire contact object on list endpoint (over-fetch)
# BAD: require N+1 calls to get related data (under-fetch)
# GOOD: support sparse fieldsets (?fields=id,name,email)
# GOOD: support sideloading (?include=account,owner)
```

**Mistake**: Synchronous long-running operations
```
# BAD
POST /contacts/bulk-import → waits 30s → returns result

# GOOD
POST /contacts/bulk-import → 202 Accepted → { "jobId": "job_xyz" }
GET  /jobs/job_xyz         → { "status": "processing", "progress": 45 }
GET  /jobs/job_xyz         → { "status": "completed", "result": { ... } }
```

---

### Pagination Standards

```
# Cursor-based (preferred for real-time data)
GET /contacts?cursor=eyJ...&limit=25
Response: { "data": [...], "meta": { "nextCursor": "eyJ...", "hasMore": true } }

# Offset-based (acceptable for stable datasets)
GET /contacts?page=2&perPage=25
Response: { "data": [...], "meta": { "total": 342, "page": 2, "perPage": 25 } }
```

---

### Mental Models Experts Use

- **Resource-oriented design**: Every URL is a noun (thing), every method is a verb (action)
- **Hyrum's Law**: All observable API behaviors will be depended on — design intentionally
- **Postel's Law**: Be conservative in what you send, liberal in what you accept
- **Additive evolution**: Plan for growth. Every field you add is load-bearing forever.
- **Consumer-first**: Design the API you'd want to consume, then build the implementation

---

### Vocabulary

| Term | Meaning |
|------|---------|
| Idempotent | Same request N times = same result as 1 time |
| Safe | No side effects (GET, HEAD, OPTIONS) |
| Sparse fieldset | Client specifies which fields to return |
| Sideloading | Including related resources in single response |
| Cursor pagination | Opaque token pointing to position in result set |
| HATEOAS | Hypermedia links in response for discoverability |
