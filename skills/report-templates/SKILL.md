---
name: report-templates
description: Expert reference for structuring, writing, and formatting analytical and business reports — with opinionated rules for data conflict, audience type, confidence communication, and report architecture selection
version: 2.0
---

# Report Templates Expert Reference

## Non-Negotiable Standards

1. **Executive summary contains conclusions, not descriptions**: "Churn increased 23% YoY, concentrated in SMB" is a conclusion. "This report examines churn trends" is a description. Exec summaries contain only conclusions, recommendations, and top caveats — never scope or methodology.
2. **Findings are empirical. Recommendations are normative. They never share a section**: A finding is what the data shows. A recommendation is what someone should do. Mixing them obscures both the analytical basis and the decision boundary.
3. **Every quantitative claim carries four attributes inline**: value + metric definition + source + date. "Revenue declined 18% YoY (Total billed ARR, Company 10-K, FY2024)" — all four, every time. A claim missing any attribute is inadmissible.
4. **Confidence level is declared for every non-measured claim**: Measured / Estimated / Modeled / Assumed. If you don't label it, the reader can't evaluate it.
5. **Contradictory findings are disclosed in the executive summary, not footnoted in section 4**: Burying contradictions is the most common form of analytical dishonesty in reports.

---

## Report Architecture Selection

**Use a Findings-Forward structure** when:
- The audience will act without a briefing (async report)
- The findings are conclusive and agreed-upon methodology is assumed
- Time-to-decision is the constraint

```
Exec Summary → Findings → Recommendations → Methodology → Appendix
```

**Use a Methodology-Forward structure** when:
- The audience will scrutinize the analytical basis (technical, scientific, regulatory)
- Findings are contested or counter-intuitive
- The report will be cited as a source by others

```
Exec Summary → Background → Methodology → Findings → Recommendations → Appendix
```

**Use a Narrative (SCQA) structure** when:
- The audience needs to be moved from one belief to another
- The finding contradicts the audience's current position
- The report will be presented, not just read

```
Situation → Complication → Question → Answer (exec summary as the "Answer")
→ Evidence sections → Recommendations
```

**Never** default to Findings-Forward for a technically sophisticated audience — it reads as hand-waving. **Never** use Methodology-Forward for executives — they will stop reading at page 2.

---

## Decision Rules

**If** two data sources produce conflicting values for the same metric → do not average them or pick one silently. State both, explain the definitional difference, and declare which you used and why. Example: "CRM shows 1,240 accounts (all signed contracts); Finance shows 1,180 accounts (active billing only). This report uses the Finance definition."

**If** a finding contradicts the client's stated assumption → use the SCQA narrative structure and front-load the contradiction in the executive summary. Never let it appear first in section 4 after the reader has been lulled into confirmation.

**If** the report contains projections → they must: (a) be visually distinct from actuals (dashed line, shaded column, explicit label), (b) state the model and assumptions used, (c) include a stated scenario range (base / upside / downside). A single-point projection presented without a range is false precision.

**If** the audience is a committee (multiple stakeholders with different priorities) → each recommendation must be tagged with which stakeholder it primarily affects. Untagged recommendations in committee reports produce no owner and no action.

**If** data is missing for a key variable → state: what's missing, why it matters, the direction of the bias it introduces, and whether the finding is still valid absent that data. "We don't know X, which means this finding likely *understates* the true effect" is far more credible than silence.

**If** the report will be used in a legal, regulatory, or audit context → every claim must use the most conservative defensible framing. "Revenue was approximately $4.2M" → "Revenue was $4,183,442 (source: audited P&L, FY2024)."

**If** more than 3 recommendations are made → apply a 2×2 prioritization (Impact × Effort or Must Do / Should Do / Could Do). An unprioritized list of 8 recommendations produces committee paralysis.

**Never** write "it appears," "it seems," or "may suggest" for findings with direct supporting data. Reserve hedging language for genuinely low-confidence claims — then state the confidence level explicitly.

**Never** let a conclusion section introduce new data, new claims, or new recommendations. The conclusion synthesizes only what appeared in the body. If you find yourself writing new content in the conclusion, it belongs in the body.

**Never** use the same metric with different definitions in different sections of the same report without a conversion table in the methodology section.

---

## The Confidence Gradient (Non-Negotiable)

Every quantitative claim in a report lives on one of four levels. Label each:

| Level | Definition | Required Disclosure |
|---|---|---|
| **Measured** | Directly observed, auditable data | Source + date |
| **Estimated** | Calculated from measured proxies | Method + assumptions + error range |
| **Modeled** | Output of a model with inputs | Model name + key inputs + scenario |
| **Assumed** | Required for analysis, no data support | Explicit statement + sensitivity note |

**If** a finding rests on Assumed data and the assumption changes the direction of the finding → the finding must be conditional: "If assumption X holds, then Y. If X does not hold, the finding reverses."

---

## Handling Conflicting Data Sources (Decision Tree)

```
Two sources conflict
        ↓
Are they measuring the same thing?
    ├── No → They are different metrics. Use both with distinct labels.
    └── Yes → Is the difference definitional (e.g., gross vs. net)?
            ├── Yes → Define both, select one, state reason, footnote the other.
            └── No → Is the difference material (>5% or changes the finding)?
                    ├── No → Note discrepancy in methodology; use primary source.
                    └── Yes → Escalate to client/stakeholder before publishing.
                              Never silently pick the number that supports the thesis.
```

---

## Audience-Specific Formatting Rules

**Single executive decision-maker:**
- Exec summary ≤ 1 page, 3 bullets maximum
- Recommendations before findings (they want the ask, then the evidence)
- Methodology in appendix only
- No tables with >4 columns in the body

**Committee / multi-stakeholder:**
- Tag each recommendation with primary owner
- Include a summary table: Recommendation × Owner × Timeline × Priority
- Add a "Minority view" section if stakeholders disagree on findings
- Budget and resource implications require their own section

**Technical / analytical audience:**
- Methodology in the body, not the appendix
- Confidence intervals required on all statistical claims
- Show the model, not just the output
- Peer reviewers named or blind-review process stated

**Regulatory / audit audience:**
- Every number traces to a named primary source document
- No estimates without a stated derivation method
- Use passive voice sparingly but acceptably when actor is systemic
- All dates in ISO 8601 format (YYYY-MM-DD)

---

## Mental Models

**The Inverted Pyramid**
```
[Executive Summary: All critical conclusions + top recommendation + key caveat]
    ↓
[Body: Evidence and analysis supporting each conclusion]
    ↓
[Appendix: Raw data, full methodology, supporting exhibits]
```
Design for readers who exit at the level of detail they need.

**The SCQA Framework (Minto)**
- **Situation**: What stable context the reader accepts as true
- **Complication**: What changed or what problem exists
- **Question**: What the reader now needs to know
- **Answer**: The report's thesis — stated in the executive summary

Use SCQA when the finding is counter-intuitive or the audience needs to shift their position.

**The Recommendation Equation**
```
Valid recommendation = Finding + Implication + Specific Action + Owner + Timeline + Priority
```
Remove any element and the recommendation degrades to noise. "Improve customer service" fails on Action, Owner, Timeline, and Priority simultaneously.

**The Confidence Gradient**
Readers cannot evaluate credibility if they can't see the epistemological basis of each claim. Labeling claims as Measured / Estimated / Modeled / Assumed is not hedging — it is intellectual honesty that increases credibility.

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Finding | An empirical observation supported by labeled data |
| Insight | A finding plus its non-obvious implication |
| Recommendation | A specific action + owner + timeline + priority |
| Confidence interval | The range within which a true value falls at a stated probability |
| Caveat | A stated limitation that bounds validity of a finding |
| SCQA | Situation-Complication-Question-Answer narrative structure |
| Findings-Forward | Report structure where findings precede methodology |
| Methodology-Forward | Report structure where methodology precedes findings |
| Definitional conflict | Two sources measuring the same concept with different definitions |
| Scenario range | Base / upside / downside projections with stated assumptions |
| Committee paralysis | Failure to act caused by an unprioritized recommendation list |

---

## Standard Report Architectures

### Analytical / Research Report (Findings-Forward)
```
1. Cover page (title, author, date, version, confidentiality classification)
2. Executive Summary (conclusions + top recommendation + key caveat — ≤300 words)
3. Table of Contents (if >8 pages)
4. Background & Objectives
5. Findings (each = declarative claim + evidence + exhibit + confidence level)
6. Recommendations (numbered, prioritized, owner + timeline per item)
7. Conclusion (synthesis only — no new information)
8. Methodology (sources, date ranges, definitions, limitations, confidence labeling)
9. Appendix (raw data, extended exhibits, conflicting source reconciliation)
10. References (inline citations resolved here)
```

### Status / Progress Report
```
1. Header (project, period, RAG status: Red/Amber/Green + one-line reason)
2. Executive Summary (3 bullets: accomplished, blocked, next period)
3. Accomplishments vs. Plan (table: milestone, planned date, actual date, delta)
4. Issues & Risks (each: description, impact level, owner, resolution date, status)
5. Plan for Next Period (milestone, owner, date, dependencies)
6. Budget / Resource Status
```

### Decision Report (Committee Audience)
```
1. Decision Required (single sentence: what decision, by whom, by when)
2. Recommendation (the proposed decision, stated first)
3. Options Considered (table: option, pros, cons, cost, risk)
4. Supporting Analysis (findings that inform the recommendation)
5. Stakeholder Impact Summary (table: stakeholder, impact, owner of change)
6. Implementation Plan (if recommendation is adopted)
7. Appendix
```

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Exec summary as introduction**
- Bad: "This report examines customer churn rates across three segments over 12 months to identify key drivers and inform retention strategy."
- Fix: "Churn increased 23% YoY (Measured; Salesforce, Q4 2024), concentrated in SMB (65% of total churn volume). Root causes: onboarding friction, feature gap vs. Competitor X, pricing mismatch. Recommendation: SMB onboarding redesign (Q2, Owner: CPO) and pricing model review (Q3, Owner: CFO). Full methodology in Appendix A."

**Mistake 2: Silent source conflict**
- Bad: Uses the CRM number in section 2 and the Finance number in section 4 without acknowledgment
- Fix: Conflict resolution table in methodology section; single declared source for the report; discrepant number noted

**Mistake 3: Single-point projection**
- Bad: "We project 14% growth in FY2025."
- Fix: "Base case: 14% growth. Upside (10% churn reduction achieved): 19%. Downside (EMEA continues to decline): 8%. (DCF model v3, key input: net revenue retention assumption of 108%.)"

**Mistake 4: Unprioritized recommendation list**
- Bad: 7 recommendations with no ordering
- Fix:

| # | Recommendation | Priority | Owner | Timeline |
|---|---|---|---|---|
| 1 | Reduce enterprise SLA to 8h | Must Do | VP Support | Q1 |
| 2 | Mobile stability sprint | Must Do | CTO | Feb–Mar |
| 3 | Pricing model review | Should Do | CFO | Q2 |

**Mistake 5: Conclusion with new claims**
- Bad: Conclusion includes a new statistic or a recommendation not in the body
- Fix: Read the conclusion aloud. Every sentence must trace to a body section. If it can't, move it or cut it.

---

## Quality Gate Checklist

- [ ] Exec summary: conclusions + recommendation + caveat only (no scope/methodology)
- [ ] Report architecture selected and matched to audience type
- [ ] Every quantitative claim: value + definition + source + date
- [ ] Confidence level labeled on all non-measured claims
- [ ] Conflicting data sources reconciled in methodology section
- [ ] Projections visually distinct from actuals + scenario range stated
- [ ] Findings and recommendations in separate sections
- [ ] Recommendations: action + owner + timeline + priority (all four)
- [ ] Conclusion introduces zero new information
- [ ] Committee reports: each recommendation tagged with primary owner
- [ ] Table of contents present if >8 pages
- [ ] All exhibits numbered, titled, and sourced
