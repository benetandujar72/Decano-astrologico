# Sistema de Auto-Regeneración de Módulos

## 🎯 Problema Resuelto

**ANTES:** El sistema bloqueaba la generación completa del informe cuando detectaba lenguaje determinista (como "es", "será", "siempre") y lanzaba una excepción, deteniendo todo el proceso.

**AHORA:** El sistema **regenera automáticamente** el módulo problemático con instrucciones corregidas, permitiendo que el informe se complete exitosamente.

---

## 🔄 Cómo Funciona

### 1. Detección Inteligente de Tipos de Error

El sistema distingue entre dos tipos de problemas:

#### A. Problemas de Lenguaje (Requieren REGENERACIÓN)
- Lenguaje determinista detectado (`"es"`, `"será"`, `"siempre"`, `"nunca"`)
- Lenguaje dramático (`"terrible"`, `"catastrófico"`, `"fatal"`)
- Falta de estructura (`"Polo A"`, `"Polo B"` en módulo de ejes)

**Acción:** Reescribe el módulo completo con prompts corregidos

#### B. Problemas de Formato (Requieren EXPANSIÓN)
- Longitud insuficiente (faltan caracteres)
- Falta "Pregunta para reflexionar" al final

**Acción:** Añade contenido nuevo al final (append-only)

### 2. Proceso de Regeneración Automática

Cuando se detecta un problema de lenguaje:

```python
# 1. Detecta el problema
is_valid, error_msg = self._validate_section_content(...)
# ❌ "Se detectó lenguaje determinista prohibido: [' es ', ' será ']"

# 2. Identifica que necesita regeneración
needs_regeneration = "lenguaje determinista" in error_msg.lower()  # True

# 3. Genera prompt de corrección específico
regen_prompt = """
REESCRIBE COMPLETAMENTE el módulo corrigiendo los siguientes problemas:

❌ PROBLEMA DETECTADO: Se detectó lenguaje determinista [' es ', ' será ']

✅ INSTRUCCIONES DE CORRECCIÓN:
- ELIMINA lenguaje determinista: NO uses "es", "será", "siempre"
- USA lenguaje de posibilidad: "tiende a", "puede", "frecuentemente"
- Mantén tono profesional y empático
...
"""

# 4. Regenera el módulo completo
response = await self.ai_service.get_chat_response(regen_prompt, [])

# 5. Valida nuevamente
is_valid, error_msg = self._validate_section_content(...)

# 6. Si sigue fallando, reintenta (máximo 3 veces)
```

### 3. Límites de Reintento

- **Regeneraciones (problemas de lenguaje):** Máximo 3 (configurable con `FULL_REPORT_MAX_REGENERATIONS`)
- **Expansiones (problemas de longitud):** Máximo 6 (configurable con `FULL_REPORT_MAX_EXPANSIONS`)

---

## ⚙️ Variables de Entorno

```bash
# Número máximo de regeneraciones completas por módulo
FULL_REPORT_MAX_REGENERATIONS=3

# Número máximo de expansiones (añadir texto) por módulo
FULL_REPORT_MAX_EXPANSIONS=6

# Caracteres del final del módulo a usar como contexto en expansiones
FULL_REPORT_EXPANSION_TAIL_CHARS=1800
```

---

## 📊 Eventos de Progreso

El sistema emite eventos SSE para tracking en el frontend:

### Regeneración
```json
{
  "event": "ai_regenerate_start",
  "regeneration": 1,
  "max": 3,
  "reason": "Se detectó lenguaje determinista prohibido: [' es ', ' será ']"
}

{
  "event": "ai_regenerate_done",
  "regeneration": 1,
  "response_chars": 4250
}
```

### Expansión
```json
{
  "event": "ai_expand_start",
  "expansion": 1,
  "max": 6,
  "reason": "Extensión insuficiente: 2500 de 3500 caracteres requeridos"
}

{
  "event": "ai_expand_done",
  "expansion": 1,
  "response_chars": 3800
}
```

---

## 🎨 Integración Frontend

El frontend puede mostrar mensajes específicos según el evento:

```javascript
// Regeneración (problema de lenguaje)
case 'ai_regenerate_start':
  showMessage(`🔄 Regenerando módulo (${data.regeneration}/${data.max}): ${data.reason}`);
  break;

// Expansión (problema de longitud)
case 'ai_expand_start':
  showMessage(`➕ Expandiendo módulo (${data.expansion}/${data.max}): ${data.reason}`);
  break;
```

---

## 🔍 Ejemplo de Flujo Completo

### Escenario: Módulo con Lenguaje Determinista

```
1. Generación inicial del módulo
   ✅ Módulo generado: 3500 caracteres

2. Validación
   ❌ Detectado: [' es ', ' será ', ' siempre ']
   → needs_regeneration = True

3. Primera regeneración
   📝 Prompt: "ELIMINA lenguaje determinista..."
   ✅ Módulo regenerado: 3600 caracteres

4. Re-validación
   ❌ Aún detectado: [' es ']
   → needs_regeneration = True

5. Segunda regeneración
   📝 Prompt más estricto con ejemplos
   ✅ Módulo regenerado: 3550 caracteres

6. Re-validación
   ✅ Validación exitosa - Sin lenguaje determinista
   ✅ Longitud correcta (3550 > 3500)
   ✅ Pregunta para reflexionar presente

7. Continúa con siguiente módulo
```

---

## 🛡️ Validaciones que Activan Regeneración

### Lenguaje Determinista (v6.0)
```python
deter_words = [" es ", " será ", " siempre ", " nunca ", " indudablemente ", " inevitablemente "]
found_deter = [w for w in deter_words if w in content.lower()]
if found_deter and len(found_deter) > 2:
    return False, f"Se detectó lenguaje determinista prohibido: {found_deter}"
```

**Solución:** Usar lenguaje de posibilidad:
- ❌ "La persona **es** creativa"
- ✅ "La persona **tiende a ser** creativa"
- ✅ "La persona **puede mostrar** creatividad"

### Lenguaje Dramático (v6.0)
```python
drama_words = ["terrible", "catastrófico", "drama", "fatal", "maldición", "peor escenario"]
found_drama = [w for w in drama_words if w in content.lower()]
if found_drama:
    return False, f"Se detectó lenguaje dramático prohibido: {found_drama}"
```

**Solución:** Mantener tono profesional y empático:
- ❌ "Esta configuración es **terrible**"
- ✅ "Esta configuración presenta desafíos importantes"

### Estructura de Ejes (modulo_2_ejes)
```python
if "Polo A" not in content or "Polo B" not in content:
    return False, "Falta la estructura de plantilla (Polo A / Polo B)"
```

**Solución:** Incluir análisis de ambos polos en cada eje

---

## 📈 Beneficios

1. **Continuidad:** Los informes se completan sin intervención manual
2. **Calidad:** Mantiene estándares de lenguaje profesional
3. **Transparencia:** El usuario ve en tiempo real las correcciones
4. **Eficiencia:** No desperdicia módulos ya generados correctamente
5. **Escalabilidad:** Funciona con cualquier número de módulos

---

## 🚀 Próximos Pasos Recomendados

1. **Monitorear métricas:**
   - Número promedio de regeneraciones por informe
   - Tipos de errores más comunes
   - Tasa de éxito en primera generación

2. **Optimizar prompts base:**
   - Incluir ejemplos de lenguaje correcto desde el inicio
   - Reducir necesidad de regeneraciones

3. **Ajustar umbrales:**
   - Si las regeneraciones son frecuentes, mejorar prompts base
   - Si son raras, reducir `MAX_REGENERATIONS` para ahorrar tokens

---

## 📝 Notas Técnicas

- Las regeneraciones cuentan como intentos separados en el tracking de tokens
- Cada regeneración tiene su propia metadata de uso de la IA
- El contenido anterior se descarta completamente en regeneraciones
- Las expansiones preservan el contenido anterior y solo añaden al final
- Los límites de regeneración/expansión son independientes entre sí

---

## 🐛 Debugging

Para ver los logs de regeneración:

```bash
# En el backend
grep "ai_regenerate_start" /var/log/decano-backend.log

# En el frontend (consola del navegador)
console.log("[WIZARD] Regenerando módulo:", event.data)
```

Para desactivar temporalmente las validaciones de lenguaje:

```python
# En full_report_service.py línea 146
if found_deter and len(found_deter) > 99:  # Cambiar 2 a 99
    return False, f"Se detectó lenguaje determinista..."
```

**NOTA:** Solo para testing, no recomendado en producción.
