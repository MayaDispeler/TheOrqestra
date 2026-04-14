---
name: vector-database-patterns
description: Authoritative reference for vector database selection, indexing configuration, filtering strategies, and production operations
version: 1.0
---

# Vector Database Patterns Expert Reference

## Non-Negotiable Standards

1. **Choose the index algorithm before the database, not after.** HNSW for <10M vectors; IVF or DiskANN for >10M. The algorithm determines latency, recall, and memory profile. Switching post-index requires full rebuild.
2. **Distance metric must match the embedding model's training objective.** OpenAI Ada-002 and text-embedding-3: use cosine. Dot-product-normalized models (e.g., trained with dot product loss): use dot product. Euclidean is rarely correct for high-dimensional text embeddings.
3. **Never use Chroma in production with >500K vectors.** Chroma is a prototyping tool. It lacks horizontal scaling, does not support multi-tenancy isolation, and has no SLA. Graduate to Qdrant, Weaviate, or Pinecone before prod.
4. **Metadata filters must be designed at schema time, not query time.** Post-index addition of filterable fields requires full re-indexing in most databases. Plan your filter dimensions (date, doc_type, tenant_id, language) before first write.
5. **Batch upserts, never single-record writes at scale.** Single-record inserts with HNSW incur O(log N) graph update per record. Batch size of 100–500 vectors per request reduces overhead by 40–60%.
6. **Monitor recall degradation over time.** As the index grows and data distribution shifts, approximate recall drifts. Set automated recall checks against a golden query set; alert at <0.90 recall@10.

## Decision Rules

1. **If scale is <1M vectors, you need managed cloud, and filtering is simple → use Pinecone Serverless.** Pay-per-query, no infra. Limitation: no BM25 hybrid natively, limited filter complexity.
2. **If you need hybrid search (dense + sparse BM25) out of the box and rich object modeling → use Weaviate.** Weaviate's GraphQL interface and built-in BM25 make hybrid RAG straightforward. Self-hosted or managed.
3. **If you need on-premises deployment, fine-grained HNSW tuning, and high filter selectivity → use Qdrant.** Qdrant's payload indexing handles high-cardinality filters without recall degradation. Best Rust-native performance.
4. **If you already run PostgreSQL and vectors are <2M, filtering is complex relational → use pgvector.** Avoids infra sprawl. Use HNSW index in pgvector (added in 0.5.0). Accept ~20% latency premium over dedicated VDBs.
5. **If vectors exceed 10M and query throughput > 1,000 QPS → use Weaviate or Qdrant with IVF or DiskANN.** HNSW memory usage at 10M × 1536 dims = ~120GB RAM; DiskANN moves the graph to disk.
6. **If multi-tenancy requires hard data isolation (regulatory compliance) → use collection-per-tenant, not namespace-per-tenant.** Namespaces share the same index; collections are fully isolated. Cost is higher but isolation is guaranteed.
7. **If your embedding dim is 1536 (OpenAI) and cost is a concern → evaluate switching to text-embedding-3-small (1536 dim, 5× cheaper) or Cohere embed-english-light-v3 (384 dim, 8× cheaper).** Run RAGAS context precision comparison before committing.
8. **If pre-filter selectivity is >10% of the corpus → use pre-filter.** If selectivity is <1% (very narrow filter) → use post-filter with HNSW; the narrow filter set is small enough to re-score exactly.
9. **If your data has frequent updates (>5% of vectors change per day) → design for upsert, not insert.** Use deterministic IDs (hash of source content) to allow idempotent upserts. Never accumulate stale vectors.
10. **If you need cross-modal search (text + image in the same space) → use a shared embedding model (CLIP or imagebind) and a single collection with a `modality` metadata field.**

## Mental Models

### The VDB Selection Matrix
Four axes determine the right choice: (1) **Scale** (vectors count), (2) **Deployment model** (managed vs. self-hosted), (3) **Filter complexity** (simple equality vs. compound relational), (4) **Feature requirements** (hybrid search, multi-tenancy, cross-modal). Map your requirements on these four axes first; the decision tree narrows to 1–2 options.

### HNSW Tuning Triangle
Three HNSW parameters govern the quality-speed-memory tradeoff: `M` (graph connectivity, default 16; increase to 32–64 for higher recall at cost of memory), `ef_construction` (build-time search width, default 128; increase to 256 for better index quality at build time), `ef` (query-time search width, default 64; increase to 128–256 to recover recall at query time without rebuilding). Rule: if recall is low, increase `ef` first (free at query time). If still low, rebuild with higher `ef_construction`. Only increase `M` if you can afford 2× memory.

### Reciprocal Rank Fusion for Hybrid Search
RRF merges dense and sparse rankings without tuning weights: `score(d) = Σ 1/(k + rank_i(d))` where k=60 is standard. This outperforms linear combination in most benchmarks because it is robust to score scale differences between BM25 and cosine similarity. Use RRF as the default fusion strategy; only switch to linear combination if you have a large labeled dataset to tune the alpha weight.

### The Stale Vector Problem
Vectors become stale when the underlying source document changes. Three strategies: (1) **Version-based**: embed source hash as metadata; query filters out old versions. (2) **Upsert-based**: deterministic ID = hash(source_id + version); upsert overwrites. (3) **Tombstone-based**: soft-delete old vectors with `active=false` metadata; periodic hard-delete job. Strategy 2 is preferred for most RAG systems. Strategy 1 accumulates stale data; strategy 3 adds complexity.

## Vocabulary

| Term | Definition |
|---|---|
| HNSW | Hierarchical Navigable Small World; graph-based ANN index; best recall/latency for <10M vectors |
| IVF | Inverted File Index; clusters vectors into buckets; scales to >10M but requires `nprobe` tuning |
| DiskANN | Graph-based index that stores most graph edges on disk; enables 100M+ vector scale |
| ef_construction | HNSW build-time parameter; higher = better index quality, slower build; recommended 128–256 |
| M | HNSW graph connectivity per node; higher = better recall, more memory; recommended 16–64 |
| ANN | Approximate Nearest Neighbor; trades exact recall for speed; standard for all production vector search |
| Cosine Similarity | Angle-based distance metric; normalizes for vector magnitude; standard for text embeddings |
| Pre-filter | Apply metadata filter before ANN search; precise but can miss neighbors if filter is narrow |
| Post-filter | Run ANN search, then apply filter to results; works for narrow filters on large datasets |
| RRF | Reciprocal Rank Fusion; rank-based score fusion for combining dense and sparse search results |
| Namespace | Logical partition within a single index; shared infrastructure, lower isolation |
| Payload Index | Qdrant term for a secondary index on metadata fields; required for efficient filtered search |

## Common Mistakes and How to Avoid Them

### 1. Default HNSW Parameters for Production Index

**Bad:**
```python
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
    # Uses default M=16, ef_construction=100
)
```

**Fix:** Tune parameters for your recall/latency target:
```python
from qdrant_client.models import HnswConfigDiff

client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
    hnsw_config=HnswConfigDiff(
        m=32,                    # Higher connectivity for better recall
        ef_construct=256,        # Better index quality at build time
        full_scan_threshold=10_000  # Exact search below this count
    )
)
# At query time, set ef=128 for recall@10 > 0.95
```

### 2. Inserting Vectors Without Filterable Metadata

**Bad:**
```python
index.upsert(vectors=[(str(uuid4()), embedding)])
# No metadata — cannot filter by tenant, date, or doc_type later
```

**Fix:**
```python
index.upsert(vectors=[{
    "id": hashlib.sha256(f"{tenant_id}:{doc_id}:{version}".encode()).hexdigest(),
    "values": embedding,
    "metadata": {
        "tenant_id": tenant_id,
        "doc_type": doc_type,         # Indexed for filtering
        "source_url": source_url,
        "created_at": created_at.isoformat(),
        "language": language,
        "active": True
    }
}])
```

### 3. Single-Record Inserts at Ingestion Time

**Bad:**
```python
for doc in documents:
    embedding = embed(doc.text)
    vectordb.add(embedding, doc.metadata)  # N individual requests
```

**Fix:**
```python
BATCH_SIZE = 200

for i in range(0, len(documents), BATCH_SIZE):
    batch = documents[i:i + BATCH_SIZE]
    embeddings = embed_batch([d.text for d in batch])  # Single API call
    vectordb.upsert_batch([
        {"id": d.id, "values": emb, "metadata": d.metadata}
        for d, emb in zip(batch, embeddings)
    ])
```

### 4. No Recall Monitoring After Index Growth

**Bad:** Deploy vector DB, never measure recall degradation as corpus grows.

**Fix:**
```python
# golden_queries.json: list of {query, expected_doc_ids} compiled at index creation
def check_recall(vectordb, golden_queries: list[dict], k: int = 10) -> float:
    hits = 0
    for item in golden_queries:
        results = vectordb.query(item["query"], top_k=k)
        result_ids = {r.id for r in results}
        if any(eid in result_ids for eid in item["expected_doc_ids"]):
            hits += 1
    recall = hits / len(golden_queries)
    if recall < 0.90:
        alert(f"Recall@{k} degraded to {recall:.2f}")
    return recall

# Run nightly via cron or after every major batch upsert
```

### 5. Multi-Tenancy via Namespaces in Regulated Environments

**Bad:**
```python
# All tenants share the same HNSW index with namespace separation
index.query(vector=embedding, namespace=f"tenant_{tenant_id}", top_k=5)
# Cross-namespace data leakage possible via index-level attacks
```

**Fix:** Collection-per-tenant for hard isolation:
```python
def get_tenant_collection(tenant_id: str) -> str:
    return f"tenant_{tenant_id}_docs"

def query_tenant(tenant_id: str, embedding: list[float], k: int = 5):
    collection = get_tenant_collection(tenant_id)
    if not client.collection_exists(collection):
        raise ValueError(f"Unknown tenant: {tenant_id}")
    return client.search(collection_name=collection, query_vector=embedding, limit=k)
```

## Good vs. Bad Output

### Database Selection

**Bad:** "Use Pinecone for your vector search needs."

**Good:** "Corpus is 8M vectors (1536 dim, OpenAI embeddings), on-premises deployment required (EU data residency), complex compound filters (tenant_id + doc_type + date_range). Use Qdrant self-hosted with HNSW M=32, ef_construction=256, payload index on tenant_id + doc_type. Estimated RAM: ~48GB for index + vectors. Deploy on 3-node cluster for HA."

### HNSW vs. IVF Decision

**Bad:** "Use HNSW for best performance."

**Good:** "8M vectors: HNSW requires ~96GB RAM at M=16. If RAM is constrained to 32GB, switch to IVF-PQ with 256 clusters and PQ compression (4× size reduction, ~5% recall loss). Profile with nprobe=32 for recall@10 > 0.90. Above 20M vectors, evaluate Qdrant's on-disk HNSW or DiskANN."

## Checklist

- [ ] Database selected against 4-axis matrix: scale, deployment model, filter complexity, features required
- [ ] Distance metric matches embedding model training objective (cosine for OpenAI, dot product only where model trained for it)
- [ ] HNSW parameters explicitly set: M=32, ef_construction=256, ef=128 as starting point
- [ ] All vectors have structured, filterable metadata attached at upsert time
- [ ] Batch upserts implemented: 100–500 vectors per request
- [ ] Deterministic IDs (content hash) used for idempotent upserts
- [ ] Pre-filter vs. post-filter decision made based on filter selectivity (>10% = pre-filter)
- [ ] Multi-tenancy isolation strategy chosen: namespace (non-regulated) vs. collection-per-tenant (regulated)
- [ ] Chroma not used in production with >500K vectors
- [ ] Embedding dimension and cost tradeoff evaluated (1536 vs. 768 vs. 384)
- [ ] Recall monitoring job implemented with golden query set; alert at recall@10 < 0.90
- [ ] Hybrid search (BM25 + dense, RRF fusion) implemented for keyword-heavy query domains
