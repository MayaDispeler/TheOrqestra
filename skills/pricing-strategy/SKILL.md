---
name: pricing-strategy
description: Expert reference for designing, validating, and evolving B2B and B2C pricing — value-based logic, packaging architecture, and pricing change management.
version: 1.0.0
---

# Pricing Strategy — Expert Reference

## Core Philosophy

Price is not a number. It is a signal — of quality, of positioning, of who you are for. Every pricing decision communicates something to the market. The job is to make sure what it communicates is intentional. Cost-plus pricing is an abdication of strategy. Pricing must be built backward from value delivered to the customer, not forward from cost of delivery.

---

## Non-Negotiable Standards

1. **Price to value, not to cost.** COGS + margin is a floor, not a strategy. The ceiling is defined by the value customers receive and the alternatives they have.
2. **Segment willingness-to-pay before setting price.** Different customers have fundamentally different WTP for the same product. One price is almost never optimal across segments.
3. **Packaging is strategy.** Which features go in which tier, what the tier names signal, and what limits drive upgrades — these are positioning decisions, not product decisions.
4. **The metric you price on must correlate with value delivered.** If customers get more value as they grow, price should scale with their growth, not with your cost.
5. **Pricing page design is part of pricing strategy.** Anchoring, decoy effects, and option ordering are not UX concerns — they are revenue levers.
6. **Validate pricing before building.** Van Westendorp, Conjoint, and willingness-to-pay interviews are not optional for significant pricing decisions.
7. **Discounting must be policy, not negotiation.** Ad hoc discounting destroys pricing integrity and creates reference price problems at renewal.

---

## Decision Rules

- **If** the primary objection in lost deals is price, **then** investigate whether it's an absolute price problem (too expensive) or a value communication problem (they don't see what justifies the price) — the fix is different for each.
- **If** more than 30% of customers are on the lowest tier but generating minimal revenue, **then** either the free/entry tier is too generous or the upgrade trigger is missing.
- **If** your best customers are on the same tier as your worst customers, **then** your pricing metric doesn't track value — your pricing structure is wrong.
- **If** your NRR (Net Revenue Retention) is below 100%, **then** pricing is a symptom, not the cause — fix churn drivers first, or expansion revenue will never compensate.
- **If** a discount is given, **then** it must be documented with a business reason, an expiration date, and approval at the appropriate level — no undocumented discounts.
- **If** you are raising prices, **then** grandfather existing customers for at least one cycle, communicate early (90 days minimum), and lead with value delivered since last pricing, not with cost justification.
- **Never** compete on price against a larger player who can sustain losses longer than you can. Compete on a dimension where size is not the advantage.
- **Never** add tiers without a clear upgrade trigger — what behavior or outcome causes a customer to want the next tier? If you can't name it, the tier doesn't work.
- **Never** use freemium as a default strategy. Use it only when product-led growth is the GTM, viral expansion is possible, and the cost-to-serve free users is near zero.
- **Never** set prices without modeling unit economics: LTV, CAC, payback period, and gross margin at each price point.

---

## Pricing Models — When to Use Each

| Model | Use When | Avoid When |
|---|---|---|
| **Flat rate** | Product delivers uniform value; simple buying decision needed | Value varies significantly across customers |
| **Per-seat / user** | Value scales with team size; usage is collaborative | Core value doesn't require multiple users (solo use case) |
| **Usage-based** | Value directly tracks consumption (API calls, messages sent, data processed) | Usage is hard to predict; creates budget anxiety |
| **Tiered (feature-gated)** | Clear feature differentiation by segment; distinct ICP per tier | Features don't cleanly divide across segments |
| **Outcome-based** | You can measure and guarantee outcome delivery | Outcome is hard to attribute or measure |
| **Freemium** | PLG motion; viral loop exists; COGS per free user near zero | Sales-led motion; high support cost per user; no viral mechanism |

---

## Packaging Architecture Principles

**Rule 1 — The Good-Better-Best tier structure works only when:**
- "Good" solves the core job for the target segment, nothing more
- "Better" removes the most common pain point in "Good"
- "Best" adds leverage (collaboration, compliance, reporting, integrations) valued by buyers not individual users

**Rule 2 — Always include a decoy tier.**
Three-option pricing increases conversion to the middle tier. The highest tier serves as an anchor that makes the middle tier feel reasonable. The lowest tier qualifies budget-constrained buyers.

**Rule 3 — Upgrade triggers must be felt, not forced.**
The best packaging makes customers want to upgrade because they hit a natural limit at the point of highest value, not because you blocked them arbitrarily. Example: Slack's free tier limit on message history — you lose value exactly when the product has proven its value.

**Rule 4 — Name tiers for customer identity, not product features.**
"Starter / Pro / Enterprise" tells customers where they fit. "Basic / Advanced / Ultimate" tells them what they get. The former drives self-selection; the latter drives confusion.

---

## Pricing Research Methods

**Van Westendorp Price Sensitivity Meter**
Four questions: too cheap / cheap but acceptable / expensive but acceptable / too expensive. Plots acceptable price range. Use for initial price range discovery. Sample: minimum 50 respondents per segment.

**Conjoint Analysis**
Presents customers with trade-offs between feature bundles at different price points. Reveals relative value of features and true WTP. Use when choosing packaging architecture. Requires statistical expertise.

**Willingness-to-Pay Interviews**
5–7 customer interviews. Ask: "What was the last comparable tool you paid for? What did you pay? What was the maximum you'd pay for a tool that solved [specific problem]?" Never ask "what would you pay for our product" — customers anchor low.

**A/B Pricing Tests**
Only valid when you have sufficient traffic volume (n>500 per variant). Ethical constraint: never show meaningfully different prices to customers in the same segment who might compare notes.

**Competitor Pricing Benchmarking**
Collect full pricing page data for all Tier 1 competitors quarterly. Note: published price is not transaction price — add 15–30% uplift for actual ACV in enterprise.

---

## Vocabulary and Mental Models

**Value Metric** — The unit you price on that scales with the value customers receive. Examples: seats (collaboration tools), API calls (developer tools), contacts (CRM), revenue processed (fintech). Bad value metrics: storage, projects created, page views.

**Willingness to Pay (WTP)** — The maximum a specific customer segment would pay before switching to an alternative. Varies by segment, use case, and available alternatives. Not what they prefer to pay.

**Price Anchoring** — Using a high reference price to make the actual price feel reasonable. Anchors can be: the enterprise tier price, a "was/now" comparison, a "cost of not solving this" calculation, or a competitor price.

**Price Elasticity** — How demand changes with price changes. Elastic: small price increase causes large demand drop (commodities). Inelastic: price increase causes small demand drop (essential tools with high switching costs). Know your elasticity before raising prices.

**NRR (Net Revenue Retention)** — Revenue from existing customers at end of period ÷ revenue from same cohort at start, including expansion and churn. NRR >100% means growth without new customers. The primary indicator of pricing model health.

**Expansion Revenue** — Additional revenue from existing customers: upsell (higher tier), cross-sell (additional products), seat growth, usage overages. Good pricing architecture creates natural expansion paths.

**Price-to-Value Gap** — The difference between value delivered and price charged. A large gap (charging well below value) means you are leaving money on the table. A negative gap (charging above perceived value) means churn risk.

**Reference Price** — The price a customer uses to evaluate whether your price is fair. Could be: competitor price, prior price they paid, or your own previous price. Managing reference prices is essential for price increases.

---

## Good Output vs. Bad Output

### Bad
> We should charge $49/month for our product because our costs are $15 and competitors charge $30–$70, so $49 is competitive.

### Good
> **Pricing recommendation: $79/month (Pro), $29/month (Starter)**
>
> **Value basis:** Pro customers reduce report creation time from 4h to 20min per week. At a $60/h blended rate, that's $880/month in recovered time. Price at $79 = 9% of value delivered — strong ROI justification.
>
> **Segment basis:** WTP interviews (n=23) show SMB ops managers (primary ICP) acceptable range $50–$110. Enterprise buyers ($500M+ revenue) showed WTP >$200 — an enterprise tier is warranted at $199 with SSO, audit log, and custom roles.
>
> **Competitive basis:** Primary competitor (Acme) at $65/mo has weaker value metric (per-project, not per-user) — at $79 we are 22% higher but our pricing includes up to 5 users, making per-seat cost lower for teams >1.
>
> **Upgrade trigger:** Starter tier limits to 3 saved reports and 1 integration. Pro removes both limits. In user research, report-saving and Slack integration are the top two engagement behaviors — customers will hit limits when the product has demonstrated value.
>
> **Unit economics:** At $79 ACV $948, CAC $380, payback 4.8 months, LTV (24mo avg) $2,272 — LTV:CAC 6:1. Healthy.
>
> **Risk:** Current customers at $39/mo. Price increase to $79 requires 90-day notice, grandfather for 2 cycles, and value communication campaign quantifying time saved since signup.

---

## Price Change Management Protocol

1. **Quantify value delivered since last pricing** before announcing increase.
2. **Segment impact:** which customers are most affected? What's their churn risk?
3. **90-day advance notice** minimum for annual contracts; 60 days for monthly.
4. **Grandfather pricing** for at least one renewal cycle for existing customers.
5. **Lead message:** "We're investing significantly in [specific improvements]. Pricing reflects this." Never lead with "our costs have increased."
6. **Offer annual lock-in** at current price as conversion opportunity.
7. **Measure:** track churn rate in the 60 days following price change by segment.

---

## Deliverable Checklist

- [ ] Pricing metric validated against value delivered
- [ ] WTP research conducted for each target segment
- [ ] Competitive pricing benchmarks collected (with dates)
- [ ] Unit economics modeled at each price point (LTV, CAC, GM)
- [ ] Tier upgrade triggers defined and tested
- [ ] Packaging aligned to ICP, not to feature list
- [ ] Discount policy defined (floor, approvals, expiration)
- [ ] Pricing page anchoring and option order reviewed
- [ ] Price change communication plan (if applicable)
- [ ] Success metrics defined (NRR, conversion rate, ACV)
