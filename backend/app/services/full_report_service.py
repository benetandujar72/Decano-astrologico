
import os
import asyncio
import re
from typing import Dict, List, Optional
from app.services.documentation_service import documentation_service
from app.services.ai_expert_service import get_ai_expert_service

class FullReportService:
    """
    Servicio para generar informes astrológicos completos y extensos (30 páginas)
    siguiendo estrictamente el prompt CORE CARUTTI v5.3 (REORDENADO & HOMOGÉNEO).
    Utiliza documentación contextual, generación por secciones con confirmación paso a paso,
    y validación automática de contenido.
    """
    
    def __init__(self):
        self.doc_service = documentation_service
        self.ai_service = get_ai_expert_service()

    def _generate_ejes_template_prompt(self) -> str:
        """
        Genera el prompt específico para MÓDULO 2-VII (Ejes de Vida)
        con formato rígido obligatorio.
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

    def _validate_section_content(self, section_id: str, content: str, expected_min_chars: int) -> tuple:
        """
        Valida el contenido generado para una sección.
        
        Returns:
            (is_valid, error_message)
        """
        # Validar extensión mínima
        if len(content) < expected_min_chars:
            return False, f"Contenido demasiado corto: {len(content)} caracteres (mínimo esperado: {expected_min_chars})"
        
        # Validar presencia de pregunta de reflexión
        if "pregunta para reflexionar" not in content.lower() and "pregunta para reflexionar:" not in content.lower():
            return False, "Falta la 'Pregunta para reflexionar' al final del bloque"
        
        # Validar lenguaje abierto (no determinista)
        deterministas = [" es ", " tiene ", " siempre ", " nunca ", " bloqueado "]
        for palabra in deterministas:
            if palabra in content.lower():
                # Permitir si está en contexto de lenguaje abierto
                if "tiende a" not in content.lower() and "puede" not in content.lower():
                    return False, f"Lenguaje demasiado determinista detectado. Usa 'tiende a', 'puede', 'frecuentemente'"
        
        # Validación especial para MÓDULO 2-VII (Ejes)
        if section_id == "modulo_2_ejes":
            # Verificar que tenga los 6 ejes mencionados
            ejes_requeridos = ["I-VII", "II-VIII", "III-IX", "IV-X", "V-XI", "VI-XII"]
            ejes_encontrados = sum(1 for eje in ejes_requeridos if eje in content)
            if ejes_encontrados < 6:
                return False, f"Solo se encontraron {ejes_encontrados} de los 6 ejes requeridos"
            
            # Verificar estructura de plantilla (debe tener títulos de ejes y secciones)
            if "Polo A" not in content or "Polo B" not in content:
                return False, "Falta la estructura de plantilla (Polo A / Polo B) en los ejes"
        
        return True, ""

    async def generate_single_module(
        self, 
        chart_data: Dict, 
        user_name: str, 
        module_id: str,
        previous_modules: List[str] = None
    ) -> tuple[str, bool]:
        """
        Genera un único módulo del informe.
        
        Returns:
            (content, is_complete) - contenido del módulo y si es el último módulo
        """
        if previous_modules is None:
            previous_modules = []
        
        # Asegurar documentación cargada
        if not self.doc_service.is_loaded:
            self.doc_service.load_documentation()
        
        # Obtener la sección correspondiente
        sections = self._get_sections_definition()
        section = next((s for s in sections if s['id'] == module_id), None)
        
        if not section:
            raise ValueError(f"Módulo {module_id} no encontrado")
        
        module_index = next((i for i, s in enumerate(sections) if s['id'] == module_id), -1)
        is_last = (module_index == len(sections) - 1)
        
        print(f"[MÓDULO {module_index + 1}/{len(sections)}] Generando: {section['title']}")
        
        # Obtener contexto de documentación
        max_context_chars = 10000 if section['requires_template'] else 8000
        context = self.doc_service.get_context_for_module(section['id'], max_chars=max_context_chars)
        
        # Construir prompt
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
            base_prompt += self._generate_ejes_template_prompt()
        
        # Agregar instrucciones finales
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
- RECUERDA: El objetivo es generar un informe de 30 páginas. Esta sección debe ser exhaustiva y detallada.
"""
        
        # Generar con reintentos
        max_retries = 2
        response = ""
        is_valid = False
        
        for attempt in range(max_retries + 1):
            print(f"[MÓDULO {module_index + 1}/{len(sections)}] Generando contenido (intento {attempt + 1}/{max_retries + 1})...")
            response = await self.ai_service.get_chat_response(base_prompt, [])
            
            is_valid, error_msg = self._validate_section_content(
                section['id'], 
                response, 
                section['expected_min_chars']
            )
            
            if is_valid:
                print(f"[MÓDULO {module_index + 1}/{len(sections)}] ✅ Confirmado: {len(response)} caracteres")
                break
            else:
                if attempt < max_retries:
                    print(f"[MÓDULO {module_index + 1}/{len(sections)}] ⚠️ Contenido corto ({len(response)} chars). Reintentando...")
                    base_prompt += f"\n\n⚠️ ADVERTENCIA CRÍTICA: El contenido anterior fue demasiado corto. DEBES generar AL MENOS {section['expected_min_chars']} caracteres. EXPÁNDE cada concepto con múltiples párrafos. NO RESUMAS."
        
        return response, is_last

    def _get_sections_definition(self) -> List[Dict]:
        """Retorna la definición de todas las secciones"""
        return [
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
                "prompt": "EJECUTA la parte I del MÓDULO 2 (ANÁLISIS PLANETARIO). Analiza EXHAUSTIVAMENTE cada uno: Sol (función, escenario, dispositor, aspectos, manifestación psicológica, vivencia, proyección), Luna (refugio regresivo, función, escenario, dispositor, aspectos, manifestación emocional), Ascendente (destino, energía no reconocida, función, signo, regente), Regente del Ascendente (función, posición, aspectos, manifestación). Cero definiciones de diccionario, solo mecánica energética pura. EXTENSIÓN MÍNIMA: 5000 caracteres. Mínimo 1000 caracteres por planeta/componente.",
                "expected_min_chars": 5000,
                "requires_template": False
            },
            {
                "id": "modulo_2_personales",
                "title": "MÓDULO 2-II: PLANETAS PERSONALES",
                "topic": "personales",
                "prompt": "EJECUTA la parte II del MÓDULO 2. Analiza EXHAUSTIVAMENTE cada uno: Mercurio (función, escenario, dispositor, aspectos, manifestación mental, comunicación, vivencia), Venus (función, escenario, dispositor, aspectos, manifestación afectiva, valores, vivencia), Marte (función, escenario, dispositor, aspectos, manifestación de acción, impulso, vivencia). Para cada planeta desarrolla: mecánica energética, psicología profunda, vivencia concreta, proyección y evolución. EXTENSIÓN MÍNIMA: 5000 caracteres. Mínimo 1500 caracteres por planeta.",
                "expected_min_chars": 5000,
                "requires_template": False
            },
            {
                "id": "modulo_2_sociales",
                "title": "MÓDULO 2-III: PLANETAS SOCIALES",
                "topic": "sociales",
                "prompt": "EJECUTA la parte III del MÓDULO 2. Analiza EXHAUSTIVAMENTE: Júpiter (función, escenario, dispositor, aspectos, expansión, filosofía, vivencia) y Saturno (función como estructura, escenario, dispositor, aspectos, límites, responsabilidad, esqueleto del dharma, vivencia). Presta especial atención a la función de Saturno como estructura del destino. Desarrolla cada planeta con profundidad ensayística: mecánica, psicología, vivencia, proyección y evolución. EXTENSIÓN MÍNIMA: 5000 caracteres. Mínimo 2000 caracteres por planeta.",
                "expected_min_chars": 5000,
                "requires_template": False
            },
            {
                "id": "modulo_2_transpersonales",
                "title": "MÓDULO 2-IV: PLANETAS TRANSPERSONALES",
                "topic": "transpersonales",
                "prompt": "EJECUTA la parte IV del MÓDULO 2. Analiza EXHAUSTIVAMENTE cada uno: Urano (función, escenario, dispositor, aspectos, ruptura, innovación, vivencia), Neptuno (función, escenario, dispositor, aspectos, disolución, trascendencia, vivencia), Plutón (función, escenario, dispositor, aspectos, transformación, poder, vivencia). Presta especial atención a la 'Polarización Transpersonal'. Desarrolla cada planeta con profundidad ensayística: mecánica energética, psicología profunda, vivencia, proyección y evolución. EXTENSIÓN MÍNIMA: 6000 caracteres. Mínimo 1800 caracteres por planeta.",
                "expected_min_chars": 6000,
                "requires_template": False
            },
            {
                "id": "modulo_2_nodos",
                "title": "MÓDULO 2-V: LOS NODOS LUNARES",
                "topic": "nodos",
                "prompt": "EJECUTA la parte V del MÓDULO 2. Analiza EXHAUSTIVAMENTE: Los Nodos Lunares (Norte y Sur). Desarrolla: Nodo Sur (inercia, patrones kármicos, zona de confort, lo conocido, manifestación), Nodo Norte (dharma, dirección evolutiva, desafío, lo desconocido, manifestación), el Eje Evolutivo completo (de la inercia Sur a la ingesta Norte), la tensión entre ambos, y la integración. Profundiza en mecánica, psicología, vivencia y proyección. EXTENSIÓN MÍNIMA: 4000 caracteres. Mínimo 1500 caracteres por nodo más análisis del eje.",
                "expected_min_chars": 4000,
                "requires_template": False
            },
            {
                "id": "modulo_2_aspectos",
                "title": "MÓDULO 2-VI: ASPECTOS CLAVE",
                "topic": "aspectos",
                "prompt": "EJECUTA la parte VI del MÓDULO 2. Analiza EXHAUSTIVAMENTE: Aspectos Clave (Tensiones estructurales y Facilitadores). Identifica TODOS los aspectos significativos según la matriz de orbes. Para cada aspecto mayor desarrolla: identificación técnica (planetas, tipo, orbe), mecánica energética, manifestación psicológica, vivencia concreta, proyección y oportunidad evolutiva. Incluye aspectos mayores (conjunciones, oposiciones, cuadraturas, trígonos, sextiles) y configuraciones (T-cuadradas, Grandes Trígonos, Yods, etc.). EXTENSIÓN MÍNIMA: 5000 caracteres. Mínimo 300-400 caracteres por aspecto significativo.",
                "expected_min_chars": 5000,
                "requires_template": False
            },
            {
                "id": "modulo_2_ejes",
                "title": "MÓDULO 2-VII: LOS EJES DE VIDA (ANÁLISIS DE CASAS)",
                "topic": "ejes",
                "prompt": "EJECUTA la parte VII del MÓDULO 2. Analiza EXHAUSTIVAMENTE los 6 Ejes de Vida siguiendo OBLIGATORIAMENTE el formato rígido especificado en el System Prompt. Para CADA eje desarrolla con máxima profundidad: Título y Signos, Dinámica Psicológica (intro extensa), Polo A (análisis exhaustivo del Signo + cada planeta individualmente con subapartados + si está vacía analiza Signo y Regente con MÍNIMO 150 palabras), Polo B (análisis exhaustivo de la Proyección/Destino + cada planeta individualmente + si está vacía analiza Signo y Regente con MÍNIMO 150 palabras), Síntesis del Eje (tensión y resolución extensa). CASAS VACÍAS: Analizar obligatoriamente Signo en cúspide + Regente con misma profundidad que si hubiera planetas. EXTENSIÓN MÍNIMA: 8000 caracteres. Mínimo 1200 caracteres por eje.",
                "expected_min_chars": 8000,
                "requires_template": True
            },
            {
                "id": "modulo_2_sintesis",
                "title": "MÓDULO 2-VIII: SÍNTESIS ARQUETÍPICA",
                "topic": "general",
                "prompt": "EJECUTA la parte VIII del MÓDULO 2. Realiza una Síntesis Arquetípica EXHAUSTIVA integrando todos los elementos analizados anteriormente. Desarrolla: patrones arquetípicos dominantes, configuraciones maestras (stelliums, T-cuadradas, etc.), sombra y proyección (qué no se reconoce), el mito personal, y la integración sistémica. Profundiza en mecánica, psicología, vivencia y proyección. EXTENSIÓN MÍNIMA: 5000 caracteres.",
                "expected_min_chars": 5000,
                "requires_template": False
            },
            {
                "id": "modulo_3_recomendaciones",
                "title": "MÓDULO 3: RECOMENDACIONES EVOLUTIVAS PRINCIPALES",
                "topic": "evolucion",
                "prompt": "EJECUTA EL MÓDULO 3. Analiza EXHAUSTIVAMENTE: A. Fortalezas Base (identifica y desarrolla cada fortaleza con detalle), B. Integración de Tensiones Principales (cómo integrar cada tensión identificada), C. Orientación hacia el Nodo Norte (camino evolutivo específico y práctico), D. Cierre Motivacional (sin lenguaje de éxito, enfoque en proceso y crecimiento). Desarrolla cada sección con profundidad ensayística. EXTENSIÓN MÍNIMA: 5000 caracteres. Mínimo 1000 caracteres por subsección.",
                "expected_min_chars": 5000,
                "requires_template": False
            }
        ]

    async def generate_full_report(self, chart_data: Dict, user_name: str) -> str:
        """
        Orquesta la generación del informe completo siguiendo estrictamente
        el prompt CORE CARUTTI v5.3 con confirmación paso a paso.
        """
        print(f"🚀 [INICIO] Generación de informe completo para: {user_name}")
        print(f"📋 Siguiendo estrictamente CORE CARUTTI v5.3 (REORDENADO & HOMOGÉNEO)")
        
        # 1. Asegurar documentación cargada
        if not self.doc_service.is_loaded:
            print("📚 [PASO 0/10] Cargando documentación por primera vez...")
            self.doc_service.load_documentation()
            print("✅ [PASO 0/10] Documentación cargada")

        # 2. Obtener secciones usando el método centralizado
        sections = self._get_sections_definition()

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
                context = self.doc_service.get_context_for_module(section['id'], max_chars=max_context_chars)
                
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
                    base_prompt += self._generate_ejes_template_prompt()
                
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
