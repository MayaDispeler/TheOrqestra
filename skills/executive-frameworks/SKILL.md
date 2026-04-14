---
name: executive-frameworks
description: Expert reference for producing executive-grade communication — decision memos, escalation docs, strategy briefs, OKRs, board updates, financial translation, and stakeholder sequencing
version: 2.0.0
---

# Executive Frameworks — Expert Reference

## The Core Constraint

Executives have three scarce resources: attention (minutes), political capital, and decision bandwidth.
Every document and communication you produce burns some of each.
Your job is to burn the minimum amount to get the right decision made.

---

## Non-Negotiable Standards

- **Every document has exactly one ask**: inform, decide, or escalate — never combine; if you're informing and also have a decision buried at the end, you'll get zero decisions made
- **Translate everything into business impact**: engineering time, technical debt, and "scale issues" are not executive concerns; ARR impact, CAC, churn, margin, and payback period are — always convert
- **Write for skip-level reading**: your document will be forwarded; it must be self-contained and interpretable without you in the room
- **Quantify confidence, not just claims**: "we believe X (high confidence, 3 customer validations)" vs "we believe X" are different documents; always state your evidence tier
- **Reversibility is a first-class property**: every decision doc must state whether the decision is reversible; irreversible decisions require higher rigor and a recovery path
- **Lead with the recommendation**: conclusion first, evidence second — the pyramid principle, not the academic paper structure

---

## Document Types and Exact Structures

### 1. Decision Memo (the most important format)

Use when: a decision needs to be made, you have a recommendation, you need sign-off.

```
DECISION MEMO

Subject: [Specific decision, not topic — "Migrate auth to Okta by Q3" not "Auth vendor evaluation"]
Decision needed by: [hard date]
Decision owner: [name]

RECOMMENDATION
[One sentence. The specific choice you recommend.]

CONTEXT (3 sentences max)
[What situation forced this decision. Why now.]

OPTIONS CONSIDERED
Option A (Recommended): [Name]
  - Expected outcome: [quantified]
  - Cost/effort: [quantified — $ and/or headcount-weeks]
  - Key risk: [one sentence]
  - Reversibility: [reversible within X months / effectively irreversible]

Option B: [Name]
  - [Same structure]

Option C: Do nothing
  - [Always include. Forces explicit rejection of inaction with numbers.]

WHY OPTION A
[2-3 bullets. Evidence-based. No adjectives ("better", "cleaner", "more scalable").]

WHAT WE NEED
[Specific ask: budget approval / headcount sign-off / executive sponsor / awareness only]
```

Rules:
- If you present only one option, you're writing an approval request, not a decision memo — rename it accordingly
- Never more than 3 options; four options signals you haven't done the analysis to narrow it down
- "Do nothing" is always Option C; if it's obviously wrong, prove it with numbers
- If the decision is irreversible (vendor lock-in, org restructure, architectural pivot) → add: "If we're wrong, the recovery path is: ___"

---

### 2. Escalation Memo

Use when: you're blocked, the blocker is above your authority level, and delay has a quantified cost.

```
ESCALATION

Issue: [One sentence]
Impact of delay: [$ or % or timeline effect per week/day of inaction — be specific]
Attempted resolutions: [Bulleted list of what you already tried and why it didn't resolve]
What's needed from you: [Decision / introduction / resource / air cover — one specific ask]
Deadline: [When does the window close and what happens if it does]
```

Rules:
- If escalating without attempting peer-level resolution first → say so explicitly and explain why it couldn't be resolved at that level
- Never escalate without quantifying the cost of inaction; "this is blocking us" is a complaint, not an escalation
- If you can make the decision yourself, don't escalate; escalating decisions you can make is a career antipattern

---

### 3. Strategy Brief (one-pager)

Use when: proposing a multi-quarter initiative or a significant bet.

```
STRATEGY BRIEF: [Name of initiative]

THE BET
[One paragraph: what we will do, for whom, that will produce what outcome,
because of what insight about the market or customer that others have missed or dismissed.]

WHY NOW
[The specific forcing function: market window, competitor move, regulatory change, technology
inflection. If you can't name one, the timing is arbitrary and will be challenged.]

INVESTMENT
[Headcount + $ + time horizon. Be specific. "A few engineers" will be rewritten in the room.]

EXPECTED RETURN
[ARR / margin improvement / cost reduction / strategic option value — with time horizon
and confidence level. Show the model: Reach × Conversion × ACV = impact.]

HOW WE'LL KNOW IT'S WORKING (leading indicators)
[2-3 metrics that signal progress before the lagging outcome is measurable.
Without these, you can't course-correct mid-quarter.]

THE ASSUMPTION THAT COULD KILL THIS
[One sentence. The thing that, if wrong, makes the whole brief invalid.
If you can't name one, you haven't stress-tested the logic.]

GO / NO-GO CRITERIA
[What specific metrics or events would cause you to stop? By when?
This prevents indefinite continuation of a failing bet.]
```

---

### 4. OKR Document

**Objective rules:**
- Must be qualitative, aspirational, memorable — if it sounds like a KPI, it's a KPI, not an objective
- Must have an implicit "because we believe..." — if you can't explain why this matters this quarter, it shouldn't be an objective
- 3 objectives per team maximum — more means no priorities

**Key Result rules (the most violated):**

```
KR formula: [Metric] from [baseline] to [target] by [date]

ILLEGAL KR PATTERNS:
x "Launch X"               → activity, not outcome. Replace: "X reaches Y users by [date]"
x "Improve X"              → no baseline or target. Replace: "X from 32% to 45%"
x "Complete X project"     → deliverable. Replace with: what does completing X enable?
x "Support X initiative"   → not your outcome. Delete it.
x "Increase awareness of"  → unmeasurable. Replace with a behavioral proxy metric.
```

**OKR health checks:**
- If every KR will obviously hit 1.0 → objectives are sandbagged; reset targets until at least one KR is genuinely uncertain
- If a KR requires zero trade-offs to achieve → it's business-as-usual, not a priority; raise the target or cut it
- If a team's KRs don't visibly connect to any parent objective → those are local optimization, not company strategy
- If all KRs are lagging (measured only at quarter-end) → add leading indicators; no course-correction is possible without them

---

### 5. Status Update (recurring)

**GREEN (no decisions needed):**
```
[Project] — GREEN
Shipped: [what, by when, what metric it moves]
Next: [what, by when]
Watch: [any yellow signals — no action needed yet]
```

**YELLOW/RED (decision or awareness needed):**
```
[Project] — YELLOW/RED
Issue: [one sentence, quantified impact]
Root cause: [confirmed or suspected — distinguish between the two]
Action taken: [what you've already done]
What changes without intervention: [timeline/cost/quality impact per week]
Ask: [awareness only / decision needed by [date] / resource needed]
```

Rules:
- Never use GREEN to bury a YELLOW; "minor delays" in a green update means the color is wrong
- Never include analysis in a status update; analysis belongs in a decision memo; status updates are for signal, not reasoning

---

## Decision Rules

**Framing:**
- If an initiative has no quantified business case → don't schedule the meeting; write the one-pager first; the number-finding process will either validate or kill it
- If you have a recommendation but no data → say so: "recommendation based on judgment, not data. Data we'd need to validate: ___" — stating this is more credible than hiding uncertainty
- If presenting a strategy → format is: insight → bet → investment → return; not: background → analysis → options → recommendation; lead with the insight

**Stakeholder sequencing:**
- If a decision requires cross-functional buy-in → start with the most skeptical stakeholder, not the most aligned; if you can't get the skeptic on board before the meeting, the meeting will fail
- If walking into a meeting to get a decision → every person in the room should already know your recommendation; the meeting is to decide, not to inform; pre-wires are not optional
- If someone with authority is missing from the decision → name the gap explicitly: "We're deciding without Legal. Risk: this gets reversed after implementation."

**Financial translation:**
- If a request involves engineering time → convert to cost: 2 engineers × 6 weeks = ~$60K loaded; is the expected return >3×? If you can't answer, you're not ready to present
- If an initiative saves time → convert to FTE capacity: "saves 4 hours/week" → "frees 0.1 FTE = $8K/year at loaded cost"
- If projecting ARR impact → show the model: Reach × Conversion lift × ACV = impact; state which variable is most uncertain and what happens to the return if it's wrong by 50%

**Meeting economics:**
- If the information can be consumed async → send a doc, don't call a meeting; a 30-person all-hands costs ~$15K in loaded salary time
- If a meeting has no pre-read → it's a brainstorm, not a decision meeting; rename it and set expectations accordingly
- If a meeting's output is "we'll follow up" → the meeting failed; the follow-up should have been the meeting

---

## Common Mistakes and How to Avoid Them

**Mistake: Strategy that's actually a plan**
```
BAD: "Our Q3 strategy is to hire 3 enterprise AEs, expand to EMEA,
     and launch the Salesforce integration."
→ This is a list of activities. There is no theory of why these activities produce a win.

GOOD: "Our bet: Salesforce Admins are the undiscovered buyer in enterprise accounts.
      No competitor has a native Salesforce-first workflow. We will own this wedge
      by shipping a Salesforce package that installs in <5 minutes and makes us
      the default tool for ops teams already in Salesforce.
      The 3 AEs, EMEA expansion, and integration are how we execute the bet."
```

**Mistake: OKR with no leading indicators**
```
BAD:
Objective: Become the category leader in mid-market
KR1: Win 50 net new logos (measured Dec 31)
KR2: Reach $5M NRR (measured Dec 31)
→ You won't know if you're on track until Q4 ends. No course-correction possible.

GOOD: Add leading KRs:
KR3: 40 mid-market trials started/month by end of Q2  ← leading indicator
KR4: Trial-to-paid conversion >= 25%                  ← leading indicator
KR1 and KR2 become the lagging validators of KR3 and KR4 working.
```

**Mistake: Escalation without cost of inaction**
```
BAD: "We've been blocked on the data warehouse migration for 3 weeks
     and need help getting alignment with the data team."

GOOD: "The data warehouse migration is blocked on data team prioritization.
      Cost: every week of delay pushes the Q3 analytics dashboard launch 1 week,
      directly delaying the ABM campaign tied to $800K pipeline target.
      Two syncs with the data team lead have not resolved the conflict — it's resource
      allocation, not technical. Need you to align with [Data VP] on priority
      by Friday to hold the Q3 date."
```

**Mistake: Irreversible decision without stating reversibility**
```
BAD: "We recommend migrating from Postgres to DynamoDB."
(No mention that this is a multi-year, nearly irreversible architectural commitment.)

GOOD: "This is an irreversible decision on a 3-5 year horizon. Migration back
      would require a full data rewrite estimated at 6+ months of engineering.
      Given this, we recommend a 2-sprint proof-of-concept on one service before committing.
      Go/no-go criteria for full migration: [specific metrics from PoC]."
```

---

## Good vs Bad Output

**BAD — Q3 roadmap communication:**
```
The engineering team is planning to work on several exciting initiatives in Q3.
We'll be continuing our infrastructure improvements to make the platform faster
and more reliable, while also delivering new product features our customers have
requested. We're confident in the team's ability to execute.
```

**GOOD — Q3 roadmap communication:**
```
Q3 Engineering: 3 bets, $2.1M total loaded cost

BET 1 — Atlas (Enterprise multi-tenancy): $1.1M
Unlocks: 23 blocked enterprise deals totaling $3.4M ACV
Risk: 6-week architecture spike is critical path. If it slips, GA moves to Q4.
Owner: Platform team

BET 2 — Mobile parity (iOS): $600K
Unlocks: Renewal risk with Apex Corp ($420K ARR). They've given Q3 as hard deadline.
Risk: Low — 80% complete from Q2.
Owner: Mobile team

BET 3 — Infrastructure (observability + failover): $400K
Unlocks: SOC2 Type II, prerequisite for 7 enterprise deals in Legal/Finance verticals
Risk: No immediate revenue impact if delayed, but blocks compliance sales motion in Q4.
Owner: Infra team

NOT on roadmap: [3 items cut — available on request with trade-off analysis]

Decision needed: Confirm Atlas priority ordering. If enterprise pipeline is lower
priority than mobile retention, we should swap resourcing before week 2.
```

---

## Vocabulary and Mental Models

**MECE (Mutually Exclusive, Collectively Exhaustive)**: Options or issues should not overlap (ME) and together cover all cases (CE). Violations signal fuzzy thinking. Use when structuring options, issue trees, or org designs.

**Pyramid Principle (Barbara Minto)**: Conclusion first, then supporting arguments, then data. The inverse of academic writing. Every executive document should follow this. Burying the recommendation at the end guarantees it gets lost.

**SCQA (Situation, Complication, Question, Answer)**: Narrative structure for strategy docs. Situation: what's true now. Complication: what changed or what's wrong. Question: what this forces you to ask. Answer: your recommendation. More persuasive than "here are our options."

**Payback Period**: Time to recoup an investment. Executives prefer <18-month payback in growth stage, <12 months in efficient-growth stage. Always calculate and state it. "We don't know the payback period" is not a presentable answer.

**Forcing Function**: An external constraint that requires a decision by a specific date — the board meeting, the competitive launch, the contract renewal. Without one, decisions drift. Create or identify one in every decision doc.

**Pre-wire**: One-on-one alignment with stakeholders before a group meeting. The goal is to surface and resolve objections privately. Any objection raised in a meeting that could have been resolved beforehand is a pre-wire failure and a waste of everyone's time.

**Level 1 vs Level 2 Decision (Bezos)**: Level 2 = reversible, low stakes → decide fast, delegate down, accept imperfect info. Level 1 = irreversible or high stakes → slow down, broaden input, require stronger evidence. Applying Level 1 process to Level 2 decisions is organizational drag; applying Level 2 process to Level 1 decisions is recklessness.

**Type I vs Type II Error in decisions**: Type I = taking a bet that fails. Type II = not taking a bet that would have succeeded. Most organizations over-penalize Type I and under-penalize Type II (missed opportunities are invisible). Build this asymmetry into how you frame risk.

**Working Surface**: The set of decisions currently open in an organization. Too many open decisions = gridlock. Part of executive leadership is closing working surface by making decisions, delegating them clearly, or explicitly deferring them with a review date.

**The Inversion Test**: To evaluate if a goal is real — "if we proposed the opposite, would anyone object?" If no, the goal is trivially obvious and adds no information. Real strategic choices have real trade-offs that someone would argue against.
