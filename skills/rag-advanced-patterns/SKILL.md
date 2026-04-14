---
name: rag-advanced-patterns
description: Authoritative reference for RAG pipeline optimization, chunking strategies, retrieval methods, and evaluation thresholds
version: 1.0
---

# RAG Advanced Patterns Expert Reference

## Non-Negotiable Standards

1. **Chunking strategy must match query type.** Fixed-size chunking (512 tokens, 10% overlap) is the floor, not the default. Hierarchical chunking with 512-token parent / 128-token child is required for knowledge-dense technical or legal documents.
2. **Reranking is not optional at production scale.** Similarity search alone degrades in precision beyond 50 retrieved candidates. Always rerank with Cohere Rerank v3 or ColBERT before passing to the LLM.
3. **Never retrieve and inject without measuring context precision.** Context precision < 0.75 means you are injecting noise. Stop and fix retrieval before optimizing generation.
4. **HyDE must be toggled per query type, not applied universally.** HyDE improves precision 15–30% in knowledge-dense domains (medical, legal, scientific). It degrades performance on factual lookup queries and recent events.
5. **RAGAS evaluations must run on every pipeline change.** Faithfulness, answer relevancy, context precision, and context recall are non-negotiable baseline metrics. No deploy without eval gate.
6. **Embedding model selection is a deployment-time decision, not runtime.** Switching embedding models requires re-indexing the entire corpus. Plan for this cost before choosing.

## Decision Rules

1. **If documents are uniform, short (<512 tokens), and factual → use fixed-size chunking at 512 tokens with 50-token overlap.** No need for hierarchical complexity.
2. **If documents have natural section boundaries (headers, paragraphs) and queries are conceptual → use semantic chunking with sentence-transformers boundary detection.** Chunks preserve coherent thought units.
3. **If queries span parent context (e.g., "what does section 3 say about X") → use hierarchical chunking: 512-token parent, 128-token child.** Retrieve children; return parent context to LLM.
4. **If corpus size < 1M vectors and queries are narrow → cosine similarity with top-k=10 suffices.** Skip MMR.
5. **If queries require diverse, non-redundant results (research, summarization) → use MMR (Maximal Marginal Relevance) with lambda=0.5 to balance relevance vs. diversity.**
6. **If the corpus contains both structured metadata and unstructured text → use hybrid BM25 + dense retrieval with Reciprocal Rank Fusion (RRF).** BM25 covers exact keyword matches dense retrieval misses.
7. **If query is multi-hop (answer requires chaining 2+ documents) → decompose query into sub-queries with LLM, retrieve independently, then synthesize.** Single-shot retrieval fails on multi-hop by design.
8. **If answer requires current entity relationships (org charts, product dependencies) → use Graph RAG.** Vector similarity cannot capture graph-structured relationships.
9. **If queries are highly ambiguous or abstract → apply HyDE.** Generate a hypothetical answer, embed it, retrieve against that embedding. Do not apply HyDE when query precision matters more than recall.
10. **If faithfulness score drops below 0.8 → the LLM is hallucinating beyond retrieved context.** Tighten the system prompt, reduce top-k, or switch to a model with lower hallucination rate.

## Mental Models

### The RAG Precision-Recall Tradeoff Triangle
Three forces in tension: (1) **Recall** (retrieve everything relevant — high top-k, loose similarity threshold), (2) **Precision** (inject only relevant context — reranking, low top-k), (3) **Latency** (fast retrieval — HNSW ANN, no reranking). You can optimize two; the third suffers. Production systems: optimize precision + latency; accept slightly lower recall. Research/analysis systems: optimize recall + precision; accept higher latency.

### Pipeline Stages as Quality Gates
RAG has 5 quality gates: (1) Indexing quality (chunk size, overlap, metadata), (2) Query processing (expansion, HyDE, decomposition), (3) Retrieval quality (top-k, similarity threshold, hybrid), (4) Reranking (cross-encoder score > 0.3 threshold), (5) Generation (faithfulness constraint in system prompt). A failure at stage N cannot be fixed at stage N+1. Diagnose stage by stage using RAGAS metrics.

### Agentic RAG as a Retrieval Loop
Standard RAG retrieves once before generation. Agentic RAG treats retrieval as a tool callable mid-generation. The agent decides when to retrieve, what to query, and whether the retrieved context is sufficient. Use agentic RAG when: (a) the full information need is not known upfront, (b) multi-hop reasoning requires iterative retrieval, (c) the agent must verify its own outputs against source.

### The Embedding Space Alignment Problem
Embeddings must capture the semantic relationship between queries and documents. Asymmetric embedding models (e.g., BGE with separate query/document encoders) outperform symmetric models for RAG by 8–15% on standard benchmarks. The embedding model must be trained on data similar in domain and format to your corpus — a model trained on Wikipedia performs poorly on code documentation.

## Vocabulary

| Term | Definition |
|---|---|
| Chunking | Splitting source documents into retrievable units; strategy critically affects retrieval quality |
| Hierarchical Chunking | Two-level split: large parent (512 tokens) for context, small children (128 tokens) for precise retrieval |
| HyDE | Hypothetical Document Embeddings; embed a generated answer to query the vector space instead of raw query |
| MMR | Maximal Marginal Relevance; retrieval scoring that penalizes redundancy between candidates |
| Hybrid Search | Combining dense vector search with sparse BM25; fused via Reciprocal Rank Fusion |
| RRF | Reciprocal Rank Fusion; score fusion formula: `sum(1/(k + rank_i))` where k=60 is standard |
| Reranking | Cross-encoder model re-scores top-N candidates from ANN retrieval for precision improvement |
| ColBERT | Late-interaction retrieval model; token-level matching; slower than bi-encoders, higher precision |
| Graph RAG | Retrieval over a knowledge graph to answer entity-relationship queries |
| RAGAS | Retrieval-Augmented Generation Assessment; framework measuring faithfulness, relevancy, precision, recall |
| Context Precision | Fraction of retrieved chunks that are actually relevant to the query; target >0.75 |
| Faithfulness | Fraction of answer claims that are grounded in retrieved context; target >0.8 |

## Common Mistakes and How to Avoid Them

### 1. Fixed Chunk Size Applied to All Document Types

**Bad:**
```python
text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
chunks = text_splitter.split_documents(docs)
```

**Fix:** Use document-type-aware chunking:
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

# For technical docs with hierarchical structure
parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2048, chunk_overlap=100)
child_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=50)

parent_docs = parent_splitter.split_documents(docs)
child_docs = child_splitter.split_documents(docs)

# Index children for retrieval; return parent for context injection
store = InMemoryStore()
retriever = ParentDocumentRetriever(
    vectorstore=vectordb,
    docstore=store,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter
)
```

### 2. No Reranking — Raw Similarity Top-K Injected

**Bad:**
```python
results = vectordb.similarity_search(query, k=5)
context = "\n".join([r.page_content for r in results])
```

**Fix:**
```python
import cohere

co = cohere.Client(api_key)
candidates = vectordb.similarity_search(query, k=20)  # Over-retrieve
docs_text = [c.page_content for c in candidates]

rerank_response = co.rerank(
    model="rerank-english-v3.0",
    query=query,
    documents=docs_text,
    top_n=5
)

reranked = [candidates[r.index] for r in rerank_response.results if r.relevance_score > 0.3]
context = "\n\n".join([r.page_content for r in reranked])
```

### 3. HyDE Applied to Factual Lookup Queries

**Bad:** Applying HyDE to all queries including "What is the capital of France?" — generates hallucinated hypothetical answer and retrieves wrong documents.

**Fix:** Gate HyDE on query classification:
```python
def should_apply_hyde(query: str, classifier_model) -> bool:
    query_type = classifier_model.classify(query)
    # Apply HyDE for: conceptual, analytical, synthesis queries
    # Skip HyDE for: factual, temporal, entity-lookup queries
    return query_type in {"conceptual", "analytical", "synthesis"}

if should_apply_hyde(query, classifier):
    hypothetical = llm.generate(f"Write a paragraph answering: {query}")
    query_embedding = embed(hypothetical)
else:
    query_embedding = embed(query)

results = vectordb.similarity_search_by_vector(query_embedding, k=10)
```

### 4. Missing Metadata in Chunks — No Filtering Possible

**Bad:**
```python
chunks = splitter.split_text(document_text)
vectordb.add_texts(chunks)  # No metadata
```

**Fix:** Always attach filterable metadata at index time:
```python
vectordb.add_documents([
    Document(
        page_content=chunk,
        metadata={
            "source": doc.source_url,
            "doc_type": doc.type,          # "contract", "manual", "faq"
            "date": doc.created_at.isoformat(),
            "section": chunk.section_header,
            "chunk_index": i,
            "parent_id": parent_doc.id
        }
    )
    for i, chunk in enumerate(chunks)
])
```

### 5. No RAGAS Evaluation — Flying Blind

**Bad:** Deploy RAG pipeline, measure only end-user satisfaction (too slow, too late).

**Fix:**
```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
from datasets import Dataset

eval_data = Dataset.from_dict({
    "question": test_questions,
    "answer": generated_answers,
    "contexts": retrieved_contexts,  # list of lists
    "ground_truth": reference_answers
})

results = evaluate(eval_data, metrics=[faithfulness, answer_relevancy, context_precision, context_recall])

# Enforce thresholds
assert results["faithfulness"] >= 0.80, f"Faithfulness {results['faithfulness']:.2f} below 0.80"
assert results["answer_relevancy"] >= 0.85, f"Relevancy {results['answer_relevancy']:.2f} below 0.85"
assert results["context_precision"] >= 0.75, f"Precision {results['context_precision']:.2f} below 0.75"
assert results["context_recall"] >= 0.70, f"Recall {results['context_recall']:.2f} below 0.70"
```

## Good vs. Bad Output

### Retrieval Strategy Selection

**Bad:** "Use similarity search to retrieve the top 5 documents and pass them to GPT-4."

**Good:** "Corpus is 500K product support tickets. Queries are keyword-heavy user descriptions. Use hybrid BM25 + dense retrieval (all-MiniLM-L6-v2 for speed) with RRF fusion, k=20 candidates, rerank with Cohere rerank-english-v3.0, top 5 results with relevance_score > 0.3. Expected context precision: 0.82."

### Chunk Size Guidance

**Bad:** "Use 1000 character chunks."

**Good:** "Legal contracts: 512-token parent / 128-token child hierarchical. FAQ pairs: whole Q+A as one chunk (typically 80–150 tokens). Code files: function-level chunking with tree-sitter, never split mid-function. News articles: paragraph-level semantic chunking."

## Checklist

- [ ] Chunking strategy is document-type-specific, not one-size-fits-all
- [ ] Hierarchical chunking (512 parent / 128 child) implemented for knowledge-dense documents
- [ ] All chunks have structured metadata (source, date, doc_type, section) attached at index time
- [ ] Over-retrieval (k=20) + reranking (Cohere rerank-v3 or ColBERT) applied before context injection
- [ ] HyDE is gated on query type classification, not applied universally
- [ ] Hybrid BM25 + dense search implemented for keyword-heavy query domains
- [ ] Multi-hop queries are decomposed into sub-queries before retrieval
- [ ] Context window budget enforced: ≤4,000 tokens of retrieved context per LLM call
- [ ] RAGAS eval suite runs on every pipeline change with hard thresholds: faithfulness >0.8, relevancy >0.85, precision >0.75, recall >0.7
- [ ] Graph RAG evaluated for entity-relationship query types
- [ ] Embedding model selection documented with re-indexing cost acknowledged
- [ ] Agentic retrieval loop implemented for tasks where information need is discovered mid-generation
