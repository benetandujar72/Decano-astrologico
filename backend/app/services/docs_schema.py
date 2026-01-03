"""
Schema and mappings for documentation retrieval.

This module is intentionally dependency-free so it can be imported by:
- offline ingestion scripts (local)
- backend retrieval services (prod)
"""

from __future__ import annotations

from typing import Dict, Tuple


# Stable topic taxonomy used to tag chunks and filter retrieval.
DOC_TOPICS = {
    "general",
    "fundamentos",
    "personales",
    "sociales",
    "transpersonales",
    "nodos",
    "aspectos",
    "ejes",
    "evolucion",
}


# Map report modules to a canonical topic for retrieval filtering.
MODULE_TO_TOPIC: Dict[str, str] = {
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


# Short semantic queries per module.
# In Atlas M0 (no Vectorize), we precompute embeddings for these queries offline and store them
# in `documentation_query_vectors`, then the backend uses numeric `queryVector`.
MODULE_TO_QUERY: Dict[str, str] = {
    "modulo_1": "mandala astrologico, signos, polaridades, modalidades, enfoque psicologico y arquetipos (Carutti)",
    "modulo_2_fundamentos": "sol luna ascendente, luminares, ascendentes, fundamentos de interpretacion psicologica",
    "modulo_2_personales": "mercurio venus marte, planetas personales, funcion psicologica y expresion",
    "modulo_2_sociales": "jupiter saturno, planetas sociales, crecimiento, limites, sentido, responsabilidad",
    "modulo_2_transpersonales": "urano neptuno pluton, planetas transpersonales, ciclos, transformacion, liz greene",
    "modulo_2_nodos": "nodos lunares, karma, dharma, direccion evolutiva, proposito",
    "modulo_2_aspectos": "aspectos, orbes, dinamica entre planetas, tensiones, integracion, tierney",
    "modulo_2_ejes": "casas y ejes I-VII II-VIII III-IX IV-X V-XI VI-XII, dinamica polar y regentes, sasportas, mandala",
    "modulo_2_sintesis": "sintesis integradora de carta natal, patrones, ejes, aspectos, narrativa psicologica",
    "modulo_3_recomendaciones": "recomendaciones evolutivas, integracion, practicas, guia, proposito, nodos, saturno",
}


def module_topic_and_query(module_id: str) -> Tuple[str, str]:
    topic = MODULE_TO_TOPIC.get(module_id, "general")
    query = MODULE_TO_QUERY.get(module_id, MODULE_TO_QUERY["modulo_1"])
    return topic, query


