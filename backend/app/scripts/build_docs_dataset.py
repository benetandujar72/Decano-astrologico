"""
Offline builder: PDFs -> normalized text chunks -> MongoDB Atlas (for Vector Search).

Run locally (recommended) and point it to your MongoDB Atlas connection string.

Example (PowerShell):
  cd backend
  $env:MONGODB_URI="mongodb+srv://..."
  python -m app.scripts.build_docs_dataset --docs-path ".\\documentacion" --version "atlas_v1"

Notes:
  - This script is intended to be run OUTSIDE Render.
  - Uses PyMuPDF (pymupdf) if available for robust PDF extraction.
    If not installed, it falls back to PyPDF2 (less robust).
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from pymongo import MongoClient

from app.services.docs_schema import DOC_TOPICS, MODULE_TO_QUERY, module_topic_and_query


def _sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _normalize_text(text: str) -> str:
    if not text:
        return ""
    # unify newlines
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # remove excessive whitespace
    text = re.sub(r"[ \t]+", " ", text)
    # collapse too many blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_pages_text(path: str) -> List[str]:
    # Prefer PyMuPDF
    try:
        import fitz  # type: ignore

        doc = fitz.open(path)
        pages: List[str] = []
        for i in range(doc.page_count):
            page = doc.load_page(i)
            pages.append(page.get_text("text") or "")
        return pages
    except Exception:
        pass

    # Fallback PyPDF2
    import PyPDF2  # type: ignore

    pages: List[str] = []
    with open(path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            pages.append(page.extract_text() or "")
    return pages


def _chunk_pages(
    pages: List[str],
    *,
    chunk_size: int = 1400,
    overlap: int = 250,
) -> List[Tuple[int, int, str]]:
    """
    Returns list of (page_start, page_end, chunk_text).
    Chunking happens over the concatenated document but tracks page spans.
    """
    # Build a single string with page separators and remember offsets
    offsets: List[Tuple[int, int]] = []
    buf = []
    pos = 0
    for i, p in enumerate(pages):
        p = _normalize_text(p)
        start = pos
        buf.append(p)
        pos += len(p)
        end = pos
        offsets.append((start, end))
        # separator between pages
        buf.append("\n\n")
        pos += 2
    full = "".join(buf)
    if not full.strip():
        return []

    step = max(1, chunk_size - overlap)
    out: List[Tuple[int, int, str]] = []
    i = 0
    n = len(full)

    def page_for_offset(o: int) -> int:
        for idx, (s, e) in enumerate(offsets):
            if s <= o <= e:
                return idx + 1  # 1-based pages
        return len(offsets) if offsets else 1

    while i < n:
        chunk = full[i : i + chunk_size].strip()
        if chunk:
            ps = page_for_offset(i)
            pe = page_for_offset(min(n - 1, i + chunk_size))
            out.append((ps, pe, chunk))
        i += step
    return out


def _infer_topic(filename: str) -> str:
    fn = (filename or "").lower()
    rules: List[Tuple[str, List[str]]] = [
        ("aspectos", ["aspect", "tierney", "orbe"]),
        ("ejes", ["casa", "casas", "mandala", "sasportas", "eje"]),
        ("transpersonales", ["urano", "neptuno", "pluton", "greene", "exteriores"]),
        ("sociales", ["jupiter", "saturno", "sociales"]),
        ("personales", ["mercurio", "venus", "marte", "interiores"]),
        ("nodos", ["nodo", "nodos"]),
        ("fundamentos", ["luna", "sol", "asc", "ascendente", "luminar", "planeta"]),
        ("evolucion", ["evoluc", "dharma", "karma"]),
        ("general", ["signos", "mandala", "general", "carutti"]),
    ]
    for topic, keys in rules:
        if any(k in fn for k in keys):
            return topic
    return "general"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs-path", required=True, help="Directorio con PDFs (local).")
    parser.add_argument("--version", required=True, help="Versionado lógico de docs (ej: atlas_v1).")
    parser.add_argument("--db", default="fraktal", help="DB name in MongoDB Atlas.")
    parser.add_argument("--chunks-collection", default="documentation_chunks", help="Collection for chunks.")
    parser.add_argument("--sources-collection", default="documentation_sources", help="Collection for sources.")
    parser.add_argument("--query-vectors-collection", default="documentation_query_vectors", help="Collection for module query vectors.")
    parser.add_argument("--chunk-size", type=int, default=1400)
    parser.add_argument("--overlap", type=int, default=250)
    parser.add_argument("--embed-model", default="sentence-transformers/all-mpnet-base-v2", help="SentenceTransformer model id.")
    parser.add_argument("--embed-device", default="auto", help="auto|cpu|cuda")
    parser.add_argument("--embed-batch-size", type=int, default=64)
    parser.add_argument("--no-embeddings", action="store_true", help="No generar embeddings (solo chunks).")
    parser.add_argument("--copyright-safe", action="store_true", help="No guardar texto crudo: reescribir/resumir chunks antes de guardar y vectorizar.")
    parser.add_argument("--summary-max-chars", type=int, default=1200, help="Máximo de caracteres por chunk resumido (copyright-safe).")
    args = parser.parse_args()

    mongo_url = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL")
    if not mongo_url:
        raise SystemExit("Falta MONGODB_URI/MONGODB_URL en el entorno.")

    docs_path = args.docs_path
    if not os.path.isdir(docs_path):
        raise SystemExit(f"Directorio no encontrado: {docs_path}")

    pdfs = sorted([p for p in os.listdir(docs_path) if p.lower().endswith(".pdf")])
    if not pdfs:
        raise SystemExit(f"No se encontraron PDFs en {docs_path}")

    client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000, connectTimeoutMS=10000)
    db = client[args.db]
    col_chunks = db[args.chunks_collection]
    col_sources = db[args.sources_collection]
    col_qv = db[args.query_vectors_collection]

    version = args.version.strip()
    ingested_at = datetime.utcnow().isoformat()

    # Clean previous run for same version (idempotent)
    col_chunks.delete_many({"version": version})
    col_sources.delete_many({"version": version})
    col_qv.delete_many({"version": version})

    model = None
    if not args.no_embeddings:
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore
        except Exception as e:
            raise SystemExit(
                "Falta dependencia para embeddings. Instala: pip install sentence-transformers torch"
            ) from e

        device = (args.embed_device or "auto").lower().strip()
        if device == "auto":
            try:
                import torch  # type: ignore

                device = "cuda" if torch.cuda.is_available() else "cpu"
            except Exception:
                device = "cpu"

        model = SentenceTransformer(args.embed_model, device=device)

        # Precompute query vectors per module (small + stable)
        qv_docs: List[Dict[str, Any]] = []
        for mid in sorted(MODULE_TO_QUERY.keys()):
            topic, qtext = module_topic_and_query(mid)
            vec = model.encode([qtext], normalize_embeddings=True)[0]
            qv_docs.append(
                {
                    "version": version,
                    "module_id": mid,
                    "topic": topic,
                    "query_text": qtext,
                    "embedding": [float(x) for x in vec.tolist()],
                    "ingested_at": ingested_at,
                }
            )
        if qv_docs:
            col_qv.insert_many(qv_docs)
        print(f"[OK] query_vectors: modules={len(qv_docs)} model={args.embed_model}")

    total_chunks = 0
    for filename in pdfs:
        path = os.path.join(docs_path, filename)
        sha = _sha256_file(path)
        doc_id = f"{os.path.splitext(filename)[0]}:{sha[:12]}"
        topic = _infer_topic(filename)
        if topic not in DOC_TOPICS:
            topic = "general"

        pages_text = _extract_pages_text(path)
        pages_text = [_normalize_text(p) for p in pages_text]
        page_count = len(pages_text)

        chunks = _chunk_pages(pages_text, chunk_size=args.chunk_size, overlap=args.overlap)

        col_sources.insert_one(
            {
                "version": version,
                "doc_id": doc_id,
                "source_file": filename,
                "sha256": sha,
                "page_count": page_count,
                "topic": topic,
                "ingested_at": ingested_at,
            }
        )

        docs: List[Dict[str, Any]] = []
        texts: List[str] = []
        for idx, (ps, pe, text) in enumerate(chunks):
            original_text = text
            if args.copyright_safe:
                from app.services.docs_summarizer import summarize_for_rag

                summarized = summarize_for_rag(original_text, max_chars=int(args.summary_max_chars))
                # Guardar SOLO el resumen (copyright-safe) y un hash del original para trazabilidad
                text = summarized
                raw_sha = hashlib.sha256(original_text.encode("utf-8", errors="ignore")).hexdigest()
            else:
                raw_sha = None

            texts.append(text)
            docs.append(
                {
                    "version": version,
                    "doc_id": doc_id,
                    "source_file": filename,
                    "title": os.path.splitext(filename)[0],
                    "topic": topic,
                    "page_start": ps,
                    "page_end": pe,
                    "chunk_id": idx,
                    "text": text,
                    "len": len(text),
                    **({"raw_text_sha256": raw_sha} if raw_sha else {}),
                    "ingested_at": ingested_at,
                }
            )

        # Attach embeddings to chunks (offline)
        if model is not None and docs:
            vecs = model.encode(
                texts,
                batch_size=int(args.embed_batch_size),
                normalize_embeddings=True,
                show_progress_bar=False,
            )
            for i in range(len(docs)):
                docs[i]["embedding"] = [float(x) for x in vecs[i].tolist()]
        if docs:
            col_chunks.insert_many(docs)
            total_chunks += len(docs)
        print(f"[OK] {filename}: pages={page_count}, chunks={len(docs)}, topic={topic}")

    print(f"[DONE] version={version} pdfs={len(pdfs)} total_chunks={total_chunks}")
    if model is None:
        print("Next: re-run with embeddings (sentence-transformers) before creating Vector Search index.")
    else:
        print("Next: create Atlas Vector Search index on documentation_chunks.embedding and set DOCS_VERSION.")


if __name__ == "__main__":
    main()


