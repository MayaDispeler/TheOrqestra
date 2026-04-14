---
name: legal-compliance
description: >
  Use this skill whenever the task involves legal compliance, privacy law, data protection,
  GDPR, CCPA, HIPAA, SOC 2, contract drafting, terms of service, privacy policies, cookie
  consent, data retention, regulatory requirements, legal risk assessment, IP ownership,
  NDAs, SLAs, acceptable use policies, or any mention of "legally required", "compliance",
  "regulation", "audit", "DSAR", "data subject request". Use this skill proactively when
  writing software that handles personal data, health data, or financial data.
---

# Legal Compliance — Expert Reference

## Core Mental Models

**Compliance is minimum viable legality, not best practice.** Meeting the letter of the law is the floor; ethical data handling is the ceiling.

**Privacy by design, not by retrofit.** Building privacy controls after launch costs 10x more and creates liability gaps.

**Data you don't collect can't be breached.** Data minimization is both a legal requirement and a security strategy.

**Contracts allocate risk, not eliminate it.** Every indemnification clause, liability cap, and warranty moves risk between parties.

**Ignorance of the law is not a defense.** If your product serves users in a jurisdiction, that jurisdiction's laws apply.

---

## Non-Negotiable Standards

1. **Personal data must have a documented legal basis for processing** (GDPR Art. 6, CCPA). "We might find it useful" is not a legal basis.
2. **Data retention policies must exist and be enforced.** If you can't define when data is deleted, you're retaining it indefinitely — a liability.
3. **Security incident response plan must be documented before a breach happens.** GDPR requires breach notification within 72 hours.
4. **Privacy policies must accurately describe actual data practices.** Inaccurate privacy policies are FTC violations (deceptive practices).
5. **Cookie consent must be obtained before setting non-essential cookies**, not after. Pre-checked boxes do not constitute consent under GDPR.
6. **Health data (HIPAA) and financial data (PCI-DSS) require specific controls** — encryption at rest, in transit, access logging, BAAs.
7. **IP ownership clauses in employee/contractor agreements must be signed before work begins**, not retroactively.

---

## Decision Rules

```
IF collecting personal data from EU residents THEN GDPR applies regardless of company location
IF collecting personal data from CA residents AND > 100k consumers OR selling data THEN CCPA applies
IF processing health information for US-covered entities THEN HIPAA applies — sign BAA before sharing data
IF storing payment card data THEN PCI-DSS applies — prefer tokenization to avoid storing card data at all
IF user requests their data (DSAR) THEN respond within 30 days (GDPR), 45 days (CCPA)
IF data retention period is undefined THEN default to shortest defensible period + document it
IF third-party vendor processes your user data THEN execute DPA (Data Processing Agreement) before sharing
IF breach exposes personal data THEN notify DPA within 72 hours (GDPR), notify affected users "without undue delay"
IF contract is silent on liability THEN unlimited liability is implied — always negotiate a cap
IF software is "open source" THEN check the license — GPL viral provisions can force your code to be open
IF using third-party code/APIs THEN license compatibility must be verified before shipping
NEVER use dark patterns to obtain consent (pre-ticked boxes, confusing opt-outs, consent bundled with terms)
NEVER transfer EU personal data to non-adequate countries without Standard Contractual Clauses or equivalent
NEVER promise confidentiality in a contract if you cannot technically guarantee it
NEVER include a class action waiver in consumer contracts in jurisdictions where it's unenforceable
```

---

## GDPR Lawful Bases for Processing (Article 6)

| Basis | When to use | Limits |
|-------|-------------|--------|
| **Consent** | Freely given, specific, informed, unambiguous opt-in | Withdrawable at any time; cannot be bundled with service access |
| **Contract** | Processing necessary to fulfill a contract with the user | Only covers what's strictly necessary |
| **Legal obligation** | Required by law (tax records, AML) | Narrow — must cite specific legal obligation |
| **Vital interests** | Life or death emergencies | Almost never applies to tech companies |
| **Public task** | Government bodies | Rarely applies to private companies |
| **Legitimate interests** | Business need that doesn't override user rights | Requires documented balancing test; cannot override user objection |

**Rule**: Consent is the weakest basis (users can withdraw). Legitimate interests requires a documented balancing test. Contract is strongest but narrowest. Most B2C companies over-rely on consent when legitimate interests would be more appropriate and durable.

---

## Privacy Policy Requirements (GDPR + CCPA minimum)

A compliant privacy policy must state:
- **What data** is collected (categories, not just "information you provide")
- **Why** it's collected (purpose — must match actual use)
- **Legal basis** for processing (GDPR)
- **How long** it's retained (specific periods or criteria)
- **Who** it's shared with (named categories or specific vendors)
- **User rights**: access, deletion, correction, portability, objection, restriction
- **How to exercise rights**: specific contact/mechanism, response timeframe
- **Whether data is sold** (CCPA — must offer opt-out if yes)
- **Contact for privacy questions**: DPO contact if required

### BAD privacy policy language:
```
We may share your data with trusted partners to improve our services.
We retain data as long as necessary.
```

### GOOD privacy policy language:
```
We share your data with the following categories of third parties:
- Analytics providers (e.g., Mixpanel) to understand product usage
- Payment processors (Stripe) to process transactions
- Customer support tools (Intercom) to respond to your inquiries

We do not sell your personal data.

We retain account data for the duration of your account plus 12 months after
deletion, and then permanently delete it, except where required by law (e.g.,
invoicing records retained 7 years per tax law).
```

---

## Contract Drafting — Critical Clauses

### Limitation of Liability
```
# BAD (no cap — unlimited exposure):
"Each party shall be liable for all damages arising from breach of this Agreement."

# GOOD (capped, with carve-outs):
"Except for indemnification obligations and breaches of confidentiality, neither
party's aggregate liability shall exceed the fees paid in the 12 months preceding
the claim. Neither party shall be liable for indirect, consequential, or punitive
damages."
```

### Data Processing Agreement (DPA) — must include:
- Subject matter, duration, nature of processing
- Type of personal data and categories of data subjects
- Controller's instructions to processor (processor may only act on instructions)
- Sub-processor authorization and notification requirements
- Security measures (Article 32 GDPR)
- Breach notification obligations (inform controller "without undue delay")
- Return/deletion of data on termination
- Audit rights

### SLA — Key metrics to define explicitly:
- **Uptime**: measured how? (calendar month, rolling 30 days)
- **Calculation**: does planned maintenance count? Excluded?
- **Remedy**: service credits — what percentage, what cap, is credit sole remedy?
- **Notification**: how fast must downtime be reported?
- **Exclusions**: force majeure, customer-caused outages, third-party failures

---

## Common Mistakes & Exact Fixes

### Mistake 1: Cookie consent after the fact
```javascript
// BAD: sets analytics cookie before consent
analytics.init();
showCookieBanner();

// GOOD: gate initialization on consent
showCookieBanner().then(consent => {
  if (consent.analytics) analytics.init();
});
```

### Mistake 2: Soft delete without actual deletion on DSAR
```
# BAD: "deleting" user sets deleted_at flag but data persists indefinitely
# GOOD: deleted_at triggers scheduled hard delete job after retention period
# User data must be genuinely irrecoverable after deletion commitment
```

### Mistake 3: Contractor owns the IP
```
# BAD: contract is silent on IP ownership
# In many jurisdictions, contractor retains IP created outside employment
# GOOD: explicit work-for-hire clause: "All work product created by Contractor
# under this Agreement is work made for hire owned exclusively by Company.
# Contractor hereby assigns all rights to Company."
```

### Mistake 4: Logging personal data
```python
# BAD: PII in logs — a breach if logs are exposed
logger.info(f"Processing payment for {user.email}, card {card_number}")

# GOOD: log identifiers, not personal data
logger.info(f"Processing payment for user_id={user.id}, payment_method_id={pm_id}")
```

---

## Regulatory Quick Reference

| Regulation | Jurisdiction | Applies to | Key requirement |
|------------|-------------|------------|-----------------|
| GDPR | EU/EEA | Any org processing EU resident data | Lawful basis, data rights, 72h breach notification |
| CCPA/CPRA | California | Revenue > $25M or data on 100k+ CA consumers | Right to know, delete, opt-out of sale |
| HIPAA | US | Covered entities + their business associates | PHI controls, BAA required, breach notification |
| PCI-DSS | Global | Any entity handling card payment data | Network controls, encryption, quarterly scans |
| SOC 2 | US (common) | SaaS companies selling to enterprises | Security, availability, confidentiality controls |
| COPPA | US | Services directed to children under 13 | Verifiable parental consent required |

---

## Expert Vocabulary

- **Controller**: entity that determines the purposes and means of processing personal data
- **Processor**: entity that processes data on behalf of the controller (bound by DPA)
- **DSAR (Data Subject Access Request)**: formal request by individual to exercise their privacy rights
- **DPO (Data Protection Officer)**: mandatory role for some organizations; independent, reports to highest management
- **PIA/DPIA**: Privacy/Data Protection Impact Assessment — required for high-risk processing
- **Data minimization**: collect only what's necessary for the stated purpose — GDPR Art. 5(1)(c)
- **Purpose limitation**: data collected for one purpose cannot be repurposed without new legal basis
- **Legitimate interests**: processing basis requiring documented balancing test against user rights
- **Standard Contractual Clauses (SCCs)**: EU-approved contract terms enabling cross-border data transfers
- **Indemnification**: one party agrees to hold the other harmless from specific third-party claims
- **Force majeure**: contract clause excusing performance due to extraordinary events outside party's control
