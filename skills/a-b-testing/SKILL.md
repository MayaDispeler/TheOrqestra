---
name: a-b-testing
description: Experimentation design and A/B testing standards for product teams
version: 1.0
---

# A/B Testing Expert Reference

## Non-Negotiable Standards

1. The Minimum Detectable Effect (MDE) must be calculated and documented before a single user is enrolled. Running an experiment without an MDE is running without a stopping rule — you will stop when the result flatters you.
2. Statistical power must be ≥ 80% (beta ≤ 0.20). Anything lower means you have a greater than 1-in-5 chance of missing a real effect — too high a rate of false negatives for any shipping decision.
3. Confidence level is 95% (alpha = 0.05) for primary metrics. Do not lower it to achieve significance faster; that is p-hacking with extra steps.
4. Never stop an experiment early based on significance. Implement a pre-registered runtime and honor it. Peeking and stopping inflates false positive rates to as high as 26% at alpha = 0.05.
5. Every experiment has exactly one pre-registered primary metric. Multiple primary metrics without correction are multiple comparisons dressed up as a single test.
6. Results are not final until the full pre-registered runtime has elapsed AND the sample size target has been met. A significant result at day 3 of a 14-day experiment is not a result.

## Decision Rules

- If your weekly traffic to the experiment surface is < 1,000 users per variant, do not run an A/B test — you lack the power to detect any practically meaningful effect in a reasonable timeframe; run a qualitative study instead.
- If you have 3+ variants, apply Bonferroni correction: divide alpha by the number of comparisons (e.g., alpha = 0.05 / 3 = 0.0167 per comparison). Never compare 3 variants to control at alpha = 0.05 each.
- If your primary metric is significant but the effect size is below your pre-registered MDE, treat it as a null result — statistical significance at trivial effect sizes is noise amplified by a large sample.
- If any guardrail metric moves negatively with p < 0.10 (one-tailed), halt the experiment and investigate before shipping — guardrails use a more lenient threshold because false negatives here cause harm.
- If you observe significance before the scheduled end date, do not ship. Log it, continue running, and report the final result at the scheduled end.
- If a social feature is involved (sharing, following, messaging), cluster randomization by household or social graph — individual randomization is invalid because treatment can leak to control via social connections.
- If the experiment runs for > 4 weeks, check for novelty effect by plotting the treatment effect over time in weekly cohorts. A decaying treatment effect week-over-week is a novelty signal, not a real effect.
- If MDE < 1% relative change on a conversion metric, reconsider whether the test is worth running — the practical significance threshold for most product metrics is 2-5% relative.
- Never reuse a holdout group for multiple experiments simultaneously — holdout contamination makes long-term measurement uninterpretable.
- If you ship based on a non-significant result (ship-by-default), document it explicitly as "no detected effect" rather than "test passed" — these are not the same claim.

## Mental Models

**The Pre-Registration Contract**
Before enrollment begins, document in writing: hypothesis, primary metric, guardrail metrics, MDE, sample size, runtime, and analysis plan. Changes to any of these after data collection begins are protocol deviations and must be disclosed. Pre-registration is not bureaucracy — it is the mechanism that makes the result credible.

**Power as a Budget**
Statistical power is determined by four variables: alpha, effect size (MDE), sample size, and variance. You control three of them (alpha, sample size, MDE). Set alpha and MDE based on business stakes, then solve for required sample size. Accepting low power to run a faster experiment is borrowing from future decision quality.

**The Two-Error Cost Matrix**
Type I error (false positive): you ship a change that does nothing or causes harm. Cost: wasted engineering, possible user harm, misleading roadmap. Type II error (false negative): you fail to ship a change that would have helped. Cost: missed improvement. The appropriate alpha and power settings depend on which error is more costly in your context. For irreversible changes (pricing, data deletion), use alpha = 0.01.

**Practical vs. Statistical Significance**
Statistical significance answers "could this be noise?" Practical significance answers "is this large enough to matter?" Both gates must be passed to ship. A 0.1% lift in conversion is statistically significant at n = 1,000,000 — it is not a reason to prioritize engineering resources.

## Vocabulary

| Term | Precise Meaning |
|---|---|
| MDE (Minimum Detectable Effect) | The smallest effect size the experiment is designed to detect with the specified power and alpha. Set before enrollment; determines required sample size. |
| Statistical Power (1 - beta) | The probability of correctly rejecting the null hypothesis when the true effect equals the MDE. Standard minimum: 80%. |
| Alpha (significance level) | The maximum acceptable false positive rate. Standard: 0.05 (5%). Lowering alpha reduces false positives but requires larger samples. |
| p-value | The probability of observing this result (or more extreme) if the null hypothesis were true. Not the probability the hypothesis is true. |
| Confidence Interval | The range of effect sizes consistent with the observed data at the specified confidence level. Narrower intervals require more data. |
| Novelty Effect | A temporary treatment effect caused by users' response to change itself, not the change's inherent value. Diagnoses by plotting weekly cohort effects. |
| Guardrail Metric | A metric monitored to prevent harm — not the success criterion. Uses a more sensitive threshold (p < 0.10 one-tailed) to catch regressions early. |
| Holdout Group | A user segment permanently excluded from all experiments during a measurement window, used to measure cumulative long-term effects. |
| Peeking | Checking results and making ship/no-ship decisions before the pre-registered runtime ends. Inflates effective false positive rate to ~26% at alpha = 0.05 with sequential peeking. |
| Bonferroni Correction | Adjusting alpha downward when making multiple comparisons: adjusted alpha = alpha / number of comparisons. Conservative but valid. |
| Network Effect Invalidation | The failure of SUTVA (Stable Unit Treatment Value Assumption) when treatment assignment of one user affects outcomes for other users. Requires cluster randomization. |
| SRM (Sample Ratio Mismatch) | A discrepancy between the expected and observed assignment ratio. A significant SRM (chi-squared p < 0.01) invalidates the experiment — investigate before analyzing results. |

## Common Mistakes and How to Avoid Them

**Mistake 1: Stopping Early on Significance (Peeking)**
- Bad: Running an experiment, checking daily, and shipping when p < 0.05 first appears on day 5 of a planned 14-day run.
- Why: Sequential hypothesis testing at alpha = 0.05 with daily checks inflates the actual false positive rate to ~26%. You are 5x more likely to make a false positive claim than you believe.
- Fix: Pre-register a runtime based on sample size calculation. If early stopping is required by business need, use a sequential testing method (e.g., always-valid inference, mSPRT) designed for it — not naive NHST.

**Mistake 2: No Guardrail Metrics**
- Bad: Experiment primary metric is "checkout conversion rate." Experiment ships at p = 0.03. Revenue per session dropped 8% — noticed 3 weeks post-ship.
- Why: A single metric can be gamed or improved at the expense of system health. Conversion can rise while order value falls.
- Fix: Designate guardrail metrics (revenue per session, support ticket volume, session length) before the experiment starts. Any guardrail regression at p < 0.10 halts analysis and escalates.

**Mistake 3: Running Without an MDE**
- Bad: "We'll run it for 2 weeks and see what happens."
- Why: Without an MDE, you have no principled stopping rule, no way to assess whether the result is practically meaningful, and no way to know if the experiment was underpowered.
- Fix: Calculate MDE from the baseline metric value and the minimum business-relevant lift (e.g., "a 3% relative increase in activation is the smallest change worth shipping"). Use MDE to derive required sample size before launch.

**Mistake 4: Multiple Comparisons Without Correction**
- Bad: Testing 4 variants vs. control, each at alpha = 0.05, and reporting any significant pair as a win.
- Why: With 5 comparisons at alpha = 0.05, the family-wise error rate is 1 - (0.95)^5 = 22.6%. You have a nearly 1-in-4 chance of a false positive somewhere in the result set.
- Fix: Apply Bonferroni correction (alpha_corrected = 0.05 / 5 = 0.01 per comparison) or pre-specify a single primary comparison and treat others as exploratory.

**Mistake 5: Ignoring Sample Ratio Mismatch**
- Bad: Experiment runs; results are analyzed; SRM is never checked. Result is reported as significant.
- Why: An SRM (observed split of 52/48 when 50/50 was assigned) signals a logging bug, bot traffic asymmetry, or assignment mechanism failure. The sample is biased; results are invalid.
- Fix: Check SRM using a chi-squared test (expected vs. observed assignment counts) before any metric analysis. If p < 0.01, investigate and resolve before publishing results.

## Good vs. Bad Output

**Bad Experiment Design Brief**
```
Experiment: New checkout button color (green vs. blue)
Goal: Improve conversions
Runtime: We'll check daily and stop when significant
Metrics: Conversion rate
Sample: Whatever we get
```
Problems: No hypothesis, no MDE, no power calculation, no runtime, no guardrails, peeking baked in as the plan, no sample size target.

**Good Experiment Design Brief**
```
Experiment ID: EXP-2026-041
Hypothesis: Changing the primary CTA color from blue (#1A73E8) to high-contrast
  green (#1B7F3A) will increase checkout initiation rate by ≥ 3% relative,
  because green CTAs showed stronger contrast ratios in our accessibility audit
  and correlate with higher click-through in prior heatmap analysis.

Primary Metric: Checkout initiation rate (clicks on "Proceed to Checkout" / sessions
  reaching cart page)
Baseline: 24.1% (30-day average, n=42,000 sessions/week)
MDE: 3% relative (24.1% → 24.8%)
Guardrail Metrics: Revenue per session (halt if drops > 2%), cart abandonment rate

Assignment Unit: User (logged-in user ID; logged-out by cookie)
Traffic Allocation: 50% control / 50% treatment
Required Sample: 38,400 users per variant (calculated at power=0.80, alpha=0.05,
  two-tailed, using proportion z-test)
Runtime: 14 days (targeting ~42,000 users/variant at current traffic; provides
  buffer above minimum)

Analysis Plan: Two-proportion z-test, two-tailed, alpha=0.05. SRM check
  (chi-squared) before metric analysis. Bonferroni not required (one primary
  comparison). Novelty effect check: plot daily conversion rate by cohort.

Decision Rule:
  - p < 0.05 AND lift ≥ MDE (3% relative) AND no guardrail regression → Ship
  - p < 0.05 AND lift < MDE → No ship (trivial effect)
  - Any guardrail metric regression at p < 0.10 → Halt and investigate
  - p ≥ 0.05 → No detected effect; document and move on
```

## Checklist / Deliverable Structure

1. Hypothesis written in falsifiable form: "Changing X will increase Y by Z% because [mechanism]."
2. Primary metric is a single, pre-registered metric with a documented baseline value and data source.
3. MDE calculated and documented: minimum business-relevant lift converted to absolute metric change.
4. Sample size calculated from: baseline rate, MDE, alpha = 0.05, power = 0.80. Formula or tool cited.
5. Runtime pre-registered in days, derived from required sample size divided by observed weekly traffic — not chosen arbitrarily.
6. Guardrail metrics listed with specific halt thresholds (e.g., p < 0.10 one-tailed, or absolute floor).
7. Assignment unit specified (user ID, session, device) and justified relative to the feature being tested.
8. SRM check documented as a pre-analysis step with threshold (chi-squared p < 0.01).
9. Multiple comparison correction applied if > 1 variant or > 1 primary metric — method named (Bonferroni, Holm, etc.).
10. Decision rules written out in explicit if/then form covering all four quadrants: sig+practical, sig+trivial, guardrail regression, not significant.
11. Novelty effect monitoring plan included if runtime > 7 days or feature is highly visible.
12. Post-experiment write-up includes: result, confidence interval, observed vs. expected effect, decision made, and link to analysis code/notebook.
