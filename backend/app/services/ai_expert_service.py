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

        # Intentar primero con gemini-3-pro-preview, fallback a gemini-2.5-pro
        preferred_model = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
        try:
            self.model = genai.GenerativeModel(
                model_name=preferred_model,
                system_instruction=self._get_system_prompt()
            )
            self.current_model = preferred_model
            print(f"✅ AIExpertService - Modelo Gemini inicializado: {preferred_model}")
        except Exception as e:
            print(f"⚠️ AIExpertService - No se pudo inicializar {preferred_model}, intentando con gemini-2.5-pro...")
            try:
                self.model = genai.GenerativeModel(
                    model_name="gemini-2.5-pro",
                    system_instruction=self._get_system_prompt()
                )
                self.current_model = "gemini-2.5-pro"
                print(f"✅ AIExpertService - Modelo Gemini inicializado (fallback): gemini-2.5-pro")
            except Exception as e2:
                print(f"❌ AIExpertService - Error al inicializar modelos Gemini: {e2}")
                raise ValueError(f"No se pudo inicializar ningún modelo Gemini: {e2}")

    def _get_system_prompt(self) -> str:
        """Obtiene el prompt del sistema para el experto astrológico"""
        from app.models.default_prompt import DEFAULT_SYSTEM_PROMPT
        return DEFAULT_SYSTEM_PROMPT

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
            print(f"🤖 AIExpertService - Generando respuesta con modelo: {self.current_model}")
            response = await self._generate_async(chat, full_message)
            print(f"✅ AIExpertService - Respuesta generada correctamente con {self.current_model}")

            return response

        except Exception as e:
            print(f"❌ Error en AIExpertService.get_chat_response con {self.current_model}: {e}")
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
