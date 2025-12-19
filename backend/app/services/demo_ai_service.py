"""
Servicio de IA para la demo interactiva paso a paso (Gemini)
"""
import os
import google.generativeai as genai
from typing import List, Dict, Any, Optional
from app.models.demo_chat import DemoStep, DemoSession, MessageRole, DemoMessage

class DemoAIService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.model = None
        if not api_key:
            # Fallback para desarrollo si no hay key, aunque debería haber
            print("WARNING: GEMINI_API_KEY not found")
        else:
            genai.configure(api_key=api_key)
            # Usar modelo flash por defecto por ser más rápido y estable
            self.model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))

    def _get_system_prompt(self, step: DemoStep, chart_data: Dict[str, Any]) -> str:
        """Genera el prompt del sistema según el paso actual y los datos de la carta"""
        
        base_prompt = """Eres un experto astrólogo sistémico (Enfoque Eugenio Carutti / Bruno Huber).
Tu objetivo es guiar al usuario a través de una interpretación profunda de su carta natal, paso a paso.
Mantén un tono profesional, empático y psicológico. Evita el determinismo.

FORMATO DE RESPUESTA:
- Usa **negritas** para resaltar conceptos clave, planetas y aspectos importantes.
- Estructura tu respuesta en párrafos claros y legibles.
- Utiliza listas con viñetas para enumerar puntos clave.
- El estilo debe ser moderno, limpio y profesional.
"""

        chart_context = f"""
DATOS DE LA CARTA:
{chart_data}
"""

        if step == DemoStep.ELEMENTS:
            return base_prompt + chart_context + """
PASO ACTUAL: ESTRUCTURA ENERGÉTICA BASE
Analiza:
1. Balance de elementos (Fuego, Tierra, Aire, Agua). ¿Qué falta? ¿Qué sobra?
2. Modalidades (Cardinal, Fijo, Mutable).
3. Tensión vital primaria (Sol-Luna-Ascendente).

Genera un análisis conciso pero profundo de estos puntos.
"""
        elif step == DemoStep.PLANETS:
            return base_prompt + chart_context + """
PASO ACTUAL: ANÁLISIS PLANETARIO
Analiza:
1. Posiciones clave de planetas personales por signo y casa.
2. Dignidades esenciales si son relevantes.
3. Dispositores.

Céntrate en lo más destacado, no listes todo. Busca el núcleo de la personalidad.
"""
        elif step == DemoStep.ASPECTS:
            return base_prompt + chart_context + """
PASO ACTUAL: SISTEMA DE ASPECTOS
Analiza:
1. Aspectos mayores principales (Sol, Luna, Regente del Ascendente).
2. Configuraciones especiales (T-Cuadrada, Gran Trígono, etc.) si existen.
3. Tensiones y fluidez interna.
"""
        elif step == DemoStep.HOUSES:
            return base_prompt + chart_context + """
PASO ACTUAL: CASAS Y EJES
Analiza:
1. Ejes polares activados (1-7, 4-10, etc.).
2. Planetas angulares (cerca de cúspides 1, 4, 7, 10).
3. Áreas de vida con mayor carga energética.
"""
        elif step == DemoStep.SYNTHESIS:
            return base_prompt + chart_context + """
PASO ACTUAL: SÍNTESIS TRANSPERSONAL
Analiza:
1. Eje Nodal (Karma/Dharma).
2. Saturno como maestro/estructura.
3. Planetas transpersonales y su impacto generacional/personal.
4. Conclusión evolutiva.
"""
        else:
            return base_prompt + chart_context + "Responde a las dudas del usuario sobre su carta."

    async def process_step(self, session: DemoSession, user_message: str, next_step_requested: bool) -> str:
        """
        Procesa el mensaje del usuario y avanza el paso si es necesario.
        Retorna la respuesta de la IA.
        """
        
        # Lógica de transición de estados
        if next_step_requested:
            if session.current_step == DemoStep.INITIAL:
                session.current_step = DemoStep.ELEMENTS
            elif session.current_step == DemoStep.ELEMENTS:
                session.current_step = DemoStep.PLANETS
            elif session.current_step == DemoStep.PLANETS:
                session.current_step = DemoStep.ASPECTS
            elif session.current_step == DemoStep.ASPECTS:
                session.current_step = DemoStep.HOUSES
            elif session.current_step == DemoStep.HOUSES:
                session.current_step = DemoStep.SYNTHESIS
            elif session.current_step == DemoStep.SYNTHESIS:
                session.current_step = DemoStep.COMPLETED
        
        # Si es el paso inicial y no hay datos, pedir datos (simplificado por ahora asumimos que vienen en start)
        
        # Construir prompt
        system_prompt = self._get_system_prompt(session.current_step, session.chart_data or {})
        
        # Historial de chat para contexto
        history = []
        for msg in session.messages:
            role = "user" if msg.role == MessageRole.USER else "model"
            history.append({"role": role, "parts": [msg.content]})
            
        # Generar respuesta
        try:
            if not self.model:
                return "Lo siento, el servicio de IA no está configurado correctamente (Falta API Key). Por favor contacta al administrador."

            chat = self.model.start_chat(history=history)
            response = chat.send_message(system_prompt + f"\n\nUsuario dice: {user_message}\n(Si el usuario pide continuar, genera el análisis del PASO ACTUAL descrito en el system prompt. Si hace una pregunta, responde la pregunta).")
            return response.text
        except Exception as e:
            print(f"Error generating content: {e}")
            return "Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo."

demo_ai_service = DemoAIService()
