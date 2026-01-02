"""
Ingesta de documentación PDF a MongoDB (una sola vez) y precomputación de contextos por módulo.

Uso (ejemplos):
  python -m app.scripts.ingest_documentation --docs-path ../../documentacion --db fraktal --version v1
  DOCS_VERSION=v1 python -m app.scripts.ingest_documentation

Requisitos:
  - MONGODB_URL o MONGODB_URI configurado
  - PyPDF2 instalado
"""

import argparse
import glob
import hashlib
import os
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional

import PyPDF2
from pymongo import MongoClient


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def extract_text_from_pdf(file_path: str) -> Tuple[str, int]:
    text = ""
    pages = 0
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        pages = len(reader.pages)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text, pages


def chunk_text(text: str, chunk_size: int = 1400, overlap: int = 250) -> List[str]:
    """
    Chunking por caracteres con solape.
    Rápido, determinista y suficiente para recuperar contexto sin releer PDFs.
    """
    if not text:
        return []
    text = text.replace("\r\n", "\n")
    out: List[str] = []
    i = 0
    n = len(text)
    step = max(1, chunk_size - overlap)
    while i < n:
        out.append(text[i : i + chunk_size])
        i += step
    return out


def build_context_for_topic(index: Dict[str, str], topic: str, max_chars: int) -> str:
    """
    Replica (a grandes rasgos) la heurística actual: prioridad por docs + keywords
    y selección de párrafos largos.
    """
    topic_lower = (topic or "general").lower()
    keywords_map: Dict[str, Dict[str, Any]] = {
        "general": {"keywords": ["mandala", "signos", "general", "carutti"], "priority_docs": ["mandala", "signos"]},
        "fundamentos": {"keywords": ["planetas", "lunas", "ascend", "sol", "luna"], "priority_docs": ["planetas", "lunas", "asc"]},
        "personales": {"keywords": ["mercurio", "venus", "marte"], "priority_docs": ["planetas"]},
        "sociales": {"keywords": ["jupiter", "saturno"], "priority_docs": ["planetas"]},
        "transpersonales": {"keywords": ["urano", "neptuno", "pluton"], "priority_docs": ["greene", "planetas", "urano", "neptuno", "pluton"]},
        "nodos": {"keywords": ["nodos", "karma", "dharma"], "priority_docs": ["planetas", "nodos"]},
        "aspectos": {"keywords": ["aspectos", "orbe", "tierney"], "priority_docs": ["aspectos"]},
        "ejes": {"keywords": ["ejes", "casas", "mandala", "sasportas"], "priority_docs": ["mandala", "casas"]},
        "evolucion": {"keywords": ["evolucion", "dharma", "nodos", "saturno"], "priority_docs": ["planetas", "nodos", "saturno"]},
    }
    cfg = keywords_map.get(topic_lower, keywords_map["general"])
    search_terms = [k.lower() for k in cfg["keywords"]]
    priority = [p.lower() for p in cfg.get("priority_docs", [])]

    priority_found: List[Tuple[str, str]] = []
    found: List[Tuple[str, str]] = []

    for filename, content in index.items():
        fn = filename.lower()
        is_priority = any(p in fn for p in priority)
        matches = any(term in fn for term in search_terms)
        if is_priority:
            priority_found.append((filename, content))
        elif matches:
            found.append((filename, content))

    all_docs = priority_found + found
    if not all_docs:
        all_docs = list(index.items())

    ctx = ""
    for filename, doc_content in all_docs:
        if len(ctx) >= max_chars:
            break
        remaining = max_chars - len(ctx)
        if remaining <= 0:
            break

        paragraphs = doc_content.split("\n\n")
        relevant = ""
        for para in paragraphs:
            p = para.strip()
            if len(p) > 120 and not p.startswith("|"):
                relevant += p + "\n\n"
                if len(relevant) >= remaining:
                    break
        if not relevant:
            relevant = doc_content[:remaining]

        ctx += f"--- DOCUMENTO: {filename} ---\n{relevant[:remaining]}\n\n"

    return ctx


def run_ingest(
    *,
    mongo_url: str,
    db_name: str,
    docs_path: str,
    version: str,
    chunk_size: int = 1400,
    overlap: int = 250,
    job_id: Optional[str] = None,
    start_index: int = 0,
    max_files: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Ejecuta la ingesta programáticamente (usable desde endpoints admin sin Shell).
    Retorna un resumen con conteos.
    """
    mongodb_options: Dict[str, Any] = {"serverSelectionTimeoutMS": 5000, "connectTimeoutMS": 10000}
    if "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url:
        mongodb_options.update({"tls": True, "tlsAllowInvalidCertificates": True})

    client = MongoClient(mongo_url, **mongodb_options)
    db = client[db_name]
    col_sources = db.documentation_sources
    col_chunks = db.documentation_chunks
    col_module_contexts = db.documentation_module_contexts
    col_jobs = db.documentation_ingest_jobs

    pdf_files = sorted(glob.glob(os.path.join(docs_path, "*.pdf")))
    if not pdf_files:
        raise RuntimeError(f"No se encontraron PDFs en {docs_path}")

    # Batch control
    start_index = max(0, int(start_index or 0))
    if start_index >= len(pdf_files):
        raise RuntimeError(f"start_index fuera de rango: {start_index} (pdfs={len(pdf_files)})")
    if max_files is not None:
        max_files = int(max_files)
        if max_files <= 0:
            raise RuntimeError("max_files debe ser > 0")
        pdf_files = pdf_files[start_index : start_index + max_files]
    else:
        pdf_files = pdf_files[start_index:]

    def _job_update(payload: Dict[str, Any]) -> None:
        if not job_id:
            return
        try:
            payload = dict(payload)
            payload["updated_at"] = datetime.utcnow().isoformat()
            col_jobs.update_one({"job_id": job_id}, {"$set": payload})
        except Exception:
            # no romper la ingesta por fallos de logging/progreso
            pass

    _job_update(
        {
            "progress": {
                "stage": "starting",
                "docs_path": docs_path,
                "version": version,
                "total_pdfs": len(pdf_files),
                "start_index": start_index,
                "max_files": max_files,
            }
        }
    )

    index: Dict[str, str] = {}
    total_chunks = 0
    total_chars = 0

    for i, path in enumerate(pdf_files):
        filename = os.path.basename(path)
        _job_update(
            {
                "progress": {
                    "stage": "extracting_pdf",
                    "current_pdf": filename,
                    "current_pdf_index": i,
                    "current_pdf_path": path,
                }
            }
        )
        file_hash = sha256_file(path)
        text, pages = extract_text_from_pdf(path)
        index[filename] = text
        total_chars += len(text)

        now = datetime.utcnow().isoformat()
        src_doc = {
            "filename": filename,
            "sha256": file_hash,
            "extracted_text": text,
            "pages": pages,
            "extracted_at": now,
            "version": version,
        }
        col_sources.update_one({"filename": filename, "version": version}, {"$set": src_doc}, upsert=True)

        col_chunks.delete_many({"filename": filename, "version": version})
        chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)
        if chunks:
            bulk = []
            for i, ch in enumerate(chunks):
                bulk.append(
                    {
                        "filename": filename,
                        "chunk_id": i,
                        "text": ch,
                        "len": len(ch),
                        "version": version,
                        "created_at": now,
                    }
                )
            col_chunks.insert_many(bulk)
            total_chunks += len(chunks)

        _job_update(
            {
                "progress": {
                    "stage": "pdf_ingested",
                    "current_pdf": filename,
                    "pages": pages,
                    "chars": len(text),
                    "chunks": len(chunks),
                }
            }
        )

    module_to_topic = {
        "modulo_1": "general",
        "modulo_2_fundamentos": "fundamentos",
        "modulo_2_personales": "personales",
        "modulo_2_sociales": "sociales",
        "modulo_2_transpersonales": "transpersonales",
        "modulo_2_nodos": "nodos",
        "modulo_2_aspectos": "aspectos",
        "modulo_2_ejes": "ejes",
        "modulo_2_sintesis": "general",
        "modulo_3_recomendaciones": "evolucion",
    }

    sizes = [8000, 10000]
    built_at = datetime.utcnow().isoformat()
    _job_update({"progress": {"stage": "building_module_contexts", "modules": len(module_to_topic), "sizes": sizes}})
    for module_id, topic in module_to_topic.items():
        for max_chars in sizes:
            ctx = build_context_for_topic(index=index, topic=topic, max_chars=max_chars)
            doc = {
                "module_id": module_id,
                "topic": topic,
                "max_chars": int(max_chars),
                "context_text": ctx,
                "built_at": built_at,
                "version": version,
            }
            col_module_contexts.update_one(
                {"module_id": module_id, "max_chars": int(max_chars), "version": version},
                {"$set": doc},
                upsert=True,
            )

    return {
        "version": version,
        "docs_path": docs_path,
        "pdf_count": len(pdf_files),
        "total_chars": total_chars,
        "total_chunks": total_chunks,
        "modules": list(module_to_topic.keys()),
        "sizes": sizes,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs-path", default=None, help="Ruta al directorio con PDFs (default: DOCS_PATH o ../documentacion)")
    parser.add_argument("--db", default="fraktal", help="Nombre de base de datos Mongo (default: fraktal)")
    parser.add_argument("--version", default=None, help="Versión de docs (default: DOCS_VERSION o hash combinado)")
    parser.add_argument("--chunk-size", type=int, default=1400)
    parser.add_argument("--overlap", type=int, default=250)
    args = parser.parse_args()

    mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongo_url:
        raise SystemExit("Falta MONGODB_URL/MONGODB_URI en el entorno.")

    mongodb_options: Dict[str, Any] = {"serverSelectionTimeoutMS": 5000, "connectTimeoutMS": 10000}
    if "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url:
        mongodb_options.update({"tls": True, "tlsAllowInvalidCertificates": True})

    client = MongoClient(mongo_url, **mongodb_options)
    db = client[args.db]
    col_sources = db.documentation_sources
    col_chunks = db.documentation_chunks
    col_module_contexts = db.documentation_module_contexts

    # Resolver docs_path (container-friendly)
    if args.docs_path:
        docs_path = args.docs_path
    else:
        docs_path = os.getenv("DOCS_PATH")
        if not docs_path:
            # app/scripts -> app -> /app (cuando se copia backend/ a /app)
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            app_dir = os.path.dirname(base_dir)  # /app
            candidate_1 = os.path.join(app_dir, "documentacion")  # /app/documentacion (container)
            candidate_2 = os.path.join(os.path.dirname(app_dir), "documentacion")  # repo root/documentacion (dev)
            docs_path = candidate_1 if os.path.exists(candidate_1) else candidate_2

    pdf_files = sorted(glob.glob(os.path.join(docs_path, "*.pdf")))
    if not pdf_files:
        raise SystemExit(f"No se encontraron PDFs en {docs_path}")

    # Calcular versión por defecto como hash combinado de hashes de archivo
    per_file_hashes = [(os.path.basename(p), sha256_file(p)) for p in pdf_files]
    combined = hashlib.sha256(("|".join([f"{n}:{h}" for n, h in per_file_hashes])).encode("utf-8")).hexdigest()[:16]
    version = args.version or os.getenv("DOCS_VERSION") or f"docs_{combined}"

    print(f"[INGEST] docs_path={docs_path}")
    print(f"[INGEST] version={version}")
    print(f"[INGEST] PDFs={len(pdf_files)}")

    summary = run_ingest(
        mongo_url=mongo_url,
        db_name=args.db,
        docs_path=docs_path,
        version=version,
        chunk_size=args.chunk_size,
        overlap=args.overlap,
    )

    print("[INGEST] ✅ Terminado.")
    print(f"[INGEST] Resumen: pdfs={summary['pdf_count']}, chunks={summary['total_chunks']}, chars={summary['total_chars']}")
    print(f"[INGEST] Sugerencia: exporta DOCS_VERSION={version} en el backend para que use esta cache.")


if __name__ == "__main__":
    main()


