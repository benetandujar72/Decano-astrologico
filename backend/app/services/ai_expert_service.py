"""
Servicio de IA experta para consultas astrológicas
Utiliza Google Gemini para responder preguntas sobre informes astrológicos
"""
from typing import Optional, Dict
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
            response_text, usage_metadata = await self._generate_async(chat, full_message)
            
            if usage_metadata:
                print(f"📊 Tokens usados - Prompt: {usage_metadata.get('prompt_token_count', 0)}, Response: {usage_metadata.get('candidates_token_count', 0)}, Total: {usage_metadata.get('total_token_count', 0)}")
            
            print(f"✅ AIExpertService - Respuesta generada correctamente con {self.current_model}")

            # Almacenar metadata en el objeto para acceso posterior
            if not hasattr(self, '_last_usage_metadata'):
                self._last_usage_metadata = {}
            self._last_usage_metadata = usage_metadata or {}

            return response_text

        except Exception as e:
            print(f"❌ Error en AIExpertService.get_chat_response con {self.current_model}: {e}")
            raise Exception(f"Error al obtener respuesta del experto IA: {str(e)}")
    
    def get_last_usage_metadata(self) -> Optional[Dict]:
        """Obtiene la metadata de uso de la última llamada"""
        return getattr(self, '_last_usage_metadata', None)

    async def _generate_async(self, chat, message: str) -> tuple[str, Optional[Dict]]:
        """
        Wrapper asíncrono para generar respuesta con Gemini
        Retorna (texto, metadata) donde metadata incluye información de tokens
        """
        import asyncio
        from google.generativeai.types import HarmCategory, HarmBlockThreshold

        def _sync_generate():
            # Configurar safety settings más permisivos para contenido astrológico
            safety_settings = {
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }

            try:
                response = chat.send_message(
                    message,
                    safety_settings=safety_settings
                )
                text = response.text

                # Extraer información de tokens si está disponible
                usage_metadata = None
                if hasattr(response, 'usage_metadata'):
                    usage_metadata = {
                        'prompt_token_count': getattr(response.usage_metadata, 'prompt_token_count', 0),
                        'candidates_token_count': getattr(response.usage_metadata, 'candidates_token_count', 0),
                        'total_token_count': getattr(response.usage_metadata, 'total_token_count', 0)
                    }

                return text, usage_metadata

            except Exception as e:
                # Si hay un error de bloqueo (finish_reason: 12 = BLOCKLIST)
                error_str = str(e)
                if "finish_reason: 12" in error_str or "BLOCKLIST" in error_str or "content { }" in error_str:
                    print(f"⚠️ Contenido bloqueado por filtros de seguridad de Gemini")
                    print(f"⚠️ Error original: {error_str}")

                    # Intentar con prompt más genérico o sanitizado
                    # Por ahora, lanzar excepción específica que se puede manejar en niveles superiores
                    raise Exception(
                        "GEMINI_SAFETY_BLOCK: El contenido fue bloqueado por los filtros de seguridad de Gemini. "
                        "Esto puede ocurrir con ciertos términos astrológicos. Por favor, intenta reformular la consulta."
                    )
                else:
                    # Otro tipo de error, re-lanzar
                    raise

        loop = asyncio.get_event_loop()
        timeout_seconds = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "240"))
        try:
            return await asyncio.wait_for(
                loop.run_in_executor(None, _sync_generate),
                timeout=timeout_seconds,
            )
        except asyncio.TimeoutError as e:
            raise Exception(f"Timeout de Gemini ({timeout_seconds}s) esperando respuesta") from e

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


class DisabledAIExpertService:
    """
    Servicio “placeholder” cuando falta configuración (p.ej. GEMINI_API_KEY).
    Evita que el backend falle al importar módulos; fallará solo cuando se use.
    """

    def __init__(self, reason: str):
        self.current_model = "disabled"
        self._reason = reason
        self._last_usage_metadata = {}

    async def get_chat_response(self, *args, **kwargs) -> str:
        raise Exception(f"Servicio IA deshabilitado: {self._reason}")

    def get_last_usage_metadata(self) -> Optional[Dict]:
        return self._last_usage_metadata

    async def generate_welcome_message(self, user_name: Optional[str] = None) -> str:
        raise Exception(f"Servicio IA deshabilitado: {self._reason}")


def get_ai_expert_service() -> AIExpertService:
    """Obtiene la instancia del servicio de IA (lazy initialization)"""
    global ai_expert
    if ai_expert is None:
        try:
            ai_expert = AIExpertService()
        except Exception as e:
            # Importante: no tumbar el backend por falta de variables en entornos donde
            # no se use Gemini (tests, desarrollo, endpoints no-AI). Fallará al usarlo.
            print(f"⚠️ AIExpertService deshabilitado: {e}")
            ai_expert = DisabledAIExpertService(str(e))  # type: ignore[assignment]
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
