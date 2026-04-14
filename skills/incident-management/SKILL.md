---
name: incident-management
description: Incident response, management, and postmortem standards for engineering organizations operating production systems.
version: 1.0
---

# Incident Management Expert Reference

## Non-Negotiable Standards

1. Every incident has a single named Incident Commander (IC) from the moment a SEV1 or SEV2 is declared. No IC = no coordination = longer MTTR. The IC does not debug — they manage.
2. Mitigation (stopping user harm) always takes priority over resolution (fixing root cause). Shipping a hotfix is acceptable. Reverting a deploy is better. Disabling a feature flag is faster.
3. All incident timeline entries are factual and timestamped: "14:32 — deploy rolled back, error rate dropped from 38% to 0.2%." Never: "John misconfigured the database."
4. Postmortems are mandatory for every SEV1 and SEV2. Postmortem draft must be circulated within 24 hours. Action items require named owners and due dates — not teams, not "engineering."
5. Alert thresholds that produce >10% false positive rate over any 7-day rolling window must be recalibrated within one sprint. Alert fatigue is an incident risk, not a nuisance.
6. On-call engineers must have runbooks for every alert that can page them. An alert without a runbook is an incomplete alert. Do not ship alerts without runbooks.

## Decision Rules

- If error rate exceeds 5% of requests for >2 minutes or any complete service unavailability occurs, declare SEV1 immediately — do not wait to "confirm" for more than 2 minutes.
- If a single major feature is unavailable but the core product works, declare SEV2. Do not under-classify to avoid process overhead — under-classification delays escalation.
- If you cannot identify the cause within 20 minutes of a SEV1, escalate to the next tier. Seniority does not override the 20-minute rule.
- If a rollback is available and was deployed in the last 4 hours, roll back first before investigating. Time-to-mitigation beats correctness of diagnosis.
- If stakeholder updates have not gone out in 30 minutes during a SEV1, the IC must send an update even if it only says "investigation ongoing, no ETA yet." Silence is worse than uncertainty.
- If a SEV2 has had no update for 60 minutes, escalate the communication cadence to match SEV1.
- Never assign blame in incident timeline documentation or in the postmortem. If a name appears, it is in the context of who discovered or communicated something, not who caused something.
- If a postmortem action item does not have an owner, a due date, and a tracking ticket, it does not exist. Verbal commitments in postmortems do not count.
- If the same contributing factor appears in two postmortems within 6 months, it is a systemic failure of the action item process — escalate to engineering leadership.
- If on-call rotation coverage falls below 2 engineers per time zone for a SEV1-capable service, treat it as an incident risk and remediate before the next on-call cycle.

## Mental Models

**Mitigation vs. Resolution**
Mitigation stops user harm — a rollback, a feature flag disable, traffic rerouting. Resolution fixes the underlying cause — a code fix, a configuration change, a capacity increase. During an active incident, mitigation always wins. Resolution happens after users are unblocked. Conflating the two extends outage duration.

**The IC Separation of Concerns**
The Incident Commander manages three things: communication (stakeholder updates), coordination (who is working on what), and decision authority (when to escalate, when to declare resolved). The IC must not be debugging the system simultaneously. When the IC goes heads-down in a terminal, communication and coordination collapse. If there is only one engineer, they cannot be IC — they are a responder, and escalation is required.

**The Five Whys as a Tool, Not a Ritual**
Five Whys works when each "why" names a specific, verifiable system failure, not a human error. "Why did the engineer push broken code?" is not a useful why — it terminates in blame. "Why did broken code reach production?" leads to: no test coverage, no CI gate, insufficient review. The technique is valid only when applied to systems and processes, not individuals.

**Blameless Culture as Reliability Infrastructure**
Organizations where engineers fear blame under-report incidents, hide near-misses, and avoid risky but necessary escalations. Blameless postmortems are not kindness — they are the mechanism by which organizations learn. The standard is: assume engineers made the best decision available to them with the information they had at the time. Then ask: why did the system allow that decision to lead to failure?

## Vocabulary

| Term | Precise Meaning |
|------|-----------------|
| SEV1 | Full service outage, data loss, or security breach. Response time: page IC and on-call within 5 minutes. Stakeholder update every 30 minutes. |
| SEV2 | Major feature unavailable or significant performance degradation affecting >20% of users. Response time: 15 minutes. Update every 60 minutes. |
| SEV3 | Degraded performance or partial feature failure with workaround available. Response time: 4 hours. No war room required. |
| SEV4 | Minor cosmetic or non-impacting issue. Response time: next business day. Tracked as bug, not incident. |
| Incident Commander (IC) | Single decision-maker responsible for coordination, communication, and escalation during an active incident. Does not debug. |
| MTTR | Mean Time to Resolution — from incident declaration to full resolution. Industry target for SEV1: <4 hours. |
| MTTD | Mean Time to Detect — from incident start to alert firing. Measures monitoring coverage gap. |
| Mitigation | Any action that stops user harm without necessarily fixing root cause. Rollbacks, feature flags, traffic rerouting. |
| War Room | Dedicated real-time communication channel (Slack, Zoom bridge) opened at SEV1/SEV2 declaration. All responders join. No side threads. |
| Runbook | Step-by-step procedure for a specific alert: trigger conditions, immediate actions, escalation path, rollback steps. |
| Contributing Factor | A system or process condition that enabled the root cause to cause harm. Distinct from root cause — multiple factors per incident is normal. |
| Blameless Postmortem | Postmortem methodology that analyzes system failures, not individual errors. Assumes good faith of all responders. |

## Common Mistakes and How to Avoid Them

**Mistake 1: The IC also debugs**
- Bad: The most senior engineer is declared IC and immediately starts SSHing into servers to investigate.
- Why: Communication stops. Stakeholders have no updates. Other responders have no coordination. The outage extends.
- Fix: IC role is explicitly non-technical during the incident. If the IC is the only available expert, a second person must be paged to handle IC duties before debugging begins.

**Mistake 2: Waiting to declare**
- Bad: Team spends 15 minutes saying "let's see if this resolves itself" before declaring an incident.
- Why: Delays coordination, stakeholder communication, and escalation. MTTR clock starts at user impact, not declaration — but response starts at declaration.
- Fix: Define quantitative declaration triggers (error rate >5% for 2 minutes, P99 latency >5s for 5 minutes). Make declaration automatic or near-automatic. Declaring and then downgrading is acceptable — the opposite is not.

**Mistake 3: Blame-focused postmortem**
- Bad: "Root cause: engineer deployed without reviewing the diff. Fix: engineers must be more careful."
- Why: Produces no systemic improvement. Creates fear. The same failure mode recurs because the system that allowed it is unchanged.
- Fix: "Root cause: deployment pipeline did not enforce diff review on database migration scripts. Fix: add required review gate for migration files in CI config. Owner: @alice. Due: 2026-04-28."

**Mistake 4: Action items without owners or dates**
- Bad: "Action items: improve monitoring, add more tests, review deployment process."
- Why: Unowned items are never completed. "Engineering" is not an owner. Items without dates drift indefinitely.
- Fix: Every action item has one named owner, a due date, and a JIRA/Linear ticket number created before the postmortem is closed.

**Mistake 5: Alert thresholds set once and never revisited**
- Bad: Static alert thresholds set at service launch, never adjusted as traffic patterns change. PagerDuty fires 40% false positives on Monday mornings due to batch jobs.
- Why: Engineers start ignoring pages. True incidents get dismissed as noise. Alert fatigue directly causes missed SEVs.
- Fix: Monthly alert review. Any alert with >10% false positive rate in the past 7 days gets recalibrated or suppressed with an on-call annotation.

## Good vs. Bad Output

**Incident Timeline**

Bad:
```
14:15 — Bob deployed a bad config
14:30 — Alice noticed something was wrong
14:45 — The team figured out what Bob did
15:00 — Fixed
```

Good:
```
13:58 — Automated alert: error rate on /api/checkout exceeded 8% threshold (p50: 12%, p99: 47%)
14:02 — Incident declared SEV1. IC: @maya. War room: #incident-2026-04-14
14:04 — Stakeholder update #1 sent to #status-updates
14:08 — Deploy history reviewed; config change d3a91f deployed at 13:54 identified as candidate
14:19 — Rollback of d3a91f initiated
14:22 — Error rate returned to baseline (<0.5%). Mitigation confirmed.
14:35 — Stakeholder update #2: mitigation complete, monitoring, postmortem scheduled
15:00 — Incident resolved. MTTR: 58 minutes.
```

**Postmortem Structure**

Bad:
```
What happened: The database was misconfigured by the engineer on call.
Root cause: Human error.
Action items: Be more careful with database changes.
```

Good:
```
## Impact
- Duration: 13:54–14:22 (28 minutes)
- Users affected: ~12,000 (100% of checkout flow)
- Revenue impact: estimated $47,000 based on historical checkout rate

## Timeline
[Factual, timestamped sequence — see above]

## Root Cause
Connection pool max size was set to 5 in the production config template, down from 100.
The config change passed CI because the pool size parameter was not validated in the deployment pipeline.

## Contributing Factors
1. Config template lacked a validation schema enforcing minimum pool size
2. No staging environment load test that would have triggered pool exhaustion
3. Rollback procedure was not documented for this service, adding 11 minutes to mitigation

## Action Items
| Item | Owner | Due | Ticket |
|------|-------|-----|--------|
| Add JSON schema validation for connection pool config in CI | @carlos | 2026-04-21 | ENG-4421 |
| Add load test to staging deployment gate for checkout service | @priya | 2026-04-28 | ENG-4422 |
| Write rollback runbook for checkout-api | @maya | 2026-04-18 | ENG-4423 |
```

## Checklist

- [ ] Incident Commander named and role accepted within 5 minutes of SEV1/SEV2 declaration
- [ ] War room channel opened and all responders joined
- [ ] Stakeholder update sent within 30 minutes of SEV1 declaration (60 min for SEV2)
- [ ] Mitigation explored before root cause investigation is complete
- [ ] Incident timeline entries are timestamped and factual — no blame language
- [ ] Severity correctly classified per defined thresholds — not adjusted for convenience
- [ ] Incident declared resolved only after monitoring confirms baseline for minimum 15 minutes
- [ ] Postmortem draft circulated within 24 hours of resolution
- [ ] Every postmortem action item has a named owner, due date, and tracking ticket
- [ ] Root cause analysis uses Five Whys focused on system failures, not individual errors
- [ ] Alert false positive rate reviewed — any alert >10% FPR flagged for recalibration
- [ ] Runbook exists and was validated for every alert that fired during the incident
