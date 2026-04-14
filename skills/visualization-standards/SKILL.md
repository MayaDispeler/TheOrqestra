---
name: visualization-standards
description: Dense reference for designing analytical visualizations — chart selection, data-ink ratio, perceptual accuracy, color standards, and dashboard architecture.
version: 2.0
---

# Visualization Standards

## Mental Models

**The Chart Selection Hierarchy**: What relationship are you showing? → Comparison / Distribution / Composition / Relationship / Flow / Geospatial. Each has a primary chart type. Never choose a chart type for aesthetics or novelty.

**Data-Ink Ratio (Tufte)**: Every pixel of ink must earn its place by encoding data. Gridlines, borders, decorative legends, tick marks, drop shadows, and background fills are overhead. Maximize the ratio of data-ink to total ink. When in doubt, remove an element and check if the chart still communicates the same information — if yes, remove it permanently.

**Preattentive Attributes**: Color, size, position, and shape are processed before conscious thought. Use them to encode the most important dimension. Use them consistently across the entire dashboard. Never use them decoratively (e.g., alternating row colors that encode no data).

**The 5-Second Rule**: A viewer should understand what a chart is saying within 5 seconds without asking questions. If they need to read a legend to understand direction (up = good? bad?), the chart has failed.

**Encoding Hierarchy (Cleveland & McGill accuracy order)**:
1. Position on common scale (most accurate — use for primary variable)
2. Position on non-aligned scale
3. Length
4. Angle / Slope
5. Area
6. Color / Shade (least accurate — use only for secondary categorical encoding)

Encode your most critical variable with the most accurate encoding. Never encode a quantitative variable with area or color alone.

**Gestalt Grouping**: Charts exploit proximity and similarity to group related elements. Items close together or sharing a color are perceived as belonging to the same category. Use this intentionally — and avoid accidental groupings from poor spacing or inconsistent color assignment.

---

## Non-Negotiable Standards

1. **Every chart has a title that states the conclusion, not the topic.**
   - Bad: "Monthly Revenue by Region"
   - Good: "APAC Revenue Overtook EMEA in Q3 2024"

2. **Axes start at zero for bar charts. Always.** A truncated Y-axis on a bar chart is a lie — it exaggerates differences by hiding the true baseline. If the range matters more than the absolute value, switch to a line chart, which does not require a zero baseline.

3. **Color encodes one variable at a time.** Never use color for both category and value simultaneously. Never use rainbow/jet colormaps for sequential data — they introduce false boundaries and are inaccessible to colorblind viewers.

4. **Legends are a last resort.** If you can label data directly on the chart, do so. Legends require eye travel and working memory. A directly-labeled line chart is always preferable to a legend.

5. **Time flows left to right.** Never reverse a time axis. Never use a bar chart for time series with more than 6 time points — use a line chart.

6. **Consistent scales across small multiples.** If you facet a chart, all panels share the same axis range unless you explicitly annotate with "Note: y-axis scales differ."

7. **Show uncertainty when it exists.** If a metric is derived from a sample, experiment, or forecast — show confidence intervals or error bands. A point estimate without uncertainty is a false precision claim.

8. **Colorblind-safe palettes are the default.** Use Okabe-Ito (8-color), ColorBrewer (categorical/sequential/diverging), or Viridis (sequential). Never use red/green as the primary encoding dichotomy — approximately 8% of men have red-green color blindness.

9. **Never use color alone to encode data in a chart.** Always pair color with a second encoding channel: pattern fill, direct label, shape marker, or annotation. This makes charts accessible to colorblind users and readable when printed in grayscale.

---

## Chart Type Selection Decision Tree

**Step 1: What relationship are you showing?**

| Relationship | Primary chart type | Common wrong choice |
|---|---|---|
| Comparing discrete categories | Horizontal bar chart (sorted) | Pie chart, donut |
| Change over continuous time | Line chart | Bar chart with >6 time points |
| Part-to-whole composition | Stacked bar chart | Pie chart with >3 slices |
| Distribution of one variable | Histogram or density plot | Bar chart, pie chart |
| Correlation between two continuous variables | Scatter plot | Line chart |
| Ranked list (top N) | Horizontal bar, sorted descending | Donut, treemap |
| Geospatial data | Choropleth (normalized) or proportional symbol map | Raw count choropleth |
| Flow or transition between states | Sankey diagram | Spaghetti line chart |
| Performance vs target | Bullet chart | Gauge/speedometer |
| Data over many dimensions | Small multiples or heatmap | Spider/radar chart |

**Step 2: Apply these specific rules**

- If comparing >7 categories → group the bottom N into "Other"; no chart communicates well with >7 discrete categories
- If time series has seasonality → annotate seasons on the axis; don't force viewers to infer it
- If scatter plot has >500 points → use hexbin density plot; overplotting hides the distribution
- If showing a ranked list → sort descending by value; never alphabetical unless the task is lookup
- If a bar chart has subcategories → use grouped bars (comparison) or stacked bars (composition), not both in the same chart

**Never:**
- Use 3D charts. They distort all perceptual encodings and add zero information.
- Use a dual-axis chart unless both series share the same unit. Even then, document the scale relationship explicitly with an annotation.
- Use a pie chart with more than 3 slices. Humans cannot accurately judge angles beyond ~3 segments; use a horizontal sorted bar chart instead.
- Use a line chart for a categorical X-axis. Lines imply continuity between points. "North" to "South" is not a continuum.

---

## Color in Visualization

**Categorical palette rules:**
- Maximum 7 distinct colors in a single chart. Beyond 7, viewers cannot reliably distinguish categories — consolidate or use small multiples.
- Assign colors consistently across all charts in a dashboard. If blue = mobile on chart 1, blue must = mobile on every chart. Inconsistent color assignment destroys trust.
- Use Okabe-Ito as the default categorical palette: `#E69F00, #56B4E9, #009E73, #F0E442, #0072B2, #D55E00, #CC79A7` (7 colors, colorblind-safe).
- Reserve red for "bad/error/decrease" and green for "good/success/increase" only if the context is unambiguous AND you add a second encoding (arrow direction, +/- sign).

**Sequential vs diverging palette selection:**
- **Sequential palette** (e.g., Viridis, Blues): use when data has a natural minimum and the magnitude matters. Examples: revenue, count, density. One hue, varying lightness.
- **Diverging palette** (e.g., RdBu, PiYG from ColorBrewer): use when data has a meaningful midpoint (zero, a target, or a neutral baseline) and both directions matter equally. Examples: YoY change (positive/negative), NPS score, temperature anomaly. Two hues meeting at a neutral midpoint.
- Never use a diverging palette when the data has no natural midpoint.
- Never use rainbow/jet — it creates false contours, misleads about gradient speed, and is not colorblind-safe.

**Accessibility rule:**
- Every color encoding must have a second channel. Options: direct data label, pattern fill (hatching), shape marker on line charts, annotation.

---

## Axis Rules

**Bar charts:**
- Y-axis always starts at zero. No exceptions. A truncated bar chart axis is actively misleading.
- If two comparison values are 98% and 99%, use a table or a dot plot — not a bar chart. The visual encoding cannot show a 1% difference without truncating (which is forbidden) or making both bars look identical.

**Line charts:**
- Y-axis does not need to start at zero. The baseline should be chosen to make variation readable.
- Never crop Y-axis to exaggerate a trend. If a line is nearly flat, it is nearly flat — label the scale prominently.
- X-axis time labels: show the minimum number needed for orientation. If data is monthly, label every 3 months, not every month.

**General:**
- Axis labels include units: "Revenue ($M)", "Latency (ms)", "Users (thousands)".
- Avoid scientific notation on axis labels unless the audience is technical and the numbers demand it.
- Remove tick marks when gridlines are present — they are redundant.

---

## Annotation Standards

- **Always annotate significant events** on time-series charts: product launches, outages, policy changes, external shocks. Unlabeled anomalies generate more questions than insights.
- **Format for event annotations**: vertical dashed line + short label above or beside the line. Never a floating text box without a pointer.
- **Annotate the takeaway directly on the chart** when the chart is embedded in a slide or report (not an interactive dashboard). The title states the conclusion; an annotation pin-points where in the chart to look.
- **Use callout annotations for outliers**: if a single data point is an outlier, label it with its value and a brief reason. "Dec 2023: holiday surge (+42%)".
- Annotation text size: minimum 11px (for print/export). Never use annotation text smaller than axis labels.

---

## Dashboard Architecture Standards

**Layer 1 — Executive (top-left and top of page):** 3–5 KPI scorecards. Current value, trend direction arrow, and delta vs prior period. The most important metric goes top-left — this is where eyes land first (F-pattern reading). No interaction required to read this layer.

**Layer 2 — Diagnostic (middle):** 2–4 charts explaining why the KPIs moved. Filterable by key dimensions. These charts answer "what changed?" and "where?".

**Layer 3 — Exploratory (bottom or linked page):** Detail tables, drill-downs, segment breakdowns. Only reached intentionally — should not be visible on initial load of an executive view.

**Layout hierarchy rules:**
- Top-left: most important single number (primary KPI)
- Top row: supporting KPIs, all same size
- Left-to-right reading order maps to analytical priority order
- Charts that compare the same metric across categories belong in the same row (shared context)
- Never put a detail table above a summary chart

**Filter design:**
- Filters apply to the entire page by default.
- Filter controls live at the top-left or top of the page — not scattered inline.
- Default filter state is always explicitly defined and labeled (not "all" silently — state "All regions, All time").
- No more than 5 active filter dimensions on a single dashboard. More than 5 creates a combinatorial explosion that is impossible to reason about.

**Refresh cadence must be visible.** Every dashboard shows "Last updated: [timestamp]" prominently near the top. A viewer who doesn't know the data freshness cannot trust the dashboard.

---

## Common Mistakes

**Mistake: Pie chart with >3 slices**
Humans cannot accurately judge angles beyond ~3 segments. Fix: sorted horizontal bar chart, values labeled directly on bars.

**Mistake: Line chart for categorical X-axis**
Lines imply continuity between points. If the X-axis is a category (product names, regions), the line between "North" and "South" encodes no meaningful relationship. Fix: bar chart.

**Mistake: Raw count choropleth map**
Raw count choropleths favor large geographic areas. California always looks high; Rhode Island always looks low. Fix: normalize. Use rate per capita, per square km, or per relevant denominator.

**Mistake: Overlapping labels / overplotting on scatter plot**
Apply jitter, reduce opacity to 30–50%, or use a hexbin/density chart for datasets over 500 points. Overplotting hides the distribution and creates a false sense of density uniformity.

**Mistake: Inconsistent color meaning across charts**
If blue = mobile on chart 1 and blue = desktop on chart 2, viewers build incorrect mental models. Fix: assign a color palette at the dashboard level and document it. Never reassign colors.

**Mistake: Truncated Y-axis on bar chart**
Starting a bar chart Y-axis at 950 to make bars starting at 952, 961, and 978 look meaningfully different is misleading. Fix: use a dot plot or a table if differences are small and absolute values matter. Use a line chart if trend is the point.

**Mistake: Using color as the only encoding for accessibility**
Red/green status indicators are invisible to 8% of male viewers. Fix: pair color with a symbol (checkmark, X, arrow), text label, or both.

---

## Good vs Bad Output

**Bad title:** "User Signups Over Time"
**Good title:** "New User Signups Declined 18% After Paywall Introduction (Aug 2024)"

**Bad color choice:** Red for decrease, green for increase on a financial dashboard — colorblind users see identical colors.
**Good color choice:** Orange/downward arrow for decrease, blue/upward arrow for increase — shape + color double-encodes the direction.

**Bad chart:** Pie chart with 8 slices, no labels, legend only, 3D perspective.
**Good chart:** Horizontal bar, sorted descending, values labeled on bars, top 5 in primary color, remaining in neutral gray, title states the finding.

**Bad axis:** Y-axis starts at 94% to make a line look dramatic.
**Good axis:** Y-axis starts at 0% with a callout annotation pointing to where the change occurred and labeling the delta.

**Bad dashboard layout:** Detail table at the top, KPI cards buried at the bottom, filters scattered inline.
**Good dashboard layout:** Primary KPI top-left, supporting KPIs across the top row, diagnostic charts in the middle row, detail table accessible via drill-down or bottom section.

---

## Vocabulary

| Term | Meaning |
|------|---------|
| Data-ink ratio | Ratio of ink encoding data vs total ink used; higher is better; remove all non-data ink that does not aid comprehension |
| Small multiples | The same chart type repeated across segments (facets) for direct comparison; all panels share axes |
| Preattentive attribute | Visual property processed before conscious thought (color, position, size, motion) |
| Overplotting | Multiple data points occupying the same visual space, hiding distribution; fix with jitter, opacity, or hexbin |
| Choropleth | Map where regions are colored by a variable value; must be normalized, never raw counts |
| Truncated axis | Y-axis that doesn't start at zero on a bar chart — always misleading, always forbidden |
| Gestalt grouping | Proximity and similarity cues that group chart elements perceptually |
| Sparkline | Miniature line chart embedded inline, without axes, for trend direction only |
| Sequential palette | Single-hue gradient for data with no meaningful midpoint (counts, revenue) |
| Diverging palette | Two-hue gradient meeting at a neutral midpoint; use only when both directions from zero are meaningful |
| Categorical palette | Set of distinct colors for nominal/categorical variables; maximum 7 |
| Hexbin | Aggregated 2D density chart for large scatter datasets; prevents overplotting |
| Data label | Value written directly on a chart element, eliminating the need for a legend |
