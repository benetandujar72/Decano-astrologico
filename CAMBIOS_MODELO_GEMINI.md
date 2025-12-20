# Cambios en Configuración de Modelos Gemini

## Resumen de Cambios

Se ha actualizado el sistema para utilizar los modelos más recientes de Google Gemini con sistema de fallback automático y logging mejorado.

## Modelo por Defecto

### Modelo Principal
- **gemini-3-pro-preview** (última versión de Gemini)

### Fallback Automático
- **gemini-2.5-pro** (si el modelo principal no está disponible)

## Características Implementadas

### 1. Sistema de Fallback Inteligente
- Intenta primero con el modelo preferido (`gemini-3-pro-preview`)
- Si falla, automáticamente cambia a `gemini-2.5-pro`
- No requiere intervención manual

### 2. Logging Mejorado
Ahora la aplicación muestra mensajes claros en consola sobre qué modelo se está utilizando:

```
✅ Modelo Gemini inicializado: gemini-3-pro-preview
🤖 Generando respuesta con modelo: gemini-3-pro-preview
✅ Respuesta generada correctamente con gemini-3-pro-preview
```

O en caso de fallback:
```
⚠️ No se pudo inicializar gemini-3-pro-preview, intentando con gemini-2.5-pro...
✅ Modelo Gemini inicializado (fallback): gemini-2.5-pro
🤖 Generando respuesta con modelo: gemini-2.5-pro
```

### 3. Configuración Flexible
Puedes cambiar el modelo mediante la variable de entorno `GEMINI_MODEL`:

```bash
# En tu archivo .env
GEMINI_MODEL=gemini-2.5-pro
```

## Archivos Modificados

### 1. `backend/app/services/demo_ai_service.py`
- Implementación de sistema de fallback
- Tracking del modelo activo (`self.current_model`)
- Logs informativos en inicialización y generación

### 2. `backend/app/services/ai_expert_service.py`
- Mismas mejoras que en `demo_ai_service.py`
- Logs con prefijo `AIExpertService` para identificación

### 3. `backend/.env.example`
- Documentación de variable `GEMINI_MODEL`
- Lista de modelos disponibles
- Recomendaciones de uso

## Modelos Disponibles

| Modelo | Descripción | Recomendado Para |
|--------|-------------|------------------|
| `gemini-3-pro-preview` | Última versión de Gemini | Desarrollo y producción (RECOMENDADO) |
| `gemini-2.5-pro` | Versión estable | Producción estable |
| `gemini-1.5-pro` | Versión anterior | Compatibilidad |
| `gemini-1.5-flash` | Rápido y económico | Alta carga, respuestas rápidas |

## Cómo Usar

### Desarrollo Local
No se requiere cambiar nada. El sistema usará `gemini-3-pro-preview` por defecto.

### Cambiar Modelo Manualmente
1. Abre tu archivo `.env`
2. Agrega o modifica:
   ```bash
   GEMINI_MODEL=gemini-2.5-pro
   ```
3. Reinicia el servidor backend

### Verificar Modelo en Uso
Revisa la consola del backend al iniciar:
```
✅ Modelo Gemini inicializado: [nombre-del-modelo]
```

Y cada vez que se genera contenido:
```
🤖 Generando respuesta con modelo: [nombre-del-modelo]
```

## Beneficios

1. **Mayor Estabilidad**: Si un modelo falla, el sistema continúa funcionando
2. **Visibilidad**: Sabes exactamente qué modelo está procesando cada solicitud
3. **Flexibilidad**: Puedes cambiar de modelo sin modificar código
4. **Debugging Mejorado**: Los logs facilitan identificar problemas

## Notas Importantes

- El modelo `gemini-3-pro-preview` es la última versión disponible de Gemini
- El fallback a `gemini-2.5-pro` garantiza que el sistema siempre funcione
- Para máxima estabilidad en producción puedes forzar `gemini-2.5-pro` en la variable de entorno
- Los logs se muestran en la consola del servidor backend

## Pruebas Recomendadas

1. Inicia el backend y verifica qué modelo se inicializó
2. Realiza una consulta de prueba
3. Revisa los logs para confirmar el modelo usado
4. Prueba cambiar `GEMINI_MODEL` en `.env` y reiniciar

---

**Fecha de Cambio**: 2025-12-20
**Versión**: 1.0
