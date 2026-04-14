---
name: llm-integration-patterns
description: Patterns for integrating LLMs into production applications
version: 1.0
---

# LLM Integration Patterns Expert Reference

## Non-Negotiable Standards

1. Every LLM call in production has a timeout, a retry policy with exponential backoff, and a defined fallback behavior. Treating the LLM API as a reliable synchronous service will produce incidents.
2. Prompts are versioned artifacts, stored in source control, with regression tests against a golden dataset before any prompt change ships to production. Prompt changes that are not tested are uncontrolled deployments.
3. Output validation is mandatory before LLM responses are parsed, stored, or rendered. An LLM that returns 99.9% valid JSON still fails once per thousand calls — at scale, that is your next production bug.
4. Token usage is metered and attributed per feature and per tenant from day one. Retroactively adding token cost attribution to an existing system requires a rewrite.
5. The context window is a fixed resource. Token budgets are allocated explicitly: system prompt, retrieved context, conversation history, and output reservation each have a hard ceiling that is enforced before the API call is made.
6. Evaluation runs before production, not after. An LLM feature without an eval suite is a feature you cannot safely iterate on — every prompt change is a guess.

## Decision Rules

- If the task requires factual accuracy about proprietary or recent data that the model was not trained on → use RAG, not fine-tuning. Fine-tuning teaches style and behavior; RAG supplies facts.
- If the task requires consistent output format, domain-specific tone, or specialized reasoning that cannot be achieved with prompting in < 5 attempts → consider fine-tuning. Fine-tuning to compensate for a bad prompt is expensive and slow.
- If the task requires multi-step reasoning with external data access → use an agent pattern with tool calling. Do not stuff multi-step logic into a single prompt.
- If expected latency budget is < 500ms end-to-end → cache aggressively (semantic caching for near-duplicate queries), use the smallest capable model, and consider pre-computation for predictable inputs. Do not attempt streaming as a latency fix; it hides latency, it does not reduce it.
- If the user-facing feature generates > 50 tokens of output → implement streaming. Waiting for full completion before rendering creates perceived latency that degrades UX regardless of actual model speed.
- If a RAG chunk size is being set, default to 512 tokens with 10-20% overlap (51-102 tokens) for general text. For structured data (tables, code), use smaller chunks (128-256 tokens) with no overlap. Larger chunks hurt retrieval precision; smaller chunks lose context.
- If a retrieval query returns k > 10 results before reranking, you are trusting embedding similarity to do a job it is not precise enough to do. Use a cross-encoder reranker and reduce post-rerank k to 3-5 for context injection.
- If the application serves multiple tenants with different data → namespace vector store indexes by tenant ID. Mixing tenant embeddings in a single flat namespace creates cross-tenant data leakage risk and degrades retrieval quality.
- If an LLM tool call returns an error, retry exactly once with a corrected prompt or schema hint before falling back to a non-tool response. More than one retry per tool call in a synchronous path creates compounding latency.
- If the model cost per request exceeds $0.01, introduce a task-complexity routing layer: use a cheaper model (e.g., GPT-4o-mini, Claude Haiku) for classification, summarization, and extraction; reserve frontier models for generation and complex reasoning.

## Mental Models

**The Token Budget Framework**
Every context window is a fixed budget, not a suggestion. Allocate it explicitly before writing any retrieval or conversation logic. A pragmatic default for a 128K context model: system prompt ≤ 2K tokens, conversation history ≤ 20K tokens (with summarization after), retrieved context ≤ 80K tokens (managed by retrieval k and chunk size), output reservation ≤ 4K tokens, safety buffer 2K tokens. Implement a token counting function that enforces these ceilings; when any bucket exceeds its limit, truncate or compress — never overflow silently into another bucket's allocation.

**The Evaluation Pyramid**
LLM evaluation has three tiers, each more expensive and more reliable than the one below. (1) Unit evals: deterministic assertions on structured output (field presence, format, schema validity) — run in CI on every commit, < 1 second each. (2) LLM-as-judge evals: an LLM grades output quality against a rubric — run nightly on a 50-100 item golden dataset, catches semantic regressions. (3) Human evals: domain experts rate outputs — run before major prompt or model changes, expensive but ground truth. A mature system needs all three tiers. Relying only on human evals makes iteration slow; relying only on automated evals misses semantic quality degradation.

**The RAG Pipeline as a Search System**
RAG is a retrieval problem first, a generation problem second. Treat the retrieval layer with the same rigor as a search system: measure retrieval precision and recall (not just end-to-end answer quality), test chunking strategies empirically, and monitor retrieval quality in production with query logging. The most common RAG failure mode is returning irrelevant chunks, not bad generation — a wrong context produces a confidently wrong answer.

**Fallback Layering**
Every LLM integration should define a fallback stack before going to production. Layer 1: retry the same model (transient error). Layer 2: route to a secondary model (primary model degraded). Layer 3: return a deterministic fallback response (cached, rule-based, or "try again" message). Layer 4: graceful feature degradation (hide the LLM-powered feature, expose the non-AI path). Users are more forgiving of a missing feature than of a broken one.

## Vocabulary

| Term | Precise Meaning |
|---|---|
| RAG (Retrieval-Augmented Generation) | An architecture where relevant documents are retrieved from an external store and injected into the LLM context at inference time, enabling factually grounded generation without retraining. |
| Chunking | The process of splitting source documents into segments for embedding and indexing. Chunk size determines retrieval granularity; overlap preserves context across chunk boundaries. |
| Embedding | A dense vector representation of a text chunk, computed by an embedding model. Semantic similarity between chunks is measured as cosine distance between their embeddings. |
| Reranking | A second-pass retrieval step where a cross-encoder model scores retrieved candidates for relevance to the query. More accurate than vector similarity alone; higher latency. |
| Context Window | The maximum number of tokens an LLM can process in a single inference call, covering input (prompt + context) and output combined. |
| Token Budget | An explicit allocation of context window capacity to named components (system prompt, history, retrieved context, output). Prevents silent truncation and context overflow. |
| Semantic Cache | A cache keyed on embedding similarity rather than exact string match. Returns cached responses for semantically equivalent queries without an LLM call. |
| Tool Calling (Function Calling) | A structured protocol where the LLM emits a JSON object specifying a tool name and arguments instead of a free-text response. The application executes the tool and feeds results back to the model. |
| LLM-as-Judge | An evaluation pattern where a separate LLM scores the output of a primary LLM call against a rubric. Lower cost than human evaluation; biased toward outputs similar to the judge model's own style. |
| Structured Output | LLM output constrained to a defined schema (JSON, XML) via model-native features (response_format, constrained decoding) or post-processing validation (Zod, Pydantic). |
| Prompt Regression | A degradation in output quality caused by a prompt change, detected by running the new prompt against a golden eval dataset and comparing scores to the baseline. |
| Agentic Loop | A control pattern where an LLM iteratively selects tools, executes them, observes results, and decides next actions until a termination condition is met. Requires explicit loop limits to prevent runaway execution. |

## Common Mistakes and How to Avoid Them

**Mistake 1: Naive Context Stuffing**
- Bad: Concatenate all potentially relevant documents into the prompt until the context limit is hit. Pass to the model.
- Why: Irrelevant context actively degrades model performance ("lost in the middle" effect — models weight content at the beginning and end of context more than the middle). Cost is proportional to tokens; stuffing maximizes both cost and noise.
- Fix: Retrieve only the top 3-5 most relevant chunks after reranking. Enforce a retrieved context token ceiling. Log retrieval precision metrics in production.

**Mistake 2: No Output Validation**
- Bad: `const result = JSON.parse(llmResponse)` with no schema check or error handling.
- Why: LLMs produce malformed output at low but non-zero rates. `JSON.parse` throws on malformed JSON; schema violations silently corrupt downstream data. At 10,000 requests/day, even a 0.1% failure rate is 10 broken requests/day.
- Fix: Validate with a schema library (Zod, Pydantic) immediately after parsing. On validation failure, retry once with a schema-correction prompt ("Your output was invalid. Return valid JSON matching this schema: ..."). On second failure, log and return a structured error — never propagate unvalidated LLM output to a database write.

**Mistake 3: No Eval Suite**
- Bad: Prompt is modified based on a few manual test cases. Deployed. Regression discovered by a user two weeks later.
- Why: LLM outputs are non-deterministic and model-version-sensitive. A prompt that works on 5 manual tests can fail on the 6th edge case at scale. Without a regression suite, every prompt change is a deployment without tests.
- Fix: Build a golden dataset of 50-100 (input, expected output) pairs before the first production deployment. Run LLM-as-judge scoring on this dataset on every prompt change. Set a minimum score threshold (e.g., mean judge score ≥ 4.0/5.0, no individual score < 2.0) as a CI gate.

**Mistake 4: Unbounded Agentic Loops**
- Bad: An agent is given a task and a set of tools with no maximum iteration count. A tool call returns an unexpected result; the agent enters a planning loop that never terminates. Bill: $40.
- Why: Agentic loops have no natural termination guarantee. Unexpected tool outputs, contradictory instructions, or hallucinated intermediate states can cause infinite or very long loops.
- Fix: Every agentic loop has a hard maximum iteration count (default: 10; increase only with justification). Every tool call has a timeout. Total agent execution time has a ceiling enforced by the orchestration layer. Log every iteration with token counts.

**Mistake 5: Ignoring Model Tiering**
- Bad: All LLM calls in the application route to the frontier model (e.g., GPT-4o, Claude Sonnet) regardless of task complexity.
- Why: A frontier model costs 10-50x more than a smaller model for tasks like classification, summarization, or extraction where a smaller model performs identically. Uniform routing to frontier models is the fastest way to make a unit-economics-negative product.
- Fix: Classify tasks by complexity and route accordingly. Tier 1 (Haiku/GPT-4o-mini): classification, intent detection, summarization of structured data, simple extraction. Tier 2 (Sonnet/GPT-4o): complex generation, multi-step reasoning, nuanced tone. Tier 3 (Opus/o1): tasks where quality justifies cost, with human-in-the-loop review. Measure and report cost per tier monthly.

## Good vs. Bad Output

**Bad LLM Integration (Direct API, No Guards)**
```typescript
// No timeout, no retry, no validation, no error handling
async function generateSummary(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: `Summarize: ${text}` }]
  });
  return response.choices[0].message.content; // possibly null, no validation
}

// Called directly, result stored without checking
const summary = await generateSummary(userDocument);
await db.documents.update({ id: docId, summary }); // null or invalid content goes to DB
```
Problems: No timeout, no retry, no output schema, no null check, no fallback, no token counting, no error logging, frontier model for a summarization task.

**Good LLM Integration**
```typescript
import { z } from "zod";

const SummarySchema = z.object({
  summary: z.string().min(10).max(500),
  keyPoints: z.array(z.string()).min(1).max(5),
});

async function generateSummary(
  text: string,
  options: { maxRetries?: number; timeoutMs?: number } = {}
): Promise<z.infer<typeof SummarySchema> | null> {
  const { maxRetries = 1, timeoutMs = 10_000 } = options;

  const tokenCount = countTokens(text);
  if (tokenCount > 80_000) {
    text = compressToTokenLimit(text, 80_000); // enforce context budget
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await withTimeout(
        openai.chat.completions.create({
          model: "gpt-4o-mini", // tier 1 model for summarization
          messages: [
            { role: "system", content: SUMMARY_SYSTEM_PROMPT_V3 }, // versioned prompt
            { role: "user", content: text },
          ],
          response_format: { type: "json_object" },
        }),
        timeoutMs
      );

      const raw = response.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty LLM response");

      const parsed = SummarySchema.safeParse(JSON.parse(raw));
      if (parsed.success) {
        metrics.increment("llm.summary.success");
        metrics.histogram("llm.summary.tokens", response.usage?.total_tokens ?? 0);
        return parsed.data;
      }

      // On first attempt failure, retry with schema hint
      if (attempt === 0) {
        logger.warn({ attempt, error: parsed.error }, "LLM output schema invalid, retrying");
        continue;
      }
    } catch (err) {
      logger.error({ attempt, err }, "LLM summary call failed");
      if (attempt < maxRetries) continue;
    }
  }

  metrics.increment("llm.summary.fallback");
  return null; // caller handles graceful degradation
}
```

## Checklist / Deliverable Structure

1. Architecture decision documented: direct call, RAG, fine-tuning, or agent — with explicit justification against alternatives.
2. All LLM API calls have: timeout (≤ 10s for synchronous paths), retry with exponential backoff (max 2 retries), and defined fallback behavior.
3. Prompts are stored in source control, versioned (e.g., `SUMMARY_PROMPT_V3`), and referenced by version in code.
4. Token budget defined and enforced per call: system prompt, history, retrieved context, and output reservation have explicit ceilings.
5. Output validation implemented with a schema library (Zod, Pydantic) on every LLM response before downstream use.
6. RAG pipeline (if used): chunk size documented (default 512 tokens, 10-20% overlap), retrieval k set, reranker applied, retrieval precision monitored in production.
7. Model tiering applied: task type mapped to model tier, cost-per-request estimated for each tier.
8. Eval suite exists before first production deployment: ≥ 50 golden examples, LLM-as-judge scoring, minimum score threshold defined.
9. Streaming implemented for any user-facing output > 50 tokens; streaming errors handled gracefully with partial-output recovery logic.
10. Cost attribution instrumented: token usage tagged by feature, model, and tenant from day one.
11. Agentic loops (if used): maximum iteration count enforced, per-tool timeout set, total execution time ceiling configured.
12. Fallback stack documented: model fallback, cached response, graceful degradation path — each layer tested independently.
