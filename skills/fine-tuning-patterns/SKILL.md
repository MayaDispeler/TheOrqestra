---
name: fine-tuning-patterns
description: Expert reference for LLM fine-tuning decisions, dataset curation, training, and deployment
version: 1.0
---

# Fine-Tuning Patterns Expert Reference

## Non-Negotiable Standards

1. **Fine-tuning requires a baseline eval before starting**: You cannot measure improvement without a baseline. Run your evaluation suite on the base model before fine-tuning. Without this, you cannot prove the fine-tune helped.
2. **Dataset quality beats dataset quantity**: 200 high-quality, diverse, correctly-labeled examples outperform 10,000 scraped examples with label noise. Curate aggressively. Filter ruthlessly.
3. **Fine-tuning is the last resort, not the first**: Exhaust system prompt engineering, few-shot examples, and RAG before fine-tuning. Fine-tuning has a training cost, an ongoing hosting cost, and a maintenance burden. Choose it only when alternatives demonstrably fail.
4. **The eval set is held out from training and never touched during iteration**: Examples used to improve the fine-tune go in the training set. The test set is sealed until final evaluation. Evaluating on training data produces meaningless scores.
5. **Fine-tuned models are versioned and rollback is always possible**: Every fine-tuned model has a version, a training run ID, a dataset version, and a baseline comparison. You must be able to roll back to the previous version within minutes.

---

## Decision Rules

**If** the goal is consistent output format/style → fine-tuning is a strong candidate. System prompts can enforce format but struggle with complex, lengthy, or highly specific structures at scale.

**If** the goal is domain knowledge injection → prefer RAG. Fine-tuning memorizes knowledge from training data but cannot be updated without retraining. RAG is updated by adding documents. Exception: if knowledge is stable and latency/cost of retrieval is prohibitive.

**If** the goal is behavior change (tone, persona, refusal patterns) → fine-tuning is appropriate if the behavior is consistent and can be demonstrated in training examples.

**If** the required dataset is <50 examples → use few-shot prompting, not fine-tuning. 50 examples is a floor; 100-500 is the effective range for style/format; 1,000+ for domain knowledge.

**If** using LoRA/QLoRA → appropriate for: adapting large models (7B-70B) with limited GPU memory; multi-tenant scenarios (one LoRA adapter per client on shared base model); rapid experimentation. Use QLoRA when GPU memory is the binding constraint (4-bit quantized base model + LoRA adapters).

**If** validation loss diverges from training loss after epoch 2 → overfitting. Stop training, reduce epochs, or add more training data diversity. Never continue training past the divergence point.

**If** fine-tuned model shows regression on general capabilities → the dataset lacked diversity. Add general instruction-following examples (10-20% of dataset) to prevent catastrophic forgetting.

**Never** fine-tune on data that contains PII, credentials, or proprietary information without explicit data governance approval and dataset sanitization.

**Never** use the OpenAI fine-tuning API for highly sensitive or regulated data — understand data handling policies before submitting training data to any third-party API.

---

## Mental Models

**The Fine-Tuning Decision Tree**
```
Goal: Improve model behavior for specific task
                ↓
Can system prompt + few-shot examples achieve it?
    ├── YES → Use prompting. Fine-tuning overhead not justified.
    └── NO ↓
Is the knowledge dynamic/frequently updated?
    ├── YES → RAG. Fine-tuning can't be updated without retraining.
    └── NO ↓
Is the dataset curateable (500+ high-quality examples)?
    ├── NO → Collect more data first. Don't fine-tune on insufficient data.
    └── YES ↓
Does cost/latency of prompting at scale justify training cost?
    ├── NO → Prompting is acceptable. Fine-tuning not needed.
    └── YES → Fine-tune.
```

**LoRA vs Full Fine-Tune Decision**
```
GPU memory available for 7B model?
├── >80GB (A100 80GB) → Full fine-tune possible; use for maximum quality
├── 40-80GB → LoRA (rank 16-64) on full-precision base model
├── 16-40GB → QLoRA (4-bit base + LoRA adapters)
└── <16GB → QLoRA with aggressive quantization; consider smaller base model
```

**Dataset Composition Guidelines**
```
Task type                | Min examples | Format          | Diversity requirement
-------------------------|--------------|-----------------|----------------------
Style/format consistency | 100          | Instruction+Output | 20+ distinct input types
Domain Q&A              | 500          | Question+Answer | Cover all sub-domains
Behavior change         | 300          | Instruction+Output | Include edge cases
Classification          | 200/class    | Input+Label     | Balanced + adversarial
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| LoRA | Low-Rank Adaptation — adds small trainable weight matrices to frozen base model layers |
| QLoRA | Quantized LoRA — base model quantized to 4-bit, LoRA adapters in full precision |
| PEFT | Parameter-Efficient Fine-Tuning — umbrella term for LoRA, adapters, prefix tuning |
| Catastrophic forgetting | Fine-tuned model loses general capabilities because training data was too narrow |
| Overfitting | Model memorizes training examples instead of generalizing — val loss rises while train loss falls |
| Instruction tuning | Fine-tuning on instruction-response pairs to improve instruction-following |
| Rank (LoRA) | Dimensionality of LoRA matrices; r=8 minimal, r=64 high-quality; higher = more parameters |
| Epoch | One full pass through the training dataset; 1-3 epochs typical for fine-tuning LLMs |
| RLHF | Reinforcement Learning from Human Feedback — training signal from human preference rankings |
| DPO | Direct Preference Optimization — fine-tuning from preference pairs without separate reward model |
| Adapter | A small set of trainable weights inserted between frozen model layers |
| Merged weights | LoRA adapters mathematically merged into the base model weights for faster inference |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Fine-tuning without a baseline**
- Bad: Fine-tune, test informally, declare success
- Fix: Run eval suite on base model first. Document baseline scores. Fine-tune. Re-run identical eval suite. Report delta. If delta is not meaningful, the fine-tune was not justified.

**Mistake 2: Low-quality scraped training data**
- Bad: Scrape 5,000 examples from the web, fine-tune, wonder why the model learned bad habits
- Fix: Each training example is human-reviewed or filtered by a quality classifier. Bad examples poison the model more than their proportion suggests. Label noise at 10% degrades quality significantly.

**Mistake 3: Forgetting catastrophic forgetting**
- Bad: Fine-tune on 500 narrow domain examples → model loses ability to follow general instructions
- Fix: Include 10-20% general instruction-following examples in the training mix. Run a general capability eval (MT-Bench or similar) before and after fine-tuning.

**Mistake 4: Training beyond the optimal checkpoint**
- Bad: Train for 5 epochs because "more training = better"
- Fix: Monitor validation loss at every epoch. Stop when val loss stops decreasing or begins to increase. Save checkpoint at the lowest val loss, not the last epoch.

**Mistake 5: Ignoring inference cost after fine-tuning**
- Bad: Fine-tune a 70B model for a high-volume, low-complexity task
- Fix: Fine-tune the smallest model that can achieve the quality target. A fine-tuned 7B model often outperforms a prompted 70B model on narrow tasks — at 1/10th the inference cost.

---

## Good vs. Bad Output

**BAD training example (instruction tuning):**
```json
{
  "messages": [
    {"role": "user", "content": "Summarize this."},
    {"role": "assistant", "content": "Here is a summary."}
  ]
}
```
Problems: Input is generic (no actual text to summarize), output is useless, teaches nothing.

**GOOD training example:**
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are a financial document analyst. Summarize earnings call transcripts in 3 bullet points: revenue trend, key risk, and management outlook. Be specific with numbers."
    },
    {
      "role": "user",
      "content": "Q3 2024 earnings call: Revenue grew 18% YoY to $2.4B. Gross margin compressed 200bps to 71% due to infrastructure investment. CEO highlighted AI integration roadmap and raised FY guidance to $9.8B."
    },
    {
      "role": "assistant",
      "content": "• Revenue: +18% YoY to $2.4B, above consensus\n• Risk: Gross margin -200bps to 71% from infra spend — watch Q4 for recovery\n• Outlook: FY guidance raised to $9.8B; AI integration cited as growth driver"
    }
  ]
}
```

---

## Fine-Tuning Checklist

- [ ] Alternatives exhausted: system prompt, few-shot, RAG all evaluated first
- [ ] Baseline eval scores documented before training begins
- [ ] Dataset minimum size met (100+ for style, 500+ for domain, 1K+ for behavior)
- [ ] Each training example human-reviewed or quality-filtered
- [ ] 90/10 train/val split maintained — test set sealed
- [ ] 10-20% general instruction examples included to prevent catastrophic forgetting
- [ ] LoRA rank and training config documented
- [ ] Validation loss monitored per epoch — early stopping at divergence
- [ ] General capability eval (MT-Bench or equivalent) run before and after
- [ ] Fine-tuned model versioned with training run ID and dataset version
- [ ] Rollback to previous model version tested
- [ ] Inference cost comparison: fine-tuned smaller model vs prompted larger model
