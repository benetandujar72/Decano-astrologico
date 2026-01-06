import os
from datetime import datetime
from typing import Any, Dict, Optional

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover
    MongoClient = None  # type: ignore


DEFAULT_TEXTS: Dict[str, str] = {
    "title": "Informe Astrológico",
    "brand": "Motor Fraktal",
    "subtitle": "Informe técnico de astropsicología",
    "personal_data_title": "Datos Personales",
    "chart_title": "Carta Astral",
    "planets_title": "Posiciones Planetarias",
    "houses_title": "Cúspides de Casas (Placidus)",
    "analysis_title": "Análisis Psico-Astrológico",
    "footer_left": "Informe generado por Motor Fraktal",
    "footer_right": datetime.now().strftime("%d/%m/%Y"),
}


def load_report_texts() -> Dict[str, str]:
    """
    Carga textos editables del informe.
    Fuente preferida: MongoDB `report_texts` (_id='default') si REPORT_TEXTS_MODE=db.
    Fallback: DEFAULT_TEXTS.
    """
    mode = (os.getenv("REPORT_TEXTS_MODE") or "").lower().strip()
    if mode != "db" or MongoClient is None:
        return dict(DEFAULT_TEXTS)

    mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
    if not mongo_url:
        return dict(DEFAULT_TEXTS)

    opts: Dict[str, Any] = {"serverSelectionTimeoutMS": 5000, "connectTimeoutMS": 10000}
    if "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url:
        opts.update({"tls": True, "tlsAllowInvalidCertificates": True})

    try:
        client = MongoClient(mongo_url, **opts)
        db = client.fraktal
        col = db.report_texts
        doc = col.find_one({"_id": "default"}, projection={"_id": 0, "texts": 1})
        texts = (doc or {}).get("texts")
        if isinstance(texts, dict):
            merged = dict(DEFAULT_TEXTS)
            for k, v in texts.items():
                if isinstance(k, str) and isinstance(v, str):
                    merged[k] = v
            return merged
    except Exception:
        return dict(DEFAULT_TEXTS)

    return dict(DEFAULT_TEXTS)


