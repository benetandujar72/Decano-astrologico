"""
Servicio de orquestación de prompts
Resuelve qué prompt usar, inyecta variables y aplica configuración de templates
"""
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Dict, Any, Optional
import re
import json
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB client
MONGODB_URL = os.getenv("MONGODB_URL") or os.getenv("MONGODB_URI") or "mongodb://localhost:27017"
mongodb_options = {
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 10000,
    "socketTimeoutMS": 10000,
    "maxPoolSize": 10,
    "minPoolSize": 1,
}

if "mongodb+srv://" in MONGODB_URL or "mongodb.net" in MONGODB_URL:
    mongodb_options.update({
        "tls": True,
        "tlsAllowInvalidCertificates": True,
    })

client = AsyncIOMotorClient(MONGODB_URL, **mongodb_options)
db = client[os.getenv("MONGODB_DB_NAME", "astrology_db")]

prompts_collection = db["prompts"]
templates_collection = db["templates"]
report_types_collection = db["report_types"]


class PromptOrchestrator:
    """Orquestador de prompts"""

    def __init__(self):
        self.fallback_prompt = {
            "_id": "fallback",
            "version": 0,
            "system_instruction": "Eres un astrólogo profesional certificado con experiencia en interpretación de cartas natales.",
            "user_prompt_template": "Genera un informe astrológico para {nombre} basado en su carta natal:\n\n{carta_data}",
            "model": "gemini-3-pro-preview",
            "temperature": 0.7,
            "max_tokens": 8000
        }

    async def resolve_prompt(
        self,
        report_type_id: str,
        user_id: str,
        template_id: Optional[str] = None,
        variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Resolver qué prompt usar y aplicar configuración

        Args:
            report_type_id: ID del tipo de informe
            user_id: ID del usuario
            template_id: ID de la plantilla (opcional)
            variables: Variables para inyectar en el prompt

        Returns:
            Dict con prompt resuelto y configuración LLM
        """
        if variables is None:
            variables = {}

        # Paso 1: Intentar obtener prompt personalizado del usuario
        custom_prompt = await prompts_collection.find_one(
            {
                "report_type_id": ObjectId(report_type_id),
                "customized_by": ObjectId(user_id),
                "is_active": True
            },
            sort=[("version", -1)]
        )

        if custom_prompt:
            prompt = custom_prompt
            print(f"[ORCHESTRATOR] Using custom prompt v{prompt['version']} for user {user_id}")
        else:
            # Paso 2: Obtener prompt por defecto
            default_prompt = await prompts_collection.find_one(
                {
                    "report_type_id": ObjectId(report_type_id),
                    "is_default": True,
                    "is_active": True
                },
                sort=[("version", -1)]
            )

            if default_prompt:
                prompt = default_prompt
                print(f"[ORCHESTRATOR] Using default prompt v{prompt['version']}")
            else:
                # Paso 3: Usar fallback
                prompt = self.fallback_prompt
                print("[ORCHESTRATOR] No prompt found, using fallback")

        # Paso 4: Aplicar modificaciones de template (si existe)
        if template_id:
            template = await templates_collection.find_one({"_id": ObjectId(template_id)})
            if template:
                prompt = self._apply_template_to_prompt(prompt, template)
                print(f"[ORCHESTRATOR] Applied template modifications: {template['name']}")

        # Paso 5: Inyectar variables
        final_prompt = self._inject_variables(prompt, variables)

        # Paso 6: Aplicar guardrails
        final_prompt = self._apply_guardrails(final_prompt)

        # Paso 7: Construir respuesta
        return {
            "prompt_id": str(prompt.get("_id", "fallback")),
            "version": prompt.get("version", 0),
            "system_instruction": final_prompt["system_instruction"],
            "user_prompt": final_prompt["user_prompt"],
            "llm_config": {
                "model": prompt.get("model", "gemini-3-pro-preview"),
                "temperature": prompt.get("temperature", 0.7),
                "max_tokens": prompt.get("max_tokens", 8000),
                "safety_settings": prompt.get("safety_settings", {})
            }
        }

    def _apply_template_to_prompt(self, prompt: Dict[str, Any], template: Dict[str, Any]) -> Dict[str, Any]:
        """
        Modificar prompt basado en configuración de template

        Args:
            prompt: Prompt original
            template: Template con configuración

        Returns:
            Prompt modificado
        """
        user_prompt = prompt.get("user_prompt_template", "")
        content = template.get("content", {})

        # Inyectar instrucciones de modo (resumen/completo/exhaustivo)
        mode = content.get("report_mode", "completo")
        mode_instructions = {
            "resumen": "\n\nIMPORTANTE: Genera un informe BREVE y CONCISO (máximo 3000 palabras). Enfócate en los puntos más relevantes.",
            "completo": "\n\nIMPORTANTE: Genera un informe COMPLETO y DETALLADO (aproximadamente 8000 palabras). Analiza todos los aspectos importantes.",
            "exhaustivo": "\n\nIMPORTANTE: Genera un informe EXHAUSTIVO y MUY DETALLADO (15000+ palabras). Incluye todas las secciones expandidas con análisis profundo."
        }
        user_prompt += mode_instructions.get(mode, "")

        # Inyectar módulos a incluir
        modules = content.get("modules_to_print", [])
        if modules:
            modules_str = ", ".join(modules)
            user_prompt += f"\n\nSecciones a incluir: {modules_str}"

        # Inyectar idioma
        language = content.get("language", "es")
        language_map = {
            "es": "español",
            "en": "inglés",
            "fr": "francés",
            "de": "alemán",
            "it": "italiano",
            "pt": "portugués"
        }
        lang_name = language_map.get(language, "español")
        user_prompt += f"\n\nResponde en idioma: {lang_name}"

        # Inyectar instrucciones de elementos visuales
        if content.get("include_chart_images", True):
            user_prompt += "\n\nIncluye referencias a las imágenes de la carta natal."

        if content.get("include_aspects_table", True):
            user_prompt += "\n\nIncluye análisis de la tabla de aspectos."

        if content.get("include_planetary_table", True):
            user_prompt += "\n\nIncluye análisis de las posiciones planetarias."

        # Actualizar prompt
        modified_prompt = dict(prompt)
        modified_prompt["user_prompt_template"] = user_prompt

        return modified_prompt

    def _inject_variables(self, prompt: Dict[str, Any], variables: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inyectar variables en el prompt

        Args:
            prompt: Prompt con placeholders
            variables: Variables a inyectar

        Returns:
            Prompt con variables reemplazadas
        """
        user_prompt = prompt.get("user_prompt_template", "")

        # Reemplazar cada variable
        for var_name, var_value in variables.items():
            placeholder = f"{{{var_name}}}"

            # Si es dict u objeto, convertir a JSON
            if isinstance(var_value, dict):
                var_value = json.dumps(var_value, ensure_ascii=False, indent=2)
            elif isinstance(var_value, (list, tuple)):
                var_value = json.dumps(var_value, ensure_ascii=False)

            user_prompt = user_prompt.replace(placeholder, str(var_value))

        # Verificar variables no resueltas
        unresolved = re.findall(r'\{(\w+)\}', user_prompt)
        if unresolved:
            print(f"[ORCHESTRATOR] Warning: Unresolved variables: {unresolved}")
            # Reemplazar con placeholder vacío para evitar errores
            for var in unresolved:
                user_prompt = user_prompt.replace(f"{{{var}}}", f"[{var} no disponible]")

        return {
            "system_instruction": prompt.get("system_instruction", ""),
            "user_prompt": user_prompt
        }

    def _apply_guardrails(self, prompt: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aplicar guardrails de seguridad

        Args:
            prompt: Prompt a validar

        Returns:
            Prompt validado
        """
        system = prompt.get("system_instruction", "")
        user = prompt.get("user_prompt", "")

        # Verificar longitud total
        total_length = len(system) + len(user)
        if total_length > 32000:
            raise ValueError(
                f"Prompt exceeds 32K character limit (current: {total_length})"
            )

        # Sanitizar inputs básicos (protección contra inyección)
        user = self._sanitize_input(user)

        # Agregar instrucciones de seguridad al system prompt
        safety_instruction = (
            "\n\nIMPORTANTE - RESTRICCIONES:"
            "\n- Nunca proporciones información médica, legal o financiera específica."
            "\n- No hagas diagnósticos de salud mental."
            "\n- No predecir eventos específicos como predicciones categóricas."
            "\n- Enfócate en el potencial y el crecimiento personal."
        )

        if safety_instruction not in system:
            system += safety_instruction

        return {
            "system_instruction": system,
            "user_prompt": user
        }

    def _sanitize_input(self, text: str) -> str:
        """
        Sanitizar input para prevenir inyecciones

        Args:
            text: Texto a sanitizar

        Returns:
            Texto sanitizado
        """
        # Remover tags HTML/script
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', '', text)

        # Remover caracteres de control peligrosos
        text = text.replace('\x00', '')

        # Limitar longitud de líneas individuales (protección contra payloads grandes)
        lines = text.split('\n')
        sanitized_lines = [line[:5000] for line in lines]  # Max 5000 chars por línea
        text = '\n'.join(sanitized_lines)

        return text


# Instancia global del orquestador
prompt_orchestrator = PromptOrchestrator()
