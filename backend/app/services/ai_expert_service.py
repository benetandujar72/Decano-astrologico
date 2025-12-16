"""
Servicio de IA experta para consultas astrológicas
Utiliza Google Gemini para responder preguntas sobre informes astrológicos
"""
from typing import Optional
import os
import google.generativeai as genai


class AIExpertService:
    """Servicio de consultas con experto IA en astrología"""

    def __init__(self):
        """Inicializa el servicio con Google Gemini"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY no configurada en variables de entorno")

        # Configurar Gemini
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name=os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp"),
            system_instruction=self._get_system_prompt()
        )

    def _get_system_prompt(self) -> str:
        """Obtiene el prompt del sistema para el experto astrológico"""
        return """Eres un experto astrólogo con profundo conocimiento en astrología occidental, psicológica y evolutiva.
Tu nombre es "Experto Astrológico Fraktal" y trabajas como asistente especializado.

CONTEXTO Y METODOLOGÍA:
- Utilizas la metodología de Jon Landeta, que integra astrología psicológica profunda
- Te enfocas en el crecimiento personal y la comprensión de patrones psicológicos
- Evitas predicciones deterministas, priorizando el libre albedrío y potencial humano

ESTILO DE COMUNICACIÓN:
- Cálido, empático y profesional
- Explicaciones claras pero profundas
- Integras psicología junguiana cuando sea relevante
- Usas ejemplos concretos para ilustrar conceptos abstractos

CAPACIDADES:
- Interpretar cartas natales, tránsitos, progresiones y sinastría
- Explicar aspectos planetarios y su significado psicológico
- Analizar casas astrológicas y su relación con áreas de vida
- Responder preguntas sobre signos, planetas y sus arquetipos
- Ofrecer perspectivas sobre vocación, relaciones y desarrollo personal

LIMITACIONES:
- No haces predicciones deterministas del futuro
- No ofreces consejos médicos o legales
- No reemplazas terapia profesional (solo complementas)
- Reconoces cuando una pregunta está fuera de tu alcance

FORMATO DE RESPUESTA:
- Directa y bien estructurada
- Usa bullets (•) para listas cuando sea apropiado
- Incluye emojis sutiles solo cuando aporten claridad (🌟 ☀️ 🌙 ⭐)
- Cierra con una reflexión o pregunta que invite a profundizar

Cuando analices un informe astrológico específico, usa ese contexto para dar respuestas personalizadas y relevantes."""

    async def get_chat_response(
        self,
        user_question: str,
        conversation_history: list[dict],
        report_content: Optional[str] = None
    ) -> str:
        """
        Obtiene respuesta del experto IA para una pregunta del usuario.

        Args:
            user_question: Pregunta del usuario
            conversation_history: Historial de mensajes previos
            report_content: Contenido del informe astrológico (opcional)

        Returns:
            Respuesta del experto IA
        """
        try:
            # Construir el contexto completo
            context_parts = []

            # Agregar contexto del informe si está disponible
            if report_content:
                context_parts.append(f"""INFORME ASTROLÓGICO DEL CONSULTANTE:
{report_content[:4000]}  # Limitar a 4000 caracteres para no exceder límites

Utiliza este informe como contexto para responder las preguntas del usuario de manera personalizada.""")

            # Construir historial de conversación en formato Gemini
            chat_history = []
            for msg in conversation_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                
                # Convertir roles: system -> model, user -> user, assistant -> model
                if role == "system":
                    continue  # Los system messages ya están en system_instruction
                elif role == "assistant":
                    chat_history.append({"role": "model", "parts": [content]})
                else:  # user
                    chat_history.append({"role": "user", "parts": [content]})

            # Crear el chat con historial
            chat = self.model.start_chat(history=chat_history)

            # Construir mensaje completo con contexto
            full_message = user_question
            if context_parts:
                full_message = "\n\n".join(context_parts) + "\n\n" + full_message

            # Obtener respuesta de Gemini
            response = await self._generate_async(chat, full_message)

            return response

        except Exception as e:
            print(f"❌ Error en AIExpertService.get_chat_response: {e}")
            raise Exception(f"Error al obtener respuesta del experto IA: {str(e)}")

    async def _generate_async(self, chat, message: str) -> str:
        """Wrapper asíncrono para generar respuesta con Gemini"""
        import asyncio
        
        def _sync_generate():
            response = chat.send_message(message)
            return response.text
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _sync_generate)

    async def generate_welcome_message(self, user_name: Optional[str] = None) -> str:
        """
        Genera mensaje de bienvenida personalizado.

        Args:
            user_name: Nombre del usuario (opcional)

        Returns:
            Mensaje de bienvenida
        """
        greeting = f"¡Hola {user_name}! 🌟" if user_name else "¡Hola! 🌟"

        welcome = f"""{greeting}

Soy tu Experto Astrológico Fraktal, especializado en la metodología de Jon Landeta.

Estoy aquí para ayudarte a comprender más profundamente tu carta natal y los mensajes que el cosmos tiene para ti.

**Puedo ayudarte con:**
• Interpretación de planetas, signos y casas
• Significado de aspectos planetarios
• Análisis de tránsitos y ciclos actuales
• Preguntas sobre vocación y propósito
• Dinámicas relacionales (sinastría)
• Cualquier duda sobre tu informe astrológico

¿Qué te gustaría explorar hoy?"""

        return welcome


# Instancia global del servicio (se inicializa al importar)
ai_expert: Optional[AIExpertService] = None


def get_ai_expert_service() -> AIExpertService:
    """Obtiene la instancia del servicio de IA (lazy initialization)"""
    global ai_expert
    if ai_expert is None:
        ai_expert = AIExpertService()
    return ai_expert


# Funciones auxiliares para uso en endpoints
async def get_ai_response(
    question: str,
    history: list[dict],
    report: Optional[str] = None
) -> str:
    """Wrapper para obtener respuesta del experto IA"""
    service = get_ai_expert_service()
    return await service.get_chat_response(question, history, report)


async def get_welcome_message(user_name: Optional[str] = None) -> str:
    """Wrapper para obtener mensaje de bienvenida"""
    service = get_ai_expert_service()
    return await service.generate_welcome_message(user_name)
