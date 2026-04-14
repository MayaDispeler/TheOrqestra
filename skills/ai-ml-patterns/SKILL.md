---
name: ai-ml-patterns
description: Machine learning engineering patterns for model selection, feature engineering, training pipelines, evaluation, and production deployment.
version: 1.0
---

# Machine Learning Engineering Expert Reference

## Non-Negotiable Standards

1. **Never allow target leakage.** Every feature must be constructed using only information available at the time of prediction. Audit the temporal ordering of every join and aggregation before training.
2. **Establish a held-out test set before any EDA.** Lock it away. Never make modeling decisions by evaluating against it. Use k-fold CV or a validation split for all tuning.
3. **Track every experiment.** Dataset version, feature set hash, hyperparameters, seed, and all metrics go into MLflow, W&B, or equivalent. Reproducibility is a hard requirement, not a nice-to-have.
4. **Baseline first.** Before any complex model, fit a logistic regression / linear regression / frequency baseline and record its metrics. No complex model ships unless it materially beats the baseline (>2% AUC or equivalent).
5. **Quantify uncertainty on your evaluation metric.** Report confidence intervals (bootstrap or analytic). A model is not "better" unless intervals are non-overlapping or p < 0.05 on a paired test.
6. **Monitor data distributions in production.** Deploy a statistical drift detector (PSI, KS test, or chi-square) on inputs and outputs from day one. Set alert thresholds before go-live, not after the first incident.

---

## Decision Rules

1. **If target is continuous → regression. If target is a finite ordered set of ≤5 values, consider ordinal regression before treating as classification.**
2. **If class imbalance ratio > 10:1 → use class_weight='balanced' or SMOTE as a first response. If ratio > 100:1, prefer cost-sensitive learning (XGBoost scale_pos_weight) or threshold optimization over re-sampling.**
3. **If n_samples < 1,000 → use logistic regression, SVM, or gradient boosted trees with heavy regularization. Never default to deep learning below this threshold.**
4. **If n_features > n_samples → regularize aggressively (L1/ElasticNet), apply PCA or feature selection before tree-based methods. Random Forest with default settings will overfit.**
5. **If interpretability is a hard requirement → use logistic regression, decision tree (max_depth ≤ 5), or gradient boosted trees with SHAP. Do not deploy a neural network where a regulator can demand explanation.**
6. **If latency SLA < 10ms → rule out any model requiring GPU inference. Prefer ONNX-quantized trees or lightweight logistic regression. Benchmark p99, not p50.**
7. **If you have >100K labeled samples and structured tabular data → XGBoost or LightGBM before neural networks. Tabular deep learning (TabNet, FT-Transformer) rarely beats well-tuned GBMs on structured data.**
8. **If evaluation metric is AUC and AUC > 0.99 → suspect leakage. Audit feature construction pipeline before declaring victory.**
9. **Never use accuracy as the primary metric when prevalence < 20% or > 80%. Use precision-recall AUC or F-beta with beta chosen by the business cost ratio.**
10. **If model is used for ranking (ads, recommendations, search) → use NDCG@K or MAP, not classification metrics. Train with LambdaRank or a pairwise loss, not cross-entropy.**

---

## Mental Models

### 1. The Bias-Variance Tradeoff Decomposition Tree

```
High Error on Validation Set
├── Training error also high? → HIGH BIAS (underfitting)
│   ├── Increase model complexity
│   ├── Add features / reduce regularization
│   └── Train longer (for neural nets)
└── Training error low, validation error high? → HIGH VARIANCE (overfitting)
    ├── Add regularization (L1/L2, dropout, early stopping)
    ├── Reduce model complexity
    ├── Collect more data
    └── Apply cross-validation-based feature selection
```

### 2. Metric Selection by Business Objective

```
Business Cost Structure
├── FN costly (missed fraud, missed cancer) → Maximize Recall → Use F2-score or Recall@fixed FPR
├── FP costly (spam filter, user trust) → Maximize Precision → Use Precision@fixed TPR
├── Both matter equally → F1-score or ROC-AUC
├── Need a threshold-free summary → PR-AUC (preferred over ROC-AUC when positives rare)
└── Ranking task (top-K matters) → NDCG@K, MAP, MRR
```

### 3. The Feature Leakage Detection Protocol

```
For each feature F:
  1. At what timestamp was F computed?
  2. Does that timestamp precede the prediction timestamp T_pred?
     No → LEAK: drop feature
  3. Does F derive from the target variable Y?
     Yes → LEAK: drop feature
  4. Does F use data from the future relative to T_pred?
     Yes (e.g., rolling average includes future rows) → LEAK: fix window
  5. Is F populated only after a certain event that correlates with Y?
     Yes (e.g., "claim settled date" predicting fraud) → LEAK: drop or re-engineer
```

### 4. Train / Validation / Test Split Strategy

```
Dataset Type
├── i.i.d. tabular, no time component
│   └── 60/20/20 or 5-fold CV; stratify on target for classification
├── Time series or temporal data
│   └── Strict forward split: train on [T0,T1), validate on [T1,T2), test on [T2,T3)
│       NEVER random split on time-indexed data
├── Group structure (user-level predictions, patient cohorts)
│   └── Group k-fold: same entity must not appear in both train and val splits
└── Very small dataset (n < 500)
    └── Leave-One-Out CV or nested CV for unbiased generalization estimate
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| **Target Leakage** | A feature computed using information that would not be available at inference time, causing inflated training metrics. |
| **Data Drift** | A statistically significant shift in the marginal distribution P(X) of input features between training and production. |
| **Concept Drift** | A shift in the conditional distribution P(Y|X), meaning the relationship between features and target has changed. |
| **Population Stability Index (PSI)** | Metric quantifying distribution shift: PSI < 0.1 stable, 0.1–0.25 moderate shift, >0.25 significant drift requiring retraining. |
| **Calibration** | Alignment between predicted probabilities and empirical frequencies. A model predicting 0.8 probability should be correct ~80% of the time. Measured via Brier score or reliability diagrams. |
| **SMOTE** | Synthetic Minority Over-sampling Technique: interpolates new minority class samples along k-nearest neighbor lines. Apply only to training data, never to validation/test. |
| **Shadow Mode Deployment** | Running a new model in production alongside the incumbent, logging its predictions without serving them, to compare behavior before cutover. |
| **Feature Store** | A centralized registry that computes, stores, and serves features consistently across training and inference, eliminating train-serve skew. |
| **Train-Serve Skew** | Discrepancy between features computed at training time vs. inference time, caused by differing code paths or data sources. |
| **Stratified Split** | Partitioning that preserves the class distribution of the original dataset in each split; mandatory for imbalanced targets. |
| **Early Stopping** | Halting training when validation loss stops improving for N consecutive epochs (typically N=10–20); primary regularization strategy for neural networks. |
| **Monotonic Constraint** | Enforcing that a model's output can only increase (or only decrease) as a given feature increases; critical for credit scoring and risk models requiring regulatory compliance. |

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Evaluating on the Test Set During Tuning

**Bad example:**
```python
for depth in [3, 5, 10]:
    model = XGBClassifier(max_depth=depth).fit(X_train, y_train)
    score = roc_auc_score(y_test, model.predict_proba(X_test)[:,1])
    print(depth, score)
# Pick the depth with highest test AUC
```

**Why wrong:** You have now trained 3 models on the test set implicitly. The reported AUC is optimistically biased. The model will underperform this estimate in deployment.

**Fix:**
```python
from sklearn.model_selection import GridSearchCV
gs = GridSearchCV(XGBClassifier(), {'max_depth': [3, 5, 10]}, cv=5, scoring='roc_auc')
gs.fit(X_train, y_train)
# Report on test set ONCE after selecting best params
final_score = roc_auc_score(y_test, gs.best_estimator_.predict_proba(X_test)[:,1])
```

---

### Mistake 2: Random Splitting Time-Series Data

**Bad example:**
```python
X_train, X_test, y_train, y_test = train_test_split(df.drop('target', axis=1), df['target'], test_size=0.2, random_state=42)
# df is ordered by date; rows are shuffled randomly
```

**Why wrong:** Future data leaks into the training set. The model learns patterns that are causally impossible at inference time, producing inflated metrics.

**Fix:**
```python
split_idx = int(len(df) * 0.8)
df_sorted = df.sort_values('event_date')
X_train, y_train = df_sorted.iloc[:split_idx].drop('target', axis=1), df_sorted.iloc[:split_idx]['target']
X_test, y_test = df_sorted.iloc[split_idx:].drop('target', axis=1), df_sorted.iloc[split_idx:]['target']
```

---

### Mistake 3: Using Accuracy on Imbalanced Classes

**Bad example:**
```
Dataset: 95% class 0, 5% class 1
Model: predicts class 0 always
Reported accuracy: 95% — shipped to production
```

**Why wrong:** The model has learned nothing. It will miss every positive case. The accuracy number is meaningless and misleading.

**Fix:** Report PR-AUC and F1 at the operating threshold. Set threshold by business cost ratio, not the default 0.5. A 95%-majority classifier has PR-AUC ≈ 0.05 (random baseline), which immediately exposes the failure.

---

### Mistake 4: Applying SMOTE Before Cross-Validation Split

**Bad example:**
```python
X_resampled, y_resampled = SMOTE().fit_resample(X, y)
cross_val_score(model, X_resampled, y_resampled, cv=5)
```

**Why wrong:** Synthetic samples from the test fold's neighbors appear in the training fold. The validation is contaminated. Reported scores are overly optimistic.

**Fix:** Use `imblearn.pipeline.Pipeline` to ensure SMOTE is applied only within each training fold:
```python
from imblearn.pipeline import Pipeline
pipe = Pipeline([('smote', SMOTE()), ('clf', XGBClassifier())])
cross_val_score(pipe, X, y, cv=StratifiedKFold(5), scoring='f1')
```

---

### Mistake 5: Deploying Without a Drift Detection Baseline

**Bad example:** Model trained, evaluated offline, deployed. Six months later, AUC has dropped from 0.85 to 0.61 with no alert ever fired.

**Why wrong:** No distribution monitoring was established at deployment, so degradation went undetected until a business review caught the downstream impact.

**Fix:** At deployment, compute PSI baseline on all input features using training distribution vs. first 2 weeks of production data. Set PSI > 0.2 alert on any feature. Log prediction score distribution daily and alert if mean score drifts > 2 standard deviations from the 30-day rolling baseline.

---

## Good vs. Bad Output

### Comparison 1: Model Evaluation Report

**Bad:**
```
Model: XGBoost
Accuracy: 94.2%
The model performs well and is ready for deployment.
```

**Good:**
```
Model: XGBoost v2.1 | Dataset: user_churn_v3 (n=82,450; 8.3% positive rate)
Threshold: 0.42 (optimized for F2 at 3:1 FN:FP cost ratio)
Precision: 0.71 | Recall: 0.83 | F2: 0.80 | PR-AUC: 0.79
Baseline (frequency): PR-AUC: 0.083 | Lift: 9.5x
95% CI on PR-AUC: [0.77, 0.81] (bootstrap n=1000)
Calibration Brier score: 0.062 (vs. 0.076 uncalibrated)
Known limitation: model degrades for users with account age < 30 days (n=4,200 out of scope)
```

---

### Comparison 2: Feature Engineering Decision

**Bad:**
```python
df['avg_spend'] = df.groupby('user_id')['spend'].transform('mean')
# Used as a feature in a churn model
```

**Good:**
```python
# Compute rolling average only using data prior to each event's timestamp
df = df.sort_values(['user_id', 'event_date'])
df['avg_spend_trailing_30d'] = (
    df.groupby('user_id')['spend']
    .apply(lambda x: x.shift(1).rolling(30, min_periods=3).mean())
    .reset_index(level=0, drop=True)
)
# shift(1) ensures current row's spend is excluded — prevents target leakage
```

---

### Comparison 3: Production Deployment Strategy

**Bad:** Swap old model for new model at midnight. Watch metrics for 24 hours. Roll back if something looks wrong.

**Good:**
1. Shadow mode for 72 hours: new model runs alongside incumbent, predictions logged but not served. Compare score distributions and flag divergences > 15%.
2. Canary release: route 5% of traffic to new model. Monitor business KPIs (conversion, fraud rate) at p < 0.05 significance before expanding.
3. Full rollout at 50% → 100% with automated rollback trigger if primary metric degrades > 5% relative.
4. Incumbent model retained in registry for 30 days post-full-rollout for emergency rollback.

---

## Checklist

- [ ] Held-out test set was locked before any EDA or feature engineering decisions.
- [ ] All features audited for temporal leakage; every feature has a documented "available at T_pred" timestamp.
- [ ] A baseline model (logistic regression or frequency) was trained and its metrics are documented.
- [ ] Train/val/test split strategy is appropriate for data type (stratified for classification, forward-split for temporal, group-split for grouped data).
- [ ] Evaluation metric aligns with business cost structure; accuracy is NOT used for imbalanced targets.
- [ ] Confidence intervals reported for all primary metrics (bootstrap or analytic).
- [ ] Class imbalance handled with class_weight, SMOTE-in-pipeline, or cost-sensitive learning — never by ignoring it.
- [ ] Experiment tracked: dataset version, feature hash, hyperparameters, random seed, all metric values logged.
- [ ] Model calibration checked; probabilities are meaningful if downstream decisions use a threshold.
- [ ] Drift detection baseline established: PSI thresholds set on all input features before go-live.
- [ ] Deployment strategy includes shadow mode or canary phase; rollback procedure documented.
- [ ] Model card written: training data description, known failure modes, out-of-scope populations, performance by subgroup.
