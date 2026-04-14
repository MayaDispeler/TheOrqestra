---
name: product-roadmap
description: Expert reference for product roadmap planning, prioritization, and communication.
version: 1.0
---

# Product Roadmap Expert Reference

## Non-Negotiable Standards

1. **Roadmaps communicate bets and outcomes, not task lists.** A roadmap row reads "Increase activation rate from 40% to 60%" — never "Build onboarding wizard." The moment a roadmap looks like a backlog, it has failed its purpose.
2. **Every item in the Now column is committed, sized, and has a named owner.** Anything unowned and unsized lives in Next or Later regardless of stakeholder pressure.
3. **Confidence levels are disclosed for every theme.** High / Medium / Low confidence is labeled explicitly. Hiding uncertainty from stakeholders is a trust-destroying anti-pattern, not stakeholder management.
4. **Feature-based roadmaps are never delivered to engineering leadership or above.** Feature lists create contractual commitments. Outcome-based themes preserve the team's ability to solve the problem the right way.
5. **20% of quarterly capacity is formally reserved as a buffer.** Unplanned work (incidents, tech debt spikes, compliance mandates) fills this slot. Promising 100% capacity means slipping every quarter.
6. **The roadmap and the backlog are separate artifacts with different audiences.** The roadmap answers "why and what direction." The backlog answers "how and in what order." Conflating them produces a Gantt chart with product manager branding.

---

## Decision Rules

1. **If the company is pre-product-market fit (<18 months old, <$1M ARR), use Now/Next/Later.** Quarterly structure implies predictability you do not have. Dates lie; horizons are honest.
2. **If the audience is investors or the board, use a quarterly roadmap.** Investors need time-boxed commitments to underwrite their thesis. Outcome-based horizons without dates read as evasion in that context.
3. **If the product has established retention and the team runs OKR cycles, use outcome-based roadmaps.** Themes map directly to OKR key results; "Later" items are explicitly options, not promises.
4. **If a feature request cannot be attached to a measurable outcome, it goes into the parking lot, not the roadmap.** Parking lot is a real, visible section — not a euphemism for "rejected."
5. **Use RICE when scoring items in a mature backlog with sufficient data.** RICE = (Reach × Impact × Confidence%) / Effort. Score gaming prevention: Reach must be a real number from analytics (MAU count), not an estimate. Confidence >80% requires a user research citation.
6. **Use ICE for rapid pre-discovery sorting.** ICE = Impact × Confidence × Ease (all 1–10). ICE is directional only — never use it to justify a multi-quarter investment.
7. **Use MoSCoW only for release scoping, never for annual prioritization.** MoSCoW degrades into Must Have = everything when applied to a portfolio of initiatives.
8. **If two RICE scores are within 10% of each other, treat them as ties.** Tie-breaking by RICE decimal precision is false precision — resolve ties with strategic alignment, not arithmetic.
9. **If an item has been in "Next" for more than two quarters without moving, it either gets promoted or removed.** Items that never move are organizational dysfunction made visible; the roadmap should force the conversation.
10. **Never put a specific date on a "Later" item.** Dates in Later create implicit commitments. Later = "we might do this when Now and Next are done and we validate the hypothesis."

---

## Mental Models

### 1. The Horizon Model (Now / Next / Later)

```
NOW (0–3 months)          NEXT (3–6 months)         LATER (6+ months)
─────────────────         ──────────────────         ─────────────────
Committed                 Directional                Options
Fully sized               Unsized                    No sizing
Named owners              Team-level ownership        No owners yet
Dates visible             No hard dates              No dates ever
Confidence: High          Confidence: Med–High       Confidence: Low–Med
Outcome defined           Hypothesis stated          Problem space only
```

**When to use:** Pre-PMF startups, internal team roadmaps, any context where quarterly certainty would be dishonest.

---

### 2. The Outcome Stack (Why → What → How)

```
STRATEGY (Why)
  └── OKR Key Result: "Increase 90-day retention from 55% to 70%"
        └── ROADMAP THEME (What): "Reduce time-to-value in first 7 days"
              ├── Bet A: Contextual onboarding checklist
              ├── Bet B: Integration marketplace on Day 1
              └── Bet C: Role-based default workspace templates
                    └── BACKLOG (How): Jira tickets, sprint tasks, PRDs
```

The roadmap lives at the Theme level. The backlog lives at the Bet level and below. Executives see the OKR Key Result and Theme. Engineering teams see Bets and Backlog.

---

### 3. The Stakeholder Matrix (What Each Variant Includes)

| Roadmap Variant     | Audience              | Includes                                      | Excludes                          |
|---------------------|-----------------------|-----------------------------------------------|-----------------------------------|
| Engineering roadmap | Eng leads, architects | Dependencies, tech debt, infra milestones, risk flags | Revenue targets, customer names   |
| Sales roadmap       | AEs, SEs, CS          | Committed features with Q-level timing, NDA items | Bets, confidence levels, Later   |
| Public roadmap      | Prospects, customers  | Themes, problem areas, "In Progress / Planned" | Dates, internal strategy, Later  |
| Executive roadmap   | Board, C-suite        | Outcome targets, OKR alignment, resource allocation | Feature-level detail, sprint data |

**Rule:** Never hand an engineering roadmap to a customer. Never hand a public roadmap to the board.

---

### 4. The RICE Formula (Annotated)

```
RICE Score = (Reach × Impact × Confidence) / Effort

Reach      = # users affected per quarter (from analytics — not a guess)
Impact     = 0.25 (minimal) / 0.5 (low) / 1 (medium) / 2 (high) / 3 (massive)
Confidence = % as decimal: 0.5 (low) / 0.8 (medium) / 1.0 (high)
Effort     = person-weeks for the full team (not just engineering)

Example:
  Onboarding checklist: (5000 × 2 × 0.8) / 3 = 2,667
  Admin reporting:      (800  × 1 × 0.5) / 8 = 50

→ Onboarding checklist wins by a factor of 53x. No debate needed.
```

---

## Vocabulary

| Term | Precise Meaning |
|------|-----------------|
| Roadmap | A strategic communication artifact expressing directional bets, outcomes, and time horizons — not a project plan |
| Backlog | An ordered list of discrete tasks and feature specs for a development team to execute against |
| Theme | A problem space or outcome cluster on a roadmap; groups multiple possible solutions under one strategic intent |
| Now / Next / Later | A horizon-based roadmap format using commitment level, not calendar dates, to organize work |
| RICE | Prioritization formula: Reach × Impact × Confidence / Effort; produces a comparable score across items |
| ICE | Lightweight scoring: Impact × Confidence × Ease (1–10 scale); used for fast pre-discovery triage only |
| MoSCoW | Release-scoping method: Must Have, Should Have, Could Have, Won't Have; not a portfolio prioritization tool |
| Parking Lot | A visible section of the roadmap for valid ideas that are not prioritized; prevents silent rejection |
| Outcome | A measurable change in user behavior or business metric; what the roadmap is organized around |
| Output | A deliverable (feature, screen, API); what feature roadmaps are incorrectly organized around |
| Confidence Level | Explicit indicator (High / Medium / Low) on a roadmap item reflecting how validated the hypothesis is |
| Capacity Buffer | Formally reserved unplanned capacity (standard: 20%); prevents 100%-committed plans from always slipping |

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Feature-based roadmap rows

**Bad:**
```
Q1 | Build CSV export
Q2 | Add SSO support
Q3 | Redesign dashboard
Q4 | Launch mobile app
```

**Why wrong:** Each row is an output, not an outcome. Engineering has no flexibility to solve the underlying problem differently. Stakeholders treat each line item as a contract. When Q3 gets cut, you have broken a "promise."

**Fix:**
```
Q1 | Reduce friction in data portability workflows    [target: export usage +40%]
Q2 | Unblock enterprise procurement                   [target: 5 enterprise deals unlocked]
Q3 | Improve daily active usage for core workflows    [target: DAU/MAU from 28% → 40%]
Q4 | Expand surface area to mobile workers            [target: 15% of sessions from mobile]
```

---

### Mistake 2: Roadmaps that change every sprint

**Bad:** Reprioritizing the roadmap after every customer call or sales escalation, resulting in 4 different versions circulating in Slack within a single quarter.

**Why wrong:** Trust collapses. Engineering cannot plan. Sales over-promises based on the "current" version. The PM is seen as reactive, not strategic.

**Fix:** Establish a formal roadmap review cadence (monthly or quarterly only). All new input goes into the parking lot or the next planning cycle. Mid-cycle changes require a written decision record with explicit trade-off stated: "We are adding X; Y moves to Next."

---

### Mistake 3: Gantt-chart-style roadmaps

**Bad:**
```
Feature A  ████████░░░░░░░░░░░░  Jan 3 – Feb 14
Feature B  ░░░░████████░░░░░░░░  Feb 7 – Mar 22
Feature C  ░░░░░░░░████████████  Mar 1 – Apr 30
```

**Why wrong:** Gantt charts signal date commitments at feature level. Any slip cascades visually and creates immediate stakeholder anxiety. They also imply sequential dependencies that usually don't exist.

**Fix:** Use swim-lane themes with confidence indicators. If a Gantt is required by a stakeholder (e.g., program management), maintain it separately as a delivery plan — not as the product strategy document.

---

### Mistake 4: RICE score gaming

**Bad:** A PM estimates Reach = 50,000 users (the entire user base), Impact = 3 (massive), and Confidence = 1.0 for a feature request from one enterprise customer, producing a score of 150,000 / 2 = 75,000.

**Why wrong:** Inputs are fabricated. The score becomes a political instrument, not a prioritization tool.

**Fix:** Reach requires an analytics pull with a specific segment query. Impact 3 (massive) requires either an A/B test result or a user research citation referencing ≥5 sessions. Confidence 1.0 is only allowed if you have shipped a variant and measured the effect.

---

### Mistake 5: "Later" items with dates

**Bad:**
```
Later | AI-powered analytics dashboard | Target: Q4 2026
```

**Why wrong:** Immediately becomes a soft commitment. Sales will reference it in deals. Customers will ask about it at QBRs. When it moves, you have "broken a promise" even though it was in the "not committed" section.

**Fix:**
```
Later | AI-powered analytics dashboard | Confidence: Low | No date | Hypothesis: power users will self-serve on retention analysis
```

No date. Explicit confidence level. A hypothesis, not a promise.

---

## Good vs. Bad Output

### Comparison 1: Roadmap Row Quality

**Bad (feature-based, output-oriented):**
```
Theme        | Q1 Deliverable              | Owner   | Status
Onboarding   | Build onboarding wizard     | @jane   | In Progress
Integrations | Add Salesforce connector    | @team   | Planned
Reporting    | Redesign reports dashboard  | @alex   | Planned
```

**Good (outcome-based, hypothesis-driven):**
```
Theme                        | Outcome Target                        | Horizon | Confidence | Owner
Reduce time-to-first-value   | Activation rate: 40% → 60% (Day 7)   | Now     | High       | @jane
Unblock CRM-driven workflows | 3 CRM-native integrations live in Q1  | Now     | Medium     | @team
Empower data-driven users    | Report exports: 200/mo → 800/mo       | Next    | Medium     | @alex
```

---

### Comparison 2: Stakeholder Communication on Delay

**Bad:**
```
"The mobile app is delayed to Q3 due to engineering capacity."
```
(Implies a missed commitment, puts engineering on defense, communicates nothing about the trade-off.)

**Good:**
```
"We moved the mobile surface area theme from Q2 to Q3. The trade-off: Q2 capacity is now fully allocated to the enterprise procurement unblocking theme, which maps to 5 pipeline deals worth $400K. Mobile hypothesis confidence is still Medium — the Q3 timing gives us 6 more weeks of usage data to validate the core use case before building."
```

---

### Comparison 3: Parking Lot vs. Silent Rejection

**Bad:** Sales requests a competitor feature. PM says "we'll consider it" and never documents it anywhere. The feature resurfaces 3 months later as "you promised this."

**Good:**
```
PARKING LOT — Reviewed quarterly

| Idea                          | Requested by  | Date Added | Rationale for Hold                                  |
|-------------------------------|---------------|------------|-----------------------------------------------------|
| White-label branding          | Sales / @mike | 2025-01-10 | Valid for enterprise; blocked on multi-tenant arch  |
| Public API v2                 | Customers ×12 | 2024-11-04 | High demand; deprioritized vs retention work in H1  |
| Competitor feature parity: X  | Sales / @sara | 2025-02-01 | Segment mismatch — feature targets SMB, we're mid-market |
```

---

## Checklist / Deliverable Structure

- [ ] Every roadmap item is expressed as an outcome with a measurable target, not a feature description
- [ ] Each Now item has a named owner, a sizing estimate (person-weeks), and High confidence
- [ ] Confidence level (High / Medium / Low) is labeled on every roadmap item
- [ ] 20% capacity buffer is explicitly reserved in the quarterly plan and visible to engineering leadership
- [ ] A parking lot section exists with dated entries and documented hold rationale
- [ ] Stakeholder-specific variants are maintained: executive, engineering, sales, and public versions are separate documents with defined include/exclude rules
- [ ] RICE scores (where used) include a data source citation for the Reach input
- [ ] "Later" items contain no dates — only a hypothesis statement and a confidence level
- [ ] Roadmap review cadence is defined (monthly or quarterly) and change requests outside that cadence go to parking lot by default
- [ ] OKR alignment is explicit: each roadmap theme maps to a named Key Result
- [ ] Roadmap has a version number and last-updated date in the header
- [ ] The backlog is maintained as a separate artifact; no sprint-level tasks appear on the roadmap
