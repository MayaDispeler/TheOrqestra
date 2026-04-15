---
name: token-optimization
description: Expert reference for token counting, prompt compression, cost estimation, and quality preservation when optimizing prompts for Claude models
version: 1.1.0
---

# Token Optimization — Expert Reference

## Non-Negotiable Standards

- **Stated counts override estimates**: when a token count is given as a fact ("the plan is 800 tokens"), use it directly — do not re-estimate from character count. Mark stated values without `~`. Mark estimated values with `~`. Never mix the two without labeling which is which
- **Never estimate when you can count**: when text is available, count characters and divide by the content-type ratio (prose: 4.0, technical: 3.8, code: 3.5, JSON: 3.2). Always label results as estimates with `~`
- **Show your arithmetic**: every number in a token report must be reproducible. After each report, include a collapsed arithmetic block showing the formula and values used for each line. If a number cannot be derived from a formula, it is a guess — and guesses are not permitted
- **Default input:output ratio is 70:30**: when only a total token count is available and the input/output split is unknown, assume 70% input and 30% output. This reflects typical orchestrator-heavy early sessions. Override with actual counts when available. Always state when this default is being applied
- **System prompt baseline is 3,000 tokens**: use this fixed number, not a range. It covers the system prompt, tool definitions, and agent file injection. If actual system prompt length is known, use the actual value instead
- **Output tokens cost 5x input tokens**: every optimization decision must account for this asymmetry — a 200-token input increase that prevents 100 tokens of output saves money
- **Quality is the constraint, not the variable**: if compression degrades output quality by any measurable amount, the compression is wrong — revert it
- **Show your work**: every optimization must display before/after token counts, the optimized prompt, and what was removed — never optimize silently
- **Critical constraints are sacred**: a constraint that changes the output if removed is load-bearing — never touch it regardless of token savings

---

## Section 1 — Token Counting Rules

### How Claude Tokenizes Text

Claude uses byte-pair encoding (BPE). Tokenization is not character-by-character — it maps common byte sequences to single tokens. The practical rules:

**Common English words**: most 4-6 letter words are 1 token. "the", "function", "return", "import" = 1 token each. Longer common words like "implementation" or "configuration" = 1 token. Rare or compound words split: "defenestration" = 2-3 tokens.

**Spaces and whitespace**: a leading space is usually merged into the next word's token. " the" (space + the) = 1 token. But a newline + indentation = 1-3 tokens depending on depth. Each blank line = 1 token. Four spaces of indentation = 1 token. A tab character = 1 token.

**Numbers**: single digits 0-9 = 1 token. 2-3 digit numbers = 1 token ("42", "100", "999"). 4+ digit numbers split: "12345" = 2 tokens, "1234567890" = 3-4 tokens. Decimals cost extra: "3.14" = 3 tokens (3, ., 14).

**Punctuation and special characters**: common punctuation (`.`, `,`, `:`, `;`, `!`, `?`) = 1 token each. Paired delimiters (`()`, `[]`, `{}`, `""`) = 1 token each character. Uncommon symbols (`@`, `#`, `$`, `%`, `^`, `&`, `*`) = 1 token each. Sequences of special characters cost linearly: `===` = 2-3 tokens, `<!--` = 2-3 tokens.

**Working estimates for planning**:

| Content type | Chars per token | Tokens per word | 1000 words = |
|---|---|---|---|
| English prose | ~4.0 | ~1.3 | ~1,300 tokens |
| Technical prose | ~3.8 | ~1.4 | ~1,400 tokens |
| Python/JS/TS code | ~3.5 | ~1.8 | ~1,800 tokens |
| JSON/YAML config | ~3.2 | ~2.0 | ~2,000 tokens |
| URLs and paths | ~2.8 | ~3.0 | ~3,000 tokens |
| Base64 / encoded data | ~2.5 | ~3.5 | ~3,500 tokens |

### Why Code Costs More Than Prose

Code has three token-expensive properties prose does not:

1. **Indentation**: every level of nesting adds 1 token per line. A 4-level-deep function body pays 4 extra tokens per line just for whitespace. A 50-line deeply nested function wastes 100-200 tokens on indentation alone.

2. **Symbol density**: code uses `{`, `}`, `(`, `)`, `[`, `]`, `=>`, `===`, `!==`, `&&`, `||` — each costs 1-2 tokens. A single line like `if (items.filter((x) => x.active).length > 0) {` costs ~18 tokens for 49 characters (~2.7 chars/token).

3. **Camel/snake case identifiers**: `getUserSubscriptionStatus` splits into 3-4 tokens. `get_user_subscription_status` splits into 5-7 tokens (underscores are separate tokens). Long identifiers are the single biggest token inflator in code.

### Markdown Syntax Overhead

| Markdown element | Token overhead | Example |
|---|---|---|
| `# Heading` | +1 token for `#` | `# Setup` = 2 tokens vs "Setup" = 1 token |
| `## Heading` | +1 token for `##` | `## Config` = 2 tokens vs "Config" = 1 token |
| `**bold**` | +2 tokens for `**...**` | `**important**` = 3 tokens vs "important" = 1 token |
| `*italic*` | +2 tokens for `*...*` | `*note*` = 3 tokens vs "note" = 1 token |
| `` `inline code` `` | +2 tokens for backticks | `` `value` `` = 3 tokens vs "value" = 1 token |
| ```` ``` ```` code fence | +2-3 tokens per fence | Opening + closing fence = 4-6 tokens total |
| `- list item` | +1 token for `- ` | Per item; 10-item list = 10 extra tokens |
| `1. numbered item` | +1-2 tokens for `1. ` | Per item; `10. ` costs more than `1. ` |
| `> blockquote` | +1 token for `> ` | Per line inside the blockquote |
| `[text](url)` | +4 tokens for `[`, `](`, `)` | Plus full URL token cost |
| `| table |` | +1 token per `|` | A 4-column, 5-row table wastes ~40 tokens on pipes alone |

**Decision rule**: use markdown only when the formatting improves the model's ability to parse structure. In agent-to-agent prompts where no human reads the intermediate output, strip all markdown formatting. Save ~8-15% of tokens.

### Bullet Lists vs Prose

A 5-point list of constraints as bullets:

```
- Must support TypeScript 5.0+
- Must handle null inputs gracefully
- Must return within 200ms at p99
- Must not break existing API contracts
- Must include unit tests for edge cases
```

~35 tokens.

The same 5 points as prose:

```
Support TypeScript 5.0+, handle null inputs gracefully, return within 200ms at p99, preserve existing API contracts, and include unit tests for edge cases.
```

~28 tokens. **20% cheaper.** But the list is easier for the model to parse as distinct constraints. Use prose for 3 or fewer items. Use lists for 4 or more.

---

## Section 2 — Prompt Compression Techniques

The 12 highest-impact techniques, ranked by typical token savings:

### Technique 1: Session Context Deduplication (saves 15-30%)

Remove information already established earlier in the session.

**Before** (~82 tokens):
```
You are working on a Next.js 14 application using TypeScript, Tailwind CSS,
and Prisma ORM. The application is a B2B SaaS platform for project management.
The codebase uses the App Router pattern. Write a server action that creates
a new project with the given name and assigns it to the current user.
```

**After** (~38 tokens):
```
Per session context. Write a server action: create project with name,
assign to current user.
```

**Saved**: ~44 tokens (54%). The stack, architecture, and ORM are already in the conversation context. Restating them is pure waste.

### Technique 2: Role Compression (saves 10-25%)

Strip verbose role preambles that repeat what the agent definition already establishes.

**Before** (~64 tokens):
```
You are an expert backend engineer with deep experience in Node.js,
PostgreSQL, and distributed systems. You write clean, production-ready
code that follows best practices. Please review the following database
query and optimize it for performance.
```

**After** (~18 tokens):
```
Optimize this database query for performance:
```

**Saved**: ~46 tokens (72%). The agent's role and expertise are defined in the agent file. Restating them in every prompt wastes tokens.

### Technique 3: Instruction Stacking (saves 10-20%)

Combine multiple sequential instructions into a single dense directive.

**Before** (~58 tokens):
```
First, read the file src/auth/middleware.ts.
Then, identify any security vulnerabilities.
After that, fix the vulnerabilities you found.
Finally, write tests for the fixes you made.
```

**After** (~28 tokens):
```
In src/auth/middleware.ts: find security vulnerabilities, fix them,
and write tests for each fix.
```

**Saved**: ~30 tokens (52%). Sequential instructions with explicit ordering words ("first", "then", "after that", "finally") are redundant when the logical order is obvious.

### Technique 4: Filler Word Removal (saves 8-15%)

Strip hedging, politeness, and zero-information phrases.

**Before** (~44 tokens):
```
I would really appreciate it if you could please take a look at the
following code and let me know if there are any potential issues that
you think might cause problems in production.
```

**After** (~14 tokens):
```
Review this code for production issues:
```

**Saved**: ~30 tokens (68%). Words that carry no technical information: "I would really appreciate it if you could please", "take a look at", "let me know if", "you think might".

### Technique 5: Implicit Constraint Removal (saves 5-15%)

Remove constraints the model already follows by default.

**Before** (~52 tokens):
```
Write a Python function. Make sure to use proper indentation.
Follow PEP 8 style guidelines. Use meaningful variable names.
Add type hints to function parameters and return values.
Handle edge cases appropriately.
```

**After** (~22 tokens):
```
Write a Python function with type hints. Handle edge cases for:
empty input, None values, negative numbers.
```

**Saved**: ~30 tokens (58%). "Proper indentation", "PEP 8", and "meaningful variable names" are default behavior. But "handle edge cases" is vague — specifying which edge cases makes the constraint actionable and worth the tokens.

### Technique 6: Reference Substitution (saves 5-20%)

Replace repeated entity names with short references after first mention.

**Before** (~68 tokens):
```
The UserSubscriptionService should validate the subscription status.
If the UserSubscriptionService finds an expired subscription, the
UserSubscriptionService should send a notification. The
UserSubscriptionService must log all status changes.
```

**After** (~40 tokens):
```
UserSubscriptionService (USS): validate subscription status. If expired,
send notification. Log all status changes.
```

**Saved**: ~28 tokens (41%). After first mention with abbreviation, use the short form. For agent-to-agent prompts, even the first mention can often be shortened if the context establishes it.

### Technique 7: Example Consolidation (saves 10-25%)

Merge multiple examples that illustrate the same point into one.

**Before** (~86 tokens):
```
For example, if the input is "hello world", return "Hello World".
Another example: if the input is "foo bar baz", return "Foo Bar Baz".
Also, for the input "test input string", return "Test Input String".
```

**After** (~36 tokens):
```
Capitalize first letter of each word: "hello world" → "Hello World",
"foo bar baz" → "Foo Bar Baz".
```

**Saved**: ~50 tokens (58%). Two examples demonstrate the pattern. Three is redundant. Use 1 example for trivial patterns, 2 for non-obvious patterns, 3 only when edge cases differ significantly.

### Technique 8: Negative Constraint Inversion (saves 5-10%)

Convert "do not do X" lists into a positive constraint when the positive form is shorter.

**Before** (~48 tokens):
```
Do not use any external libraries.
Do not modify the existing function signatures.
Do not add any console.log statements.
Do not change the return type.
```

**After** (~22 tokens):
```
Constraints: stdlib only, preserve existing signatures and return types,
no console.log.
```

**Saved**: ~26 tokens (54%). Four negative instructions compressed into a single constraint block.

### Technique 9: Schema-as-Spec (saves 10-20%)

Replace prose descriptions of data shapes with TypeScript interfaces or JSON schemas.

**Before** (~72 tokens):
```
The function should accept an object with a name field that is a string,
an age field that is a number and must be positive, an email field that
is a string and must be a valid email format, and an optional roles field
that is an array of strings.
```

**After** (~38 tokens):
```
Input:
{ name: string; age: number (>0); email: string (valid email); roles?: string[] }
```

**Saved**: ~34 tokens (47%). Type notation is denser than English for describing data shapes. Models parse it natively.

### Technique 10: Conditional Flattening (saves 5-10%)

Replace nested if/else prose with a decision table.

**Before** (~62 tokens):
```
If the user is an admin, they should see all projects. If the user is
a member, they should see only projects they belong to. If the user is
a guest, they should see only public projects. If the user has no role,
return an empty list.
```

**After** (~30 tokens):
```
Visibility rules:
- admin → all projects
- member → own projects only
- guest → public projects only
- no role → empty list
```

**Saved**: ~32 tokens (52%). Decision tables compress conditional logic better than prose paragraphs.

### Technique 11: Output Format Specification Compression (saves 5-15%)

Replace verbose output instructions with a single example.

**Before** (~56 tokens):
```
Return the result as a JSON object. The object should have a "status"
field with either "success" or "error". It should have a "data" field
containing the result. If there's an error, include a "message" field
with a description of what went wrong.
```

**After** (~28 tokens):
```
Return: { status: "success"|"error", data: any, message?: string }
```

**Saved**: ~28 tokens (50%). One typed example replaces a paragraph of description.

### Technique 12: Boilerplate Elimination (saves 3-8%)

Remove standard instructions that models follow without being told.

Remove these — they are default behavior:
- "Write clean, readable code"
- "Follow best practices"
- "Make sure the code compiles/runs"
- "Return your response in a clear format"
- "Think step by step" (unless chain-of-thought is specifically needed)
- "Be thorough and complete"
- "Double-check your work"

Keep these — they change output:
- Specific language/framework versions
- Performance constraints with numbers
- Compatibility requirements
- Security-specific requirements (auth, encryption)
- Exact output format when non-obvious

---

## Section 3 — Quality Preservation Rules

### What Must Never Be Removed

1. **Version constraints**: "TypeScript 5.0+", "Node 20 LTS", "React 18" — removing these causes the model to target the wrong version and produce incompatible code.

2. **Performance requirements with numbers**: "p99 < 200ms", "< 50MB memory", "handle 10K concurrent connections" — these are measurable constraints. Without them, the model optimizes for correctness alone.

3. **Security requirements**: any mention of auth, encryption, input validation, or access control. A prompt asking for an API endpoint that omits "validate the JWT" will get an unauthenticated endpoint.

4. **Error handling specifications**: what to do on failure, what errors to throw, what to return on invalid input. These are behavior specs, not filler.

5. **Exact names**: function names, variable names, endpoint paths, file paths, table names, column names that must match an existing contract. Paraphrasing `getUserById` as "a function to get users" loses the interface contract.

6. **Edge case specifications**: "handle empty arrays", "handle null", "handle concurrent writes" — these are the most likely things to be dropped during compression and the most likely things to cause bugs when missing.

7. **Integration constraints**: "must use the existing `AuthService`", "must write to the `audit_log` table", "must emit a Kafka event" — these constrain architecture, not just behavior.

8. **Verbatim user requirements or acceptance criteria**: these are contractual text from a stakeholder. Paraphrasing them risks changing their meaning. Pass through unchanged.

### How to Identify Critical vs Filler

Apply the **deletion test**: mentally remove the sentence and ask — does the specialist agent produce a different output without it?

- If **yes** → the sentence is critical. Keep it.
- If **no** → the sentence is filler. Remove it.
- If **maybe** → keep it. False negatives (keeping filler) cost tokens. False positives (removing constraints) cost quality. The asymmetry makes "keep" the safe default.

### The 5 Signals That a Prompt Is Over-Compressed

1. **The specialist asks a clarifying question.** This means you removed something it needed. A clarification round trip costs far more tokens than the removed sentence would have. Track clarification rates per optimization — if they rise above 5%, you are compressing too aggressively.

2. **The output contains hedging language.** Phrases like "I'm assuming you want...", "Without more context...", "This could mean..." indicate the model is uncertain about intent. The removed context was load-bearing.

3. **The output is longer than expected.** A well-constrained prompt produces focused output. An under-specified prompt causes the model to cover multiple interpretations, generating 2-3x more output tokens. Since output costs 5x input, this is the most expensive failure mode.

4. **The output misses an edge case that was in the original prompt.** Compare the specialist's output against the original uncompressed prompt. If the original mentioned "handle null" and the compressed version didn't, and the output doesn't handle null — the compression caused the bug.

5. **The output uses a different technology or approach than specified.** If the original said "use Redis" and the compressed version just said "use a cache", the model may choose an in-memory cache or Memcached. Specificity was lost.

---

## Section 4 — Cost Estimation

### Pricing (Claude Sonnet 4)

| Token type | Price per 1M tokens | Price per 1K tokens | Price per token |
|---|---|---|---|
| Input | $3.00 | $0.003 | $0.000003 |
| Output | $15.00 | $0.015 | $0.000015 |

Output tokens are **5x** more expensive than input tokens. This single fact drives most optimization strategy.

### Cost Formulas

**Per-response cost**:
```
cost = (input_tokens × $0.000003) + (output_tokens × $0.000015)
```

**Session cost**:
```
session_cost = Σ(per_response_cost for each agent invocation)
```

**Practical examples**:

| Scenario | Input tokens | Output tokens | Cost |
|---|---|---|---|
| Short code review | 2,000 | 800 | $0.018 |
| Feature implementation | 8,000 | 3,000 | $0.069 |
| Full agent session (7 agents) | 84,000 | 31,000 | $0.717 |
| Heavy session (12 agents) | 150,000 | 60,000 | $1.350 |
| Context-maxed session | 180,000 | 80,000 | $1.740 |

### Context Window Percentage

```
context_used_pct = (cumulative_all_tokens / 200,000) × 100
```

Where `cumulative_all_tokens` includes:
- System prompt and tool definitions: 3,000 tokens (fixed baseline)
- All input tokens sent across all turns
- All output tokens generated across all turns
- Conversation history carried forward

### Input/Output Split Estimation

When only a total token count is available:

```
input_tokens  = total × 0.70
output_tokens = total × 0.30
```

This 70:30 default reflects typical orchestrator-heavy early sessions where input (system prompt + user context + conversation history) dominates. The ratio shifts toward 50:50 or 40:60 in output-heavy sessions (code generation, documentation writing). Override with actual counts whenever available.

When the split is estimated, annotate the report:
```
  Session total:    ~12,000 tokens (input: ~8,400 | output: ~3,600)
                    [split estimated via 70:30 default]
```

### Arithmetic Verification Block

Every token report must be followed by a verification block that shows the formula and values for each line. Format:

```
  Arithmetic:
    input_cost  = 8,400 × $0.000003 = $0.0252
    output_cost = 3,600 × $0.000015 = $0.0540
    total_cost  = $0.0252 + $0.0540 = $0.0792 → $0.079
    context_pct = 12,000 / 200,000  = 6.0%
    filled      = floor(6.0 / 5)    = 1 block
```

This block is non-optional. If the arithmetic does not add up, the report is wrong — fix it before displaying.

**Progress bar calculation**:
```
filled_blocks = floor(context_used_pct / 5)
empty_blocks = 20 - filled_blocks
bar = "█" × filled_blocks + "░" × empty_blocks
```

### Breakeven Analysis: When Optimization Costs More Than It Saves

The optimization process itself consumes tokens. The optimizer agent reads the prompt (~N input tokens), processes it (~N/2 reasoning), and produces the optimized version (~0.6N output tokens). Rough overhead per optimization pass:

```
optimization_cost = (N × $0.000003) + (0.6N × $0.000015) = N × $0.000012
```

For a 1,000-token prompt: optimization costs ~$0.012.

The savings from compressing that prompt by 40%:
```
savings = 400 × $0.000003 = $0.0012
```

**The optimization costs 10x more than the direct input savings.** Optimization only pays for itself when:

1. **The compressed prompt reduces output length.** A tighter prompt that produces 500 fewer output tokens saves $0.0075 — closer to breakeven.
2. **The prompt is reused across multiple agent calls.** If the same compressed template runs 10 times, savings multiply.
3. **The session is approaching context limits.** At 80%+ context usage, every token saved prevents quality degradation from truncation. The value is not dollar savings but output quality preservation.

**Decision rule**: do not optimize prompts under 500 tokens. The overhead exceeds the savings. Focus optimization effort on prompts over 1,500 tokens where compression yields 600+ tokens saved.

---

## Section 5 — Output Format Standards

### Token Report (after every agent response)

```
── Token Report ─────────────────────────────────────────
  This response:    ~{n} tokens (input: ~{i} | output: ~{o})
  Session total:    ~{N} tokens (input: ~{I} | output: ~{O})
  Estimated cost:   ${total} (input: ${i_cost} | output: ${o_cost})
  Context window:   [{bar}] {pct}% ({used}K / 200K tokens)
──────────────────────────────────────────────────────────
```

Rules:
- All token counts prefixed with `~` — these are estimates, never exact
- Cost to 2 decimal places minimum, 4 for sub-cent values: `$0.07`, `$0.0012`
- Context bar is 20 characters: `█` for used, `░` for remaining
- Used tokens displayed in K with 1 decimal: `76.2K`
- Line width: exactly 58 characters between the box-drawing characters

### Threshold Warnings

Append to the report when thresholds are crossed:

At 60%:
```
  ⚠ Context at 60%. Remaining capacity: ~{remaining}K tokens.
    Consider prioritizing essential tasks.
```

At 80%:
```
  ⚠ Context at 80%. Recommend completing only critical tasks.
    Estimated {n} more agent calls before compression risk.
```

At 90%:
```
  ⚠ Context at 90%. Session near limit. Further calls risk
    degraded output from context truncation.
```

### Optimization Report (before each specialist agent runs)

```
── Prompt Optimization ──────────────────────────────────
  ORIGINAL:   ~{x} tokens
  OPTIMIZED:  ~{y} tokens
  SAVED:      ~{z} tokens ({pct}% reduction)
──────────────────────────────────────────────────────────
```

Followed by the full optimized prompt in a code block.

If optimization is refused:
```
── Prompt Optimization ──────────────────────────────────
  SKIPPED: {reason}
  Reason: {one of: under 500 tokens | debug task with
  stack trace | removal would lose critical constraint |
  contains verbatim user requirements}
──────────────────────────────────────────────────────────
```

### Session Summary (at session end)

```
── Session Summary ──────────────────────────────────────
  Agents invoked:       {n}
  Total input tokens:   ~{I}
  Total output tokens:  ~{O}
  Total tokens:         ~{T}
  Estimated cost:       ${total} (input: ${i} | output: ${o})
  Context used:         [{bar}] {pct}%
  Optimization passes:  {n}
  Tokens saved:         ~{saved} (avg {pct}% per pass)
  Net savings:          ~${net} (savings minus optimizer cost)
──────────────────────────────────────────────────────────
```

### Ledger Format (when requested)

```
── Token Ledger ─────────────────────────────────────────
  #  Agent                  Input     Output    Cost
  1  orchestrator           ~4,200    ~1,800    $0.040
  2  ┗ optimizer (pass 1)   ~2,100    ~1,200    $0.024
  3  software-engineer      ~12,400   ~6,200    $0.130
  4  ┗ optimizer (pass 2)   ~1,800    ~1,000    $0.020
  5  code-reviewer          ~8,600    ~3,100    $0.072
  6  qa-engineer            ~6,800    ~4,400    $0.086
  ─────────────────────────────────────────────
     Specialist subtotal    ~32,000   ~15,500   $0.328
     Optimizer subtotal     ~3,900    ~2,200    $0.044
     TOTAL                  ~35,900   ~17,700   $0.373
──────────────────────────────────────────────────────────
```

Rules:
- Right-align all numbers
- Agent name column: 22 characters
- Token columns: 10 characters each
- Cost column: 8 characters, always 3 decimal places
- Optimizer passes appear indented with `┗` under the agent they optimized for
- Subtotals separate specialist work from optimizer overhead so the user can evaluate whether optimization is paying for itself
- The optimizer's own token consumption is always tracked — it is never invisible
