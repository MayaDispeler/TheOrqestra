---
name: feature-flags-patterns
description: Expert reference for feature flag architecture, lifecycle management, and progressive delivery
version: 1.0
---

# Feature Flags Patterns Expert Reference

## Non-Negotiable Standards

1. **Every flag has an owner and an expiry date**: A flag without an owner is infrastructure debt nobody will clean up. A release flag without an expiry date will still exist in 3 years. These are required fields at creation time, enforced by the platform.
2. **Flag definitions live in version control**: Flag changes are code changes. They go through PR review, have a diff history, and are rolled back by reverting a commit. Flags configured only in a UI dashboard with no code representation cannot be audited or rolled back reliably.
3. **Client-side never receives the full flag configuration**: Shipping all flag names, variants, and targeting rules to the browser leaks your feature roadmap and targeting logic. Flags are evaluated server-side; clients receive only the result.
4. **Unit tests never hit a real flag service**: Tests that depend on live flag state are flaky tests. Mock the flag client. Test both flag variants explicitly.
5. **Technical debt from flags is tracked and enforced**: Release flags not removed within 2 weeks of 100% rollout, and experiment flags not removed within 2 weeks of experiment conclusion, are escalated to the team's tech debt backlog with a deadline.

---

## Decision Rules

**If** the flag controls a new feature rollout → it is a **release flag**: short-lived, percentage-based rollout, automatic cleanup after 100%. Target lifecycle: 2-4 weeks.

**If** the flag controls an A/B experiment → it is an **experiment flag**: tied to experiment lifecycle, variants matched to experiment arms, requires consistent assignment (sticky by user_id). Remove after experiment concludes and winner is shipped.

**If** the flag controls a kill switch or circuit breaker → it is an **ops flag**: permanent, boolean, default-on. Used to disable a feature if it causes an incident. Never auto-remove. Review annually.

**If** the flag controls access based on plan or role → it is a **permission flag**: permanent, driven by entitlement service data, not percentage-based. Remove only when the feature tier is retired.

**If** rollout percentage is being increased → establish monitoring gates: define which metrics to check before each increase (error rate, p99 latency, conversion). If any metric degrades beyond threshold, halt and investigate before continuing.

**If** two flags control the same code path → evaluate whether they should be merged. Nested flag evaluation creates combinatorial testing complexity: 2 flags = 4 states, 3 flags = 8 states. Avoid flag stacking.

**If** a flag has not been touched in >90 days → auto-notify the owner with a "review or extend" prompt. If no response in 2 weeks, escalate to the team lead.

**Never** use a feature flag as a configuration system. Flags control behavior (on/off, A/B). Configuration values (timeout durations, API endpoints, rate limits) belong in a configuration store, not a flag.

**Never** evaluate flags in a tight loop or hot path without caching. Flag evaluation should be cached in-process; SDK polling/streaming handles updates in the background.

---

## Mental Models

**Flag Taxonomy and Governance**
```
Flag Type    | Lifetime      | Variants  | Targeting        | Cleanup Trigger
-------------|---------------|-----------|------------------|------------------
Release      | 2-4 weeks     | on/off    | % rollout        | 100% + 2 weeks
Experiment   | Experiment    | A/B/n     | Sticky by userID | Experiment ends
Ops/Kill     | Permanent     | on/off    | Global           | Annual review
Permission   | Permanent     | plan tiers| Entitlement data | Feature retired
```

**Progressive Rollout Gates**
```
1% → [monitor 1h] → 5% → [monitor 4h] → 25% → [monitor 24h]
→ 50% → [monitor 24h] → 100% → [monitor 48h] → REMOVE FLAG

At each gate, check:
  - Error rate: must not increase >10% relative
  - p99 latency: must not increase >20%
  - Business metric: must not degrade (feature-specific)

If any gate fails: roll back to previous percentage, investigate.
```

**The Flag Lifecycle State Machine**
```
[Created] → [Targeting configured] → [1% rollout] → [Graduated rollout]
    → [100% rollout] → [Cleanup PR opened] → [Flag removed from code]
    → [Flag archived in platform]

Anything stuck in [Graduated rollout] >30 days = flag debt. Alert owner.
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Release flag | Short-lived flag controlling a gradual feature rollout |
| Experiment flag | Flag with multiple variants tied to an A/B test assignment |
| Ops flag | Permanent kill switch; enables/disables a feature in response to incidents |
| Permission flag | Entitlement-driven flag controlling feature access by plan or role |
| Sticky bucketing | Consistent variant assignment for a user across sessions (bucketed by user ID) |
| Flag evaluation | The process of determining which variant a given user/context receives |
| Targeting rule | Logic defining which users receive which variant (%, segment, attribute match) |
| Flag debt | Accumulated flags that were never removed after their purpose was served |
| Progressive delivery | Gradual feature rollout using flags, with monitoring gates between percentage increases |
| Multivariate flag | Flag with more than 2 variants (A/B/C testing or feature parameterization) |
| Flag SDK | Client library that communicates with the flag service and evaluates flags locally |
| Audit log | Record of every flag change: who changed it, what changed, when |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Permanent release flags**
- Bad: `show_new_dashboard` flag created in 2022, still evaluated in every request in 2025, original owner has left the company
- Fix: Required expiry date at creation. Weekly automated report of flags past expiry. Team lead notified after 2 weeks of no action.

**Mistake 2: Flag stacking without tracking**
- Bad: `new_checkout_flow` = true AND `new_payment_ui` = true AND `express_checkout` = true — 8 possible states, only 2 tested
- Fix: Flag dependency map. If flags share a code path, document the combinations. Prefer merging into one multi-variant flag when possible.

**Mistake 3: Using flags as configuration**
- Bad: `payment_timeout_ms` flag with value "3000" — now you have a configuration system with flag governance overhead
- Fix: Feature flags control behavior (enabled/disabled, variant A/B). Numeric configuration values belong in a typed configuration store with their own change management.

**Mistake 4: Live flag evaluation in tests**
- Bad: Tests call real LaunchDarkly SDK and pass/fail depending on what flag values are set in the dashboard
- Fix:
```typescript
// BAD
const enabled = await ldClient.variation('new-feature', user, false);

// GOOD — inject mock in tests
interface FlagClient {
  variation(key: string, defaultValue: boolean): boolean;
}

// Test with both variants explicitly
describe('new-feature enabled', () => {
  const flags = { variation: () => true };
  // test enabled behavior
});
describe('new-feature disabled', () => {
  const flags = { variation: () => false };
  // test disabled behavior (feature hidden, no errors)
});
```

**Mistake 5: No rollout monitoring gates**
- Bad: Flip flag from 0% to 100% in one step because "it looks fine in staging"
- Fix: Incremental rollout: 1% → 5% → 25% → 50% → 100%. Monitor error rate, latency, and business metrics at each step. 25% rollout exposing a production bug is recoverable. 100% is an incident.

---

## Good vs. Bad Output

**BAD flag definition (no governance):**
```json
{
  "key": "new_checkout_flow",
  "type": "boolean",
  "defaultValue": false
}
```
No owner, no expiry, no description of what it controls or when it should be removed.

**GOOD flag definition:**
```json
{
  "key": "new-checkout-flow",
  "type": "boolean",
  "description": "Controls new 3-step checkout flow replacing legacy 5-step flow",
  "owner": "payments-team",
  "type_classification": "release",
  "created_date": "2025-04-01",
  "expiry_date": "2025-05-15",
  "rollout_plan": "1%→5%→25%→50%→100% with 24h monitoring at each step",
  "cleanup_criteria": "Remove flag and old code path 2 weeks after 100% rollout",
  "monitoring_metrics": ["checkout_completion_rate", "payment_error_rate", "checkout_p99_latency"],
  "tags": ["checkout", "q2-2025"]
}
```

---

## Feature Flags Checklist

- [ ] Flag platform selected: LaunchDarkly / Unleash / Statsig / GrowthBook
- [ ] Flag definitions stored in version control (flags-as-code)
- [ ] Every flag has: owner, type classification, expiry date, description
- [ ] Flag evaluation server-side only — clients receive results, not configs
- [ ] Unit tests mock flag evaluation — no live flag service calls in tests
- [ ] Both flag variants (on/off) tested explicitly
- [ ] Release flags use progressive rollout (1%→5%→25%→50%→100%)
- [ ] Monitoring gates defined per rollout step (error rate, latency, business metric)
- [ ] Experiment flags use sticky bucketing by user_id
- [ ] Automated alerts for flags past expiry date
- [ ] Audit log enabled on flag platform (who changed what, when)
- [ ] Flag debt review in each sprint retrospective
