---
name: okr-framework
description: Expert reference for writing, cascading, scoring, and operating OKRs — separating signal from theater and driving actual organizational alignment.
version: 1.0.0
---

# OKR Framework — Expert Reference

## Core Philosophy

OKRs are a focusing mechanism, not a reporting mechanism. Their job is to force explicit choices about what matters most and make it impossible to hide behind activity. If your OKRs don't require you to stop doing something, they aren't working.

---

## Non-Negotiable Standards

1. **Objectives must be qualitative and inspiring.** If it sounds like a KPI, it's not an Objective — it's a metric masquerading as direction.
2. **Key Results must be measurable and binary-verifiable at scoring time.** "Improve NPS" is not a Key Result. "Increase NPS from 32 to 45 by Q4" is.
3. **3–5 Key Results per Objective, maximum.** More than 5 means you haven't prioritized.
4. **70% attainment is on-target.** 100% means the target was sandbagged. OKRs set at a level where 60–70% success represents strong performance.
5. **OKRs are not performance reviews.** Scoring must be decoupled from compensation. This is structural, not optional — coupling destroys honest target-setting.
6. **Committed vs. Aspirational OKRs must be distinguished.** Committed: 100% expected, missing is a failure. Aspirational: 70% expected, missing is informative. Treating both the same breaks the system.
7. **Weekly check-ins are operational, not ceremonial.** Format: confidence level, blockers, required decisions. Not a progress recitation.

---

## Decision Rules

- **If** an Objective can be achieved by one team without coordination, **then** it is not a company-level Objective — push it down.
- **If** a Key Result measures output (shipped features, meetings held, reports produced), **then** replace it with the outcome that output is supposed to drive.
- **If** you can hit all Key Results and still fail the Objective, **then** your Key Results are wrong — they don't actually define success for the Objective.
- **If** a Key Result requires more than two weeks to produce any measurable signal, **then** add a leading indicator KR alongside it.
- **If** two teams have Key Results that conflict (one team's success prevents another's), **then** escalate immediately — cross-functional OKR conflicts are executive decisions, not team-level negotiations.
- **If** an OKR is scoring above 0.9 at mid-cycle, **then** either the target was too conservative or measurement is wrong — investigate before celebrating.
- **Never** carry unachieved OKRs forward unchanged. Either the context changed (document why and reset) or you failed (own it and learn from it).
- **Never** have more than 5 company-level Objectives. Priority is a zero-sum game.
- **Never** let OKR scoring happen without a retrospective. Score + no learning = theater.

---

## Common Mistakes and Exact Fixes

| Mistake | Why It Fails | Fix |
|---|---|---|
| Writing KRs that are activities ("launch campaign," "hire 3 engineers") | Activities can be completed while the Objective fails | Replace with the result the activity enables: "Achieve 15% MQL growth" not "launch 4 campaigns" |
| Cascading by copy-paste (team OKRs mirror company OKRs exactly) | Creates alignment theater; teams aren't asked to interpret how their work connects | Teams should write their own OKRs explaining *their contribution* to company OKRs, then align |
| Setting OKRs annually without quarterly reviews | World changes; annual OKRs become irrelevant by Q3 | Quarterly OKRs with a 1-year thematic Objective as north star |
| Using OKRs to capture all work | Turns OKRs into a task list; obscures what actually matters | OKRs cover 20–30% of work — the high-stakes, uncertain, cross-functional bets. Operational BAU belongs in a different system |
| Averaging KR scores to get Objective score | Ignores that KRs have different strategic weight | Weight KRs explicitly; score Objective with judgment, not arithmetic |
| No owner on each KR | Diffuse accountability = no accountability | Every KR has exactly one DRI (Directly Responsible Individual) |
| Scoring OKRs at 1.0 routinely | Signals sandbagging or dishonest reporting | Track historical scores; if avg > 0.7, require targets to be raised next cycle |

---

## Vocabulary and Mental Models

**Objective** — A qualitative, time-bound statement of direction. Answers: "Where are we going and why does it matter?" Should be memorable enough to say from memory.

**Key Result** — A quantitative milestone that proves the Objective was achieved. Answers: "How will we know we got there?" Not a task, not an output.

**Initiative** — The projects and tasks that produce Key Results. OKRs don't capture initiatives — roadmaps and project plans do. Initiatives serve OKRs; OKRs don't list initiatives.

**Confidence Score** — A weekly 1–10 self-assessment of likelihood to hit a KR. Trend matters more than absolute value. Confidence dropping from 8 to 5 in two weeks is an escalation trigger.

**Committed vs. Aspirational** — Committed OKRs: operational targets where missing = failure (uptime, support SLA). Aspirational OKRs: stretch targets where 70% success is the expectation. Must be labeled.

**Sandbagging** — Setting targets low enough to guarantee 100% scoring. Destroys the system's credibility and signals risk-averse culture.

**OKR Altitude** — The organizational level (company, division, team, individual) at which an OKR lives. Higher altitude = broader scope, longer horizon, fewer OKRs. Most organizations have too many OKRs at the company level.

**Leading vs. Lagging KR** — Lagging: the outcome you care about (revenue, retention). Leading: early signals that predict the lagging metric (pipeline coverage, feature adoption). Good OKR sets include both.

---

## OKR Quality Test

Run every draft OKR through these questions:

1. **Objective:** If we achieve this, will it matter in 3 years? If no, reduce scope.
2. **Key Results:** Can we hit all KRs and still have a bad quarter? If yes, KRs are wrong.
3. **Key Results:** Can a KR be "done" without measuring anything? If yes, it's an initiative.
4. **Key Results:** Is there exactly one person accountable for this KR? If no, assign one.
5. **Set:** Do these OKRs require any team to de-prioritize existing work? If no, they're additive theater.

---

## Good Output vs. Bad Output

### Bad
> **Objective:** Improve our product
> **KR1:** Ship 10 new features
> **KR2:** Reduce bugs
> **KR3:** Improve developer velocity

### Good
> **Objective:** Become the product users recommend without being asked
> *(Aspiration: NPS 60+ in enterprise segment by end of Q3)*
>
> **KR1 [Aspirational]:** Increase enterprise NPS from 41 to 60 (DRI: VP Product)
> **KR2 [Committed]:** Reduce P1 incident count from 8/month to ≤2/month (DRI: Engineering Lead)
> **KR3 [Aspirational]:** Achieve 40% of new enterprise signups citing "peer recommendation" as source, up from 22% (DRI: Growth PM)
> **KR4 [Committed]:** Ship top 3 enterprise-requested features by Week 10, validated by customer acceptance (DRI: PM, Feature Squad)

---

## Scoring Reference

| Score | Meaning |
|---|---|
| 0.0–0.3 | Failed. Significant miss. Requires retrospective. |
| 0.4–0.6 | Made progress but fell short. Assess whether target was right or execution failed. |
| 0.7–0.8 | On target for aspirational OKRs. Investigate if committed. |
| 0.9–1.0 | On target for committed. Possible sandbagging if aspirational — raise targets. |

---

## Quarterly Rhythm

| Week | Activity |
|---|---|
| -2 | Draft OKRs with context from previous cycle retrospective |
| -1 | Cross-functional alignment review; resolve conflicts |
| 1 | Publish OKRs, assign DRIs, set baseline metrics |
| 2–11 | Weekly confidence check-ins; biweekly blocker escalations |
| 12 | Final scoring + retrospective before next cycle drafting begins |
