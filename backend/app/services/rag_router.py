import os
from datetime import datetime
from typing import Any, Dict, Optional, List

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover
    MongoClient = None  # type: ignore


class RagRouter:
    """
    Router de RAG: report_type -> (prompt_type/system prompt) + (docs_version + docs_topic)
    """

    def __init__(self):
        self._db = None
        self._col_mappings = None
        self._col_specialized_prompts = None
        self._init_mongo()

    def _init_mongo(self) -> None:
        if MongoClient is None:
            return
        mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
        if not mongo_url:
            return
        opts: Dict[str, Any] = {"serverSelectionTimeoutMS": 5000, "connectTimeoutMS": 10000}
        if "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url:
            opts.update({"tls": True, "tlsAllowInvalidCertificates": True})
        client = MongoClient(mongo_url, **opts)
        self._db = client.fraktal
        self._col_mappings = self._db.rag_mappings
        self._col_specialized_prompts = self._db.specialized_prompts

    def resolve(self, report_type: str) -> Dict[str, Any]:
        """
        Retorna el mapping efectivo para un tipo de informe.
        Defaults:
          - docs_version: env DOCS_VERSION
          - docs_topic: adultos
          - prompt_type: carutti
        """
        rt = (report_type or "individual").lower().strip()
        if rt not in {"individual", "pareja", "familiar", "equipo", "infantil", "adultos", "profesional"}:
            rt = "individual"

        docs_version = os.getenv("DOCS_VERSION", "default")
        default = {
            "report_type": rt,
            "docs_version": docs_version,
            "docs_topic": "adultos",
            "prompt_type": "carutti",
        }

        if self._col_mappings is None:
            return default

        doc = self._col_mappings.find_one({"report_type": rt}, projection={"_id": 0})
        if isinstance(doc, dict):
            out = {**default, **doc}
        else:
            out = default

        # Normalizar
        out["docs_version"] = str(out.get("docs_version") or docs_version)
        out["docs_topic"] = str(out.get("docs_topic") or "adultos").lower()
        out["prompt_type"] = str(out.get("prompt_type") or "carutti").lower()
        return out

    def get_prompt_content(self, prompt_type: str) -> Optional[str]:
        """
        Obtiene el contenido del prompt especializado (si existe) para inyectarlo en el prompt final.
        """
        if self._col_specialized_prompts is None:
            return None
        ptype = (prompt_type or "").lower().strip()
        if not ptype:
            return None
        # Preferir default, luego mejor rating
        doc = self._col_specialized_prompts.find_one(
            {"type": ptype},
            sort=[("is_default", -1), ("rating", -1), ("usage_count", -1)],
            projection={"_id": 0, "content": 1},
        )
        content = (doc or {}).get("content")
        return content if isinstance(content, str) and content.strip() else None


rag_router = RagRouter()


