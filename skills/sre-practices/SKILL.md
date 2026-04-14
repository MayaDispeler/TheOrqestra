---
name: sre-practices
description: Expert reference for Site Reliability Engineering — SLOs, error budgets, incident response, toil reduction, and reliability architecture
version: 1.0.0
---

# SRE Practices — Expert Reference

## Non-Negotiable Standards

- Every user-facing service has SLOs. Without SLOs, reliability work is undirected opinion.
- Error budgets are spent on risk, not burned on accidents. Every budget burn must be traced to a decision.
- Toil is tracked, quantified, and reduced. If SREs spend more than 50% on toil, the team is failing.
- Postmortems are blameless. Root causes are systemic; individuals are not. Naming people is counterproductive.
- Alert on symptoms (user impact), not causes (CPU high). Cause-based alerts are noise; symptom-based alerts are signal.
- Runbooks are operational code. They are versioned, tested, and reviewed like production code.

---

## Decision Rules

**SLO Definition**
- If you don't know what users care about → you cannot define an SLO. Start with user journeys, not metrics.
- If your SLO is "100% uptime" → it is wrong. 100% is a fantasy; your error budget is zero, so no one can change anything.
- If you have one SLO → you have an availability SLO. Add latency. Users experience slow as broken.
- If your SLI is measured at the infrastructure layer → it does not represent user experience. Measure at the user or API gateway.
- Never set an SLO tighter than your dependency's SLO unless you have a mitigation strategy.
- The starting point for SLO targets: look at the past 4 weeks of actual performance, subtract 5–10%. That is your first SLO.

**Error Budgets**
- If the error budget is healthy (>50%) → reliability investment can slow; accelerate feature delivery.
- If the error budget is at 50% → pay attention; instrument more; identify the trend.
- If the error budget is exhausted → freeze feature releases. All engineering effort redirects to reliability.
- If the error budget is burned by a single incident → conduct a postmortem and implement preventive action before resuming releases.
- Never use error budget burn rate to punish teams. Use it to prioritize work.
- A 1-hour outage at 99.9% SLO consumes 4% of the monthly budget. Track this in real time.

**Alerting**
- If an alert does not require a human to take action → it is not an alert. It is a log entry or a graph.
- If an alert fires more than 5 times per on-call shift without paging action → it is noise. Fix or remove it.
- If an alert wakes someone up at 3am → it must be worth waking them up. If not, reduce severity.
- Alert on: error rate spiking, latency P99 exceeding SLO threshold, error budget burn rate (1h window > 2%, 6h window > 5%).
- Never alert on: CPU% alone, memory usage in isolation, disk usage (unless near exhaustion), queue depth in isolation.
- Every alert links to a runbook. Every runbook ends with a remediation action.

**Incidents**
- If a service is degraded but not down → it is still an incident if it breaches SLO or will within the burn window.
- If you are not sure if it is an incident → it is. Declare early; stand down is cheap.
- Incident roles: Incident Commander (IC), Communications Lead, Subject Matter Experts (SMEs). IC runs the call; SMEs do the work.
- If the incident is not resolved in 30 minutes → escalate. Do not let pride delay resolution.
- Never do speculative debugging during an incident. Mitigate first (rollback, reroute, disable feature flag). Diagnose after.
- The timeline in the postmortem starts from when the issue began (from metrics/logs), not when it was detected.

**Capacity and Load**
- If a service has no autoscaling → it has a fixed failure threshold. Know what it is.
- If load testing has not been run → you do not know your service's capacity ceiling.
- If traffic grows 2× every 6 months → you must plan headroom for 6× today.
- Never provision exactly for current load. Headroom is a reliability feature.

**Toil**
- If a task is manual, repetitive, automatable, and grows with scale → it is toil.
- If a task requires human judgment each time → it is not toil. It is engineering work.
- Toil >50% of SRE time → stop accepting new services until toil is reduced.
- Every quarter: audit toil, estimate hours, set a reduction target, automate one item.

---

## Common Mistakes and How to Avoid Them

**Mistake: Availability SLO only**
"We have 99.9% uptime!" But P99 latency is 8 seconds. Users experience it as broken.
Fix: SLO must cover availability AND latency. At minimum: `P99 latency < 500ms for 99.5% of requests`.

**Mistake: SLIs measured at the wrong layer**
CPU and memory as SLIs. These have no correlation to user experience.
Fix: Measure at the API gateway or client. SLIs are: request success rate, latency percentiles, correctness (for data pipelines).

**Mistake: Alert fatigue**
On-call gets 50 alerts per shift. They start ignoring them. Real incidents get missed.
Fix: Audit alerts monthly. Track page rates. Any alert that fires >5 times/month without action → fix or delete.

**Mistake: Blame in postmortems**
"Engineer X pushed the bad config." The postmortem names the person. Future incidents get hidden.
Fix: Reframe every individual action as a system property. "The deployment pipeline allowed a config change to reach production without validation." Fix the system.

**Mistake: Mitigation vs remediation confusion**
Team fixes the symptom (restarts the pod) without fixing the cause (OOM due to memory leak).
Fix: Two-track response. Immediate: mitigate (restore service). Follow-up: remediate (fix root cause). Both tracked as action items in postmortem.

**Mistake: Runbook as prose**
Runbook is a 5-page document explaining history, background, and theory. Under incident stress, no one reads it.
Fix: Runbooks are step-by-step, numbered, with commands to copy-paste. First heading: "Symptoms." Second: "Immediate Actions." Third: "Diagnosis." Fourth: "Escalation."

---

## Good vs Bad Output

**Bad: SLO definition**
```
SLO: 99.9% uptime
Measurement: ping test every 5 minutes
```

**Good: SLO definition**
```
Service: Checkout API
SLI: Proportion of checkout requests that return 2xx in < 1000ms (P99)
     measured at the API gateway over a 5-minute rolling window
SLO: 99.5% of checkout requests meet SLI over a 28-day rolling window
Error Budget: 3.6 hours of downtime-equivalent per 28 days
Alert: Burn rate > 2x over last 1h (fast burn) OR > 1x over last 6h (slow burn)
```

---

**Bad: Alert with no action**
```yaml
alert: HighCPU
expr: cpu_usage > 80
severity: warning
```

**Good: Actionable alert**
```yaml
alert: CheckoutAPIHighErrorRate
expr: |
  sum(rate(http_requests_total{service="checkout", status=~"5.."}[5m]))
  / sum(rate(http_requests_total{service="checkout"}[5m])) > 0.01
for: 5m
severity: page
labels:
  team: payments
annotations:
  summary: "Checkout API error rate > 1% for 5 minutes"
  runbook: "https://runbooks.internal/checkout-api-errors"
  dashboard: "https://grafana.internal/d/checkout"
```

---

**Bad: Postmortem conclusion**
```
Root cause: Engineer forgot to test the change in staging.
Action item: Engineers must test changes in staging.
```

**Good: Blameless postmortem conclusion**
```
Root cause: The staging environment did not have production traffic patterns enabled,
making it impossible to surface the race condition that manifested under load.
Contributing factors:
  - No automated load test gate in the deployment pipeline
  - Feature flag rollout was 100% immediately instead of gradual canary

Action items:
  [ ] Add load test stage to deployment pipeline gating on checkout path (owner: platform, due: 2026-05-01)
  [ ] Implement canary deployment capability with automatic rollback on error rate spike (owner: SRE, due: 2026-05-15)
  [ ] Enable production traffic shadowing in staging for checkout service (owner: checkout team, due: 2026-04-30)
```

---

## Vocabulary and Mental Models

**SLI (Service Level Indicator)** — A quantitative measure of service behavior. Must be measurable, user-relevant, and time-windowed. Examples: request success rate, latency P99, data freshness.

**SLO (Service Level Objective)** — A target range for an SLI over a time window. `SLI >= X% over 28 days`. This is a commitment to users, not a hard guarantee.

**SLA (Service Level Agreement)** — A contractual SLO with financial consequences for breach. SLAs are always less strict than internal SLOs. The gap is your safety margin.

**Error Budget** — `(1 - SLO) × window`. The amount of unreliability you are allowed. If your SLO is 99.9% over 30 days, your error budget is 43.2 minutes.

**Burn Rate** — How fast you are spending your error budget relative to the budget window. Burn rate 1 = exactly on pace to exhaust budget at window end. Burn rate 2 = exhausting budget in half the window.

**Toil** — Manual, repetitive, automatable, tactical work that scales with service volume. The enemy of engineering leverage. Target: <50% of SRE time.

**Error Budget Policy** — The documented agreement between product and SRE on what happens when the error budget is exhausted. Typically: feature freeze, mandatory reliability sprint.

**Runbook** — A documented, step-by-step procedure for responding to a specific alert or incident type. Not a design doc; a decision tree with commands.

**Postmortem** — A blameless retrospective conducted after every significant incident. Produces a timeline, root causes, contributing factors, and time-bounded action items.

**MTTD / MTTR / MTTF**
- MTTD: Mean Time to Detect. How long before we know there is a problem.
- MTTR: Mean Time to Restore. How long to restore service after detection.
- MTTF: Mean Time to Failure. Average time between failures.

**Canary Deployment** — Rolling out a change to a small percentage of traffic first. Monitor SLOs on canary before promoting to full rollout. Automatic rollback if SLO degrades.

**Chaos Engineering** — Deliberately injecting failures (latency, errors, node kills) in production or staging to verify that resilience mechanisms work and identify unknown failure modes. Game days make chaos structured.

**Saturation** — The degree to which a resource is being fully used. A saturated resource (CPU at 100%, queue full) predicts imminent latency or error rate degradation. Alert on saturation trends, not thresholds.

**The Four Golden Signals** (Google SRE Book)
1. Latency — time to serve a request
2. Traffic — demand on the system
3. Errors — rate of failing requests
4. Saturation — how "full" the service is

Start here when instrumenting any new service.
