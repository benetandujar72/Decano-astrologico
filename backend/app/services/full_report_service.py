import os
import asyncio
import re
import json
import sys
from typing import Dict, List, Optional, Callable, Awaitable
from app.services.documentation_service import documentation_service
from app.services.ai_expert_service import get_ai_expert_service
from app.services.rag_router import rag_router
import app.services.ephemeris as ephemeris
import pytz
from datetime import datetime

# Intentar importar OrbEngine desde el root
try:
    # Ajustar path para encontrar orb_engine.py en el root
    root_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    if root_path not in sys.path:
        sys.path.append(root_path)
    from orb_engine import OrbEngine
except ImportError:
    OrbEngine = None

class FullReportService:
    """
    Servicio para generar informes astrológicos completos y extensos (30 páginas)
    siguiendo estrictamente el prompt CORE CARUTTI v6.0 (INTEGRACIÓN DINÁMICA).
    Utiliza documentación contextual, generación por secciones con confirmación paso a paso,
    y validación automática de contenido.
    """
    
    def __init__(self):
        """Inicializa el servicio"""
        self.doc_service = documentation_service
        self.ai_service = get_ai_expert_service()
        
        # Inicializar OrbEngine
        self.orb_engine = None
        if OrbEngine:
            mongo_url = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI")
            if mongo_url:
                try:
                    # Usar la base de datos 'fraktal' por defecto
                    self.orb_engine = OrbEngine(mongo_url, "fraktal")
                    print("✅ FullReportService - OrbEngine inicializado correctamente")
                except Exception as e:
                    print(f"⚠️ FullReportService - Error al inicializar OrbEngine: {e}")

    def _generate_ejes_template_prompt(self, *, report_mode: str = "full") -> str:
        """
        Genera el prompt específico para MÓDULO 2-VII (Ejes de Vida)
        con formato rígido obligatorio.
        """
        report_mode = (report_mode or "full").lower().strip()
        if report_mode not in {"full", "light"}:
            report_mode = "full"

        if report_mode == "light":
            return """
⚠️ FORMATO RÍGIDO OBLIGATORIO PARA EJES DE VIDA (MODO LIGHT 6–8 PÁGINAS):

Debes usar esta plantilla estructural para cada uno de los 6 ejes, pero con síntesis (sin redundancia):

PLANTILLA POR EJE (5 PARTES OBLIGATORIAS - MÍNIMO ~450 CARACTERES POR EJE):

1. **Título del Eje y Signos**
2. **Dinámica Psicológica del Eje** (introducción breve pero clara)
3. **Polo A (Casa X):** signo + planetas (si hay) / si está vacía: signo + regente
4. **Polo B (Casa Y):** idem
5. **Síntesis del Eje:** tensión y resolución

LISTA DE EJES A CUBRIR (6 EJES OBLIGATORIOS):
- Eje I – VII (Encuentro)
- Eje II – VIII (Posesión/Fusión)
- Eje III – IX (Pensamiento/Sentido)
- Eje IV – X (Individuación)
- Eje V – XI (Creatividad/Red)
- Eje VI – XII (Orden/Caos)
"""
        return """
⚠️ FORMATO RÍGIDO OBLIGATORIO PARA EJES DE VIDA (OBJETIVO: 30 PÁGINAS):

ESTÁ PROHIBIDO integrar las casas en un solo párrafo narrativo. Debes usar OBLIGATORIAMENTE esta plantilla estructural para cada uno de los 6 ejes:

PLANTILLA POR EJE (5 PARTES OBLIGATORIAS - MÍNIMO 1200 CARACTERES POR EJE):

1. **Título del Eje y Signos** (ej: "EJE I-VII ARIES-LIBRA")
   - Mínimo 100 caracteres

2. **Dinámica Psicológica del Eje** (Introducción EXTENSA que explica la tensión fundamental del eje)
   - Mínimo 300 caracteres
   - Desarrolla la tensión arquetípica, la polaridad, y la dinámica psicológica

3. **Polo A (Casa X):**
   - Si tiene planetas: Analiza CADA planeta individualmente con subapartados extensos (mínimo 400 caracteres por planeta)
   - Si está VACÍA: Analiza OBLIGATORIAMENTE el Signo en la cúspide (mínimo 300 caracteres) + la posición del Regente de ese signo (mínimo 300 caracteres) + aspectos del regente (mínimo 200 caracteres)
   - MÍNIMO 150 palabras por polo (equivalente a ~750 caracteres)
   - Misma profundidad que si hubiera planetas
   - Desarrolla: función, manifestación, vivencia, proyección

4. **Polo B (Casa Y):**
   - Si tiene planetas: Analiza CADA planeta individualmente con subapartados extensos (mínimo 400 caracteres por planeta)
   - Si está VACÍA: Analiza OBLIGATORIAMENTE el Signo en la cúspide (mínimo 300 caracteres) + la posición del Regente de ese signo (mínimo 300 caracteres) + aspectos del regente (mínimo 200 caracteres)
   - MÍNIMO 150 palabras por polo (equivalente a ~750 caracteres)
   - Misma profundidad que si hubiera planetas
   - Desarrolla: función, manifestación, vivencia, proyección

5. **Síntesis del Eje:** Tensión y resolución entre ambos polos
   - Mínimo 300 caracteres
   - Desarrolla cómo se integran ambos polos, la tensión, y la resolución

LISTA DE EJES A CUBRIR (6 EJES OBLIGATORIOS - MÍNIMO 1200 CARACTERES CADA UNO):
- Eje I – VII (Encuentro): Mínimo 1200 caracteres
- Eje II – VIII (Posesión/Fusión): Mínimo 1200 caracteres
- Eje III – IX (Pensamiento/Sentido): Mínimo 1200 caracteres
- Eje IV – X (Individuación): Mínimo 1200 caracteres
- Eje V – XI (Creatividad/Red): Mínimo 1200 caracteres
- Eje VI – XII (Orden/Caos): Mínimo 1200 caracteres

TOTAL MÍNIMO PARA ESTA SECCIÓN: 8000 caracteres (6 ejes × 1200 + introducción y síntesis)

RECUERDA: Todos los informes deben tener el mismo "peso" y densidad. Las casas vacías NO son excusa para escribir menos. El objetivo es 30 páginas. EXPÁNDE cada eje con máxima profundidad.
"""

    def _validate_section_content(self, section_id: str, content: str, expected_min_chars: int) -> tuple[bool, str]:
        """
        Valida el contenido generado para una sección.
        
        Returns:
            (is_valid, error_message)
        """
        if not content or len(content) < 100:
            return False, "Contenido demasiado corto o vacío"

        # Validación de extensión mínima v6.0
        if len(content) < expected_min_chars:
            return False, f"Extensión insuficiente: {len(content)} de {expected_min_chars} caracteres requeridos (Protocolo de Profundidad v6.0)"

        # Validación de Pregunta de Reflexión (OBLIGATORIA v6.0)
        if "Pregunta para reflexionar" not in content and "¿" not in content:
            return False, "Falta la Pregunta para Reflexionar obligatoria al final del módulo"

        # Validación de Lenguaje Amable/Abierto (v6.0)
        deter_words = [" es ", " será ", " siempre ", " nunca ", " indudablemente ", " inevitablemente "]
        found_deter = [w for w in deter_words if w in content.lower()]
        if found_deter and len(found_deter) > 2:
            return False, f"Se detectó lenguaje determinista prohibido por Protocolo v6.0: {found_deter}"

        drama_words = ["terrible", "catastrófico", "drama", "fatal", "maldición", "peor escenario"]
        found_drama = [w for w in drama_words if w in content.lower()]
        if found_drama:
            return False, f"Se detectó lenguaje dramático prohibido por Protocolo v6.0: {found_drama}"

        # Validaciones específicas por módulo
        if section_id == "modulo_2_ejes":
            # Verificar que tenga los 6 ejes mencionados
            ejes_requeridos = ["I-VII", "II-VIII", "III-IX", "IV-X", "V-XI", "VI-XII"]
            ejes_encontrados = sum(1 for eje in ejes_requeridos if eje in content)
            if ejes_encontrados < 6:
                return False, f"Solo se encontraron {ejes_encontrados} de los 6 ejes requeridos"
            
            # Verificar estructura de plantilla (debe tener títulos de ejes y secciones)
            if "Polo A" not in content or "Polo B" not in content:
                return False, "Falta la estructura de plantilla (Polo A / Polo B) en los ejes"
        
        if section_id == "modulo_3_transitos":
            if "Tránsitos Críticos" not in content and "Tránsitos" not in content:
                return False, "El análisis de tránsitos no parece seguir la jerarquía v6.0"

        return True, ""

    def build_chart_facts(self, chart_data: Dict) -> Dict:
        """
        Construye un set compacto de 'facts' a partir de carta_data para reducir tokens de prompt.
        Diseñado para ser robusto ante variaciones de shape (usa .get y fallbacks).
        """
        if not isinstance(chart_data, dict):
            return {"raw_type": str(type(chart_data))}

        datos_entrada = chart_data.get("datos_entrada") or {}
        planetas = chart_data.get("planetas") or chart_data.get("planets") or {}
        casas = chart_data.get("casas") or chart_data.get("houses") or []
        angulos = chart_data.get("angulos") or chart_data.get("angles") or {}
        aspectos_raw = chart_data.get("aspectos") or chart_data.get("aspects") or []

        # Reducir planetas a campos típicos
        planetas_compact: Dict[str, Dict] = {}
        if isinstance(planetas, dict):
            for nombre, pos in planetas.items():
                if not isinstance(pos, dict):
                    planetas_compact[str(nombre)] = {"raw": str(pos)[:120]}
                    continue
                planetas_compact[str(nombre)] = {
                    "signo": pos.get("signo") or pos.get("zodiac_sign") or "",
                    "casa": pos.get("casa") or pos.get("house") or "",
                    "grado": pos.get("grado") or pos.get("degree") or pos.get("lon") or "",
                    "retrogrado": pos.get("retrogrado") or pos.get("retro") or False,
                    "texto": pos.get("texto") or "",
                }

        # Reducir casas a (numero, signo, regente) si existen
        casas_compact: List[Dict] = []
        if isinstance(casas, list):
            for c in casas:
                if not isinstance(c, dict):
                    continue
                casas_compact.append({
                    "casa": c.get("casa") or c.get("numero") or c.get("house") or "",
                    "signo": c.get("signo") or c.get("zodiac_sign") or "",
                    "grado": c.get("grado") or c.get("degree") or c.get("lon") or "",
                    "regente": c.get("regente") or "",
                })

        # Reducir ángulos típicos
        angulos_compact: Dict[str, Dict] = {}
        if isinstance(angulos, dict):
            for k in ["ascendente", "medio_cielo", "descendente", "fondo_cielo", "parte_fortuna"]:
                v = angulos.get(k)
                if isinstance(v, dict):
                    angulos_compact[k] = {
                        "signo": v.get("signo") or "",
                        "grado": v.get("grado") or v.get("lon") or "",
                        "texto": v.get("texto") or "",
                    }

        # Filtrado inteligente de aspectos con OrbEngine si está disponible
        aspectos_compact: List[Dict] = []
        if self.orb_engine:
            config = self.orb_engine.get_effective_config("NATAL")
            if config:
                # Si tenemos orbes personalizados, filtramos la lista original
                for a in aspectos_raw:
                    if not isinstance(a, dict): continue
                    p1 = a.get("planeta1") or a.get("p1")
                    p2 = a.get("planeta2") or a.get("p2")
                    angle = a.get("angulo") or a.get("angle")
                    
                    if p1 and p2 and angle is not None:
                        # validar aspecto con lógica de orbes (Efecto Paraguas por defecto en NATAL)
                        res = self.orb_engine.validate_aspect(p1, p2, angle, config)
                        if res.get('isValid'):
                            aspectos_compact.append({
                                "p1": p1, "p2": p2,
                                "tipo": res.get("aspectType") or a.get("tipo") or a.get("aspect") or "",
                                "orbe": res.get("orb") or a.get("orbe") or a.get("orb") or "",
                                "nota": res.get("note", "")
                            })
        
        # Fallback si no hay OrbEngine o no se filtró nada útil
        if not aspectos_compact and isinstance(aspectos_raw, list):
            for a in aspectos_raw[:200]:
                if not isinstance(a, dict): continue
                aspectos_compact.append({
                    "p1": a.get("planeta1") or a.get("p1") or a.get("from") or "",
                    "p2": a.get("planeta2") or a.get("p2") or a.get("to") or "",
                    "tipo": a.get("tipo") or a.get("aspect") or "",
                    "orbe": a.get("orbe") or a.get("orb") or "",
                })

        return {
            "datos_entrada": datos_entrada,
            "planetas": planetas_compact,
            "casas": casas_compact,
            "angulos": angulos_compact,
            "aspectos": aspectos_compact,
        }

    async def _calculate_current_transits(self, natal_data: Dict) -> Dict:
        """
        Calcula tránsitos actuales comparándolos con las posiciones natales.
        """
        try:
            # 1. Obtener Julian Day actual (UTC)
            now = datetime.now(pytz.utc)
            hora_utc_dec = now.hour + now.minute/60.0 + now.second/3600.0
            import swisseph as swe
            jd_now = swe.julday(now.year, now.month, now.day, hora_utc_dec)

            # 2. Calcular posiciones de tránsitos
            transit_positions = ephemeris.calcular_posiciones_planetas(jd_now)
            
            natal_planetas = natal_data.get("planetas") or {}
            natal_casas = natal_data.get("casas_cuspides") or [c.get("grado") for c in natal_data.get("casas", [])]
            if not natal_casas and "casas" in natal_data:
                 # fallback a la lista de dicts
                 natal_casas = [c.get("grado") or c.get("cuspide") for c in natal_data.get("casas", [])]

            transitos_destacados = []
            
            # Obtener config de tránsitos
            transit_config = None
            if self.orb_engine:
                transit_config = self.orb_engine.get_config("TRANSIT")

            # 3. Comparar Tránsitos vs Natal
            for t_name, t_pos in transit_positions.items():
                if not t_pos: continue
                
                # Aspectos a planetas natales
                for n_name, n_pos in natal_planetas.items():
                    if not n_pos: continue
                    
                    dist = self.orb_engine.angular_distance(t_pos["longitud"], n_pos["longitud"]) if self.orb_engine else abs(t_pos["longitud"] - n_pos["longitud"]) % 360
                    if dist > 180: dist = 360 - dist
                    
                    # Validar si hay aspecto
                    is_valid = False
                    tipo_aspecto = ""
                    nota_tecnica = ""
                    if self.orb_engine and transit_config:
                        res = self.orb_engine.validate_aspect(t_name, n_name, dist, transit_config)
                        is_valid = res.get('isValid', False)
                        tipo_aspecto = res.get('aspectType', "")
                        nota_tecnica = res.get('note', "")
                    else:
                        # Fallback simple
                        for asp, exact in {"conjunction": 0, "opposition": 180, "square": 90, "trine": 120, "sextile": 60}.items():
                            if abs(dist - exact) <= 5: # orbe genérico 5°
                                is_valid = True
                                tipo_aspecto = asp
                                break
                    
                    if is_valid:
                        transitos_destacados.append({
                            "transit_planet": t_name,
                            "natal_planet": n_name,
                            "aspect": tipo_aspecto,
                            "orb": round(dist - self.orb_engine.get_exact_angle_for_aspect(tipo_aspecto), 2) if self.orb_engine and tipo_aspecto else round(dist, 2),
                            "signo_transito": t_pos["signo"],
                            "nota": nota_tecnica
                        })

            return {
                "fecha_actual": now.strftime("%Y-%m-%d %H:%M UTC"),
                "posiciones_transito": {k: {"signo": v["signo"], "grado": v["grado"]} for k,v in transit_positions.items() if v},
                "aspectos_transit_natal": transitos_destacados[:30] # Cap para el prompt
            }
        except Exception as e:
            print(f"⚠️ Error calculando tránsitos: {e}")
            return {"error": str(e)}

    def _facts_for_module(self, chart_facts: Dict, module_id: str) -> Dict:
        """
        Devuelve un subconjunto de facts relevante por módulo para recortar tokens.
        """
        # Multi-input: si vienen profiles[] ya pre-compactados desde el endpoint (chart_facts={"report_type":..,"profiles":[{name,facts},...]}),
        # NO debemos "podar" los facts porque perderíamos personas. Devolvemos el paquete completo y dejamos el recorte al límite de chars.
        try:
            if isinstance(chart_facts, dict) and isinstance(chart_facts.get("profiles"), list) and chart_facts.get("profiles"):
                return chart_facts
        except Exception:
            pass

        datos = chart_facts.get("datos_entrada", {})
        planetas = chart_facts.get("planetas", {}) or {}
        casas = chart_facts.get("casas", []) or []
        angulos = chart_facts.get("angulos", {}) or {}
        aspectos = chart_facts.get("aspectos", []) or []

        def pick_planets(names: List[str]) -> Dict:
            out = {}
            for n in names:
                if n in planetas:
                    out[n] = planetas[n]
            return out

        if module_id == "modulo_1":
            # Para balance/modalidades no hay garantía de campos; dar planetas + ángulos básicos
            return {"datos_entrada": datos, "angulos": angulos, "planetas": planetas}
        if module_id == "modulo_2_fundamentos":
            return {"datos_entrada": datos, "angulos": angulos, "planetas": pick_planets(["Sol", "Luna", "Ascendente"])}
        if module_id == "modulo_2_personales":
            return {"datos_entrada": datos, "planetas": pick_planets(["Mercurio", "Venus", "Marte"])}
        if module_id == "modulo_2_sociales":
            return {"datos_entrada": datos, "planetas": pick_planets(["Júpiter", "Jupiter", "Saturno"])}
        if module_id == "modulo_2_transpersonales":
            return {"datos_entrada": datos, "planetas": pick_planets(["Urano", "Neptuno", "Plutón", "Pluton"])}
        if module_id == "modulo_2_nodos":
            return {"datos_entrada": datos, "planetas": pick_planets(["Nodo Norte", "Nodo Sur", "Nodo_Norte", "Nodo_Sur"]), "aspectos": aspectos}
        if module_id == "modulo_2_aspectos":
            return {"datos_entrada": datos, "planetas": planetas, "aspectos": aspectos}
        if module_id == "modulo_2_ejes":
            return {"datos_entrada": datos, "planetas": planetas, "casas": casas, "angulos": angulos}
        if module_id == "modulo_3_transitos":
            return {
                "datos_entrada": datos,
                "planetas": planetas,
                "aspectos": aspectos,
                "transitos_actuales": chart_facts.get("transitos_actuales", {})
            }
        
        if module_id in {"modulo_2_sintesis", "modulo_3_recomendaciones"}:
            return {"datos_entrada": datos, "planetas": planetas, "casas": casas, "angulos": angulos, "aspectos": aspectos}

        return chart_facts

    def _format_facts_for_prompt(self, facts: Dict, max_chars: int = 12000) -> str:
        """
        Convierte facts a JSON compacto con límite defensivo.
        """
        try:
            txt = json.dumps(facts, ensure_ascii=False, separators=(",", ":"), default=str)
        except Exception:
            txt = str(facts)
        if len(txt) > max_chars:
            return txt[:max_chars] + "\n\n[TRUNCADO: facts excedían el máximo permitido]"
        return txt

    async def generate_single_module(
        self,
        chart_data: Dict,
        user_name: str,
        module_id: str,
        report_mode: str = "full",
        report_type: str = "individual",
        previous_modules: List[str] = None,
        progress_cb: Optional[Callable[[str, Optional[Dict]], Awaitable[None]]] = None,
        chart_facts: Optional[Dict] = None,
        chart_config: Optional[Dict] = None,
    ) -> tuple[str, bool, Dict]:
        """
        Genera un único módulo del informe.
        
        Returns:
            (content, is_complete) - contenido del módulo y si es el último módulo
        """
        if previous_modules is None:
            previous_modules = []

        async def _progress(step: str, meta: Optional[Dict] = None) -> None:
            if progress_cb:
                try:
                    await progress_cb(step, meta)
                except Exception:
                    # Nunca romper generación por fallo de tracking
                    pass

        report_mode = (report_mode or "full").lower().strip()
        if report_mode not in {"full", "light"}:
            report_mode = "full"

        report_type = (report_type or "individual").lower().strip()

        # Obtener la sección correspondiente (antes de cualquier uso de `section`)
        sections = self._get_sections_definition(report_mode=report_mode)
        section = next((s for s in sections if s['id'] == module_id), None)
        if not section:
            raise ValueError(f"Módulo {module_id} no encontrado")
        
        # Nota: NO precargar PDFs en producción. `DocumentationService.get_context_for_module()`
        # ya prioriza Atlas Vector Search/BD y solo cae a PDFs como último recurso.
        
        module_index = next((i for i, s in enumerate(sections) if s['id'] == module_id), -1)
        is_last = (module_index == len(sections) - 1)
        
        print(f"[MÓDULO {module_index + 1}/{len(sections)}] Generando: {section['title']}")
        await _progress("module_begin", {"index": module_index + 1, "total": len(sections), "title": section["title"]})
        
        # Obtener contexto de documentación
        max_context_chars = 10000 if section['requires_template'] else 8000
        await _progress("context_fetch_start", {"max_chars": max_context_chars})
        routing = rag_router.resolve(report_type)
        docs_version = routing.get("docs_version")
        docs_topic = routing.get("docs_topic")
        docs_topics = routing.get("docs_topics")
        prompt_type = routing.get("prompt_type")
        strict_topic = bool(routing.get("strict_topic", True))

        # Evitar bloquear el event loop: get_context_for_module usa pymongo (sync).
        context = await asyncio.to_thread(
            self.doc_service.get_context_for_module,
            section['id'],
            max_context_chars,
            docs_version=docs_version,
            docs_topic=docs_topic,
            docs_topics=docs_topics,
            strict_topic=strict_topic,
        )
        await _progress("context_fetch_done", {"context_chars": len(context)})

        # Facts compactos (reduce tokens y latencia manteniendo rigor)
        effective_facts = chart_facts if isinstance(chart_facts, dict) and chart_facts else self.build_chart_facts(chart_data)
        
        # Inyectar tránsitos si es el Módulo 3
        if module_id == "modulo_3_transitos":
            transitos_facts = await self._calculate_current_transits(chart_data)
            effective_facts["transitos_actuales"] = transitos_facts

        module_facts = self._facts_for_module(effective_facts, module_id)
        facts_text = self._format_facts_for_prompt(module_facts, max_chars=12000 if section['requires_template'] else 8000)
        
        # Construir prompt
        mode_directive = ""
        if report_mode == "light":
            mode_directive = """
MODO LIGHT (6–8 PÁGINAS):
- Sé conciso y evita redundancias.
- Mantén la estructura y rigor, pero sintetiza (prioriza lo más relevante).
- Objetivo global: 6–8 páginas totales, sin perder fidelidad.
"""

        objective_line = "exhaustivo (~30 páginas)" if report_mode == "full" else "ligero (6–8 páginas)"
        summarize_line = (
            "PROHIBIDO RESUMIR: Objetivo exhaustividad MÁXIMA ABSOLUTA"
            if report_mode == "full"
            else "Evita alargar artificialmente: sintetiza con precisión"
        )
        weight_line = (
            'Todos los informes deben tener el mismo "peso" y densidad (30 páginas mínimo)'
            if report_mode == "full"
            else "Mantén consistencia y claridad en todas las secciones"
        )

        base_prompt = f"""
TIPO DE INFORME (RAG ROUTER): {report_type}

PROTOCOLO DE INGESTA DE DOCUMENTACIÓN (DEEP SCAN & SÍNTESIS):
- Lee TODA la documentación provista antes de escribir
- Prioriza párrafos conceptuales densos sobre tablas resumen
- Integra múltiples fuentes en una sola narrativa
- NO digas "El libro dice...", simplemente explica la mecánica

CONTEXTO DE DOCUMENTACIÓN (Base de Conocimiento aislada por topic/version):
{context}

DATOS DE LA CARTA:
{facts_text}

{mode_directive}

DIRECTRIZ DE EXTENSIÓN Y HOMOGENEIDAD:
- Objetivo: {objective_line}
- {summarize_line}
- {weight_line}
- PROFUNDIDAD ENSAYÍSTICA: Desarrolla mecánica, psicología, vivencia, proyección y evolución con MÁXIMO DETALLE
- Si puedes escribir 4 párrafos, escribe 8. Si puedes escribir 8, escribe 12
- DESARROLLA CADA PUNTO con múltiples párrafos densos (mínimo 3-4 párrafos por concepto principal)
- Incluye ejemplos concretos, manifestaciones prácticas, vivencias específicas
- CASAS VACÍAS: Si una casa no tiene planetas, analiza OBLIGATORIAMENTE el Signo en la cúspide y la posición de su Regente con la misma profundidad (mínimo 150 palabras por polo)
- EXTENSIÓN MÍNIMA PARA ESTA SECCIÓN: {section['expected_min_chars']} caracteres. Si generas menos, estás resumiendo. EXPÁNDE.

INSTRUCCIÓN DE COMANDO:
{section['prompt']}
"""

        # Inyectar system prompt específico (si existe) en el prompt (workaround: Gemini system_instruction es estático)
        try:
            prompt_content = rag_router.get_prompt_content(prompt_type)
            if isinstance(prompt_content, str) and prompt_content.strip():
                base_prompt = f"SYSTEM PROMPT (INSTRUCCIÓN SUPERIOR):\n{prompt_content}\n\n" + base_prompt
        except Exception:
            pass
        
        # Si requiere plantilla (MÓDULO 2-VII), agregar instrucciones específicas
        if section['requires_template']:
            base_prompt += self._generate_ejes_template_prompt(report_mode=report_mode)
        
        # Agregar instrucciones finales
        base_prompt += f"""
REGLAS CRÍTICAS DE ESTA SALIDA (OBJETIVO: {"30 PÁGINAS" if report_mode=="full" else "6–8 PÁGINAS"}):
- MANTÉN el tono "Ghost Writer Académico" y el rigor del System Prompt
- NO uses introducciones ni meta-comunicación
- Empieza DIRECTAMENTE con el título del módulo
- EXTENSIÓN MÍNIMA OBLIGATORIA: {section['expected_min_chars']} caracteres. Si generas menos, ESTÁS RESUMIENDO.
- DESARROLLA CADA CONCEPTO con múltiples párrafos (mínimo 3-4 párrafos por concepto principal)
- Incluye ejemplos concretos, manifestaciones prácticas, vivencias específicas
- Profundiza en mecánica, psicología, vivencia, proyección y evolución para CADA elemento
- Al final, incluye OBLIGATORIAMENTE: "Pregunta para reflexionar: [pregunta profunda, abierta y psicológica]"
- Usa lenguaje de posibilidad: "tiende a", "puede", "frecuentemente" (evita "es", "siempre", "nunca")
- RECUERDA: El objetivo es generar un informe {"exhaustivo (~30 páginas)" if report_mode=="full" else "ligero (6–8 páginas)"}.

FORMATO Y ESTRUCTURA (UX/UI PROFESIONAL):
- USA markdown profesional para estructura visual clara
- Títulos de sección: ## TÍTULO DE SECCIÓN (espacios antes y después)
- Subsecciones: ### Subtítulo (si necesario)
- Párrafos separados por línea en blanco
- Listas con viñetas cuando enumeres características: "- Item"
- Énfasis: **negrita** para conceptos clave, *cursiva* para términos técnicos
- NUNCA uses etiquetas HTML como <d>, <span>, etc.
- Estructura clara: Introducción → Desarrollo (con subsecciones) → Síntesis/Cierre
- Usa separadores visuales "---" entre grandes bloques temáticos si necesario
"""
        
        # Generar con reintentos
        max_retries = 2
        response = ""
        is_valid = False
        
        usage_metadata_list = []  # Para acumular metadata de todos los intentos
        
        for attempt in range(max_retries + 1):
            print(f"[MÓDULO {module_index + 1}/{len(sections)}] Generando contenido (intento {attempt + 1}/{max_retries + 1})...")
            await _progress("ai_attempt_start", {"attempt": attempt + 1, "max_attempts": max_retries + 1})
            try:
                # Primer intento: prompt completo (docs + facts + reglas)
                # Reintentos: preferir "continuation" para evitar repetir todo el prompt (más rápido y barato)
                if attempt == 0:
                    attempt_prompt = base_prompt
                else:
                    attempt_prompt = f"""
CONTINÚA Y EXPANDE la salida anterior SIN reescribir desde cero.

OBJETIVO: cumplir estrictamente con los criterios de validación y la extensión mínima.
- Mantén el mismo tono y rigor.
- Añade profundidad ensayística (mecánica, psicología, vivencia, proyección, evolución).
- Completa explícitamente lo que falte (ej.: ejes faltantes, Polo A/B, o 'Pregunta para reflexionar').
- NO elimines contenido previo: solo amplía y completa.

SALIDA ANTERIOR (para expandir):
{response}

REGLAS CRÍTICAS:
- EXTENSIÓN MÍNIMA OBLIGATORIA: {section['expected_min_chars']} caracteres.
- Debe incluir OBLIGATORIAMENTE al final: \"Pregunta para reflexionar: ...\"
- Usa lenguaje de posibilidad: \"tiende a\", \"puede\", \"frecuentemente\".
"""
                response = await self.ai_service.get_chat_response(attempt_prompt, [])
                
                # Obtener metadata de tokens
                last_metadata = self.ai_service.get_last_usage_metadata()
                if last_metadata:
                    usage_metadata_list.append(last_metadata)
                
                if not response or len(response.strip()) == 0:
                    raise ValueError("La respuesta de la IA está vacía")
                
                print(f"[MÓDULO {module_index + 1}/{len(sections)}] Respuesta recibida: {len(response)} caracteres")
                await _progress("ai_attempt_done", {"attempt": attempt + 1, "response_chars": len(response)})
                
                is_valid, error_msg = self._validate_section_content(
                    section['id'], 
                    response, 
                    section['expected_min_chars']
                )
                
                if is_valid:
                    print(f"[MÓDULO {module_index + 1}/{len(sections)}] ✅ Confirmado: {len(response)} caracteres")
                    await _progress("validation_ok", {"response_chars": len(response)})
                    break
                else:
                    await _progress("validation_failed", {"reason": error_msg, "response_chars": len(response), "expected_min_chars": section["expected_min_chars"]})
                    if attempt < max_retries:
                        print(f"[MÓDULO {module_index + 1}/{len(sections)}] ⚠️ Contenido corto ({len(response)} chars, esperado: {section['expected_min_chars']}). Reintentando...")
                        # En reintento no inflamos el base_prompt; la instrucción de continuación ya fuerza expansión.
                    else:
                        print(f"[MÓDULO {module_index + 1}/{len(sections)}] ⚠️ Contenido inválido después de {max_retries + 1} intentos. Se intentará expansión adicional en modo FULL.")
            except Exception as e:
                print(f"[MÓDULO {module_index + 1}/{len(sections)}] ❌ Error en intento {attempt + 1}: {type(e).__name__}: {e}")
                await _progress("ai_attempt_error", {"attempt": attempt + 1, "error": f"{type(e).__name__}: {str(e)}"})
                if attempt == max_retries:
                    raise Exception(f"Error generando módulo después de {max_retries + 1} intentos: {str(e)}")
                # Continuar al siguiente intento
        
        # En modo FULL, no aceptamos módulos que no cumplan longitud/formato:
        # hacemos expansiones "append-only" (solo texto nuevo) O regeneración completa según el tipo de error.
        if report_mode == "full":
            max_expansions = int(os.getenv("FULL_REPORT_MAX_EXPANSIONS", "6"))
            max_regenerations = int(os.getenv("FULL_REPORT_MAX_REGENERATIONS", "3"))
            tail_chars = int(os.getenv("FULL_REPORT_EXPANSION_TAIL_CHARS", "1800"))
            expansions_done = 0
            regenerations_done = 0

            while True:
                is_valid, error_msg = self._validate_section_content(section["id"], response, section["expected_min_chars"])
                if is_valid:
                    break

                # Determinar si necesitamos regeneración completa o solo expansión
                needs_regeneration = (
                    "lenguaje determinista" in error_msg.lower() or
                    "lenguaje dramático" in error_msg.lower() or
                    "polo a" in error_msg.lower() or
                    "polo b" in error_msg.lower()
                )

                if needs_regeneration:
                    # REGENERACIÓN COMPLETA: el problema está en el contenido existente
                    if regenerations_done >= max_regenerations:
                        raise Exception(f"Módulo {section['id']} no cumple criterios FULL después de {max_regenerations} regeneraciones: {error_msg}")

                    regenerations_done += 1
                    await _progress("ai_regenerate_start", {
                        "regeneration": regenerations_done,
                        "max": max_regenerations,
                        "reason": error_msg
                    })

                    # Prompt de regeneración con corrección específica
                    regen_prompt = f"""
REESCRIBE COMPLETAMENTE el módulo corrigiendo los siguientes problemas:

❌ PROBLEMA DETECTADO: {error_msg}

✅ INSTRUCCIONES DE CORRECCIÓN:
- ELIMINA por completo lenguaje determinista: NO uses "es", "será", "siempre", "nunca", "indudablemente"
- USA SIEMPRE lenguaje de posibilidad: "tiende a", "puede", "frecuentemente", "a menudo", "sugiere"
- EVITA lenguaje dramático: NO uses "terrible", "catastrófico", "fatal", "maldición"
- Mantén un tono profesional, empático y abierto a múltiples interpretaciones

REQUISITOS TÉCNICOS:
- Longitud mínima: {section['expected_min_chars']} caracteres
- Formato: Mantén títulos/subtítulos del módulo
- OBLIGATORIO: Termina con "Pregunta para reflexionar: ..."
{f"- IMPORTANTE: Incluye estructura 'Polo A' y 'Polo B' para cada eje" if "modulo_2_ejes" in section["id"] else ""}

CONTEXTO DE LA CARTA (para rehacer el análisis):
{base_prompt}

GENERA EL MÓDULO COMPLETO CORREGIDO:
"""

                    response = await self.ai_service.get_chat_response(regen_prompt, [])

                    # Registrar metadata de tokens de regeneración
                    last_metadata = self.ai_service.get_last_usage_metadata()
                    if last_metadata:
                        usage_metadata_list.append(last_metadata)

                    await _progress("ai_regenerate_done", {
                        "regeneration": regenerations_done,
                        "response_chars": len(response)
                    })

                else:
                    # EXPANSIÓN: solo falta longitud o pregunta de reflexión
                    if expansions_done >= max_expansions:
                        raise Exception(f"Módulo {section['id']} no cumple criterios FULL después de {max_expansions} expansiones: {error_msg}")

                    missing = []
                    if len(response) < int(section["expected_min_chars"]):
                        missing.append(f"EXTENSIÓN: faltan al menos {int(section['expected_min_chars']) - len(response)} caracteres")
                    if "pregunta para reflexionar" not in (response or "").lower():
                        missing.append("CIERRE: falta 'Pregunta para reflexionar:' al final")

                    expansions_done += 1
                    await _progress("ai_expand_start", {"expansion": expansions_done, "max": max_expansions, "reason": error_msg})

                    extra_prompt = f"""
CONTINÚA el texto del módulo y DEVUELVE SOLO TEXTO NUEVO (no repitas nada).

Requisitos:
- Longitud total mínima del módulo: {section['expected_min_chars']} caracteres (sumando lo ya escrito + lo nuevo).
- Añade profundidad ensayística: mecánica, psicología, vivencia, proyección y evolución.
- Mantén el mismo formato (títulos/subtítulos) y el tono.
- USA lenguaje de posibilidad: "tiende a", "puede", "frecuentemente" (NO uses "es", "será", "siempre")
- Termina con: "Pregunta para reflexionar: ..."
- Pendientes: {", ".join(missing) if missing else error_msg}

ÚLTIMOS PÁRRAFOS (contexto, NO repitas):
{(response or "")[-tail_chars:]}
"""

                    extra = await self.ai_service.get_chat_response(extra_prompt, [])

                    # Registrar metadata de tokens de expansión
                    last_metadata = self.ai_service.get_last_usage_metadata()
                    if last_metadata:
                        usage_metadata_list.append(last_metadata)

                    if extra and extra.strip():
                        response = (response.rstrip() + "\n\n" + extra.strip())
                    await _progress("ai_expand_done", {"expansion": expansions_done, "response_chars": len(response)})

        if not response or len(response.strip()) == 0:
            raise ValueError("No se pudo generar contenido para el módulo después de todos los intentos")
        
        # Calcular total de tokens de todos los intentos
        total_usage_metadata = {
            'prompt_token_count': sum(m.get('prompt_token_count', 0) for m in usage_metadata_list),
            'candidates_token_count': sum(m.get('candidates_token_count', 0) for m in usage_metadata_list),
            'total_token_count': sum(m.get('total_token_count', 0) for m in usage_metadata_list),
            'attempts': len(usage_metadata_list)
        }

        await _progress("module_done", {"response_chars": len(response), "attempts": total_usage_metadata.get("attempts", 0)})
        
        return response, is_last, total_usage_metadata

    def _get_sections_definition(self, *, report_mode: str = "full") -> List[Dict]:
        """Retorna la definición de todas las secciones (full/exhaustivo o light/ligero)."""
        report_mode = (report_mode or "full").lower().strip()
        if report_mode not in {"full", "light"}:
            report_mode = "full"

        sections = [
            {
                "id": "modulo_1",
                "title": "MÓDULO 1: ESTRUCTURA ENERGÉTICA BASE (DIAGNÓSTICO)",
                "topic": "general",
                "prompt": "EJECUTA EL MÓDULO 1 del System Prompt: 'ESTRUCTURA ENERGÉTICA BASE'. Analiza EXHAUSTIVAMENTE: El Balance de Sustancia (Elementos) - desarrolla cada elemento en profundidad, El Ritmo (Modalidades) - analiza cada modalidad y su impacto, La Tensión Vital Primaria (Sol-Luna-Asc) - integra los tres componentes con detalle, y la Polarización Transpersonal - identifica y desarrolla cada aspecto transpersonal. Sigue ESTRICTAMENTE el 'Protocolo de Ingesta de Documentación' y el 'Protocolo de Invisibilidad'. EXTENSIÓN MÍNIMA: 6000 caracteres. Desarrolla cada punto con 3-4 párrafos densos. Profundiza en mecánica, psicología, vivencia y proyección.",
                "expected_min_chars": 6000,
                "requires_template": False
            },
            {
                "id": "modulo_2_fundamentos",
                "title": "MÓDULO 2-I: FUNDAMENTOS DEL SER",
                "topic": "fundamentos",
                "prompt": "EJECUTA la parte I del MÓDULO 2. Analiza EXHAUSTIVAMENTE: Sol (propósito núcleo), Luna (refugio emocional), Ascendente (estilo instintivo) y Regente del Ascendente (la brújula evolutiva). Sigue el Protocolo de Lenguaje Amable v6.0. EXTENSIÓN MÍNIMA: 5000 caracteres.",
                "expected_min_chars": 5000,
                "requires_template": False
            },
            {
                "id": "modulo_2_ejes",
                "title": "MÓDULO 2-II: LOS EJES DE VIDA (ANÁLISIS DE CASAS)",
                "topic": "ejes",
                "prompt": "EJECUTA la parte II del MÓDULO 2. Analiza EXHAUSTIVAMENTE los 6 Ejes de Vida (I-VII, II-VIII, III-IX, IV-X, V-XI, VI-XII) siguiendo el formato rígido Polo A / Polo B. CASAS VACÍAS: Analiza Signo + Regente con misma profundidad. EXTENSIÓN MÍNIMA: 8000 caracteres.",
                "expected_min_chars": 8000,
                "requires_template": True
            },
            {
                "id": "modulo_2_personales",
                "title": "MÓDULO 2-III: PLANETAS PERSONALES",
                "topic": "personales",
                "prompt": "EJECUTA la parte III del MÓDULO 2. Analiza EXHAUSTIVAMENTE: Mercurio, Venus y Marte. Profundiza en mecánica, psicología, vivencia y proyección. EXTENSIÓN MÍNIMA: 5000 caracteres.",
                "expected_min_chars": 5000,
                "requires_template": False
            },
            {
                "id": "modulo_2_sociales",
                "title": "MÓDULO 2-IV: PLANETAS SOCIALES",
                "topic": "sociales",
                "prompt": "EJECUTA la parte IV del MÓDULO 2. Analiza EXHAUSTIVAMENTE: Júpiter y Saturno. Especial énfasis en Saturno como estructura. EXTENSIÓN MÍNIMA: 5000 caracteres.",
                "expected_min_chars": 5000,
                "requires_template": False
            },
            {
                "id": "modulo_2_transpersonales",
                "title": "MÓDULO 2-V: PLANETAS TRANSPERSONALES",
                "topic": "transpersonales",
                "prompt": "EJECUTA la parte V del MÓDULO 2. Analiza EXHAUSTIVAMENTE: Urano, Neptuno y Plutón. Polarización Transpersonal. EXTENSIÓN MÍNIMA: 6000 caracteres.",
                "expected_min_chars": 6000,
                "requires_template": False
            },
            {
                "id": "modulo_2_nodos",
                "title": "MÓDULO 2-VI: LOS NODOS LUNARES",
                "topic": "nodos",
                "prompt": "EJECUTA la parte VI del MÓDULO 2. Analiza el Eje Nodal (Sur -> Norte) como flecha del destino. EXTENSIÓN MÍNIMA: 4000 caracteres.",
                "expected_min_chars": 4000,
                "requires_template": False
            },
            {
                "id": "modulo_2_aspectos",
                "title": "MÓDULO 2-VII: ASPECTOS CLAVE DE LA CARTA",
                "topic": "aspectos",
                "prompt": "EJECUTA la parte VII del MÓDULO 2. Analiza Tensiones (cuadraturas/oposiciones) y Facilitadores (trinos/sextiles). EXTENSIÓN MÍNIMA: 5000 caracteres.",
                "expected_min_chars": 5000,
                "requires_template": False
            },
            {
                "id": "modulo_2_sintesis",
                "title": "MÓDULO 2-VIII: SÍNTESIS ARQUETÍPICA Y EJES DOMINANTES",
                "topic": "general",
                "prompt": "EJECUTA la parte VIII del MÓDULO 2. Síntesis final de la estructura natal. EXTENSIÓN MÍNIMA: 5000 caracteres.",
                "expected_min_chars": 5000,
                "requires_template": False
            },
            {
                "id": "modulo_3_transitos",
                "title": "MÓDULO 3: ANÁLISIS DE TRÁNSITOS ACTUALES",
                "topic": "transitos",
                "prompt": "EJECUTA EL MÓDULO 3. Analiza los tránsitos actuales usando ephemerides.csv. Jerarquía: Críticos, Significativos y Contexto. Sigue el protocolo de Lenguaje Abierto. EXTENSIÓN MÍNIMA: 6000 caracteres.",
                "expected_min_chars": 6000,
                "requires_template": False
            },
            {
                "id": "modulo_4_recomendaciones",
                "title": "MÓDULO 4: RECOMENDACIONES EVOLUTIVAS PRINCIPALES",
                "topic": "evolucion",
                "prompt": "EJECUTA EL MÓDULO 4. Fortalezas, Integración de Tensiones y Orientación Nodal. Cierre motivacional sistémico. EXTENSIÓN MÍNIMA: 5000 caracteres.",
                "expected_min_chars": 5000,
                "requires_template": False
            }
        ]

        # Asegurar que FULL sea realmente “exhaustivo (~30 páginas)”.
        # Multiplicador configurable por env (default 1.6) + cap por módulo.
        if report_mode == "full":
            try:
                mult = float(os.getenv("FULL_REPORT_MIN_CHARS_MULTIPLIER", "1.6"))
            except Exception:
                mult = 1.6
            cap = int(os.getenv("FULL_REPORT_MIN_CHARS_CAP", "20000"))
            if mult > 1.0:
                for s in sections:
                    base = int(s.get("expected_min_chars") or 0)
                    if base <= 0:
                        continue
                    bumped = int(base * mult)
                    s["expected_min_chars"] = min(cap, max(base, bumped))

        if report_mode == "light":
            # Reduce thresholds to target ~6–8 pages total.
            for s in sections:
                base = int(s.get("expected_min_chars") or 2000)
                s["expected_min_chars"] = max(1200, int(base * 0.35))
                s["prompt"] = (
                    "MODO LIGHT: sintetiza manteniendo rigor y estructura. "
                    "Evita redundancias y prioriza lo más relevante.\n\n" + str(s.get("prompt") or "")
                )

        return sections

    async def generate_full_report(self, chart_data: Dict, user_name: str, *, report_mode: str = "full") -> str:
        """
        Orquesta la generación del informe completo siguiendo estrictamente
        el prompt CORE CARUTTI v5.3 con confirmación paso a paso.
        """
        print(f"🚀 [INICIO] Generación de informe completo para: {user_name}")
        print(f"📋 Siguiendo estrictamente CORE CARUTTI v6.0 (INTEGRACIÓN DINÁMICA)")
        
        # Nota: NO precargar PDFs en producción. El contexto se obtiene por módulo vía Atlas/BD.

        # 2. Obtener secciones usando el método centralizado
        sections = self._get_sections_definition(report_mode=report_mode)

        full_report_content = []
        total_sections = len(sections)
        
        # 3. Generar cada sección con confirmación paso a paso
        for idx, section in enumerate(sections, 1):
            print(f"\n[PASO {idx}/{total_sections}] Iniciando: {section['title']}")
            
            try:
                # Obtener contexto relevante de documentación
                # Aumentar SIGNIFICATIVAMENTE el contexto para asegurar exhaustividad (30 páginas)
                max_context_chars = 10000 if section['requires_template'] else 8000
                # Usar get_context_for_module para búsqueda más específica
                context = await asyncio.to_thread(self.doc_service.get_context_for_module, section['id'], max_context_chars)
                
                print(f"[PASO {idx}/{total_sections}] Contexto de documentación obtenido: {len(context)} caracteres")
                
                # Construir prompt completo
                base_prompt = f"""
PROTOCOLO DE INGESTA DE DOCUMENTACIÓN (DEEP SCAN & SÍNTESIS):
- Lee TODA la documentación provista antes de escribir
- Prioriza párrafos conceptuales densos sobre tablas resumen
- Integra múltiples fuentes en una sola narrativa
- NO digas "El libro dice...", simplemente explica la mecánica

CONTEXTO DE DOCUMENTACIÓN (Base de Conocimiento Carutti):
{context}

DATOS DE LA CARTA:
{str(chart_data)}

DIRECTRIZ DE EXTENSIÓN Y HOMOGENEIDAD (CRÍTICO PARA 30 PÁGINAS):
- PROHIBIDO RESUMIR: Objetivo exhaustividad MÁXIMA ABSOLUTA
- Todos los informes deben tener el mismo "peso" y densidad (30 páginas mínimo)
- PROFUNDIDAD ENSAYÍSTICA: Desarrolla mecánica, psicología, vivencia, proyección y evolución con MÁXIMO DETALLE
- Si puedes escribir 4 párrafos, escribe 8. Si puedes escribir 8, escribe 12
- DESARROLLA CADA PUNTO con múltiples párrafos densos (mínimo 3-4 párrafos por concepto principal)
- Incluye ejemplos concretos, manifestaciones prácticas, vivencias específicas
- CASAS VACÍAS: Si una casa no tiene planetas, analiza OBLIGATORIAMENTE el Signo en la cúspide y la posición de su Regente con la misma profundidad (mínimo 150 palabras por polo)
- EXTENSIÓN MÍNIMA PARA ESTA SECCIÓN: {section['expected_min_chars']} caracteres. Si generas menos, estás resumiendo. EXPÁNDE.

INSTRUCCIÓN DE COMANDO:
{section['prompt']}
"""
                
                # Si requiere plantilla (MÓDULO 2-VII), agregar instrucciones específicas
                if section['requires_template']:
                    base_prompt += self._generate_ejes_template_prompt(report_mode=report_mode)
                
                # Agregar instrucciones finales con énfasis en exhaustividad
                base_prompt += f"""
REGLAS CRÍTICAS DE ESTA SALIDA (OBJETIVO: 30 PÁGINAS):
- MANTÉN el tono "Ghost Writer Académico" y el rigor del System Prompt
- NO uses introducciones ni meta-comunicación
- Empieza DIRECTAMENTE con el título del módulo
- EXTENSIÓN MÍNIMA OBLIGATORIA: {section['expected_min_chars']} caracteres. Si generas menos, ESTÁS RESUMIENDO.
- DESARROLLA CADA CONCEPTO con múltiples párrafos (mínimo 3-4 párrafos por concepto principal)
- Incluye ejemplos concretos, manifestaciones prácticas, vivencias específicas
- Profundiza en mecánica, psicología, vivencia, proyección y evolución para CADA elemento
- Al final, incluye OBLIGATORIAMENTE: "Pregunta para reflexionar: [pregunta profunda, abierta y psicológica]"
- Usa lenguaje de posibilidad: "tiende a", "puede", "frecuentemente" (evita "es", "siempre", "nunca")
- RECUERDA: El objetivo es generar un informe de 30 páginas. Cada sección debe ser exhaustiva y detallada.
"""
                
                # Llamada a Gemini con reintentos si es demasiado corto
                max_retries = 2
                response = ""
                is_valid = False
                
                for attempt in range(max_retries + 1):
                    print(f"[PASO {idx}/{total_sections}] Generando contenido con AI (intento {attempt + 1}/{max_retries + 1})...")
                    response = await self.ai_service.get_chat_response(base_prompt, [])
                    
                    # Validar contenido generado
                    print(f"[PASO {idx}/{total_sections}] Validando contenido generado...")
                    is_valid, error_msg = self._validate_section_content(
                        section['id'], 
                        response, 
                        section['expected_min_chars']
                    )
                    
                    if is_valid:
                        print(f"[PASO {idx}/{total_sections}] ✅ Confirmado: {len(response)} caracteres generados")
                        break
                    else:
                        if attempt < max_retries:
                            print(f"[PASO {idx}/{total_sections}] ⚠️ Contenido demasiado corto ({len(response)} chars, esperado: {section['expected_min_chars']})")
                            print(f"[PASO {idx}/{total_sections}] Reintentando con instrucciones más exigentes...")
                            # Agregar advertencia más fuerte al prompt
                            base_prompt += f"\n\n⚠️ ADVERTENCIA CRÍTICA: El contenido anterior fue demasiado corto. DEBES generar AL MENOS {section['expected_min_chars']} caracteres. EXPÁNDE cada concepto con múltiples párrafos. NO RESUMAS."
                        else:
                            print(f"[PASO {idx}/{total_sections}] ⚠️ Advertencia de validación después de {max_retries + 1} intentos: {error_msg}")
                            print(f"[PASO {idx}/{total_sections}] Continuando con contenido generado (puede requerir revisión)")
                
                full_report_content.append(f"## {section['title']}\n\n{response}\n\n---\n\n")
                
                print(f"[PASO {idx}/{total_sections}] Procediendo al siguiente paso...\n")
                
            except Exception as e:
                print(f"[PASO {idx}/{total_sections}] ❌ Error generando sección {section['id']}: {e}")
                import traceback
                traceback.print_exc()
                full_report_content.append(f"## {section['title']}\n\n*(Sección no disponible momentáneamente: {str(e)})*\n\n")

        # 4. Validar extensión total del informe
        final_markdown = "\n".join(full_report_content)
        total_chars = len(final_markdown)
        
        print(f"\n📊 [VALIDACIÓN FINAL] Extensión total del informe: {total_chars} caracteres")
        print(f"📊 [VALIDACIÓN FINAL] Objetivo: 50,000-60,000 caracteres para ~30 páginas")
        
        if total_chars < 50000:
            print(f"❌ [VALIDACIÓN FINAL] ERROR CRÍTICO: El informe es demasiado corto ({total_chars} caracteres)")
            print(f"❌ [VALIDACIÓN FINAL] El informe debería tener al menos 50,000 caracteres para alcanzar 30 páginas")
            print(f"⚠️ [VALIDACIÓN FINAL] Se recomienda regenerar con instrucciones de mayor extensión")
        elif total_chars < 60000:
            print(f"✅ [VALIDACIÓN FINAL] Extensión adecuada alcanzada ({total_chars} caracteres)")
        else:
            print(f"✅ [VALIDACIÓN FINAL] El informe es muy exhaustivo ({total_chars} caracteres)")
        
        print(f"✅ [FIN] Generación de informe completo finalizada")
        
        return final_markdown

# Instancia global
full_report_service = FullReportService()
