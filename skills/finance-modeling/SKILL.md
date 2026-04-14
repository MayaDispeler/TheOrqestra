---
name: finance-modeling
description: Expert reference for financial modeling, unit economics, and business case analysis.
version: 1.0
---

# Finance Modeling Expert Reference

## Non-Negotiable Standards

1. **Inputs, calculations, and outputs live in separate tabs. Always.** A hardcoded number inside a calculation formula is model smell — it breaks audit trails, makes sensitivity analysis impossible, and guarantees errors when assumptions change.
2. **All input cells are colored blue (or another consistent convention) and unlocked. All formula cells are a different color and locked.** A model where you cannot visually distinguish inputs from calculations is not a model — it is a spreadsheet waiting to lie to you.
3. **CAC is always fully-loaded.** Ad spend alone is not CAC. If you exclude sales headcount, sales tools, marketing headcount, and fractional overhead, your CAC is understated and your LTV:CAC ratio is fiction.
4. **LTV uses a discounted cash flow, not ARPU/churn.** Simple LTV = ARPU / churn rate ignores the time value of money and overstates LTV for any business with a cost of capital above zero.
5. **Three-statement models are required for fundraising, M&A, and debt financing decisions.** A P&L-only model for these audiences is incomplete — it hides cash flow timing, working capital requirements, and covenant compliance.
6. **Every model has a single "Key Driver" cell or section that controls the primary growth assumption.** If you cannot identify the one input that moves every output the most, you do not understand your own model.

---

## Decision Rules

1. **If LTV:CAC < 1x, the business is destroying value acquiring customers.** This is not a "early-stage growth trade-off" — it is a fundamental unit economics failure. Growth makes it worse, not better.
2. **If LTV:CAC is between 1x and 3x, growth is marginal and the model requires payback period analysis.** A payback period >24 months at this ratio is a cash flow crisis waiting to happen.
3. **If LTV:CAC > 3x, the business is healthy on unit economics. The constraint is likely growth rate.** This is the green zone. Anything above 5x may indicate underinvestment in acquisition.
4. **If NRR > 100%, the business grows revenue without adding a single new customer.** Model the NRR-driven revenue expansion as a separate line from new logo ARR — conflating them hides the health of both motions.
5. **If gross margin is below 60% for a SaaS business, the COGS structure requires immediate investigation.** Below 60% typically signals support costs are in COGS but are structurally a product problem, or hosting costs are not optimized.
6. **If payback period exceeds 18 months, do not model multi-year CAC payback as acceptable without a detailed retention curve.** Customers who churn before payback are NPV-negative. The assumption must be validated against cohort data.
7. **Use Base / Upside / Downside scenarios with a single swapped assumption per scenario, not multiple simultaneous changes.** Changing 5 inputs at once in a downside scenario makes it impossible to know which assumption drove the variance.
8. **If the model includes international revenue, add an explicit FX assumption row.** Mixing USD and GBP revenue without a conversion line produces revenue that cannot be audited or reproduced.
9. **If the model is used for a board deck, round every output to the nearest thousand (or million at scale).** False precision ($1,234,567.89 ARR) signals the model author does not understand what the audience needs.
10. **ARR is contracted, not annualized MRR.** If a customer signed a $60K annual contract, ARR = $60K. If a customer pays $5K/month with no contract, that is not $60K ARR — it is $5K MRR with no guaranteed renewal.

---

## Mental Models

### 1. Model Architecture: The Three-Tab Rule

```
TAB 1: INPUTS (blue cells = assumptions)
  ┌─────────────────────────────────────────────┐
  │ Growth rate (MoM)           [18%]  ← blue   │
  │ Gross margin target         [75%]  ← blue   │
  │ CAC – paid acquisition      [$420] ← blue   │
  │ CAC – organic (blended)     [$180] ← blue   │
  │ Monthly churn rate          [2.1%] ← blue   │
  │ WACC / discount rate        [12%]  ← blue   │
  │ Avg contract length (mo)    [12]   ← blue   │
  └─────────────────────────────────────────────┘

TAB 2: CALCULATIONS (formula cells — no hardcodes)
  ┌─────────────────────────────────────────────┐
  │ = Inputs!B3 * (1 + Inputs!B2)^month         │
  │ = LTV_calculation / CAC_blended             │
  │ (all formulas reference Inputs tab only)    │
  └─────────────────────────────────────────────┘

TAB 3: OUTPUTS (charts, KPI summary, scenarios)
  ┌─────────────────────────────────────────────┐
  │ ARR at Month 24:   $4.2M                    │
  │ LTV:CAC ratio:     3.7x                     │
  │ CAC Payback:       11 months                │
  │ NRR (trailing):    108%                     │
  └─────────────────────────────────────────────┘
```

**Rule:** Calculation tab cells never contain typed numbers. Every number comes from the Inputs tab via a named reference. This makes sensitivity analysis a single-cell change.

---

### 2. Unit Economics Stack

```
REVENUE PER CUSTOMER (ARPU)
  └── × Gross Margin %
        = Gross Profit per Customer per Month (GP/customer/mo)
              └── ÷ Monthly Churn Rate
                    = Simple LTV  ← DO NOT USE as final LTV
                          └── × Discount Factor (WACC-adjusted)
                                = Discounted LTV  ← USE THIS

FULLY-LOADED CAC
  = (Sales Headcount Cost + Marketing Headcount Cost
     + Paid Acquisition Spend + Tools & Platforms
     + Allocated Overhead) / New Customers Acquired

LTV:CAC Ratio = Discounted LTV / Fully-Loaded CAC
  < 1x  → Unit economics failure
  1–3x  → Marginal; analyze payback period
  > 3x  → Healthy; optimize for growth rate

CAC Payback Period (months) = Fully-Loaded CAC / (ARPU × Gross Margin %)
  < 12 months → Excellent
  12–18 months → Acceptable for SaaS
  > 24 months → Dangerous; requires strong retention data
```

---

### 3. SaaS P&L Structure

```
REVENUE
  + New Logo ARR (contracted new customers)
  + Expansion ARR (upsell / cross-sell in existing accounts)
  − Churned ARR (lost contracts)
  = Net New ARR
  + Beginning ARR
  = Ending ARR

  ↓ recognized ratably (1/12 per month for annual contracts)

COST OF GOODS SOLD (COGS)
  + Cloud hosting & infrastructure
  + Customer support headcount (not sales)
  + Customer success (post-sale, renewal-focused)
  + Third-party SaaS embedded in product
  — NOT: product engineering, R&D, sales, marketing

GROSS PROFIT = Revenue − COGS
GROSS MARGIN % = Gross Profit / Revenue
  SaaS targets: >70% good, >80% excellent, <60% investigate

OPERATING EXPENSES
  + Sales & Marketing (S&M)
  + Research & Development (R&D)
  + General & Administrative (G&A)

EBITDA = Gross Profit − Operating Expenses

Rule of 40 = Revenue Growth Rate (YoY %) + EBITDA Margin %
  ≥ 40 → healthy for growth-stage SaaS
  < 20 → growth vs. profitability profile is broken
```

---

### 4. Scenario Architecture: Base / Upside / Downside

```
IDENTIFY THE KEY DRIVER FIRST (usually one of):
  ├── Monthly churn rate (retention = most leveraged in SaaS)
  ├── New logo growth rate
  └── Expansion revenue rate (NRR)

SCENARIO TABLE (change ONE key input per scenario):

                 Downside   Base    Upside
Monthly Churn:   3.5%       2.1%    1.2%
─────────────────────────────────────────────
12-mo ARR:       $2.1M      $3.4M   $5.1M
24-mo ARR:       $3.2M      $6.8M   $12.4M
LTV:CAC:         2.1x       3.7x    5.9x
Payback (mo):    19         11      7

TORNADO CHART (sensitivity rank order — what moves ARR the most):
  1. Monthly churn rate        ████████████████  ±$1.8M
  2. New logo growth rate      ████████████      ±$1.2M
  3. ACV (avg contract value)  ████████          ±$0.9M
  4. Gross margin              ████              ±$0.4M
  5. Paid CAC                  ██                ±$0.2M

→ Build downside scenario around rank 1 and 2 only.
```

---

## Vocabulary

| Term | Precise Meaning |
|------|-----------------|
| ARR | Annual Recurring Revenue — contracted, not projected; annual value of active subscription contracts at a point in time |
| MRR | Monthly Recurring Revenue — monthly equivalent of ARR; ARR ≠ MRR × 12 unless all contracts are month-to-month |
| NRR | Net Revenue Retention — (Beginning ARR + Expansion − Contraction − Churn) / Beginning ARR; >100% = expansion exceeds churn |
| CAC | Customer Acquisition Cost — fully-loaded cost to acquire one new customer including headcount, tools, ad spend, and overhead |
| LTV | Lifetime Value — NPV of gross profit generated by a customer over their lifetime; must use discount rate, not simple ARPU/churn |
| WACC | Weighted Average Cost of Capital — discount rate used in LTV and DCF calculations; typically 10–15% for early-stage SaaS |
| Payback Period | Months required to recover CAC from gross profit contribution; CAC ÷ (ARPU × Gross Margin %) |
| Gross Margin | (Revenue − COGS) / Revenue; COGS = hosting, support, CS only — not R&D or S&M |
| Rule of 40 | Growth rate % + EBITDA margin % ≥ 40; benchmark for SaaS health balancing growth and profitability |
| Cohort | A group of customers acquired in the same time period (e.g., January 2025 cohort); used to track retention and LTV over time |
| Churn Rate | Percentage of ARR or customers lost in a period; monthly churn × 12 ≠ annual churn for compounding reasons |
| Three-Statement Model | Integrated model with Income Statement, Balance Sheet, and Cash Flow Statement; required for fundraising, M&A, debt |

---

## Common Mistakes and How to Avoid Them

### Mistake 1: CAC calculated as ad spend only

**Bad:**
```
New customers acquired in Q1:    50
Paid acquisition spend in Q1:    $25,000
CAC = $25,000 / 50 = $500
```

**Why wrong:** This excludes the sales team salaries ($120K/quarter for 2 AEs), SDR compensation ($40K/quarter), sales tools like Salesforce and Outreach ($8K/quarter), marketing headcount ($30K/quarter), and 10% overhead allocation ($19.8K). Actual CAC is 4x higher.

**Fix:**
```
Fully-Loaded CAC Calculation (Q1):

  Sales headcount (2 AEs + 1 SDR):     $160,000
  Marketing headcount (1 PMM, 0.5 DG):  $55,000
  Paid acquisition (Google, LinkedIn):   $25,000
  Sales tools (Salesforce, Outreach):     $8,000
  Marketing tools (HubSpot, etc.):        $4,000
  Overhead allocation (10%):             $25,200
  ─────────────────────────────────────────────
  Total acquisition cost:               $277,200

  New customers acquired:                     50
  ─────────────────────────────────────────────
  Fully-Loaded CAC:                       $5,544

  LTV:CAC with $500 CAC: 20x  ← fictional
  LTV:CAC with $5,544 CAC: 1.8x  ← real; marginal
```

---

### Mistake 2: Simple LTV without discounting

**Bad:**
```
ARPU (monthly):   $462
Monthly Churn:    2.1%
Simple LTV = $462 / 0.021 = $22,000
```

**Why wrong:** This assumes $22,000 in gross profit is received today. In reality, customers pay monthly over ~48 months (1/0.021). Money received 4 years from now is worth less than money received today. At a 12% WACC, $22K received over 48 months is worth significantly less.

**Fix:**
```
Discounted LTV Formula:

  LTV = (ARPU × Gross Margin %) / (Churn Rate + (WACC / 12))

  Components:
    ARPU (monthly):        $462
    Gross Margin:          74%
    Monthly Gross Profit:  $462 × 0.74 = $342
    Monthly Churn Rate:    2.1% = 0.021
    WACC:                  12% annual = 1.0% monthly = 0.010
    Discount Rate (monthly): 0.021 + 0.010 = 0.031

  Discounted LTV = $342 / 0.031 = $11,032

  vs. Simple LTV: $22,000 (overstated by 99%)

  LTV:CAC (simple):      22,000 / 5,544 = 4.0x  ← misleading
  LTV:CAC (discounted):  11,032 / 5,544 = 2.0x  ← accurate; requires attention
```

---

### Mistake 3: Circular references in three-statement models

**Bad:** Interest expense on the income statement references the ending debt balance on the balance sheet, which references net income from the income statement, which references interest expense — circular.

**Why wrong:** Excel will either show a circular reference error (and return 0) or iterate to a wrong answer if iterative calculation is enabled. The model breaks on any scenario change.

**Fix:** Use a "plug" approach for the interest calculation. Calculate interest expense based on the *beginning* period debt balance, not ending. This breaks the circular dependency at the cost of a minor approximation that is acceptable for planning models (not audit-grade models).

---

### Mistake 4: Conflating cash and accrual accounting

**Bad:** A $120K annual contract signed in December is recorded as $120K revenue in December in the model.

**Why wrong:** Under accrual accounting (required for GAAP/IFRS), SaaS revenue is recognized ratably — $10K/month over 12 months. Recording $120K in December overstates Q4 revenue by $110K, understates Q1–Q3 of the next year, and produces deferred revenue on the balance sheet that the model does not capture.

**Fix:**
```
Contract signed: Dec 1, 2025
Contract value: $120,000 annual
Recognition: $10,000/month × 12 months

  Dec 2025:  $10,000  (revenue recognized)
  Jan 2026:  $10,000
  ...
  Nov 2026:  $10,000

  Deferred Revenue (Balance Sheet) at Dec 31:  $110,000
  → This is a liability, not revenue. Model must track it.
```

---

### Mistake 5: Compounding growth rate errors

**Bad:**
```
Month 1 revenue:  $100,000
Annual growth rate: 60%
Month 12 revenue = $100,000 × 1.60 = $160,000  ← wrong
```

**Why wrong:** 60% annual growth does not mean adding 60% once at the end of year one. It means compounding monthly. Monthly growth rate = (1.60)^(1/12) − 1 = 3.97%/month.

**Fix:**
```
Monthly growth rate = (1 + annual_growth)^(1/12) − 1
                    = (1.60)^(1/12) − 1
                    = 3.97% per month

Month 1:  $100,000
Month 6:  $100,000 × (1.0397)^5  = $121,600
Month 12: $100,000 × (1.0397)^11 = $153,400  ← not $160K (timing matters)

Year-end ARR after 12 months:
  $100,000 × (1.60)^1 = $160,000  ← correct if starting ARR is $100K
  but monthly revenue in month 12 ≠ $160K

The annual revenue total = sum of all monthly revenues, which ≠ ending month × 12.
```

---

## Good vs. Bad Output

### Comparison 1: CAC Summary in a Board Deck

**Bad:**
```
Q1 Customer Acquisition Cost: $500
(Based on Google Ads spend)
```
Presents a number the board will use to calculate LTV:CAC. The number is wrong by 10x. The board will make capital allocation decisions on false data.

**Good:**
```
Q1 Fully-Loaded CAC: $5,544

  Component Breakdown:
  ├── Sales headcount:       $160K  (57.7%)
  ├── Marketing headcount:    $55K  (19.8%)
  ├── Paid acquisition:       $25K   (9.0%)
  ├── Tools & platforms:      $12K   (4.3%)
  └── Overhead allocation:    $25K   (9.0%)
  Total:                     $277K
  New customers:              50
  CAC:                      $5,544

  Trend: Q4 $6,100 → Q1 $5,544 (-9%) — driven by SDR ramp efficiency
```

---

### Comparison 2: Three-Statement vs. P&L-Only for Fundraising

**Bad (P&L only, presented to Series B investors):**
```
        FY2025    FY2026E
ARR     $3.2M     $7.1M
Gross M  72%       75%
EBITDA  -$1.8M    -$0.9M
```

Investors cannot determine: When does the company run out of cash? What is the working capital burn from deferred revenue? Can the company service debt? What is the ending cash balance?

**Good (Three-statement summary):**
```
                    FY2025    FY2026E
Income Statement
  ARR               $3.2M     $7.1M
  Gross Margin       72%       75%
  EBITDA            -$1.8M    -$0.9M

Cash Flow Statement
  Operating CF      -$1.4M    -$0.6M
  CapEx / Investing  -$0.1M    -$0.1M
  Financing (raise)  $5.0M     $0.0M
  Net Cash Change    $3.5M    -$0.7M

Balance Sheet
  Cash (ending)      $3.8M     $3.1M
  Deferred Revenue   $0.6M     $1.4M
  Total Liabilities  $1.1M     $2.0M

→ Runway at current burn: 19 months from FY2026E ending cash
→ Series B of $8M extends runway to 36+ months under base case
```

---

### Comparison 3: Cohort Retention — Reading the Shape

**L-shaped curve (churn problem):**
```
Month:  0    1    2    3    4    5    6    12   24
Cohort: 100  78   64   55   50   48   46   44   43

→ Rapid early drop. Churn concentrated in months 1–3.
→ Signal: onboarding failure or product-market fit issue for segment.
→ Action: fix activation, not retention.
```

**Smile curve (resurrection possible):**
```
Month:  0    1    2    3    4    5    6    12   24
Cohort: 100  88   79   71   65   66   68   72   70

→ Dip in months 3–5, then recovery. "Smile" shape.
→ Signal: customers who churn often return; seasonal or episodic usage.
→ Action: model win-back campaigns, re-engagement nudges. LTV is higher than simple curve implies.
```

---

## Checklist / Deliverable Structure

- [ ] Model has three separate tabs: Inputs (blue cells), Calculations (formula-only), Outputs (summary/charts)
- [ ] No hardcoded numbers exist in calculation formulas — every constant references a named cell in Inputs tab
- [ ] CAC is fully-loaded: includes sales headcount, marketing headcount, tools, ad spend, and overhead allocation
- [ ] LTV uses discounted formula: `(ARPU × Gross Margin) / (Churn Rate + Monthly WACC)`, not `ARPU / Churn`
- [ ] LTV:CAC ratio is calculated and labeled with threshold context (<1x / 1–3x / >3x)
- [ ] CAC payback period is calculated in months: `CAC / (ARPU × Gross Margin %)`
- [ ] ARR and MRR are tracked separately; ARR is contracted, not annualized MRR
- [ ] NRR is calculated as `(Beginning ARR + Expansion − Contraction − Churn) / Beginning ARR`
- [ ] Revenue is recognized ratably for annual contracts (1/12 per month), not upfront
- [ ] Three scenarios exist (Base / Upside / Downside) each varying only the primary key driver
- [ ] A tornado chart or sensitivity table identifies the top 3–5 inputs by impact on the key output metric
- [ ] Three-statement model is built for any fundraising, M&A, or debt financing use case (P&L alone is insufficient)
- [ ] All FX exposures have an explicit conversion line in the Inputs tab with a dated source rate
