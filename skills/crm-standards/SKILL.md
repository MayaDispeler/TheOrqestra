---
name: crm-standards
domain: crm-standards
purpose: Maintain clean, trustworthy CRM data across HubSpot/Apollo/Clay integrations
applies_to: "Contact, Account, Deal, and Activity data operations"
---

### Non-Negotiable Standards

**Data Hierarchy**
```
Account (Company)
  └── Contact (Person at company)
        └── Deal (Opportunity)
              └── Activity (Email, Call, Meeting, Note)
```
- Every Contact must be associated to an Account. Orphan contacts = data debt.
- Every Deal must have a Contact AND an Account.
- Activities always attach to the lowest applicable level (Contact > Deal > Account).

**Contact Data**
- Required fields: `firstName`, `lastName`, `email`, `accountId`, `lifecycleStage`
- Email is the primary dedup key — one canonical email per contact
- Phone normalized to E.164: `+15555550123` — never store `(555) 555-0123`
- LinkedIn URL stored without trailing slash, normalized to `linkedin.com/in/handle`
- Job title stored as-is from source (do not normalize — reporting does that)

**Account Data**
- Required fields: `name`, `domain`, `industry`, `employeeCount`, `country`
- Domain is the primary dedup key — `acme.com` not `www.acme.com` not `acme.com/`
- One Account record per company — subsidiaries linked via `parentAccountId`
- ARR/Revenue stored in USD, always. Convert at ingest time.

**Lifecycle Stages (in order)**
```
Subscriber → Lead → MQL → SQL → Opportunity → Customer → Churned
```
- Stages only move FORWARD automatically. Manual override allowed to move backward.
- MQL requires: `source`, `sourceDetail`, and a qualifying activity
- SQL requires: sales rep assigned + `qualifiedDate` set
- Never skip stages in automated workflows — audit trail must be complete

**Source Attribution**
- Required on every Contact/Deal: `source`, `sourceDetail`, `sourceCampaign`
- Sources: `inbound`, `outbound`, `referral`, `partner`, `event`, `paid`, `organic`
- Never overwrite source once set (first-touch attribution is canonical)
- Multi-touch attribution tracked separately in `touchpoints` array

---

### Decision Rules

IF importing contacts → deduplicate on email before insert, never create duplicates
IF email is missing → do not create contact, enrich first via Apollo/Clay
IF contact domain doesn't match an existing account → create the account first
IF two records have same email → merge, preserve oldest `createDate`, union all activities
IF a field conflicts on merge → prefer the more recently updated value
IF a deal has no owner → assign to round-robin queue, not "unassigned"
IF a contact's company changes → create new association, archive old, never delete
NEVER delete records — archive with `isArchived: true` and `archivedReason`
NEVER store PII in custom text fields (SSN, passwords, sensitive notes)
NEVER sync data bidirectionally without conflict resolution strategy defined
NEVER use HubSpot's native dedup on bulk imports — it's unreliable, do it upstream

---

### Common Mistakes and Fixes

**Mistake**: Creating orphan contacts
```
# BAD
POST /contacts { email: "alice@acme.com" }  // no account linked

# GOOD
1. Check if account with domain "acme.com" exists
2. Create account if missing
3. POST /contacts { email: "...", accountId: "acct_123" }
```

**Mistake**: Overwriting source attribution
```
# BAD
onContactUpdate: { source: newSource }  // kills first-touch data

# GOOD
onContactUpdate: { source: contact.source ?? newSource }  // preserve if set
```

**Mistake**: Inconsistent lifecycle stage management
```
# BAD: Moving contact to SQL because they booked a meeting
# Why bad: SQL requires sales qualification, not just activity

# GOOD:
Meeting booked → set lastActivityDate, add to MQL stage
After sales call + BANT qualified → move to SQL, set qualifiedDate
```

**Mistake**: Storing unclean phone numbers
```
// BAD
"+1 (555) 555-0123"
"5555550123"
"555-555-0123 ext 4"

// GOOD — normalize at write time
"+15555550123"  // E.164 format
// Extensions stored separately in phoneExtension field
```

---

### Deduplication Decision Tree

```
Incoming record
  │
  ├── Has email?
  │     ├── YES → query by email
  │     │           ├── Match found → merge/update
  │     │           └── No match → check by name + company
  │     └── NO  → enrich via Apollo before proceeding
  │
  └── Has domain?
        ├── YES → query accounts by domain
        │           ├── Match → link contact to existing account
        │           └── No match → create account, then contact
        └── NO  → flag for manual review queue
```

---

### Integration Sync Rules (Apollo ↔ HubSpot ↔ Clay)

**Source of Truth by Object**
| Object | Source of Truth | Sync Direction |
|--------|----------------|----------------|
| Contact enrichment | Apollo | Apollo → HubSpot |
| Deal data | HubSpot | HubSpot only |
| Email sequences | Apollo | Apollo only |
| Company intelligence | Clay | Clay → HubSpot |
| Activities/Meetings | HubSpot | HubSpot only |

- Sync runs on change event, not polling (use webhooks)
- All syncs idempotent — running twice produces same result
- Sync failures logged to `sync_errors` with full payload for replay

---

### Mental Models Experts Use

- **Single source of truth**: For each field, exactly one system owns it
- **Immutable history**: Never delete, always archive. Audit trail is a feature.
- **Progressive enrichment**: Start with minimum viable data, enrich over time
- **Lifecycle as a funnel**: Stages are gates, not labels — they require criteria
- **Data debt**: Every dirty record costs sales cycles. Clean at ingest, not at report time.

---

### Vocabulary

| Term | Meaning |
|------|---------|
| MQL | Marketing Qualified Lead — met marketing criteria |
| SQL | Sales Qualified Lead — rep-verified fit |
| First-touch | Original source that first created the record |
| Dedup key | Canonical identifier used to prevent duplicates |
| E.164 | International phone number format (+countrycode...) |
| ICP | Ideal Customer Profile — firmographic target definition |
| BANT | Budget, Authority, Need, Timeline — qualification framework |
