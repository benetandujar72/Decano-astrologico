import os
import re
import sys
from typing import Any, Dict, List, Optional, Tuple

try:
    from pymongo.collection import Collection
except Exception:  # pragma: no cover
    Collection = None  # type: ignore

from app.services.docs_schema import module_topic_and_query


class DocsRetrievalService:
    """
    Retrieve relevant documentation chunks from MongoDB Atlas.

    Primary mode: Atlas Vector Search using numeric query vectors (no Vectorize required).
    Fallback mode: keyword scan within (version, topic).
    """

    def __init__(self, *, chunks_collection: Collection, query_vectors_collection: Optional[Collection] = None):
        if chunks_collection is None:
            raise RuntimeError("DocsRetrievalService requires a valid pymongo Collection")
        self.col = chunks_collection
        self.query_vectors_col = query_vectors_collection
        self.vector_index = os.getenv("ATLAS_VECTOR_INDEX", "docs_chunks_vector")
        self.vector_path = os.getenv("ATLAS_VECTOR_PATH", "embedding")
        # Allow switching pipeline type if needed
        self.vector_stage = os.getenv("ATLAS_VECTOR_STAGE", "$vectorSearch")  # or "$search"

    def retrieve_context_for_module(
        self,
        module_id: str,
        *,
        version: str,
        max_chars: int = 10000,
        limit: int = 12,
        num_candidates: int = 120,
    ) -> Tuple[str, Dict[str, Any]]:
        topic, query = module_topic_and_query(module_id)
        filter_q: Dict[str, Any] = {"version": version, "topic": topic}

        qvec = self._get_module_query_vector(module_id=module_id, version=version)
        if qvec is not None:
            try:
                chunks = self._vector_search(
                    query_vector=qvec,
                    filter_q=filter_q,
                    limit=limit,
                    num_candidates=num_candidates,
                )
                ctx, meta = self._assemble_context(chunks=chunks, max_chars=max_chars)
                meta.update({"mode": "atlas_vector", "topic": topic, "version": version})
                return ctx, meta
            except Exception as e:
                print(f"[DocsRetrieval] ⚠️ vector search failed: {type(e).__name__}: {e}", file=sys.stderr)

        # Fallback: keyword scan within the filtered set
        chunks = self._keyword_fallback(query=query, filter_q=filter_q, limit=limit)
        ctx, meta = self._assemble_context(chunks=chunks, max_chars=max_chars)
        meta.update({"mode": "keyword_fallback", "topic": topic, "version": version, "has_query_vector": bool(qvec)})
        return ctx, meta

    def _get_module_query_vector(self, *, module_id: str, version: str) -> Optional[List[float]]:
        """
        Load a precomputed query vector from MongoDB.
        Collection schema (recommended): documentation_query_vectors
          { version, module_id, topic, query_text, embedding:[float] }
        """
        if not self.query_vectors_col:
            return None
        try:
            doc = self.query_vectors_col.find_one(
                {"version": version, "module_id": module_id},
                projection={"_id": 0, "embedding": 1},
            )
            vec = (doc or {}).get("embedding")
            if isinstance(vec, list) and vec and isinstance(vec[0], (int, float)):
                return [float(x) for x in vec]
        except Exception:
            return None
        return None

    def _vector_search(
        self,
        *,
        query_vector: List[float],
        filter_q: Dict[str, Any],
        limit: int,
        num_candidates: int,
    ) -> List[Dict[str, Any]]:
        """
        Uses Atlas Vector Search. Expected index: `ATLAS_VECTOR_INDEX`.

        Implementation uses `$vectorSearch` stage with numeric query vectors.
        """
        pipeline: List[Dict[str, Any]] = []

        # Preferred stage: $vectorSearch
        if self.vector_stage == "$vectorSearch":
            pipeline.append(
                {
                    "$vectorSearch": {
                        "index": self.vector_index,
                        "queryVector": query_vector,
                        "path": self.vector_path,
                        "numCandidates": int(num_candidates),
                        "limit": int(limit),
                        "filter": filter_q,
                    }
                }
            )
            pipeline.append(
                {
                    "$project": {
                        "_id": 0,
                        "text": 1,
                        "source_file": 1,
                        "doc_id": 1,
                        "page_start": 1,
                        "page_end": 1,
                        "topic": 1,
                        "score": {"$meta": "vectorSearchScore"},
                    }
                }
            )
        else:
            # Alternate stage: Atlas Search ($search + knnBeta)
            pipeline.append(
                {
                    "$search": {
                        "index": self.vector_index,
                        "knnBeta": {
                            "vector": query_vector,
                            "path": self.vector_path,
                            "k": int(limit),
                            "filter": {
                                "compound": {
                                    "must": [
                                        {"equals": {"path": "version", "value": filter_q["version"]}},
                                        {"equals": {"path": "topic", "value": filter_q["topic"]}},
                                    ]
                                }
                            },
                        },
                    }
                }
            )
            pipeline.append({"$limit": int(limit)})
            pipeline.append(
                {
                    "$project": {
                        "_id": 0,
                        "text": 1,
                        "source_file": 1,
                        "doc_id": 1,
                        "page_start": 1,
                        "page_end": 1,
                        "topic": 1,
                        "score": {"$meta": "searchScore"},
                    }
                }
            )

        return list(self.col.aggregate(pipeline, allowDiskUse=False))

    def _keyword_fallback(self, *, query: str, filter_q: Dict[str, Any], limit: int) -> List[Dict[str, Any]]:
        """
        Cheap fallback (no Atlas Search index required): regex match a few keywords inside the filtered set.
        This is slower than vector search but still bounded by small collections.
        """
        # pick 6-10 keywords from query
        words = [w.strip().lower() for w in re.split(r"[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]+", query) if len(w.strip()) >= 4]
        words = list(dict.fromkeys(words))[:10]
        if not words:
            cursor = self.col.find(filter_q, {"_id": 0, "text": 1, "source_file": 1, "doc_id": 1, "page_start": 1, "page_end": 1, "topic": 1}).limit(int(limit))
            return list(cursor)

        regex = re.compile("|".join([re.escape(w) for w in words]), re.IGNORECASE)
        cursor = self.col.find(
            {**filter_q, "text": {"$regex": regex}},
            {"_id": 0, "text": 1, "source_file": 1, "doc_id": 1, "page_start": 1, "page_end": 1, "topic": 1},
        ).limit(int(limit))
        return list(cursor)

    @staticmethod
    def _assemble_context(*, chunks: List[Dict[str, Any]], max_chars: int) -> Tuple[str, Dict[str, Any]]:
        ctx_parts: List[str] = []
        used = 0
        sources: List[str] = []
        for ch in chunks:
            text = (ch.get("text") or "").strip()
            if not text:
                continue
            header = f"--- {ch.get('source_file','doc')} p.{ch.get('page_start','?')}-{ch.get('page_end','?')} ---\n"
            block = header + text + "\n\n"
            if used + len(block) > max_chars:
                remaining = max_chars - used
                if remaining > 200:
                    ctx_parts.append(block[:remaining])
                    used += remaining
                break
            ctx_parts.append(block)
            used += len(block)
            sf = ch.get("source_file")
            if sf and sf not in sources:
                sources.append(str(sf))

        return "".join(ctx_parts), {"chunks": len(chunks), "context_chars": used, "sources": sources[:10]}


