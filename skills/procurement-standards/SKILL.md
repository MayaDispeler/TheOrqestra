---
name: procurement-standards
description: Dense reference for procurement operations — sourcing, vendor evaluation, contract negotiation, compliance, and supplier risk management.
version: 1.0.0
---

# Procurement Standards

## Mental Models

**Total Cost of Ownership (TCO)**: Purchase price is rarely the dominant cost. Include: implementation, integration, training, maintenance, migration cost-to-exit, and opportunity cost of switching. A cheap vendor with high switching costs is not cheap.

**The Negotiation Leverage Matrix**: Leverage = (your urgency) × (vendor competition) / (vendor's need for your logo). High urgency + single source = worst position. Model leverage before entering any negotiation.

**Risk-Adjusted Value**: Procurement decisions are not just cost optimization. A low-cost vendor with supply chain concentration risk or data security gaps is not low-cost — the risk is off-balance-sheet until it isn't.

**The Approval Threshold Ladder**: Every organization has dollar thresholds that trigger additional approvals. Procurement's job is to ensure compliance is structural (built into workflow), not advisory (sent in an email).

**Make vs Buy**: Before sourcing externally, the question is: is this a commodity (buy), a differentiator (build or buy strategic), or a constraint (solve structurally)? Procurement of a differentiating capability is a strategic decision, not a purchasing one.

---

## Non-Negotiable Standards

1. **No vendor is selected from a single quote.** Minimum 3 competitive bids for any spend >$25K (adjust threshold to org policy). Document why finalists were not selected.

2. **Legal reviews all contracts before signature.** No exceptions for "standard vendor agreements" — "standard" means standard for the vendor, not you.

3. **Data processing agreements (DPAs) are mandatory for any vendor handling personal data.** GDPR/CCPA compliance is not optional and is not the vendor's responsibility to volunteer.

4. **Vendor risk assessments are completed before contract execution, not after.** Risk tiers: Critical (core business operations), High (sensitive data), Medium (business enablement), Low (commodity). Tier determines due diligence depth.

5. **Contract terms must include: scope, price, term, renewal/auto-renewal terms, SLA with remedies, termination for cause and convenience, IP ownership, and data return on exit.**

6. **Payment terms are a negotiable lever.** Net-30 is not a default — it's a starting position. Net-60 or Net-90 improves working capital. Early payment discounts (2/10 net 30) have an implicit 36% APR — evaluate against cost of capital.

7. **Every active vendor with >$100K annual spend has a named internal owner.** Ownerless vendors accumulate spend, risk, and shadow IT.

---

## Decision Rules

**If** a vendor is sole-source (no competition) → document the business justification explicitly. Accepted reasons: (1) proprietary technology with no equivalent, (2) switching cost exceeds competitive savings, (3) regulatory requirement. "Relationship" is not a justification.

**If** a vendor requests a multi-year contract → assess: (1) lock-in risk vs price certainty benefit, (2) whether the product roadmap is validated, (3) whether an exit clause is negotiable. Never sign a 3-year term without a termination-for-convenience clause at year 1.5+.

**If** a contract auto-renews → set a calendar reminder 90 days before the auto-renewal date. Most vendor contracts require 60-day written notice to cancel. Missing this is an expensive operational error.

**If** scope creep occurs mid-contract → issue a change order. Never allow verbal agreement to expand scope — it voids price protections and liability limits.

**If** a vendor is acquired → review: (1) change-of-control clause, (2) pricing protection post-acquisition, (3) product roadmap continuity. Do not wait for the vendor to notify you — monitor actively.

**If** a vendor fails an SLA → calculate the remedy per the contract and claim it. Not claiming SLA credits signals that the SLA is unenforceable. Vendors will deprioritize your account.

**Never** sign a vendor contract that lacks a limitation of liability clause — uncapped liability is existential risk.

**Never** agree to auto-renewal without a negotiated price cap (e.g., CPI + 3% max annual increase). Unlimited price increases at renewal are a common vendor tactic.

**Never** allow shadow procurement. Employees purchasing SaaS on corporate cards without approval creates data risk, compliance violations, and duplicated spend.

---

## Vendor Evaluation Scorecard

For any critical or high-tier vendor, score against:

| Dimension | Weight | What to Assess |
|-----------|--------|---------------|
| Functional fit | 30% | Does it solve the requirement without workarounds? |
| Security & compliance | 25% | SOC 2 Type II, ISO 27001, pen test recency, data residency |
| TCO | 20% | All-in cost over 3 years including exit costs |
| Vendor stability | 15% | Funding runway, customer concentration, key-person risk |
| References | 10% | 2 live customer calls (not provided references — independently sourced) |

Score each on 1–5. Weight-sum to a total. Document scores and rationale. Never select against the scorecard without a written exception approved by the budget owner.

---

## Common Mistakes

**Mistake: Negotiating on price only**
→ Price is one lever. Payment terms, implementation support, SLA remedies, user seat flexibility, and renewal price caps are all negotiable. A 10% price reduction is often worse than 60-day payment terms plus a 5% annual cap.

**Mistake: Accepting "standard contract" language**
→ Auto-renewal with 60-day cancellation window, unlimited price increase, uncapped liability, IP ownership of your data — these are all standard vendor terms that are routinely negotiated away. Mark up every contract.

**Mistake: Skipping security review for "small" SaaS tools**
→ A $5K/year SaaS tool with access to your Salesforce data is a $5K entry point to your CRM. Classify by data sensitivity, not spend.

**Mistake: Single stakeholder RFP**
→ Procurement decisions made by one team without cross-functional input miss: IT security concerns, legal compliance gaps, finance payment term optimization, and end-user adoption requirements. Run a structured RFP with a cross-functional evaluation panel.

**Mistake: No offboarding plan at contract signature**
→ "We'll figure out migration when we leave" is how you get held hostage at renewal. Require data export formats, API access post-termination, and a 90-day transition support obligation in the initial contract.

---

## Good vs Bad Output

**Bad vendor selection rationale:**
> "We went with Vendor A because they had the best demo and the sales rep was responsive."

**Good vendor selection rationale:**
> "Vendor A selected based on weighted scorecard (score: 4.2/5.0). Functional fit: 4/5 — meets 9/10 requirements natively. Security: 5/5 — SOC 2 Type II current, GDPR DPA executed. TCO over 3 years: $287K vs Vendor B ($310K) and Vendor C ($340K). Two independent reference calls confirmed implementation timeline accuracy. Vendor B eliminated: missing SSO integration (required). Vendor C eliminated: data residency outside EU (compliance blocker)."

---

**Bad contract term (auto-renewal):**
> "This agreement renews automatically for successive one-year terms."

**Good contract term (negotiated):**
> "This agreement renews automatically for successive one-year terms unless either party provides written notice of non-renewal at least 60 days prior to the renewal date. Renewal pricing shall not exceed the prior year's fees by more than the lesser of (a) 5% or (b) the CPI-U for the prior 12 months."

---

## Vocabulary

| Term | Meaning |
|------|---------|
| TCO | Total Cost of Ownership — all costs across the vendor lifecycle |
| RFP | Request for Proposal — structured competitive sourcing document |
| SOW | Statement of Work — detailed scope, deliverables, and timeline attachment to MSA |
| MSA | Master Services Agreement — umbrella legal terms governing all work |
| DPA | Data Processing Agreement — GDPR/CCPA-required data handling terms |
| SLA remedy | Contractual compensation (credit, refund) triggered by vendor failure to meet SLA |
| Auto-renewal | Contract clause that extends the term automatically without affirmative action |
| Change of control | Clause triggered when a vendor is acquired or materially changes ownership |
| Net-30/60/90 | Payment due 30/60/90 days after invoice date |
| Sole-source | Procurement from a single vendor without competitive bidding |
| Limitation of liability | Cap on the maximum damages a party can recover from the other |
| Shadow IT | Technology purchased or used outside of official procurement/IT processes |
