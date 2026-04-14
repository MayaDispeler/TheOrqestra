---
name: customer-journey-mapping
description: Expert reference for building and analyzing customer journey maps — touchpoints, emotional arcs, friction diagnosis, and actionable insight extraction.
version: 1.0.0
---

# Customer Journey Mapping — Expert Reference

## Core Philosophy

A journey map is a diagnostic instrument, not a decoration. Its only purpose is to expose gaps between what the business believes happens and what customers actually experience. If a map doesn't generate prioritized action items, it failed.

---

## Non-Negotiable Standards

1. **Ground every stage in observed behavior, not assumed intent.** Data sources must include: session recordings, support tickets, NPS verbatims, sales call transcripts, or ethnographic research. Opinion is not data.
2. **Map one persona per journey.** Blended personas produce blended maps that accurately describe nobody.
3. **Include the emotional arc.** Cognitive steps without emotional valence miss the actual decision levers.
4. **Capture backstage processes.** Every customer touchpoint has a corresponding internal system, team, or policy responsible for it. Name them explicitly.
5. **Define the scope boundary explicitly.** State where the journey starts (trigger event) and where it ends (outcome achieved or abandoned). Scope drift is the most common failure mode.
6. **Friction and delight must be specific.** "Checkout is confusing" is not a finding. "Users abandon at the promo code field because error messages don't indicate the code has expired" is a finding.
7. **Every map must produce a ranked issue backlog.** Impact × frequency × fixability scoring is the minimum.

---

## Decision Rules

- **If** you have fewer than 5 real customer interviews for a stage, **then** mark that stage as "hypothesis" and flag it for validation before acting on it.
- **If** the emotional arc stays flat across all stages, **then** you haven't gone deep enough — no real journey is emotionally neutral.
- **If** a touchpoint has no clear owner (team/system), **then** that touchpoint will never improve — assign ownership before the map is final.
- **If** two personas diverge significantly at any stage, **then** split them into separate maps rather than averaging behavior.
- **If** a pain point appears in both the journey map and the top 3 support ticket categories, **then** it is high-confidence and should be prioritized immediately.
- **Never** map the journey you wish customers took. Map the journey they actually take, including workarounds, detours, and abandonment paths.
- **Never** present a journey map without a recommended action per friction point.
- **Never** conflate channel (email, app, store) with stage (awareness, consideration, purchase). Channels are delivery mechanisms; stages are progress markers.

---

## Common Mistakes and Exact Fixes

| Mistake | Why It Fails | Fix |
|---|---|---|
| Using marketing funnel stages (TOFU/MOFU/BOFU) as journey stages | Funnel stages describe volume flow, not customer experience | Use customer-language stages: "Realizes problem," "Researches options," "Evaluates alternatives," "Commits," "Onboards," "Gets value," "Renews or leaves" |
| Mapping only the happy path | Hides 60–80% of actual experience | Explicitly map the 2–3 most common failure paths as alternate lanes |
| Treating NPS score as emotional data | NPS is an outcome metric, not an emotional signal | Use verbatim quotes, sentiment-coded support transcripts, and reaction testing |
| One-size touchpoint lists | Buries signal in noise | Distinguish high-frequency/low-stakes touchpoints from low-frequency/high-stakes ones; weight accordingly |
| Map created by one team in isolation | Produces internal assumptions dressed as customer insight | Require at least one cross-functional review with Sales, Support, and Product before finalizing |
| Mixing B2B buying committee roles into one persona | Enterprise purchases have 6–10 stakeholders with conflicting priorities | Map economic buyer, technical evaluator, and end user separately for B2B |

---

## Vocabulary and Mental Models

**Moments of Truth** — High-stakes interactions where the customer forms or revises a lasting opinion. There are 1–3 per journey. Everything else is supporting context.

**Jobs-to-be-Done (JTBD)** — The underlying progress a customer is trying to make. The journey map shows *how* they pursue the job; JTBD defines *what* the job is. Always anchor the map to a JTBD statement.

**Backstage / Frontstage** — Frontstage: what the customer sees and interacts with. Backstage: internal processes that produce that experience. Good maps show both and draw the line of visibility.

**Emotional Arc** — The pattern of highs and lows across stages. Typical patterns: roller coaster (alternating), descent (eroding confidence), canyon (one catastrophic dip), plateau (numb/disengaged).

**Opportunity Space** — Gaps between customer expectation (what they need at a stage) and current experience (what they get). The larger the gap at a high-stakes stage, the higher the opportunity.

**Swim Lane** — A horizontal row in the map representing one data type: actions, thoughts, emotions, touchpoints, systems, pain points, opportunities. Minimum viable map has 5 swim lanes.

**Service Blueprint** — An extended journey map that adds employee actions, support processes, and backend systems. Use when diagnosing operational failure, not just UX friction.

---

## Good Output vs. Bad Output

### Bad
> **Stage: Onboarding**
> Customers sign up and start using the product. They may feel confused at first but eventually figure it out. We should make the onboarding better.

### Good
> **Stage: Onboarding (Day 0–7)**
> **Customer actions:** Creates account → receives welcome email → attempts first core action (create project) → hits permission error on team invite → searches help docs → submits support ticket or abandons
> **Emotional arc:** Hopeful (signup) → Uncertain (first login, unfamiliar UI) → Frustrated (permission block, Day 1) → Disengaged (Day 3 if unresolved)
> **Backstage:** Permission defaults set by Engineering in 2021, not revisited; help docs owned by Marketing, last updated 14 months ago; no proactive outreach triggered by support ticket
> **Friction point (High/High):** Team invite permission error — appears in 34% of onboarding support tickets, blocks the collaboration use case that drives retention
> **Owner:** Product (permission default), Support (proactive outreach trigger)
> **Recommended action:** Change default permission to Editor; add in-app tooltip; trigger CSM outreach if invite fails within 48h

---

## Deliverable Checklist

- [ ] Scope defined (trigger → outcome)
- [ ] Single persona with research backing
- [ ] Minimum 5 swim lanes
- [ ] Emotional arc plotted with evidence
- [ ] Backstage processes named with owners
- [ ] Failure paths included
- [ ] Moments of truth identified
- [ ] Friction points scored (impact × frequency)
- [ ] Ranked action backlog with owners
- [ ] Validation gaps flagged
