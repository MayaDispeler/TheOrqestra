---
name: market-segmentation
description: Expert reference for market segmentation analysis, strategy, and output standards
version: 1.0
---

# Market Segmentation Expert Reference

## Non-Negotiable Standards

1. **Every segment must be MADS-validated**: Measurable, Accessible, Differentiable, Substantial. Reject any segment that fails one criterion — don't soften or footnote the failure.
2. **Segmentation basis must be declared upfront**: Geographic, Demographic, Psychographic, Behavioral, Firmographic (B2B), or Needs-based. Never mix bases without explicit rationale.
3. **Size precedes attractiveness**: Quantify TAM/SAM/SOM for each segment before discussing fit or strategy. Unitless segments are opinions, not analysis.
4. **Primary and secondary data must be distinguished**: Survey-derived insight ≠ census data ≠ analyst estimate. Label each data source and its vintage.
5. **Segment profiles require a "jobs-to-be-done" anchor**: Demographics describe who; JTBD describes why they buy. Both are mandatory.

---

## Decision Rules

**If** segmenting a B2B market → use firmographic + behavioral bases first (company size, industry vertical, buying stage, tech stack); add psychographic only as tertiary color.

**If** segment size is unknown → state it as a constraint, estimate with named assumptions, and flag confidence level (low/medium/high). Never omit size to avoid difficulty.

**If** two segments share >70% of their defining attributes → collapse them or justify separation with distinct willingness-to-pay or channel behavior.

**If** a client asks for "more segments" → push back. More segments ≠ more precision. The right number is the minimum required to make distinct go-to-market decisions.

**If** using survey data → weight responses by purchase authority, not just respondent count. A buyer's response is worth more than a user's.

**Never** define segments by product feature preference alone — that is product analytics, not market segmentation.

**Never** present a segmentation without a "so what" per segment: which ones to pursue (prioritized), which to ignore, and why.

**Never** use revenue deciles as a segmentation framework — it describes historical behavior, not a market structure.

---

## Mental Models

**The Segmentation Ladder**
```
Level 0: No segmentation (one-size-fits-all)
Level 1: Demographic / firmographic splits
Level 2: Behavioral / usage-pattern splits
Level 3: Needs-based / attitudinal splits  ← gold standard
Level 4: Individual-level personalization (not segmentation)
```
Most organizations are at Level 1–2. Mature go-to-market requires Level 3.

**The Segment Attractiveness Matrix**
Axes: Segment Size × Strategic Fit. Four quadrants:
- Large + High Fit → Core (invest)
- Large + Low Fit → Adjacent (evaluate)
- Small + High Fit → Niche (nurture or ignore)
- Small + Low Fit → Avoid

**Behavioral vs. Attitudinal Segmentation**
- Behavioral: what customers *do* (purchase frequency, channel, category switching)
- Attitudinal: what customers *believe* (price sensitivity, brand trust, risk tolerance)
Use behavioral to identify; use attitudinal to explain.

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| TAM | Total Addressable Market — 100% category spend if you had 100% share |
| SAM | Serviceable Addressable Market — portion you can reach with current model |
| SOM | Serviceable Obtainable Market — realistic near-term capture |
| Segment | A group with homogeneous needs and heterogeneous needs vs. other groups |
| Persona | A narrative archetype of a segment member — illustrative, not definitional |
| Beachhead | The single segment chosen for initial market entry focus |
| Whitespace | Unaddressed need within a segment no competitor currently serves |
| CLV | Customer Lifetime Value — used to prioritize segment investment |
| Churn cohort | Behavioral segment defined by exit timing and exit reason |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Demographic proxy for needs**
- Bad: "Women 25–34 are our segment"
- Why it's wrong: Demographics describe people, not problems
- Fix: "Primary caregivers (skew female 25–34) seeking time-efficient nutrition decisions" — need is the anchor

**Mistake 2: Segment overlap without resolution**
- Bad: A customer appears in 2 segments with no tie-breaking rule
- Fix: Define a primary segmentation variable that creates mutually exclusive buckets; secondary variables enrich but don't reassign

**Mistake 3: Conflating segment with channel**
- Bad: "Our Amazon segment vs. our DTC segment"
- Fix: Channel is a reach mechanism, not a segment. The same person buying via two channels is one person with one need profile.

**Mistake 4: Skipping the "serve" decision**
- Bad: Listing 6 segments with no recommendation
- Fix: Every segmentation output must end with a prioritized pursuit list: Tier 1 (now), Tier 2 (next), Not pursued (why)

**Mistake 5: Undated market data**
- Bad: "The market is 45M households"
- Fix: "45M households (U.S. Census 2023 ACS, 1-person+ households with annual income >$75K)"

---

## Good vs. Bad Output

**BAD segment definition:**
> "Tech-savvy millennials who value sustainability and shop online"

Problems: Vague size, three unranked attributes, no JTBD, no measurability.

**GOOD segment definition:**
> **Segment: Eco-Conscious Remote Professionals**
> - Size: ~8.2M U.S. adults (Ipsos 2024; WFH 3+ days/week + household income >$90K + demonstrated sustainability purchase behavior in 12 months)
> - Core JTBD: Reduce personal carbon footprint without lifestyle sacrifice
> - Behavioral marker: Pays 15–25% premium for certified sustainable products; researches purchase >3 touchpoints
> - Differentiation from adjacent: Unlike "budget eco-buyers," price is not the primary barrier — trust and convenience are
> - Go-to-market implication: Content-led acquisition, DTC or specialty retail; price premium sustainable up to ~30%

---

## Deliverable Structure (Standard)

1. Segmentation basis declaration + rationale
2. Segment inventory (all viable segments, sized)
3. Segment profiles (JTBD, behavioral markers, demographics, CLV estimate)
4. Attractiveness scoring matrix
5. Prioritization recommendation with rationale
6. Implications for product, pricing, channel, and message (one sentence per segment per dimension)
