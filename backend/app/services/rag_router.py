import os
from datetime import datetime
from typing import Any, Dict, Optional, List

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover
    MongoClient = None  # type: ignore


def _load_context_map() -> Dict[str, Any]:
    """
    Load optional knowledge base context map from repo root.
    Path: data_knowledge_base/config/context_map.json
    """
    import json
    from pathlib import Path

    kb_root = os.getenv("KB_ROOT") or "data_knowledge_base"
    cfg_path = Path(kb_root) / "config" / "context_map.json"
    try:
        if cfg_path.exists():
            with cfg_path.open("r", encoding="utf-8") as f:
                return json.load(f) or {}
    except Exception:
        return {}
    return {}


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
            "docs_topics": ["adultos"],
            "prompt_type": "carutti",
        }

        if self._col_mappings is None:
            cfg = _load_context_map()
            resolved = self._resolve_from_context_map(rt, cfg) or {}
            return {**default, **resolved}

        doc = self._col_mappings.find_one({"report_type": rt}, projection={"_id": 0})
        if isinstance(doc, dict):
            out = {**default, **doc}
            # Si el mapping en BD es legacy (sin docs_topics), intentar completar desde context_map local.
            try:
                cfg = _load_context_map()
                from_cfg = self._resolve_from_context_map(rt, cfg) or {}
                # Solo aplicar si no hay docs_topics explícitos o si parecen ser los defaults legacy.
                if isinstance(from_cfg.get("docs_topics"), list) and from_cfg.get("docs_topics"):
                    existing_topics = out.get("docs_topics")
                    if (not isinstance(existing_topics, list)) or (not existing_topics) or (existing_topics == ["adultos"]):
                        out.update(from_cfg)
            except Exception:
                pass
        else:
            cfg = _load_context_map()
            resolved = self._resolve_from_context_map(rt, cfg) or {}
            out = {**default, **resolved}

        # Normalizar
        out["docs_version"] = str(out.get("docs_version") or docs_version)
        topics = out.get("docs_topics")
        if isinstance(topics, list) and topics:
            norm_topics = [str(t).replace("\\", "/").lower().strip() for t in topics if str(t).strip()]
        else:
            legacy = str(out.get("docs_topic") or "adultos").strip()
            norm_topics = [legacy] if legacy else ["adultos"]
        norm_topics = [t for t in norm_topics if t]
        out["docs_topics"] = norm_topics
        out["docs_topic"] = norm_topics[0] if norm_topics else "adultos"
        out["prompt_type"] = str(out.get("prompt_type") or "carutti").lower()

        # Hard fallback: si no hay mappings en BD o context_map disponible en runtime,
        # evitamos que el sistema se quede en un topic genérico "adultos" que NO existe
        # en la taxonomía real del knowledge base (carpetas).
        # Esto es crítico cuando strict_topic=True (no hay relajación).
        default_topics_by_rt: Dict[str, List[str]] = {
            "individual": ["00_core_astrologia", "01_individual_adulto"],
            "adultos": ["00_core_astrologia", "01_individual_adulto"],
            "infantil": ["00_core_astrologia", "02_infantil_neurodesarrollo"],
            "pareja": ["00_core_astrologia", "03_sistemico_relacional/sinastria_pareja"],
            "familiar": ["00_core_astrologia", "03_sistemico_relacional/constelacion_familiar"],
            "equipo": ["00_core_astrologia", "03_sistemico_relacional/equipos_trabajo"],
            "profesional": ["00_core_astrologia", "04_clinico_terapeutas"],
        }
        try:
            topics = out.get("docs_topics")
            if (not isinstance(topics, list)) or (not topics) or (topics == ["adultos"]):
                fallback = default_topics_by_rt.get(rt)
                if fallback:
                    out["docs_topics"] = [str(t).replace("\\", "/").strip() for t in fallback]
                    out["docs_topic"] = out["docs_topics"][0]
        except Exception:
            pass
        return out

    @staticmethod
    def _resolve_from_context_map(rt: str, cfg: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Resolve mapping using `data_knowledge_base/config/context_map.json`.
        Supports canonical keys from the IA taxonomy and maps current rt values:
          - individual/adultos -> adulto_completo
          - infantil -> infantil_evolutivo
          - pareja -> sinastria_pareja
          - familiar -> constelacion_familiar
          - equipo -> equipos_trabajo
          - profesional -> clinico_terapeutas
        """
        if not isinstance(cfg, dict):
            return None
        informe_tipo = cfg.get("informe_tipo") if isinstance(cfg.get("informe_tipo"), dict) else {}

        key_map = {
            "individual": "adulto_completo",
            "adultos": "adulto_completo",
            "infantil": "infantil_evolutivo",
            "pareja": "sinastria_pareja",
            "familiar": "constelacion_familiar",
            "equipo": "equipos_trabajo",
            "profesional": "clinico_terapeutas",
        }

        for k in [rt, key_map.get(rt, "")]:
            if not k:
                continue
            node = informe_tipo.get(k)
            if isinstance(node, dict):
                folders = node.get("folders")
                if isinstance(folders, list) and folders:
                    folders_norm = [str(f).replace("\\", "/").strip() for f in folders if str(f).strip()]
                    if folders_norm:
                        return {"docs_topics": folders_norm}
        return None

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


