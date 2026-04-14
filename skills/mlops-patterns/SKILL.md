---
name: mlops-patterns
description: Expert reference for MLOps — model lifecycle management, CI/CD for ML, feature stores, training pipelines, serving infrastructure, drift detection, retraining triggers, and production reliability for ML systems
version: 2.0.0
---

# MLOps Patterns — Expert Reference

## Non-Negotiable Standards

- **ML code is software**: apply the same engineering rigor as any production system — version control, code review, testing, CI/CD; "research code" has no place in production
- **Reproducibility is mandatory**: every experiment must be reproducible from code version + data version + hyperparameters + random seed; if you can't reproduce a result, you can't trust it or debug it
- **Data is the product**: model quality is bounded by data quality; invest in data validation, lineage tracking, and freshness monitoring before model complexity
- **Monitor training, serving, and business metrics**: a model can be technically healthy (no errors, no latency spike) while silently degrading on business outcomes; monitor all three layers from day 1
- **Automate the full lifecycle**: manual model deploys, manual retraining triggers, and manual data pipelines are operational time bombs waiting for the on-call rotation to become inadequate
- **Separate concerns strictly**: feature engineering belongs in the feature store, not the training notebook; preprocessing logic belongs shared between training and serving — never duplicated

---

## Decision Rules

**Experiment tracking:**
- If running any experiment → log: run ID, git commit hash, dataset version, all hyperparameters, train/val/test metrics, system info; use MLflow, W&B, or Comet; never use ad-hoc naming conventions or notebook filenames
- If comparing experiments → compare on held-out test set, same data split, same evaluation metric; never cherry-pick based on validation performance
- If a model is selected for production → tag the winning run in the model registry, document the selection rationale, record the champion metric at promotion time

**Feature engineering:**
- If features are shared across models → define them once in a feature store (Feast, Tecton, Hopsworks); never duplicate feature transformation logic across training pipelines
- If serving features online → pre-compute and cache in a low-latency store (Redis, DynamoDB); never recompute aggregations at inference time
- If there is a training-serving skew risk → share the same transformation code object for both training and serving; never re-implement transformations in the serving layer from memory or documentation
- If features depend on time → point-in-time correct joins are mandatory; a single look-ahead leak invalidates the entire model and all metrics derived from it

**Training pipelines:**
- If training takes >30 minutes → checkpoint regularly; allow resume from checkpoint, not full restart
- If dataset is large → sample stratified for initial iteration; train on full data only after the approach is validated on the sample
- If class imbalance exists → measure it before assuming it's a problem; report precision/recall/F1 and ROC-AUC, not accuracy; apply class weights, threshold tuning, or SMOTE based on business cost of FP vs FN
- If using a pretrained model → fine-tune on your domain data; never ship a generic foundation model for a domain-specific task without task-specific validation

**Model serving:**
- If latency SLO < 100ms → serve with batch size 1; dynamic batching helps throughput, not single-request latency
- If throughput matters more than latency → dynamic batching (TorchServe, Triton, vLLM); tune batch timeout and max batch size against your actual traffic distribution
- If model size > 1GB → apply quantization (INT8 or INT4) or distillation before scaling infrastructure; don't add GPUs before optimizing the model
- If serving multiple model versions → canary deploy: 5% → 20% → 100% with automatic rollback on metric degradation
- If inference is slow despite small model size → profile first; tokenization, image decode, and pre/postprocessing are frequently the bottleneck, not the model forward pass

**Drift and monitoring:**
- If deploying a model → define input drift, prediction drift, and business proxy monitors before go-live; not after the first incident
- If data drift is detected → investigate before retraining; drift is a symptom; the cause could be an upstream pipeline change, schema change, or genuine distribution shift — retraining fixes only the last one
- If model performance degrades → check in order: data pipeline changes, feature store staleness, schema changes, label quality changes, then consider retraining
- If ground truth labels lag by days/weeks → use proxy metrics (click-through, conversion, return rate) for early warning; calibrate proxy against ground truth periodically to maintain signal validity

**Deployment and rollback:**
- If deploying a new model → shadow mode first (run in parallel, log predictions, don't serve them); then A/B test with real traffic; then full rollout — never skip shadow mode for a model with significant behavior change
- If a model needs rollback → it must be possible in <5 minutes; pre-stage the previous model version; test rollback procedure in staging before production promotion
- If multiple models share a serving endpoint → version the API (`/v1/predict`, `/v2/predict`); never break downstream consumers with a silent model swap

---

## Common Mistakes and How to Avoid Them

| Mistake | Symptom | Fix |
|---|---|---|
| Data leakage via time | Model metrics unrealistically optimistic; production performance collapses | Point-in-time correct joins with `.shift(1)` before rolling windows |
| Training-serving skew | Production predictions diverge from offline eval | Serialize and load the same scaler/encoder object in both training and serving |
| Evaluating only accuracy on imbalanced classes | 98% accuracy on 1% fraud data; model predicts "not fraud" always | `classification_report`, ROC-AUC, precision-recall curve; tune threshold |
| No dataset versioning | Can't reproduce experiments; can't diagnose regressions | DVC, Delta Lake, or at minimum hash + log dataset snapshot per run |
| Retraining without gating | Bad retrain auto-promoted; production degrades silently | Champion/challenger comparison gate; canary before full rollout |
| Monitoring only system health | Model degrades silently; nobody notices until sales asks about conversion | PSI on features, KS test on predictions, business proxy metric — all three |
| Feature store not used for online serving | Training-serving skew at the aggregation layer | Online store (Redis) fed by the same pipelines as the offline store |
| No point-in-time correctness | Future data leaks into training features | Sort by time; `.shift(1)` before rolling windows; validate with temporal holdout |

---

## Good vs Bad Output

**BAD — experiment workflow:**
```
1. Train model in Jupyter notebook
2. Print final accuracy: 0.89
3. Copy model.pkl to prod server via scp
4. Six weeks later: "model is wrong but we don't know which version is running or on what data"
```

**GOOD — experiment workflow:**
```
1. git checkout -b experiment/xgb-churn-v2
2. dvc pull  (fetches versioned dataset snapshot)
3. python train.py --config configs/xgb_v2.yaml
   → MLflow auto-logs: commit=a3f8c2, dataset=v7, params={...}, metrics={auc: 0.847}
4. python evaluate.py --run-id <id> --compare-to champion
   → Challenger AUC 0.847 vs Champion AUC 0.831. Significant at p<0.05. ✓
5. mlflow models register --name churn-model --run-id <id> --stage Staging
6. Deploy to shadow: serve alongside champion, log both predictions for 48h
7. Shadow shows alignment; no distribution anomalies detected
8. Canary: 10% traffic → 24h stable → 100%
9. Previous version retained in registry for 30-day rollback window
```

---

**BAD — training-serving skew:**
```python
# Training:
scaler = StandardScaler()
X_train = scaler.fit_transform(df[features])
model.fit(X_train, y_train)

# Serving (reimplemented from memory):
def preprocess(request):
    return (request['value'] - 42.3) / 11.7  # hardcoded from a Slack message
```

**GOOD — shared transformation artifact:**
```python
# Training:
scaler = StandardScaler()
X_train = scaler.fit_transform(df[features])
model.fit(X_train, y_train)
joblib.dump(scaler, artifacts_dir / "scaler.pkl")  # versioned alongside model weights

# Serving:
scaler = joblib.load(artifacts_dir / "scaler.pkl")  # same object, no reimplementation
def preprocess(request):
    return scaler.transform([[request['value']]])
```

---

**BAD — drift monitoring:**
```python
# "We'll set up monitoring after launch"
# Three months later: model silently degrading,
# nobody notices until the sales team asks why conversion dropped 15%
```

**GOOD — drift monitoring at launch:**
```python
monitors = {
    "input_drift": PSIMonitor(
        features=CRITICAL_FEATURES,
        threshold=0.2,          # >0.2 = significant drift, investigate
        window_days=7
    ),
    "prediction_drift": KSTestMonitor(
        threshold=0.05,
        window_days=7
    ),
    "business_proxy": ConversionRateMonitor(
        baseline_period="previous_30_days",
        alert_threshold=0.15    # 15% relative drop triggers alert
    ),
    "data_freshness": FeatureFreshnessMonitor(
        max_lag_hours=4         # feature store must be updated within 4h
    ),
}
# All alerts route to PagerDuty with runbook link
```

---

**BAD — retraining pipeline:**
```bash
# Cron job retrains and deploys with no gating
0 2 * * * python train.py && python deploy.py
```

**GOOD — gated retraining pipeline:**
```
train.py
  → validate_data.py        (schema checks, null rates, distribution assertions)
  → train.py                (checkpointed, reproducible)
  → evaluate.py             (challenger vs champion on held-out test set)
    → if challenger AUC > champion + 0.005 AND p < 0.05:
      deploy_canary.py      (5% traffic)
      monitor_canary.py     (24h soak: drift + business proxy)
      → if metrics stable:
          deploy_full.py    (100% traffic)
          archive_champion.py (retain for 30 days)
      → else:
          rollback.py       (auto-revert, page on-call)
    → else:
        notify.py           ("Challenger did not beat champion. No deploy.")
```

---

## Vocabulary and Mental Models

**Training-Serving Skew**: Divergence between how features are computed at training time versus serving time. The most common silent failure in production ML. Solved by sharing transformation objects (serialized scalers, encoders), not documentation about what those objects do.

**Point-in-Time Correctness**: When joining features to labels, each feature value must reflect only information available at the moment of prediction — no future data. A single look-ahead leak inflates offline metrics and produces a model that cannot generalize. Always sort by time, `.shift(1)` before rolling windows, and validate with a temporal holdout (not random split).

**Champion/Challenger**: Production pattern where the current best model (champion) is compared against a candidate (challenger) using live traffic or held-out evaluation. Challenger must beat champion on both statistical metrics and business metrics before promotion.

**Concept Drift vs Data Drift**: Data drift = input distribution changed (new customer segment, seasonal shift). Concept drift = relationship between features and labels changed (user behavior changed after product redesign). Data drift is detectable without labels via PSI/KS test. Concept drift requires ground truth labels and lags by the label delay.

**Feature Store**: Centralized repository for computed features with consistent definitions. Provides: (1) consistency between training and serving, (2) reuse across models, (3) point-in-time retrieval for training. Offline store (batch retrieval, e.g., S3/Parquet) + online store (low-latency, e.g., Redis). The offline and online stores must be fed by the same pipeline.

**Shadow Mode (Dark Launch)**: New model receives real production traffic and makes predictions, but predictions are not returned to users. Used to validate behavior, latency, and prediction distribution before any user exposure. Required before A/B testing any model with significant behavior change.

**Label Lag**: Delay between model prediction and availability of ground truth label. Fraud: hours to days. Churn: weeks to months. Determines how quickly you can detect model degradation and sets a floor on retraining frequency. High label lag requires proxy metrics for early warning.

**PSI (Population Stability Index)**: Measures distribution shift between two datasets. PSI < 0.1 = no shift. 0.1–0.2 = moderate, investigate. >0.2 = significant, retraining likely needed. Apply to input features weekly in production.

**MLflow Model Registry**: Tracks model versions with lifecycle stages: None → Staging → Production → Archived. Provides governance: who promoted the model, when, based on what metrics. Every production model must have a registered version — no bare `.pkl` files on servers.

**ONNX (Open Neural Network Exchange)**: Framework-agnostic model format. Convert PyTorch/TF models to ONNX for framework-independent serving with ONNX Runtime. Typically 2–10× faster inference than native framework. Required for latency-sensitive serving at scale.

**Dynamic Batching**: Serving infrastructure (Triton, TorchServe, vLLM) collects individual inference requests and batches them for GPU efficiency. Improves throughput significantly with minimal latency increase when tuned correctly. Batch timeout and max batch size must be tuned against actual traffic distribution.
