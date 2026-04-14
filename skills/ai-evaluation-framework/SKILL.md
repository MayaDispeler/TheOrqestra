---
name: ai-evaluation-framework
description: Expert reference for evaluating LLM systems, RAG pipelines, and AI features in production
version: 1.0
---

# AI Evaluation Framework Expert Reference

## Non-Negotiable Standards

1. **No prompt or model change ships without running the full eval suite**: "It looks better" is not a deployment criterion. Every change is measured against a versioned golden dataset before merge.
2. **Eval datasets are versioned alongside prompts**: The eval set that validated v3 of a prompt lives next to that prompt. Deleting or modifying eval examples without a documented reason is forbidden.
3. **Human eval and automated eval are always distinguished**: LLM-as-judge scores are proxies. They require calibration against human judgment (target: >0.8 correlation). Never report only automated scores for a new eval dimension without human validation first.
4. **Eval coverage includes adversarial and edge cases**: A dataset of only happy-path examples is a marketing document, not an evaluation. Minimum 20% of eval examples must be adversarial, edge-case, or out-of-distribution inputs.
5. **Production signals are collected from day one**: User correction rate, regeneration rate, thumbs-down rate — these are ground-truth signals. Any system without production feedback collection is running blind.

---

## Decision Rules

**If** evaluating a RAG system → use RAGAS metrics as baseline: faithfulness >0.8, answer relevancy >0.85, context precision >0.75, context recall >0.7. Scores below threshold require root-cause analysis before deployment.

**If** running LLM-as-judge → use GPT-4o or Claude Opus as judge; define a rubric with 3-5 criteria each scored 1-5; run pairwise comparison (A vs B) for preference evals, pointwise for absolute quality. Agreement with human raters must be measured and >0.8 before trusting the judge.

**If** eval dataset has <50 examples → it is a prototype, not a production eval. Minimum 50 examples for a domain-specific task, 100+ for a general capability, 200+ for safety/guardrail evals.

**If** a prompt change causes >2% regression on any passing metric → block deployment and investigate. Regressions are not acceptable collateral damage from improvements.

**If** building a benchmark for a new task type → construct examples from four categories: (1) typical inputs, (2) edge cases, (3) adversarial inputs, (4) inputs representing known failure modes. Equal representation across categories.

**If** evaluating in production → use shadow mode first: run new prompt/model alongside existing, compare outputs offline before cutover. Never A/B test safety-critical changes.

**If** hallucination is the primary concern → use NLI-based faithfulness scoring (check if each claim in the output is entailed by the source context) + citation accuracy (% of cited sources that actually support the claim).

**Never** use perplexity as a proxy for output quality — it measures fluency, not correctness or helpfulness.

**Never** report only average scores — always report p10, p50, p90 and failure rate (% below threshold). Averages hide tail failures.

**Never** use the training data as the eval set — data leakage produces scores that are meaningless.

---

## Mental Models

**The Evaluation Pyramid**
```
Level 3: Human Eval (ground truth, expensive, slow)
         ↓ calibrate
Level 2: LLM-as-Judge (scalable, cheap, proxy — needs calibration)
         ↓ monitor
Level 1: Automated Metrics (RAGAS, BLEU, exact match — fast, limited)
         ↓ detect anomalies
Level 0: Production Signals (correction rate, regeneration, thumbs down)
```
Each level informs the one above. Production signals tell you where to look. Automated metrics give you fast feedback. LLM-as-judge scales human judgment. Human eval provides ground truth.

**The Eval Coverage Matrix**
Every eval suite must cover:
```
Input Type          | Expected | Edge Case | Adversarial | OOD
--------------------|----------|-----------|-------------|-----
Typical domain      |    ✓     |     ✓     |      ✓      |  ✓
High-stakes output  |    ✓     |     ✓     |      ✓      |  ✓
Known failure modes |    ✓     |     ✓     |      ✓      |  ✓
```

**The Change Impact Decision Tree**
```
Prompt/model change proposed
        ↓
Run full eval suite
        ↓
Any regression >2%? ── Yes ──→ Block. Root cause. Fix or revert.
        │
        No
        ↓
Any improvement >2%? ── No ──→ Change is neutral. Ship only if cost/latency benefit.
        │
        Yes
        ↓
Shadow mode in production (1-5% traffic) for 48h
        ↓
Production signals confirm improvement? ── Yes ──→ Full rollout
                                          No  ──→ Revert, investigate distribution shift
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Faithfulness | % of claims in the generated answer that are supported by the retrieved context |
| Answer relevancy | How well the generated answer addresses the actual question asked |
| Context precision | % of retrieved context chunks that are relevant to the query |
| Context recall | % of required information that is present in the retrieved context |
| LLM-as-judge | Using a capable LLM to score outputs against a rubric — requires human calibration |
| Golden dataset | A versioned, locked set of labeled input/output pairs used for regression testing |
| Shadow mode | Running a new system in parallel with the existing one, comparing offline — no user impact |
| Pairwise eval | Presenting two outputs (A vs B) and asking which is better — reduces position bias |
| Pointwise eval | Scoring a single output against a rubric — faster but higher variance |
| Hallucination | A claim in the output that is not supported by the source context or ground truth |
| RAGAS | Retrieval-Augmented Generation Assessment — framework with faithfulness, relevancy, precision, recall metrics |
| Error budget | The acceptable failure rate; e.g., 5% of evals can fail before blocking deployment |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Shipping on vibes**
- Bad: "I tested it on 5 examples and it looks great. Deploying."
- Fix: Minimum 50 labeled examples run against every change. Pass rate reported with p10/p50/p90. No exceptions.

**Mistake 2: Eval set contamination**
- Bad: Using the same examples to develop and evaluate a prompt — it will score 100% and tell you nothing
- Fix: Strict train/dev/test split. Examples used during prompt iteration go in dev. Test set is held out and touched only for final evaluation.

**Mistake 3: LLM judge with no calibration**
- Bad: Using GPT-4o as judge without ever checking its ratings against humans
- Fix: For every new eval dimension, have 3 humans rate 50 examples. Measure correlation with LLM judge. Below 0.8 = the rubric needs redesign.

**Mistake 4: Average-only reporting**
- Bad: "Our faithfulness score is 0.82 on average."
- Fix: Report distribution: p10=0.61, p50=0.85, p90=0.94, failure rate (below 0.7)=8%. The tail is where production failures live.

**Mistake 5: No production feedback loop**
- Bad: Deploy and forget — no signals on real-world quality
- Fix: Instrument user correction rate (user edits output), regeneration rate (user clicks "try again"), explicit feedback (thumbs). Alert when any metric degrades >15% week-over-week.

---

## Good vs. Bad Output

**BAD eval report:**
> "Tested the new prompt on some examples. Looks better than before. Accuracy improved. Deploying to production."

**GOOD eval report:**
```
Prompt Change: extract_entities_v4 → v5
Dataset: entities_golden_set_v2 (n=120, 20% adversarial)

Metric              | v4 (baseline) | v5        | Delta
--------------------|---------------|-----------|-------
Precision           | 0.847         | 0.891     | +5.2% ✓
Recall              | 0.812         | 0.834     | +2.7% ✓
F1                  | 0.829         | 0.862     | +4.0% ✓
Adversarial pass %  | 61%           | 68%       | +7pp  ✓
Latency p50 (ms)    | 340           | 410       | +20%  ⚠

Regressions: None (0 previously passing examples now failing)
Recommendation: SHIP — improvement is significant; latency increase acceptable
Shadow mode: 48h at 5% traffic before full rollout
```

---

## Evaluation Checklist

- [ ] Golden dataset: ≥50 examples, versioned, includes adversarial/edge cases
- [ ] Eval runs on every prompt/model change before merge
- [ ] Regression threshold defined: any metric drop >2% = block
- [ ] LLM-as-judge calibrated against human raters (>0.8 correlation)
- [ ] Results reported with p10/p50/p90, not average only
- [ ] Failure rate (% below threshold) included in every report
- [ ] Production signals instrumented: correction rate, regeneration rate, feedback
- [ ] Shadow mode used before cutover for significant changes
- [ ] Eval dataset split is clean: dev examples never in test set
- [ ] Hallucination metric included for any factual retrieval task
- [ ] Eval results stored with prompt version for audit trail
- [ ] Weekly production metric review scheduled
