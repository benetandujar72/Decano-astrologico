
import os
import asyncio
from typing import Dict, List, Optional
from app.services.documentation_service import documentation_service
from app.services.ai_expert_service import get_ai_expert_service

class FullReportService:
    """
    Servicio para generar informes astrológicos completos y extensos (25-30 páginas)
    utilizando documentación contextual y generación por secciones.
    """
    
    def __init__(self):
        self.doc_service = documentation_service
        self.ai_service = get_ai_expert_service()

    async def generate_full_report(self, chart_data: Dict, user_name: str) -> str:
        """
        Orquesta la generación del informe completo.
        """
        print(f"🚀 Iniciando generación de informe completo para: {user_name}")
        
        # 1. Asegurar documentación cargada
        if not self.doc_service.is_loaded:
            print("📚 Cargando documentación por primera vez...")
            self.doc_service.load_documentation()

        # 2. Definir secciones del informe
        sections = [
            {
                "id": "intro",
                "title": "INTRODUCCIÓN: TU MAPA DE RUTA",
                "topic": "general",
                "prompt": "Escribe una introducción profunda y acogedora para este análisis natal. Explica qué es una carta astral desde una perspectiva psicológica y evolutiva (Liz Greene/Carutti). No uses tecnicismos sin explicarlos."
            },
            {
                "id": "balance",
                "title": "BLOQUE I: EL BALANCE DE ELEMENTOS",
                "topic": "elementos",
                "prompt": "Analiza el balance de Elementos (Fuego, Tierra, Aire, Agua) y Modalidades. Profundiza en la psicología de los elementos faltantes y dominantes. Usa referencias a la 'función inferior' de Jung si aplica."
            },
            {
                "id": "identidad",
                "title": "BLOQUE II: EL NÚCLEO DE IDENTIDAD (Sol-Luna-Ascendente)",
                "topic": "planetas",
                "prompt": "Analiza la tríada fundamental: Sol (Héroe/Propósito), Luna (Niño Interior/Necesidades) y Ascendente (Vehículo/Destino). Explica la tensión y la integración entre estos tres arquetipos. Sé muy detallado."
            },
            {
                "id": "personales",
                "title": "BLOQUE III: HERRAMIENTAS PERSONALES (Mercurio, Venus, Marte)",
                "topic": "planetas",
                "prompt": "Analiza Mercurio (Mente/Comunicación), Venus (Deseo/Valor) y Marte (Acción/Voluntad). Detalla sus signos, casas y aspectos principales. Enfócate en cómo estas herramientas sirven al propósito solar."
            },
            {
                "id": "sociales",
                "title": "BLOQUE IV: EL PUENTE SOCIAL (Júpiter y Saturno)",
                "topic": "sociales",
                "prompt": "Analiza Júpiter (Expansión/Sentido) y Saturno (Estructura/Límite/Maestro). Explica cómo el individuo se relaciona con la sociedad y la autoridad. Profundiza en Saturno como el 'Guardíán del Umbral'."
            },
            {
                "id": "transpersonales",
                "title": "BLOQUE V: LOS DIOSES DEL CAMBIO (Urano, Neptuno, Plutón)",
                "topic": "transpersonales",
                "prompt": "Analiza los planetas transpersonales por casa y aspectos a personales. Urano (Despertad), Neptuno (Fusión/Disolución) y Plutón (Transformación/Poder). Explica su impacto generacional y personal."
            },
            {
                "id": "nodos",
                "title": "BLOQUE VI: EL CAMINO DE ALMA (Nodos Lunares)",
                "topic": "nodos",
                "prompt": "Analiza exhaustivamente el Eje Nodal. Nodo Sur (Pasado/Talento/Inercia) vs Nodo Norte (Futuro/Desafío/Evolución). Este es el eje vertebral de la evolución del alma. Usa metáforas de viaje."
            },
            {
                "id": "quiron",
                "title": "BLOQUE VII: LA HERIDA DEL SANADOR (Quirón)",
                "topic": "quiron",
                "prompt": "Analiza a Quirón por signo y casa. Explica la herida primaria y cómo, al aceptarla, se convierte en un don para sanar a otros. Evita el victimismo, enfócate en la resiliencia."
            },
            {
                "id": "casas",
                "title": "BLOQUE VIII: ESCENARIOS DE VIDA (Casas Potentes)",
                "topic": "casas",
                "prompt": "Identifica las casas con más planetas o actividad. Explica en qué áreas de la vida (escenarios) se jugará la partida principal. Si hay casas vacías, explica brevemente qué significa."
            },
            {
                "id": "sintesis",
                "title": "CONCLUSIÓN: SÍNTESIS Y POTENCIAL",
                "topic": "general",
                "prompt": "Realiza una síntesis integradora de todo el análisis. Ofrece un mensaje final de empoderamiento. Resalta el potencial único de esta carta para la autorrealización."
            }
        ]

        full_report_content = []
        
        # 3. Generar cada sección
        for section in sections:
            print(f"✍️ Generando sección: {section['title']}...")
            try:
                # Obtener contexto relevante
                # Para balancear tokens, pedimos ~3000 chars de contexto por sección
                context = self.doc_service.get_context_for_topic(section['topic'], max_chars=3000)
                
                # Construir Prompt Rico
                prompt = f"""
                ACTÚA COMO: Un astrólogo experto de la escuela psicológica y evolutiva (estilo Liz Greene, Howard Sasportas, Eugenio Carutti).
                
                TAREA: Escribir la sección "{section['title']}" de un informe astrológico profundo y profesional de 30 páginas para {user_name}.
                
                DATOS DE LA CARTA:
                {str(chart_data)}
                
                CONTEXTO TEÓRICO (Extractos de bibliografía experta de nuestra base de datos):
                {context}
                
                INSTRUCCIONES ESPECÍFICAS PARA ESTA SECCIÓN:
                {section['prompt']}
                - EXTENSIÓN: Mínimo 800 - 1000 palabras para esta sección.
                - TONO: Profundo, empático, psicológico, no determinista.
                - FORMATO: Markdown estricto. Usa subtítulos (###), negritas para énfasis.
                - ESTILO: Usa metáforas ricas. Habla directamente al consultante ("Tú tienes...", "Tu Luna indica...").
                - IMPORTANTE: Integra los conceptos del CONTEXTO TEÓRICO proporcionado para dar autoridad y profundidad al análisis.
                
                Genera SOLO el contenido de la sección, sin título principal (ya lo tengo).
                """
                
                # Llamada a Gemini (usando el expert service que ya tiene manejo de modelos y fallbacks)
                # Simulamos historial vacío ya que es un "one-shot" para esta sección
                response = await self.ai_service.get_chat_response(prompt, [])
                
                # Guardar resultado
                full_report_content.append(f"## {section['title']}\n\n{response}\n\n---\n\n")
                print(f"✅ Sección {section['id']} completada.")
                
            except Exception as e:
                print(f"❌ Error generando sección {section['id']}: {e}")
                full_report_content.append(f"## {section['title']}\n\n*(Sección no disponible momentáneamente debido a un error de procesamiento)*\n\n")

        # 4. Unir todo
        final_markdown = "\n".join(full_report_content)
        return final_markdown

# Instancia global
full_report_service = FullReportService()
