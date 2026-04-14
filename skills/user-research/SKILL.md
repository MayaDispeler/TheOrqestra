---
name: user-research
description: User research methods, planning, and synthesis for product teams
version: 1.0
---

# User Research Expert Reference

## Non-Negotiable Standards

1. Research questions drive method selection — never the reverse. Choosing an interview because "we always do interviews" before articulating what you need to learn is method-led, not question-led, and wastes participants' time.
2. Every research engagement has a written research brief before fieldwork begins. The brief names: the decision this research will inform, the research questions, the method, the sample, and the timeline. No brief = no research, only data collection.
3. Observations, interpretations, and recommendations are documented as three distinct layers and never conflated. Mixing them is the most common synthesis failure; it produces opinion that masquerades as evidence.
4. Confirmation bias is treated as a structural risk, not a personal failing. Mitigation is procedural: recruit participants who represent edge cases and non-users, not just happy customers; rotate moderators; review contrary evidence first in synthesis.
5. Quotes are evidence, not findings. A quote supports an insight; it does not constitute one. A finding section made of bullet-pointed quotes is a data dump, not a synthesis.
6. Participant safety and informed consent are non-negotiable regardless of timeline pressure. Participants must know what they are consenting to, how data will be used, and how to withdraw.

## Decision Rules

- If the research question is "what do users need or why do they behave this way?" → use generative methods (JTBD interviews, diary studies, contextual inquiry). Never use a survey to answer a "why" question.
- If the research question is "can users accomplish this task with this design?" → use evaluative methods (usability testing, cognitive walkthrough). Minimum 5 participants per Nielsen's rule; 8 if the population is heterogeneous.
- If the research question is "how many users do X or what is the distribution?" → use quantitative methods (survey n ≥ 30 for descriptive, n ≥ 200 for segmentation analysis, analytics data). Qualitative samples cannot answer frequency questions.
- If you have < 5 usability test participants, do not publish findings — you have not reached the Nielsen threshold for identifying major usability problems (~85% of issues found with 5 users). Add participants or scope the findings explicitly as provisional.
- If a survey question contains the word "would" or "might" (e.g., "Would you use this feature?"), remove it — stated-preference questions are known to overpredict actual behavior by 30-70%.
- If a participant gives a short, unelaborated answer during an interview, follow with "tell me more about that" or "walk me through a recent time that happened" before moving on. Never accept one-word responses as data.
- If a screener question reveals the ideal answer to an eligibility criterion (e.g., "Do you use project management software daily?"), rewrite it as a behavior-neutral question ("How do you currently manage tasks across your team?").
- If synthesis produces fewer than 3 clusters of observations, the clustering grain is too coarse — re-cluster at a finer level. If it produces more than 12, the grain is too fine — look for meta-patterns.
- If a stakeholder asks "what did users say about [specific feature]?" during a findings readout, redirect to the insight layer. Reading back quotes in response to stakeholder questions bypasses synthesis and reinforces HiPPO-driven decisions.
- Never report a JTBD or insight derived from a single participant as a pattern. Patterns require corroboration from at least 3 independent sources.

## Mental Models

**The Three-Layer Synthesis Stack**
Raw research data moves through three distinct layers before becoming actionable: (1) Observation — what literally happened or was said, verbatim and timestamped; (2) Interpretation — what this suggests about user mental models, needs, or friction, grounded in multiple observations; (3) Recommendation — what the product team should do or investigate, tied to an interpretation. Skipping layer 2 produces anecdote-driven decisions. Skipping layer 3 produces academic research that does not drive product outcomes.

**Nielsen's Diminishing Returns Curve**
The first 5 usability test participants reveal ~85% of usability problems. Participants 6-15 reveal the remaining 15% at rapidly diminishing marginal return. This is not a license to always stop at 5 — it is a guide to when to run additional rounds of testing rather than extending a single round. For heterogeneous populations (multiple personas, accessibility needs), run separate 5-participant sessions per segment.

**JTBD Switch Interview Timeline**
The Jobs-to-be-Done switch interview focuses on the moment a user switched to (or decided to adopt) a product. The timeline reconstruction method asks the participant to walk backward from the purchase/adoption decision: What happened the day you decided? What happened the week before? What triggered you to start looking? What did you try first? This technique surfaces the real causal chain of a job, not the post-hoc rationalization users give in standard interviews.

**The Research Repository as Institutional Memory**
Research findings decay in value when stored in slide decks. A structured repository (tagging observations by theme, persona, product area, and date) allows findings to compound over time. The standard tagging schema: method, date, participant ID, product area, insight type (generative/evaluative), and maturity level (hypothesis/validated/superseded). Without a repository, teams run redundant studies and make decisions without access to relevant prior evidence.

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Generative Research | Research designed to discover user needs, mental models, and behaviors before a solution is defined. Methods: JTBD interviews, diary studies, contextual inquiry. |
| Evaluative Research | Research designed to assess a specific design or prototype against user tasks. Methods: usability testing, cognitive walkthrough, first-click testing. |
| Think-Aloud Protocol | An instruction to usability test participants to verbalize their thoughts continuously while interacting with an interface. Concurrent (during task) vs. retrospective (after). Concurrent is more diagnostic. |
| Affinity Mapping | A synthesis method where raw observations are written one-per-card (physical or digital), then collaboratively clustered into themes without pre-defined categories. Clusters are named after clustering, not before. |
| Jobs-to-be-Done (JTBD) | A framework asserting that users "hire" products to make progress toward a goal in a specific context. The "job" is the progress sought, independent of the solution. |
| Screener | A short questionnaire used to qualify or disqualify research participants before recruitment. Must not reveal what "correct" answers are. |
| Recruiting Criteria | The behavioral and contextual attributes (not demographics) that define who can produce valid data for a research question. |
| Insight | A synthesis output that names a non-obvious pattern across observations and explains its significance for the product. Distinct from a quote, observation, or recommendation. |
| Observation | A direct record of what a participant said, did, or expressed — verbatim, timestamped, uninterpreted. |
| Recommendation | A product or design action proposed on the basis of an insight. Must be traceable to at least one insight, which is traceable to at least three observations. |
| Leading Question | A question that suggests a desired or expected answer ("Don't you think it would be easier if...?"). Systematically excluded from interview guides and screeners. |
| Saturation | The point in qualitative data collection at which additional participants produce no new themes. Signals that fieldwork has reached sufficient depth for the current research question. Typically reached at 8-12 participants for a focused research question. |

## Common Mistakes and How to Avoid Them

**Mistake 1: Reporting Quotes as Findings**
- Bad: "Finding: Users said 'I don't know where to find my settings.'" [followed by 6 similar quotes]
- Why: Quotes are raw data. Presenting them as findings skips the synthesis layer. Stakeholders cannot act on a quote; they can act on an insight.
- Fix: "Insight: Users consistently associate account configuration with a profile icon rather than a 'Settings' label — 7 of 8 participants navigated to the avatar first. Recommendation: Rename 'Settings' to 'Account' and place it under the profile avatar in the navigation."

**Mistake 2: Confirmation Bias in Participant Selection**
- Bad: Recruiting from the "power user" or "NPS promoter" segments because they are easy to reach and cooperative.
- Why: Power users systematically differ from median users in mental models, vocabulary, and tolerance for complexity. Research on them validates the current product, not the product's future users.
- Fix: Recruit from the target persona segment defined in the research brief, including non-users and churned users for generative work. Explicitly recruit participants who contradict your current hypothesis.

**Mistake 3: Stated-Preference Survey Questions**
- Bad: "How likely would you be to use a collaborative document feature? (1-5 scale)"
- Why: Stated preference overpredicts actual adoption by 30-70% in product contexts. Users say yes to features they never use. This data drives false confidence in roadmap decisions.
- Fix: Replace with behavioral or revealed-preference questions: "How do you currently share documents for feedback with your team? Walk me through the last time you did that." Or: use a prototype test where participants must actually attempt the task.

**Mistake 4: Undifferentiated Synthesis**
- Bad: Affinity map has 3 clusters: "Positive feedback," "Negative feedback," "Suggestions." All observations sorted into one of three buckets.
- Why: Pre-defined category names impose structure before analysis. Observations get sorted to fit the bucket rather than clustered by genuine thematic similarity. The method produces no new knowledge.
- Fix: Begin affinity mapping with no category names. Write one observation per card. Cluster by similarity without naming. Name clusters only after physical grouping stabilizes. Use the name the data suggests, not the name you expected.

**Mistake 5: Delivering a Data Dump to Stakeholders**
- Bad: 47-slide deck with one participant quote per slide, organized by interview question order, delivered as "research findings."
- Why: Stakeholders optimize for speed. A data dump forces them to do the synthesis themselves — they will not; they will remember the quote that confirmed their prior belief and ignore the rest.
- Fix: Lead with the top 3-5 insights as a one-page executive summary, each linked to a decision implication. Use the appendix for supporting evidence. Spend 80% of the readout on implications and discussion, 20% on method and data.

## Good vs. Bad Output

**Bad Research Finding**
```
Finding: Users are frustrated with the onboarding flow.

"It was really confusing, I didn't know what to do next." — P3
"There were too many steps." — P6
"I almost gave up." — P1
```
Problems: "Frustrated" is an interpretation presented as a raw finding. Three quotes are not a pattern — they are cherry-picked supporting evidence. No insight, no mechanism, no recommendation.

**Good Research Finding**
```
Insight: Users entering the product via the paid acquisition funnel (n=7/8) expect
to see value before being asked to configure their account. The onboarding flow
currently requires 4 configuration steps before any product functionality is
accessible, which conflicts with their mental model of "try first, set up later."

Evidence: 7 of 8 participants attempted to skip or defer Step 2 ("Connect your
calendar"). 5 of 8 verbalized uncertainty about why this step was required before
they could see the dashboard. The one participant who did not attempt to skip had
prior experience with calendar-integrated tools.

Recommendation: Move mandatory configuration steps to a post-first-value
checkpoint. Allow users to access a read-only dashboard view before requiring
calendar connection. Test whether this reduces Step 3 abandonment (current
baseline: 72%).
```

## Checklist / Deliverable Structure

1. Research brief completed before fieldwork: decision being informed, research questions, method, sample criteria, timeline.
2. Screener designed without answer-revealing questions; pilot-tested with one colleague before recruiting.
3. Interview guide structured as: warm-up (2-3 min), context-setting questions (open, behavioral), core task/topic walkthrough, follow-up probes, closing (5 min). No leading questions.
4. Sample size meets method minimums: ≥ 5 per segment for usability testing, ≥ 8-10 for generative interviews, ≥ 30 for surveys.
5. Sessions recorded (with consent) and timestamped notes taken separately from interpretations.
6. Affinity mapping completed with observations written one-per-card; clustering performed before naming.
7. Synthesis outputs separated into three layers: observations (verbatim), insights (patterns + mechanisms), recommendations (product actions).
8. Each insight supported by observations from ≥ 3 independent participants; single-source observations flagged as provisional.
9. Contrary evidence documented: observations that do not fit the dominant patterns are noted, not discarded.
10. Stakeholder deliverable leads with top 3-5 insights and decision implications; raw data in appendix.
11. Research artifacts stored in the team repository with standardized tags: method, date, product area, insight type, maturity.
12. Follow-up research questions identified: what this study did not answer that should inform the next research cycle.
