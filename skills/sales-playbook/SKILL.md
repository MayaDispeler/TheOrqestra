---
name: sales-playbook
domain: sales-playbook
purpose: Operationalize consistent, high-conversion GTM motions
applies_to: "Outbound sequences, discovery calls, deal progression, objection handling"
---

### Non-Negotiable Standards

**Prospecting**
- ICP-first: every outreach sequence starts with ICP match score >= 70
- Personalization floor: 1 specific, verifiable sentence about their company/role per email
- No spray-and-pray: max 500 new contacts per week per rep without ICP filtering
- Sequence touch pattern: Day 1 (email), Day 3 (LinkedIn), Day 5 (email), Day 8 (call), Day 12 (email), Day 15 (breakup)
- Subject lines: max 6 words, no questions, no clickbait, no "quick question"

**Discovery**
- Discovery before demo — always. No product demo without a completed discovery call.
- Required discovery answers before moving to SQL:
  1. What is the specific problem costing them time/money?
  2. Why now? (triggering event)
  3. Who owns the decision? (economic buyer identified)
  4. What does success look like in 90 days?
  5. What's the cost of doing nothing?
- MEDDIC recorded in CRM within 24 hours of discovery call
- Never pitch features. Pitch outcomes that match their stated pain.

**Demos**
- Demo structure: problem recap (2 min) → solution narrative (15 min) → proof point (5 min) → next step (3 min)
- Show their use case, not the full product. Customize to what they said in discovery.
- End every demo with: "Based on what you've seen, where does this rank on your priority list?"
- Never end a call without a confirmed next step with a specific date/time

**Closing**
- Proposal sent only when: economic buyer identified, budget confirmed, timeline agreed
- Proposals expire in 14 days — state this explicitly in the email
- Champion enablement: arm your internal champion with a business case doc
- Discount policy: never offer discount first. Ask "what would need to be true to move forward today?" first
- Max 2 discount rounds before escalating to manager

**Pipeline Hygiene**
- Update deal `closeDate` and `amount` every Friday (or deal gets flagged)
- Move to Closed Lost within 48 hours of loss signal — no zombie deals
- Close Lost reason required: `no_budget`, `no_decision`, `competition`, `timing`, `bad_fit`
- Win/loss analysis: mandatory call within 1 week of close

---

### Decision Rules

IF prospect asks for pricing before discovery → say "happy to share, want to make sure it's relevant first — can I ask 2 questions?"
IF demo request before qualifying → run a 15-min discovery before scheduling full demo
IF no response after 6 touches → mark as Closed Lost "no response", wait 90 days, re-engage
IF deal has been in same stage >21 days → flag for manager review
IF economic buyer isn't in calls → pause deal progression until they are
IF competitor is mentioned → acknowledge, never disparage, differentiate on your strengths
IF champion loses their job → reset deal, re-qualify from scratch
IF they say "send me some information" → "happy to — what specifically would be most useful for your evaluation?"
NEVER discount without getting something in return (faster close, longer term, referral)
NEVER submit forecast without speaking to economic buyer that week
NEVER let a deal sit in Proposal stage >14 days without an update
NEVER use "just checking in" as a follow-up — provide value in every touch

---

### Common Mistakes and Fixes

**Mistake**: Feature-dumping in demos
```
# BAD
"...and here you can see all the dashboard options, we have 47 chart types,
and over here is the settings panel, which has..."

# GOOD
"You mentioned reporting takes your team 4 hours on Fridays. Here's exactly
how that looks with our system — [shows specific workflow]. What did you
expect to take 4 hours? This takes 12 minutes."
```

**Mistake**: Weak next steps
```
# BAD
"I'll follow up with you next week"

# GOOD
"Let's put 30 minutes on the calendar for Thursday at 2pm to walk through
the proposal with you and Sarah — does that work?"
```

**Mistake**: Responding to objections with features
```
# BAD
Objection: "We already use Salesforce for this"
Response: "Well our integrations are actually really good and we have..."

# GOOD
Response: "Good context — are you happy with how Salesforce handles [specific pain]?
Most teams we talk to use both. What specifically were you hoping to solve?"
```

**Mistake**: Forecasting based on feeling
```
# BAD
"This one feels good, they were really engaged on the call"

# GOOD FORECAST CRITERIA:
- Economic buyer identified and met? ✓
- Budget confirmed ($ amount or range)? ✓
- Technical validation completed? ✓
- Decision timeline agreed? ✓
- Champion has business case internally? ✓
→ Only then: Commit forecast
```

---

### Email Templates (Structure, Not Scripts)

**Outbound Open**
```
Subject: [Specific outcome] at [Company]

[1 sentence: specific insight about their company/role]
[1 sentence: why that connects to what we do]
[1 sentence: specific outcome we drove for similar company]
[1 CTA: specific ask, low commitment]
```

**Follow-up After Demo**
```
Subject: Next steps — [Company] + [Your Company]

[Restate their top 3 problems verbatim from discovery]
[Map each to what they saw in demo]
[Proposed next step with date]
[What you need from them to move forward]
```

**Breakup Email**
```
Subject: Closing the loop

[Acknowledge you've been in touch]
[Leave door open: "if timing changes on X, I'm here"]
[One last value offer: relevant case study or insight]
[No guilt, no pressure]
```

---

### MEDDIC Framework

| Letter | Stands For | What to Record |
|--------|-----------|----------------|
| M | Metrics | Quantified pain: "$200k/year in manual work" |
| E | Economic Buyer | Name, title, relationship to champion |
| D | Decision Criteria | Their stated evaluation criteria, ranked |
| D | Decision Process | Steps to get to signed contract |
| I | Identify Pain | Root cause problem, not symptom |
| C | Champion | Name, motivation, their win if this succeeds |

Rule: If any MEDDIC field is blank, the deal is not SQL.

---

### Mental Models Experts Use

- **Problem-centric selling**: Prospects buy solutions to problems, not products with features. Always lead with their pain.
- **Economic buyer gravity**: All deals flow to the economic buyer. If you haven't met them, you're not in a real deal.
- **Champion vs sponsor**: A champion actively sells internally. A sponsor just "likes" you. Identify which you have.
- **Sales velocity**: Revenue = (# deals × win rate × ACV) / sales cycle. Optimize all four.
- **Mutual action plan (MAP)**: A shared, written checklist of steps to close. If they won't co-create it, they're not serious.
- **Negative reverse selling**: When they push back, lean in: "You might be right — maybe this isn't the right fit. What would need to be true for it to be?"

---

### Vocabulary

| Term | Meaning |
|------|---------|
| ICP | Ideal Customer Profile |
| MEDDIC | Qualification framework (see above) |
| Economic buyer | Person who signs the check |
| Champion | Internal advocate who sells for you |
| ACV | Annual Contract Value |
| Velocity | Speed deals move through pipeline |
| MAP | Mutual Action Plan — co-owned close checklist |
| BANT | Budget, Authority, Need, Timeline (older framework) |
| Breakup email | Final touch in sequence signaling disengagement |
| Multi-thread | Having relationships at multiple levels/depts |
