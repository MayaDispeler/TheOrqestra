---
name: product-requirements
description: Writing product requirements — PRDs, user stories, and acceptance criteria
version: 1.0
---

# Product Requirements Expert Reference

## Non-Negotiable Standards

1. Every requirement must be independently testable. If you cannot write a failing test for it before implementation, rewrite it until you can.
2. Requirements describe outcomes and constraints, never solutions. "Users can filter results by date" is a requirement. "Add a dropdown with date options" is a design decision.
3. All non-functional requirements carry a specific numeric threshold — "fast" and "secure" are not requirements; "p95 response < 200ms" and "AES-256 encryption at rest" are.
4. Every PRD must include an explicit Out-of-Scope section. Ambiguity about scope is the single largest cause of requirement creep in sprint execution.
5. Success metrics are defined before requirements are written, not after. Metrics drive prioritization; requirements serve metrics.
6. Open questions are tracked in the PRD itself, each assigned to an owner with a resolution-by date. Unresolved questions at sprint start are blockers, not footnotes.

## Decision Rules

- If a requirement uses passive voice ("the user should be notified"), rewrite it with an explicit actor ("the system sends an email notification to the user within 30 seconds of the triggering event").
- If Must-haves exceed 60% of sprint story points, you have a scope problem — reclassify ruthlessly before committing.
- If you cannot identify the persona for a user story within 5 seconds of reading it, the story is too abstract to estimate or test.
- If a non-functional requirement involves user-facing response time, the threshold must be drawn from real data (baseline p95 from production) or a named standard (WCAG 2.1 AA, OWASP Top 10), never invented.
- If two requirements conflict, resolve it in the PRD itself with an explicit trade-off note — never leave conflicting requirements for engineers to arbitrate.
- If an edge case is discovered during grooming, it becomes an explicit acceptance criterion immediately, not a comment in Jira.
- Never write "TBD" in a Must-have requirement. If it's truly unknown, the requirement is not yet a Must-have.
- If a requirement cannot be traced back to a success metric, demote it to Could-have or cut it — gold-plating hides behind untraceable requirements.
- Performance NFRs: define thresholds at p50, p95, and p99, not just average. Averages hide tail latency.
- Accessibility NFRs default to WCAG 2.1 AA for any public-facing surface, WCAG 2.1 AAA for government or healthcare contexts.

## Mental Models

**The Three-Layer Test**
Every requirement passes three questions: (1) Why does this matter to the business? (2) What does the user experience? (3) How will QA verify it passed? If any layer cannot be answered in one sentence, the requirement needs more work before writing.

**The Five-Level NFR Stack**
Non-functional requirements operate at five levels that must all be addressed: Performance (latency/throughput), Reliability (uptime/error rate), Security (auth, encryption, audit), Accessibility (WCAG compliance), Scalability (load at 10x current traffic). Skipping any level is a deliberate risk decision, not an oversight.

**MoSCoW as a Budget, Not a Label**
MoSCoW is a capacity allocation tool. A healthy sprint: Must ~40%, Should ~30%, Could ~20%, Won't ~10%. Treating "Must" as "important" rather than "ship-blocking" inflates Must counts and destroys the model's utility.

**The Testability Forcing Function**
Write the acceptance test before the requirement text is finalized. If Given/When/Then cannot be written in under 3 minutes, the requirement is under-specified. The inability to write a test is diagnostic, not a problem to defer.

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Business Requirement | A statement of organizational need or goal, independent of any specific system or solution (e.g., "reduce checkout abandonment by 15%") |
| Functional Requirement | A specific behavior the system must exhibit — what it does, not how (e.g., "the system validates email format before account creation") |
| Non-Functional Requirement (NFR) | A quality constraint on system behavior with a measurable threshold (e.g., "API availability ≥ 99.9% monthly") |
| Acceptance Criterion | A pass/fail condition that defines when a specific user story is complete, written in Given/When/Then (Gherkin) syntax |
| Definition of Done (DoD) | Team-level quality gates applied to every story regardless of content — includes code review, test coverage ≥ 80%, deploy to staging, accessibility audit |
| MoSCoW | Prioritization framework: Must Have (launch-blocking), Should Have (high value, workaround exists), Could Have (nice-to-have), Won't Have (explicitly out of scope this cycle) |
| User Story | A requirement framed from a user's perspective: "As a [persona], I want [capability] so that [outcome]" — the "so that" is mandatory |
| Persona | A named archetype representing a user segment, grounded in research — not a demographic label |
| Minimum Detectable Requirement | The smallest version of a requirement that still satisfies the underlying business need and can be independently shipped |
| Gherkin | Structured syntax for acceptance criteria: Given [precondition], When [action], Then [observable outcome] |
| Out-of-Scope | An explicit list of capabilities that will not be built in this release, preventing scope creep and aligning stakeholders |
| Trace Link | A documented connection between a requirement and the business metric or user need it serves — orphaned requirements without trace links are candidates for deletion |

## Common Mistakes and How to Avoid Them

**Mistake 1: Solution-Disguised-as-Requirement**
- Bad: "Add a toggle in Settings > Notifications to let users turn off marketing emails."
- Why: Prescribes UI implementation. Locks design before discovery. Prevents exploration of better solutions (e.g., preference center, unsubscribe flow).
- Fix: "Users can opt out of marketing email communications. Opt-out must persist across sessions and take effect within 10 minutes."

**Mistake 2: Untestable NFR**
- Bad: "The app should be fast and responsive."
- Why: No threshold, no measurement method, no pass/fail state. Engineers cannot design to it; QA cannot test against it.
- Fix: "Page load time (Time to Interactive) < 3s on a simulated 4G connection (Chrome DevTools throttle: Fast 4G) for p95 of sessions."

**Mistake 3: Missing Out-of-Scope Section**
- Bad: PRD describes what is being built in detail. Stakeholders assume everything adjacent is also in scope.
- Why: Implicit scope is interpreted differently by every reader. Generates last-minute requests and blame cycles post-launch.
- Fix: Explicit Out-of-Scope section listing at least 3-5 adjacent capabilities that were considered and deferred, with brief reasoning.

**Mistake 4: Passive Voice Obscures Responsibility**
- Bad: "Users should be notified when their subscription expires."
- Why: Who notifies them? When exactly? Via what channel? This is unanswerable by the engineer writing the story.
- Fix: "The system sends a push notification and email to the user 7 days before, 1 day before, and on the day of subscription expiry."

**Mistake 5: Edge Cases Treated as Afterthoughts**
- Bad: "Handle errors gracefully." Added as a note in a comment after story sign-off.
- Why: Edge cases discovered during development expand scope unpredictably. "Gracefully" is not testable.
- Fix: Edge cases are enumerated as explicit acceptance criteria during grooming. "Given the user's payment method is expired, when they attempt checkout, then the system displays error code PAY-004 and a link to update payment details."

## Good vs. Bad Output

**Bad PRD Section — Problem Statement**
```
We need to improve the onboarding experience. Users are dropping off and we want
to fix that. This will make users more engaged and improve retention.
```
Problems: No data cited, no specific drop-off point identified, no measurable target, no persona identified, no baseline established.

**Good PRD Section — Problem Statement**
```
Problem: 58% of new users (persona: Small Business Owner, acquired via paid search)
abandon the product within the first session without completing profile setup
(source: Mixpanel, Q1 2026, n=4,200). The primary exit point is Step 3 of 5
(connecting a data source), with a 72% abandonment rate at this step.

Success Metric: Reduce Step 3 abandonment from 72% to ≤ 45% within 60 days
of launch, measured by Mixpanel funnel "Onboarding v2".

Out of Scope: Re-design of Steps 1-2, changes to email onboarding sequences,
mobile app onboarding (addressed in Q3 roadmap).
```

---

**Bad User Story**
```
As a user, I want to be able to see my data so that I can use it.
```
Problems: Persona is generic, capability is vague, outcome is circular, untestable.

**Good User Story + Acceptance Criteria**
```
As a Small Business Owner, I want to view a summary of last month's revenue
broken down by product line so that I can identify which products to prioritize
in next quarter's marketing budget.

Acceptance Criteria:
  Given I am on the Dashboard page and my account has at least one completed
    order in the previous calendar month,
  When the page loads,
  Then I see a bar chart showing revenue by product line for the previous
    calendar month, with values in USD, sorted descending by revenue.

  Given my account has no orders in the previous calendar month,
  When the page loads,
  Then I see an empty state message: "No revenue data for [Month].
    Start selling to see your breakdown."
```

## Checklist / Deliverable Structure

1. Problem statement includes: baseline metric, data source, sample size, and affected persona.
2. Success metrics are defined with: specific number, measurement method, and timeframe.
3. Every user story follows "As a [named persona] I want [capability] so that [outcome]" — "so that" is never omitted.
4. Every user story has at least 2 acceptance criteria in Given/When/Then format, including at least 1 edge/error case.
5. All NFRs include a numeric threshold (latency: p95 in ms, uptime: percentage, accessibility: WCAG level + version).
6. Requirements are categorized as Business, Functional, or Non-Functional — no uncategorized requirements.
7. MoSCoW prioritization applied to all functional requirements; Must-haves do not exceed 60% of sprint points.
8. Out-of-Scope section lists at least 3 explicitly deferred capabilities with one-line rationale each.
9. Open Questions section: each question has an owner, a resolution date, and is flagged if blocking a Must-have.
10. Each requirement can be traced to at least one success metric (trace link documented).
11. No requirement uses passive voice — actor and timing are explicit in every statement.
12. Definition of Done checklist is referenced or attached, distinguishing it from story-specific acceptance criteria.
