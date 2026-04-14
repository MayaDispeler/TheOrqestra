---
name: presentation-standards
description: Expert reference for designing and structuring high-stakes business presentations
version: 1.0
---

# Presentation Standards Expert Reference

## Non-Negotiable Standards

1. **Every slide has one claim, stated in the title**: The title is not a topic label ("Q3 Revenue") — it is a declarative sentence with a point of view ("Q3 Revenue Missed Plan Due to EMEA Churn"). If you can't write a declarative title, the slide has no point and should be cut.
2. **The SCR structure governs all narrative decks**: Situation → Complication → Resolution. The audience must be able to answer all three within the first 3 slides. Decks that bury the resolution are theater, not communication.
3. **Data is never raw**: Every chart requires a data label, a source, and a "so what" — either in the title, in an annotation, or in a call-out. A chart without a stated conclusion forces the audience to do the analyst's job.
4. **Visual hierarchy before aesthetics**: Alignment, contrast, proximity, and repetition (CARP principles) are load-bearing. Color palettes and font choices are secondary.
5. **Slides are not speaker notes**: If a slide only makes sense when someone is talking over it, it is a prop. If it needs to stand alone (leave-behind, async deck), every slide must be self-sufficient.

---

## Decision Rules

**If** the presentation is >10 slides → write an executive summary slide (2–3 bullets, each a complete sentence, each a distinct point) that precedes the body.

**If** a chart has more than 5 data series → reduce, aggregate, or split into multiple charts. Visual overload destroys the signal.

**If** the audience is C-suite → lead with the implication, not the analysis. Bottom line up front (BLUF). Background and methodology go in the appendix.

**If** the audience is technical → methodology slides belong in the body, not the appendix. Credibility requires showing the work.

**If** a slide is being used to deliver bad news → state the fact first, then the context, then the path forward. Never bury bad news between positive slides.

**If** the deck will be read async (emailed, shared in Slack) → remove all builds/animations and ensure every slide is self-contained with complete sentences, not fragments.

**Never** use a pie chart for more than 4 categories or when differences between slices are <10% — use a bar chart.

**Never** place text in a font smaller than 18pt in a slide deck intended for live presentation.

**Never** use default PowerPoint/Keynote/Slides color themes in a client-facing deliverable. Brand standards or a minimal neutral palette only.

**Never** include a table with more than 6 columns without highlighting or reducing to the key comparison dimension.

---

## Mental Models

**The Pyramid Principle (Minto)**
Conclusion first, supporting arguments beneath it, supporting data beneath those. The audience should be able to stop reading at any level and still have a complete (if less detailed) understanding.

```
[Main Conclusion]
    ├── [Argument 1]
    │       ├── [Evidence 1a]
    │       └── [Evidence 1b]
    ├── [Argument 2]
    │       └── [Evidence 2a]
    └── [Argument 3]
```

**The Slide as a Memo**
Every slide = headline + evidence + implication. If any of the three is missing, the slide is incomplete.

**The 3-Second Rule**
An audience member should be able to identify the single key takeaway within 3 seconds of a slide appearing. If that's not possible due to complexity, the slide needs to be simplified or split.

**Assertion-Evidence Structure**
- Assertion: A complete declarative sentence in the title
- Evidence: A visual (chart, diagram, photo) or data table supporting it
- Not: A label ("Sales Data") followed by a chart with no title-level claim

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| SCR | Situation-Complication-Resolution narrative structure |
| BLUF | Bottom Line Up Front — lead with the conclusion |
| Deck | Full slide presentation (as opposed to single slide) |
| Storyboard | Slide-by-slide outline with headline assertions only, no visuals |
| Ghost deck | Skeleton deck with titles and placeholders, no content |
| Leave-behind | Deck designed to be read without presenter narration |
| Assertion | A declarative sentence that makes a claim (the slide title) |
| Annotation | Text directly on a chart calling out a key data point |
| Callout box | Visually distinct container highlighting a key metric or quote |
| Appendix | Supporting slides not in the main narrative flow |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Topic labels as slide titles**
- Bad: `"Customer Acquisition Costs"`
- Fix: `"Customer Acquisition Cost Rose 34% YoY, Driven by Paid Social"`
- Rule: The title must make the reader unnecessary to show up for the next slide

**Mistake 2: The data dump slide**
- Bad: A table with 12 rows × 8 columns, no highlights, no annotation
- Fix: Pull the 2–3 most important data points into a summary callout; move the full table to the appendix

**Mistake 3: Narrative-free appendix**
- Bad: Appendix slides with no context, no titles, no connection to the body
- Fix: Each appendix slide gets a title that references where it supports ("Detail on Slide 7: Regional Revenue Breakdown")

**Mistake 4: Bullet soup**
- Bad: 8 bullet points, 12 words each, all the same weight
- Fix: Maximum 3 bullets per slide; each bullet is a complete sentence with a distinct point; use hierarchy (bold key phrase + supporting detail) not flat lists

**Mistake 5: Animation as decoration**
- Bad: Fly-in, spin, and bounce animations throughout
- Fix: Animation is only acceptable for: (1) sequencing reveals to control information pacing, (2) showing process flow. No decorative animation.

---

## Good vs. Bad Output

**BAD slide:**
```
Title: Revenue

• Revenue was up in Q1
• Some regions performed well
• There were challenges in EMEA
• Marketing spend increased
• We expect Q2 to be better
```

**GOOD slide:**
```
Title: Q1 Revenue Beat Plan by 8%, But EMEA Decline Threatens Q2 Target

[Bar chart: Q1 actual vs. plan by region, EMEA bar highlighted in red]
[Annotation on EMEA bar: "-22% vs plan; churn spike in Feb"]

Key takeaway callout: "Americas and APAC offset EMEA shortfall in Q1;
EMEA recovery plan needed before Q2 close to meet full-year target."
```

---

## Slide-by-Slide Checklist

- [ ] Title is a declarative assertion, not a topic label
- [ ] One main visual or data element per slide
- [ ] Chart has: title, axis labels, data source, and annotation of key insight
- [ ] Font ≥18pt for all body text in live-presentation decks
- [ ] No more than 3 bullets; each is a complete sentence
- [ ] Color is used functionally (highlight = meaning) not decoratively
- [ ] Executive summary slide present if deck >10 slides
- [ ] Appendix slides titled with reference back to body slide
- [ ] Slide works standalone (no orphaned "as you can see here" references)
- [ ] Bad news delivered BLUF, not sandwiched between positive slides
