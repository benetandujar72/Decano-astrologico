
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
⚠️ FORMATO RÍGIDO OBLIGATORIO PARA EJES DE VIDA:

ESTÁ PROHIBIDO integrar las casas en un solo párrafo narrativo. Debes usar OBLIGATORIAMENTE esta plantilla estructural para cada uno de los 6 ejes:

PLANTILLA POR EJE (5 PARTES OBLIGATORIAS):

1. **Título del Eje y Signos** (ej: "EJE I-VII ARIES-LIBRA")

2. **Dinámica Psicológica del Eje** (Introducción que explica la tensión fundamental del eje)

3. **Polo A (Casa X):**
   - Si tiene planetas: Analiza cada planeta individualmente con subapartados
   - Si está VACÍA: Analiza OBLIGATORIAMENTE el Signo en la cúspide + la posición del Regente de ese signo
   - MÍNIMO 80 palabras por polo
   - Misma profundidad que si hubiera planetas

4. **Polo B (Casa Y):**
   - Si tiene planetas: Analiza cada planeta individualmente con subapartados
   - Si está VACÍA: Analiza OBLIGATORIAMENTE el Signo en la cúspide + la posición del Regente de ese signo
   - MÍNIMO 80 palabras por polo
   - Misma profundidad que si hubiera planetas

5. **Síntesis del Eje:** Tensión y resolución entre ambos polos

LISTA DE EJES A CUBRIR (6 EJES OBLIGATORIOS):
- Eje I – VII (Encuentro)
- Eje II – VIII (Posesión/Fusión)
- Eje III – IX (Pensamiento/Sentido)
- Eje IV – X (Individuación)
- Eje V – XI (Creatividad/Red)
- Eje VI – XII (Orden/Caos)

RECUERDA: Todos los informes deben tener el mismo "peso" y densidad. Las casas vacías NO son excusa para escribir menos.
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

        # 2. Definir secciones del informe (ALINEADO ESTRICTAMENTE CON CORE CARUTTI v5.3)
        sections = [
            {
                "id": "modulo_1",
                "title": "MÓDULO 1: ESTRUCTURA ENERGÉTICA BASE (DIAGNÓSTICO)",
                "topic": "general",
                "prompt": "EJECUTA EL MÓDULO 1 del System Prompt: 'ESTRUCTURA ENERGÉTICA BASE'. Analiza: El Balance de Sustancia (Elementos), El Ritmo (Modalidades), La Tensión Vital Primaria (Sol-Luna-Asc) y la Polarización Transpersonal. Sigue ESTRICTAMENTE el 'Protocolo de Ingesta de Documentación' y el 'Protocolo de Invisibilidad'. Extensión mínima: 2000 caracteres.",
                "expected_min_chars": 2000,
                "requires_template": False
            },
            {
                "id": "modulo_2_fundamentos",
                "title": "MÓDULO 2-I: FUNDAMENTOS DEL SER",
                "topic": "fundamentos",
                "prompt": "EJECUTA la parte I del MÓDULO 2 (ANÁLISIS PLANETARIO). Analiza: Sol, Luna, Ascendente y Regente del Ascendente. Recuerda: Función, Escenario, Dispositor y Aspectos. Cero definiciones de diccionario, solo mecánica energética pura. Extensión mínima: 2000 caracteres.",
                "expected_min_chars": 2000,
                "requires_template": False
            },
            {
                "id": "modulo_2_personales",
                "title": "MÓDULO 2-II: PLANETAS PERSONALES",
                "topic": "personales",
                "prompt": "EJECUTA la parte II del MÓDULO 2. Analiza: Mercurio, Venus y Marte. Recuerda: Función, Escenario, Dispositor y Aspectos. Cero definiciones de diccionario, solo mecánica energética pura. Extensión mínima: 2000 caracteres.",
                "expected_min_chars": 2000,
                "requires_template": False
            },
            {
                "id": "modulo_2_sociales",
                "title": "MÓDULO 2-III: PLANETAS SOCIALES",
                "topic": "sociales",
                "prompt": "EJECUTA la parte III del MÓDULO 2. Analiza: Júpiter y Saturno. Presta especial atención a la función de Saturno como estructura. Extensión mínima: 2000 caracteres.",
                "expected_min_chars": 2000,
                "requires_template": False
            },
            {
                "id": "modulo_2_transpersonales",
                "title": "MÓDULO 2-IV: PLANETAS TRANSPERSONALES",
                "topic": "transpersonales",
                "prompt": "EJECUTA la parte IV del MÓDULO 2. Analiza: Urano, Neptuno y Plutón. Presta especial atención a la 'Polarización Transpersonal'. Extensión mínima: 2000 caracteres.",
                "expected_min_chars": 2000,
                "requires_template": False
            },
            {
                "id": "modulo_2_nodos",
                "title": "MÓDULO 2-V: LOS NODOS LUNARES",
                "topic": "nodos",
                "prompt": "EJECUTA la parte V del MÓDULO 2. Analiza: Los Nodos Lunares (Norte y Sur). Analiza el Eje Evolutivo: de la inercia Sur a la ingesta Norte. Extensión mínima: 1500 caracteres.",
                "expected_min_chars": 1500,
                "requires_template": False
            },
            {
                "id": "modulo_2_aspectos",
                "title": "MÓDULO 2-VI: ASPECTOS CLAVE",
                "topic": "aspectos",
                "prompt": "EJECUTA la parte VI del MÓDULO 2. Analiza: Aspectos Clave (Tensiones estructurales y Facilitadores). Identifica los aspectos más significativos según la matriz de orbes. Extensión mínima: 2000 caracteres.",
                "expected_min_chars": 2000,
                "requires_template": False
            },
            {
                "id": "modulo_2_ejes",
                "title": "MÓDULO 2-VII: LOS EJES DE VIDA (ANÁLISIS DE CASAS)",
                "topic": "ejes",
                "prompt": "EJECUTA la parte VII del MÓDULO 2. Analiza los 6 Ejes de Vida siguiendo OBLIGATORIAMENTE el formato rígido especificado en el System Prompt. CASAS VACÍAS: Analizar obligatoriamente Signo en cúspide + Regente con misma profundidad (mín. 80 palabras por polo). Extensión mínima: 4000 caracteres.",
                "expected_min_chars": 4000,
                "requires_template": True
            },
            {
                "id": "modulo_2_sintesis",
                "title": "MÓDULO 2-VIII: SÍNTESIS ARQUETÍPICA",
                "topic": "general",
                "prompt": "EJECUTA la parte VIII del MÓDULO 2. Realiza una Síntesis Arquetípica integrando todos los elementos analizados anteriormente. Extensión mínima: 2000 caracteres.",
                "expected_min_chars": 2000,
                "requires_template": False
            },
            {
                "id": "modulo_3_recomendaciones",
                "title": "MÓDULO 3: RECOMENDACIONES EVOLUTIVAS PRINCIPALES",
                "topic": "evolucion",
                "prompt": "EJECUTA EL MÓDULO 3. Analiza: A. Fortalezas Base, B. Integración de Tensiones Principales, C. Orientación hacia el Nodo Norte, D. Cierre Motivacional (Sin lenguaje de éxito). Extensión mínima: 2000 caracteres.",
                "expected_min_chars": 2000,
                "requires_template": False
            }
        ]

        full_report_content = []
        total_sections = len(sections)
        
        # 3. Generar cada sección con confirmación paso a paso
        for idx, section in enumerate(sections, 1):
            print(f"\n[PASO {idx}/{total_sections}] Iniciando: {section['title']}")
            
            try:
                # Obtener contexto relevante de documentación
                # Aumentar contexto según el módulo para asegurar exhaustividad
                max_context_chars = 6000 if section['requires_template'] else 5000
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

DIRECTRIZ DE EXTENSIÓN Y HOMOGENEIDAD:
- PROHIBIDO RESUMIR: Objetivo exhaustividad máxima
- Todos los informes deben tener el mismo "peso" y densidad
- PROFUNDIDAD ENSAYÍSTICA: Desarrolla mecánica, psicología, vivencia, proyección y evolución
- Si puedes escribir 4 párrafos, escribe 4
- CASAS VACÍAS: Si una casa no tiene planetas, analiza OBLIGATORIAMENTE el Signo en la cúspide y la posición de su Regente con la misma profundidad

INSTRUCCIÓN DE COMANDO:
{section['prompt']}
"""
                
                # Si requiere plantilla (MÓDULO 2-VII), agregar instrucciones específicas
                if section['requires_template']:
                    base_prompt += self._generate_ejes_template_prompt()
                
                # Agregar instrucciones finales
                base_prompt += """
REGLAS CRÍTICAS DE ESTA SALIDA:
- MANTÉN el tono "Ghost Writer Académico" y el rigor del System Prompt
- NO uses introducciones ni meta-comunicación
- Empieza DIRECTAMENTE con el título del módulo
- Al final, incluye OBLIGATORIAMENTE: "Pregunta para reflexionar: [pregunta profunda, abierta y psicológica]"
- Usa lenguaje de posibilidad: "tiende a", "puede", "frecuentemente" (evita "es", "siempre", "nunca")
"""
                
                # Llamada a Gemini
                print(f"[PASO {idx}/{total_sections}] Generando contenido con AI...")
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
                    full_report_content.append(f"## {section['title']}\n\n{response}\n\n---\n\n")
                else:
                    print(f"[PASO {idx}/{total_sections}] ⚠️ Advertencia de validación: {error_msg}")
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
        
        if total_chars < 40000:
            print(f"⚠️ [VALIDACIÓN FINAL] Advertencia: El informe es más corto de lo esperado (objetivo: 40,000-50,000 caracteres)")
        elif total_chars > 50000:
            print(f"✅ [VALIDACIÓN FINAL] El informe es exhaustivo ({total_chars} caracteres)")
        else:
            print(f"✅ [VALIDACIÓN FINAL] Extensión óptima alcanzada ({total_chars} caracteres)")
        
        print(f"✅ [FIN] Generación de informe completo finalizada")
        
        return final_markdown

# Instancia global
full_report_service = FullReportService()
