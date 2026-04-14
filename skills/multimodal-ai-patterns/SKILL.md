---
name: multimodal-ai-patterns
description: Authoritative reference for vision-language model selection, image optimization, document AI, generation APIs, and multimodal RAG
version: 1.0
---

# Multimodal AI Patterns Expert Reference

## Non-Negotiable Standards

1. **Image resolution must meet the 768px minimum on the short side.** Below this threshold, text in documents becomes illegible to VLMs and extraction accuracy degrades significantly. For dense documents (financial tables, technical diagrams), use 1,568px minimum.
2. **Always choose the extraction method based on document type, not default behavior.** Native PDF text extraction is 10× faster and 100% accurate for text-only PDFs. VLM extraction is required only when the document contains tables, forms, charts, or scanned pages.
3. **Never pass base64-encoded images >5MB in a single API call.** Latency scales linearly with image size; use URL references to cloud storage (S3, GCS) for large images. OpenAI API accepts URLs for all supported image hosts.
4. **Image generation for production must use DALL-E 3 or Stable Diffusion API (Stability AI), not Midjourney.** Midjourney has no production API as of 2024; any "API" is unofficial and violates ToS. DALL-E 3 integrates with the OpenAI SDK; self-hosted SD via ComfyUI or diffusers for cost control.
5. **Whisper large-v3 is the default for transcription.** It outperforms all other open-source ASR models. For production, use the OpenAI Whisper API for <1 hour audio; self-hosted whisper.cpp for batch jobs or cost-sensitive workloads.
6. **Multimodal RAG requires visual embeddings, not text-only.** PDF pages with charts and diagrams cannot be adequately retrieved by text embeddings alone. Use ColPali or CLIP for visual document retrieval.

## Decision Rules

1. **If the task is screenshot analysis, UI review, or photo understanding → GPT-4o is the default.** Best overall vision performance, fastest, cheapest at scale.
2. **If the task requires reading dense text in scanned documents, handwriting, or mixed-layout pages → Claude 3.5 Sonnet.** Superior OCR accuracy compared to GPT-4o on text-heavy document images.
3. **If the document is a 100+ page PDF with mixed charts, tables, and text → Gemini 1.5 Pro with its 1M token context.** Gemini can ingest the entire PDF as images in a single call; GPT-4o and Claude require chunking.
4. **If the image is <512×512 or contains no text/detail → use `detail: low` (85 tokens).** For any document, diagram, or screenshot requiring precise analysis → use `detail: high` (variable, ~1,500–2,000 tokens per 512×512 tile).
5. **If PDF has a machine-readable text layer (not scanned) → extract text natively with PyMuPDF (fitz).** Only fall back to VLM for pages that contain tables or figures.
6. **If form parsing requires structured field extraction → use VLM with JSON output schema, not OCR + regex.** VLMs correctly handle non-standard form layouts; regex-based extraction breaks on format variation.
7. **If you need 10+ image generation calls per minute in production → use Stability AI's SDXL API (self-hosted ComfyUI for >100 calls/min) instead of DALL-E 3.** DALL-E 3 rate limits are 7 images/minute on Tier 1.
8. **If audio is >25MB → split into 10-minute chunks before Whisper API call.** The Whisper API has a 25MB file size limit; splitting on silence boundaries (librosa.effects.split) preserves accuracy.
9. **If the visual document retrieval corpus > 10K pages → use ColPali (PaliGemma-based late interaction) instead of CLIP.** ColPali achieves 20–30% higher retrieval accuracy on document pages than CLIP.
10. **If the task requires video understanding and video length < 90 seconds → use Gemini 1.5 Pro with video input.** For longer videos, extract 1 frame/second, embed with CLIP, and retrieve relevant frames before VLM analysis.

## Mental Models

### The Document Extraction Decision Tree
`Is the PDF machine-readable?` → Yes: use PyMuPDF native text extraction. `Does the extracted page contain tables?` → Yes: pass table region as image to VLM with JSON schema. `Does the page contain charts/figures?` → Yes: pass figure region to VLM for description. `Is the PDF scanned (image-only)?` → Use VLM on full page images at 150 DPI minimum (1,240px for A4). The decision at each node reduces cost; default to VLM only for nodes where text extraction fails.

### Token Cost Architecture for Vision
OpenAI vision pricing: `detail: low` = 85 tokens flat. `detail: high` = 85 base + 170 tokens per 512×512 tile. A 1,024×1,024 image at high detail = 85 + 4×170 = 765 tokens. A 2,048×2,048 image = 85 + 16×170 = 2,805 tokens. Resize images to the minimum resolution that preserves task-critical detail. For document text: 1,568px long side covers standard letter/A4 with sufficient DPI. Always calculate cost before choosing resolution.

### The Multimodal RAG Pyramid
Standard RAG ignores visual content in documents. Multimodal RAG has three levels: (1) **Text + caption RAG**: extract text natively; generate captions for figures using VLM at index time; embed both. (2) **CLIP-based retrieval**: embed page thumbnails with CLIP; retrieve visually similar pages. (3) **ColPali late-interaction**: token-level matching between query tokens and page patch tokens; highest precision for document retrieval. Use level 1 for cost-sensitive systems, level 3 for document-intensive RAG.

### The Audio Processing Pipeline
Speech → Preprocessing (noise reduction with noisereduce, normalization to -23 LUFS) → Chunking (10-minute segments on silence boundaries) → Whisper transcription → Post-processing (punctuation, speaker diarization with pyannote.audio) → Structured output. Diarization is separate from transcription; Whisper does not natively produce speaker labels. Combine Whisper + pyannote for speaker-attributed transcripts.

## Vocabulary

| Term | Definition |
|---|---|
| VLM | Vision-Language Model; processes image and text inputs jointly (GPT-4o, Claude 3.5 Sonnet, Gemini) |
| Detail Level | OpenAI API parameter controlling image tiling; `low` = 85 tokens, `high` = tile-based cost |
| ColPali | Late-interaction multimodal retrieval model; matches query tokens against page patch embeddings |
| CLIP | Contrastive Language-Image Pretraining; shared text/image embedding space; used for image search |
| Native PDF Extraction | Extracting text directly from PDF text layer without OCR; requires machine-readable PDF |
| PyMuPDF | Python library (fitz) for native PDF text and image extraction; fastest PDF processing option |
| Whisper | OpenAI's open-source ASR model; large-v3 is the current highest-accuracy variant |
| Diarization | Segmenting audio by speaker identity; "who spoke when"; separate from transcription |
| SDXL | Stable Diffusion XL; 1024×1024 native resolution image generation model |
| ComfyUI | Node-based GUI and API server for Stable Diffusion; used for production self-hosted image generation |
| Bounding Box | Rectangular coordinates (x, y, width, height) localizing detected objects or text regions in images |
| Tile | 512×512 pixel subdivision of a high-detail image; each tile costs 170 tokens in OpenAI vision API |

## Common Mistakes and How to Avoid Them

### 1. Low-Resolution Image Causing Failed Text Extraction

**Bad:**
```python
image = Image.open(document_scan).resize((400, 300))  # Too small for text
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": [
        {"type": "image_url", "image_url": {"url": to_base64(image)}}
    ]}]
)
```

**Fix:** Enforce minimum resolution and choose detail level explicitly:
```python
from PIL import Image

def prepare_document_image(image_path: str, min_short_side: int = 1568) -> str:
    img = Image.open(image_path)
    w, h = img.size
    short_side = min(w, h)
    if short_side < min_short_side:
        scale = min_short_side / short_side
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    # Upload to S3, return URL
    url = upload_to_s3(img)
    return url

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": [
        {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}}
    ]}]
)
```

### 2. Using VLM for Entire PDF When Native Extraction Suffices

**Bad:**
```python
# Sending every page as an image regardless of content
pages = pdf_to_images(pdf_path)
for page in pages:
    result = vlm_extract(page)
```

**Fix:** Decision tree per page:
```python
import fitz  # PyMuPDF

def extract_pdf_page(pdf_path: str, page_num: int) -> dict:
    doc = fitz.open(pdf_path)
    page = doc[page_num]

    # Try native text extraction first
    text = page.get_text()
    has_meaningful_text = len(text.strip()) > 100

    if has_meaningful_text:
        tables = extract_tables_with_camelot(pdf_path, page_num)
        return {"text": text, "tables": tables, "method": "native"}
    else:
        # Scanned or image-heavy page — fall back to VLM
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        result = vlm_extract_structured(img_bytes)
        return {"extracted": result, "method": "vlm"}
```

### 3. No JSON Schema for Structured Document Extraction

**Bad:**
```python
prompt = "Extract all the invoice fields from this image and tell me what you find."
# Returns free-form text; unparseable programmatically
```

**Fix:** Enforce structured output with explicit schema:
```python
INVOICE_PROMPT = """Extract invoice data as JSON. Return only valid JSON matching this schema:
{
  "invoice_number": "string",
  "vendor_name": "string",
  "issue_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "line_items": [{"description": "string", "quantity": number, "unit_price": number, "total": number}],
  "subtotal": number,
  "tax": number,
  "total_due": number
}
If a field is not visible, use null. Do not include any text outside the JSON object."""

response = client.chat.completions.create(
    model="gpt-4o",
    response_format={"type": "json_object"},
    messages=[{"role": "user", "content": [
        {"type": "text", "text": INVOICE_PROMPT},
        {"type": "image_url", "image_url": {"url": image_url, "detail": "high"}}
    ]}]
)
invoice = InvoiceSchema.model_validate_json(response.choices[0].message.content)
```

### 4. Whisper Applied to Oversized Audio Without Chunking

**Bad:**
```python
with open("recording.mp3", "rb") as f:
    transcript = client.audio.transcriptions.create(model="whisper-1", file=f)
# Fails silently or errors on files > 25MB
```

**Fix:**
```python
from pydub import AudioSegment
from pydub.silence import split_on_silence

def transcribe_long_audio(audio_path: str, max_chunk_ms: int = 600_000) -> str:
    audio = AudioSegment.from_file(audio_path)
    if len(audio) <= max_chunk_ms and audio.frame_count() * audio.frame_width < 25_000_000:
        with open(audio_path, "rb") as f:
            return client.audio.transcriptions.create(model="whisper-1", file=f).text

    chunks = split_on_silence(audio, min_silence_len=500, silence_thresh=-40, keep_silence=200)
    # Merge small chunks into ~10-minute segments
    merged = []
    current = AudioSegment.empty()
    for chunk in chunks:
        if len(current) + len(chunk) > max_chunk_ms:
            merged.append(current)
            current = chunk
        else:
            current += chunk
    merged.append(current)

    transcripts = []
    for i, segment in enumerate(merged):
        path = f"/tmp/chunk_{i}.mp3"
        segment.export(path, format="mp3")
        with open(path, "rb") as f:
            transcripts.append(client.audio.transcriptions.create(model="whisper-1", file=f).text)

    return " ".join(transcripts)
```

### 5. Text-Only Embeddings for Visual Document Retrieval

**Bad:**
```python
# Indexing PDFs by extracted text only
for page in pdf_pages:
    text = extract_text(page)
    embedding = openai.embeddings.create(input=text, model="text-embedding-3-large")
    vectordb.upsert(id=page.id, values=embedding)
# Charts and diagram-heavy pages have near-empty text → poor retrieval
```

**Fix:** Use ColPali for visual document retrieval:
```python
from colpali_engine.models import ColPali, ColPaliProcessor

model = ColPali.from_pretrained("vidore/colpali-v1.2")
processor = ColPaliProcessor.from_pretrained("vidore/colpali-v1.2")

def index_pdf_page_visually(page_image: Image.Image, page_id: str):
    inputs = processor.process_images([page_image])
    with torch.no_grad():
        embeddings = model(**inputs)  # Multi-vector patch embeddings
    vectordb.upsert_multivector(id=page_id, vectors=embeddings.tolist())

def retrieve_pages(query: str, k: int = 5):
    query_inputs = processor.process_queries([query])
    with torch.no_grad():
        query_embeddings = model(**query_inputs)
    return vectordb.query_multivector(query_embeddings.tolist(), top_k=k)
```

## Good vs. Bad Output

### VLM Selection

**Bad:** "Use GPT-4o for all document processing tasks."

**Good:** "Scanned 200-page legal contract with handwritten annotations: Claude 3.5 Sonnet (superior handwriting OCR). 150-page annual report with embedded charts and tables across all pages: Gemini 1.5 Pro (1M context, full PDF ingestion). UI screenshot comparison: GPT-4o (fastest, cheapest, excellent spatial reasoning)."

### Image Token Cost Estimation

**Bad:** "Use high detail for important images."

**Good:** "Invoice image 1,700×2,200px: detail=high → ceil(1700/512)×ceil(2200/512) = 4×5 = 20 tiles × 170 + 85 = 3,485 tokens. At gpt-4o pricing ($2.50/1M input tokens) = $0.0087 per image. For 10,000 invoices/day: $87/day. If budget is $20/day, resize to 1,024×1,325px → 8 tiles = 1,445 tokens = $0.0036/image = $36/day. Or use detail=low for screening pass at $0.000213/image."

## Checklist

- [ ] All document images resized to ≥768px short side (≥1,568px for dense text documents)
- [ ] `detail: low` used for non-text images (photos, icons); `detail: high` explicit for documents
- [ ] Images >5MB delivered via URL (S3/GCS), not base64 inline
- [ ] Native PDF text extraction (PyMuPDF) used first; VLM fallback only for tables/figures/scanned pages
- [ ] All structured extraction uses JSON schema in prompt + `response_format: json_object`
- [ ] Pydantic/Zod validation applied to all VLM structured outputs
- [ ] Whisper large-v3 used as default ASR; files >25MB split into ≤10-minute chunks on silence boundaries
- [ ] Speaker diarization (pyannote.audio) implemented separately from transcription when speaker attribution is needed
- [ ] Image generation uses DALL-E 3 API or Stability AI SDXL API — no unofficial Midjourney API
- [ ] Multimodal RAG uses ColPali for document-heavy corpora (>10K pages); CLIP acceptable for smaller corpora
- [ ] Video understanding: Gemini 1.5 Pro for <90s video; frame-extraction + CLIP retrieval for longer videos
- [ ] Token cost per image calculated before choosing resolution and detail level
