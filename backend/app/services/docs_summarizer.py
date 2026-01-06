import os
import re
from typing import Optional


def _heuristic_summary(text: str, max_chars: int = 1200) -> str:
    """
    Fallback sin LLM: extrae frases largas y las compacta (sin copiar párrafos enteros).
    """
    if not text:
        return ""
    t = re.sub(r"\s+", " ", text).strip()
    if len(t) <= max_chars:
        return t
    # coger las primeras frases y recortar
    parts = re.split(r"(?<=[\.\?\!])\s+", t)
    out = []
    used = 0
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if len(p) > 260:
            p = p[:260].rsplit(" ", 1)[0] + "…"
        if used + len(p) + 1 > max_chars:
            break
        out.append(p)
        used += len(p) + 1
        if len(out) >= 8:
            break
    return " ".join(out).strip()[:max_chars]


def summarize_for_rag(text: str, *, max_chars: int = 1200, model_name: Optional[str] = None) -> str:
    """
    Copyright-safe transform:
    - No guardar texto literal.
    - Reescribir ideas clave en lenguaje propio.
    - Preferir conceptos, definiciones y relaciones (no citas).
    """
    if not text:
        return ""

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _heuristic_summary(text, max_chars=max_chars)

    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=api_key)
        m = model_name or os.getenv("GEMINI_MODEL", "gemini-2.5-pro")
        model = genai.GenerativeModel(model_name=m)
        prompt = f"""
TAREA: Reescribe el siguiente texto en un resumen técnico orientado a embeddings (RAG), evitando plagio.

REGLAS:
- No copies frases largas del original.
- No uses comillas ni citas textuales.
- Extrae conceptos, mecanismos, definiciones y relaciones (causa/efecto).
- Usa lenguaje propio, estilo académico/clinico.
- Máximo {max_chars} caracteres.

TEXTO:
{text[:6000]}
"""
        resp = model.generate_content(prompt)
        out = (getattr(resp, "text", "") or "").strip()
        if not out:
            return _heuristic_summary(text, max_chars=max_chars)
        out = re.sub(r"\s+", " ", out).strip()
        return out[:max_chars]
    except Exception:
        return _heuristic_summary(text, max_chars=max_chars)


