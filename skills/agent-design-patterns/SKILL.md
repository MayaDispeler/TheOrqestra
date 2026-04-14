---
name: agent-design-patterns
description: Authoritative reference for agent architecture selection, multi-agent orchestration, tool design, memory systems, and failure mode prevention
version: 1.0
---

# Agent Design Patterns Expert Reference

## Non-Negotiable Standards

1. **Every agent loop must have a hard iteration ceiling.** Set `max_iterations=20` for research agents, `max_iterations=10` for task agents. No exception. Uncapped loops will exhaust token budgets and produce runaway costs.
2. **Tool schemas must be self-documenting.** Every parameter needs a `description` field, `enum` constraints where applicable, and explicit `required` arrays. The LLM cannot reliably guess intent from parameter names alone.
3. **Never pass raw tool errors back to the LLM as-is.** Wrap all tool exceptions in structured error envelopes with `error_code`, `message`, and `retry_hint`. Unstructured stack traces cause hallucinated recovery attempts.
4. **Tool outputs exceeding 8,000 tokens must be truncated before injection.** Summarize or chunk; never stuff a full API response into context. This is the single largest cause of context overflow in production agents.
5. **Human-in-the-loop checkpoints are mandatory for irreversible actions.** Any tool that writes, deletes, sends, or pays requires an approval gate. No autonomous agent bypasses this.
6. **Evaluate trajectories, not just outcomes.** A correct answer reached via hallucinated reasoning is a ticking time bomb. Log every tool call and intermediate reasoning step.

## Decision Rules

1. **If the task requires sequential reasoning over unknown intermediate steps → use ReAct.** ReAct interleaves thought/act/observe and is the default single-agent pattern. Do not use Plan-and-Execute for tasks where you cannot enumerate steps upfront.
2. **If the task is decomposable into parallel subtasks with known structure → use Plan-and-Execute.** The planner emits a step list; executors run steps. Use LangGraph's `Send` API for fan-out.
3. **If output quality is the primary concern and cost is secondary → use Reflexion.** The agent scores its own output and retries up to 3 times. Do not apply Reflexion to latency-sensitive paths.
4. **If two specialized agents must negotiate (e.g., coder + critic) → use CAMEL or debate pattern.** Cap debate rounds at 5; beyond this, quality rarely improves and often degrades.
5. **If orchestrating >3 specialized agents → use supervisor-worker.** The supervisor holds the plan; workers are stateless executors. Workers never communicate directly with each other.
6. **If the task requires persistent state across sessions → use external memory (vector store or KV).** In-context memory is only appropriate for single-session, <32K token tasks.
7. **Never use CrewAI for production systems requiring fine-grained observability.** CrewAI abstracts away the execution graph; use LangGraph when you need deterministic control flow and step-level tracing.
8. **If the user's org already runs on Azure and uses .NET → AutoGen is the path of least resistance.** Otherwise, LangGraph is the default for Python-based agentic systems.
9. **If retrieval is needed mid-task (not just upfront) → agentic RAG inside the agent loop.** Pre-retrieval RAG is appropriate only when the full context is known before the agent starts.
10. **If agent confidence on a decision drops below 0.7 (self-reported) → force a human checkpoint.** Confidence scoring can be elicited via structured output: `{"answer": "...", "confidence": 0.65}`.

## Mental Models

### The OODA Loop for Agent Design
Observe (tool call) → Orient (context update) → Decide (reasoning) → Act (next tool call). Every agent loop is an OODA loop. Design for fast, cheap Observe steps and expensive, rare Act steps. Batch observations; minimize irreversible actions.

### Tool as Contract
A tool schema is a contract between the LLM and the runtime. Violations on either side cause failures. The LLM is the caller; the tool is the callee. The schema is the interface definition. Treat tool design with the same rigor as API design — versioning, deprecation, error contracts included.

### Memory Hierarchy (Cost vs. Persistence)
In-context (fastest, ephemeral) → Episodic/vector (semantic retrieval, persists across sessions) → Semantic/KG (structured relational, best for entity-heavy domains) → Procedural (fine-tuned weights, most durable but most expensive to update). Escalate up the hierarchy only when the lower tier cannot serve the use case.

### The Failure Mode Taxonomy
Three root causes cover >90% of agent failures: (1) **Context poisoning** — bad data enters the reasoning trace and cascades. (2) **Action amplification** — a small misunderstanding triggers a large irreversible action. (3) **Loop entrenchment** — the agent repeats the same failing strategy because it cannot detect its own stuckness. Design explicit detection for each: input validation for (1), approval gates for (2), duplicate-action detectors for (3).

## Vocabulary

| Term | Definition |
|---|---|
| ReAct | Reasoning + Acting pattern; agent alternates Thought/Action/Observation steps in a single loop |
| Plan-and-Execute | Two-phase pattern: planner generates a step list, separate executor runs each step |
| Reflexion | Agent evaluates and critiques its own output, iterates up to N times for quality improvement |
| CAMEL | Communicative Agents for Mind Exploration; role-assigned agents negotiate toward a shared goal |
| Supervisor-Worker | Orchestration topology where a controller agent dispatches tasks to stateless specialist agents |
| Tool Schema | JSON Schema definition attached to a function; governs what parameters the LLM may pass |
| Episodic Memory | Vector store of past interaction summaries, retrieved by semantic similarity at session start |
| Trajectory Eval | Evaluation of the sequence of actions/tool calls taken, not just the final output |
| HITL | Human-in-the-Loop; a mandatory pause for human approval before irreversible tool execution |
| Token Budget | Maximum tokens available across the full agent context window; requires active management |
| Stuck Detection | Logic that identifies repeated identical tool calls or zero-progress iterations and breaks the loop |
| Procedural Memory | Capability encoded in model weights via fine-tuning; durable but costly to update |

## Common Mistakes and How to Avoid Them

### 1. Vague Tool Descriptions

**Bad:**
```json
{
  "name": "search",
  "description": "Search for things",
  "parameters": {
    "query": {"type": "string"}
  }
}
```

**Fix:** Every tool description must state what the tool returns, when to use it, and what it cannot do.

```json
{
  "name": "web_search",
  "description": "Search the public web for recent information. Returns top 5 results with title, URL, and 200-char snippet. Use for current events, documentation lookup. Do NOT use for internal company data.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The search query. Be specific. Max 200 characters."
      },
      "num_results": {
        "type": "integer",
        "description": "Number of results to return. Default 5, max 10.",
        "default": 5
      }
    },
    "required": ["query"]
  }
}
```

### 2. No Iteration Ceiling

**Bad:**
```python
while not task_complete:
    result = agent.step()
```

**Fix:**
```python
MAX_ITERATIONS = 20
for i in range(MAX_ITERATIONS):
    result = agent.step()
    if result.is_complete:
        break
    if i > 0 and result.action == prev_action:
        raise AgentStuckError(f"Repeated action at iteration {i}")
    prev_action = result.action
else:
    raise AgentMaxIterationsError("Exceeded 20 iterations without completion")
```

### 3. Raw Tool Errors Injected into Context

**Bad:**
```python
try:
    result = call_api(params)
except Exception as e:
    return str(e)  # "ConnectionRefusedError: [Errno 111] Connection refused"
```

**Fix:**
```python
try:
    result = call_api(params)
except requests.Timeout:
    return {"error_code": "TIMEOUT", "message": "API timed out after 10s", "retry_hint": "Retry once after 5s"}
except requests.HTTPError as e:
    return {"error_code": f"HTTP_{e.response.status_code}", "message": "API returned error", "retry_hint": "Check query parameters"}
```

### 4. Entire Document Stuffed into Tool Output

**Bad:**
```python
def read_document(path: str) -> str:
    return open(path).read()  # Returns 50,000 tokens
```

**Fix:**
```python
def read_document(path: str, max_tokens: int = 4000) -> dict:
    content = open(path).read()
    tokens = tokenize(content)
    if len(tokens) > max_tokens:
        truncated = detokenize(tokens[:max_tokens])
        return {"content": truncated, "truncated": True, "total_tokens": len(tokens)}
    return {"content": content, "truncated": False, "total_tokens": len(tokens)}
```

### 5. No Human Gate Before Irreversible Actions

**Bad:**
```python
def delete_records(ids: list[str]) -> dict:
    db.delete_many(ids)
    return {"deleted": len(ids)}
```

**Fix:**
```python
def delete_records(ids: list[str], confirmed: bool = False) -> dict:
    if not confirmed:
        return {
            "requires_confirmation": True,
            "message": f"About to delete {len(ids)} records. Set confirmed=true to proceed.",
            "preview": ids[:5]
        }
    db.delete_many(ids)
    audit_log.write(action="delete", ids=ids, actor=current_user())
    return {"deleted": len(ids)}
```

## Good vs. Bad Output

### Agent Architecture Selection

**Bad:** "Use LangChain agents for your use case."

**Good:** "The task requires parallel document processing across 6 independent files, each needing retrieval and synthesis. Use LangGraph with Plan-and-Execute: the planner emits 6 `Send` events to a document_analyst worker node, results fan-in to a synthesis node. Set `max_iterations=10` per worker. Use Chroma for episodic memory if sessions persist beyond 1 hour."

### Tool Schema Quality

**Bad schema:** `{"name": "get_data", "description": "Gets data", "parameters": {"id": {"type": "string"}}}`

**Good schema:** Explicit description of return value format, error conditions, when-not-to-use guidance, all parameters described, required array set, enum constraints on categorical parameters.

### Memory Selection

**Bad:** "Store everything in the context window for simplicity."

**Good:** Conversation history > 20 turns: summarize to episodic vector store (500-token summaries, cosine similarity retrieval at session start). Entity facts: semantic KG (Neo4j or Zep). Learned procedures: fine-tune — not context.

## Checklist

- [ ] Every agent has `max_iterations` set (research: 20, task: 10, debate: 5 rounds)
- [ ] All tool schemas have `description` on every parameter and `required` array declared
- [ ] Tool outputs are truncated to ≤8,000 tokens before context injection
- [ ] Stuck detection logic is implemented (repeated-action check per iteration)
- [ ] All irreversible tools (write/delete/send/pay) require `confirmed=true` parameter
- [ ] Errors are returned as structured envelopes, not raw exception strings
- [ ] Human-in-the-loop checkpoints are defined for operations with real-world side effects
- [ ] Trajectory logging is enabled (every tool call + intermediate reasoning captured)
- [ ] Memory type is chosen based on persistence requirement (in-context vs. vector vs. KG)
- [ ] Framework selection is justified (LangGraph default; AutoGen for .NET/Azure; CrewAI never for production)
- [ ] Confidence threshold checked: agent pauses at <0.7 self-reported confidence
- [ ] Outcome eval AND trajectory eval are both implemented in the evaluation suite
