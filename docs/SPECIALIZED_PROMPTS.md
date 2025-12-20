# 🎯 Sistema de Prompts Especializados - FRAKTAL

## Descripción General

El sistema de prompts especializados permite configurar diferentes instrucciones de IA para cada tipo de análisis astrológico. En lugar de usar un único prompt genérico, cada tipo de carta (Natal, Revolución Solar, Tránsitos, etc.) puede tener su propio prompt optimizado.

---

## ✨ Características Implementadas

### 1️⃣ **Backend API Completo** (`backend/app/api/endpoints/config.py`)

#### Endpoints Disponibles:

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/config/prompts/specialized` | Lista todos los prompts especializados | Admin |
| `GET` | `/config/prompts/specialized/{type}` | Obtiene un prompt específico por tipo | Usuario autenticado |
| `POST` | `/config/prompts/specialized` | Crea un nuevo prompt especializado | Solo Admin |
| `PUT` | `/config/prompts/specialized/{id}` | Actualiza un prompt existente | Admin o creador |
| `DELETE` | `/config/prompts/specialized/{id}` | Elimina un prompt personalizado | Admin o creador |
| `POST` | `/config/prompts/specialized/{id}/use` | Incrementa contador de uso | Usuario autenticado |

#### Ejemplo de Uso:

```bash
# Obtener todos los prompts especializados
curl -H "Authorization: Bearer $TOKEN" \
  https://tu-api.onrender.com/config/prompts/specialized

# Obtener prompt de Carta Natal
curl -H "Authorization: Bearer $TOKEN" \
  https://tu-api.onrender.com/config/prompts/specialized/natal_chart

# Crear nuevo prompt especializado
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Análisis de Tránsitos Avanzado",
    "type": "transits",
    "description": "Prompt optimizado para análisis de tránsitos planetarios",
    "content": "Eres un experto en tránsitos...",
    "house_system": "placidus",
    "is_public": true
  }' \
  https://tu-api.onrender.com/config/prompts/specialized
```

---

### 2️⃣ **Modelo de Datos** (`backend/app/models/prompts.py`)

#### Tipos de Prompts Soportados:

| Tipo | Código | Descripción |
|------|--------|-------------|
| **Carta Natal** | `natal_chart` | Análisis de la carta natal base |
| **Revolución Solar** | `solar_return` | Predicciones anuales basadas en retorno solar |
| **Tránsitos** | `transits` | Análisis de tránsitos planetarios actuales |
| **Progresiones** | `progressions` | Progresiones secundarias |
| **Sinastría** | `synastry` | Comparación de dos cartas natales |
| **Carta Compuesta** | `composite` | Carta compuesta de relación |
| **Direcciones** | `directions` | Direcciones primarias |
| **Orbes Custom** | `custom_orbs` | Configuración personalizada de orbes |
| **Psicológico** | `psychological` | Enfoque psicológico profundo |
| **Predictivo** | `predictive` | Enfoque predictivo/eventos |
| **Vocacional** | `vocational` | Orientación vocacional |
| **Médico** | `medical` | Astrología médica |
| **Financiero** | `financial` | Análisis financiero/económico |

#### Estructura del Modelo:

```python
class SpecializedPrompt(BaseModel):
    prompt_id: str                        # ID único del prompt
    name: str                              # Nombre descriptivo
    type: PromptType                       # Tipo de prompt (enum)
    description: str                       # Descripción breve
    content: str                           # Contenido del prompt (texto largo)

    # Configuración específica
    orb_config: Optional[OrbConfiguration] # Orbes personalizados
    house_system: str = "placidus"        # Sistema de casas

    # Metadatos
    created_by: str                        # Usuario creador
    created_at: str                        # Fecha de creación
    is_public: bool = False               # Visible para todos
    is_default: bool = False              # Prompt del sistema

    # Estadísticas
    usage_count: int = 0                  # Veces usado
    rating: float = 0.0                   # Calificación promedio
```

#### Prompts Predefinidos:

El sistema incluye **4 prompts predefinidos** ya implementados:

1. **Carta Natal** (`natal_chart`): Análisis estructural profundo con enfoque Carutti/Huber
2. **Revolución Solar** (`solar_return`): Predicción anual con técnicas de retorno solar
3. **Tránsitos** (`transits`): Activación temporal de la carta natal
4. **Sinastría** (`synastry`): Análisis de compatibilidad entre dos personas

---

### 3️⃣ **UI Interactiva** (`components/AdminDashboard.tsx`)

#### Interfaz de Administración:

- **Tab "Prompts"** en el Admin Dashboard
- **Grid visual** con los 13 tipos de prompts especializados
- **Indicadores de estado**:
  - 🟢 **Verde (Activo)**: Prompt personalizado configurado
  - ⚪ **Gris (Default)**: Usando prompt predefinido del sistema
- **Contador de usos** con estrella ⭐
- **Modal de visualización** al hacer clic en cada card

#### Funcionalidades de la UI:

✅ **Listar prompts**: Muestra todos los prompts especializados disponibles
✅ **Ver detalles**: Modal con información completa del prompt
✅ **Visualizar contenido**: Muestra el texto del prompt (solo lectura por ahora)
✅ **Distinguir defaults vs custom**: Badges de estado
✅ **Ver estadísticas de uso**: Contador de veces usado
🔧 **Editar prompts**: En desarrollo (botón placeholder)
🔧 **Crear nuevos**: En desarrollo

---

## 🚀 Cómo Usar

### Para Administradores:

1. **Acceder al Admin Dashboard**
   - Login como admin en la aplicación
   - Click en "Admin Panel"
   - Ir a la tab "Prompts"

2. **Ver Prompts Disponibles**
   - La interfaz muestra los 13 tipos de prompts
   - Los prompts con badge verde ya están configurados
   - Los prompts con badge gris usan el default del sistema

3. **Ver Contenido de un Prompt**
   - Click en cualquier card de prompt
   - Se abre modal con:
     - Nombre y descripción
     - Tipo de prompt
     - Número de veces usado
     - Contenido completo del prompt
     - Badge "Prompt del Sistema" si es default

4. **Editar Prompt Principal**
   - Usar el botón "Editar Prompt Principal" (funcionalidad ya existente)
   - Esto edita el prompt general usado en App.tsx

### Para Desarrolladores:

#### Integrar con Gemini AI:

Actualmente, el sistema de prompts especializados está listo en el backend, pero **falta integrar con el análisis de Gemini** en `App.tsx`.

**Estado Actual** (línea 226-284 de `App.tsx`):
```typescript
// Solo usa el prompt principal del sistema
const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        systemInstruction: systemInstruction, // ⚠️ Prompt genérico
        maxOutputTokens: 8192
    }
});
```

**Implementación Pendiente**:
```typescript
// TODO: Seleccionar prompt según tipo de carta
const chartType = determineChartType(userInput); // natal_chart, solar_return, etc.
const specializedPrompt = await fetchSpecializedPrompt(chartType);

const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        systemInstruction: specializedPrompt.content, // ✅ Prompt especializado
        maxOutputTokens: 8192
    }
});

// Incrementar contador de uso
await incrementPromptUsage(specializedPrompt.id);
```

---

## 📊 Base de Datos

### Colección: `specialized_prompts`

```javascript
{
  "_id": ObjectId("..."),
  "prompt_id": "prompt_1702345678",
  "name": "Análisis de Carta Natal Avanzado",
  "type": "natal_chart",
  "description": "Prompt optimizado para análisis profundo de carta natal",
  "content": "⚠️ SYSTEM PROMPT: ANÁLISIS DE CARTA NATAL...",
  "house_system": "placidus",
  "orb_config": {
    "conjunction": 8.0,
    "opposition": 8.0,
    // ...
  },
  "created_by": "admin",
  "created_at": "2024-12-13T10:30:00Z",
  "is_public": true,
  "is_default": false,
  "usage_count": 127,
  "rating": 4.8
}
```

### Índices Recomendados:

```javascript
db.specialized_prompts.createIndex({ "type": 1 });
db.specialized_prompts.createIndex({ "is_default": 1 });
db.specialized_prompts.createIndex({ "created_by": 1 });
db.specialized_prompts.createIndex({ "is_public": 1 });
```

---

## 🔧 Próximos Pasos (Pendientes)

### Alta Prioridad:

- [ ] **Integrar con Gemini AI en App.tsx**
  - Detectar tipo de carta solicitada
  - Cargar prompt especializado correspondiente
  - Usar prompt en systemInstruction de Gemini
  - Incrementar contador de uso

- [ ] **Función de Edición de Prompts**
  - Formulario de edición en modal
  - Validación de contenido
  - Guardar cambios en backend

- [ ] **Crear Nuevos Prompts Personalizados**
  - Botón "Crear Nuevo Prompt"
  - Formulario con todos los campos
  - Selección de tipo de prompt
  - Configuración de orbes opcionales

### Prioridad Media:

- [ ] **Sistema de Calificación**
  - Permitir calificar prompts después de uso
  - Mostrar rating promedio en UI
  - Ordenar por mejor calificación

- [ ] **Versionado de Prompts**
  - Historial de cambios
  - Poder revertir a versión anterior
  - Comparar versiones

- [ ] **Prompts Públicos/Compartidos**
  - Marketplace de prompts
  - Importar/exportar prompts
  - Compartir entre usuarios

### Prioridad Baja:

- [ ] **Analytics de Prompts**
  - Dashboard de estadísticas de uso
  - Prompts más populares
  - Tendencias de uso

- [ ] **A/B Testing de Prompts**
  - Comparar efectividad de diferentes prompts
  - Métricas de calidad de análisis

---

## 🧪 Testing

### Probar Endpoints Manualmente:

```bash
# 1. Login y obtener token
TOKEN=$(curl -X POST https://tu-api.onrender.com/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@programafraktal.com&password=1234" \
  | jq -r '.access_token')

# 2. Listar prompts especializados
curl -H "Authorization: Bearer $TOKEN" \
  https://tu-api.onrender.com/config/prompts/specialized

# 3. Ver prompt de Carta Natal
curl -H "Authorization: Bearer $TOKEN" \
  https://tu-api.onrender.com/config/prompts/specialized/natal_chart

# 4. Ver prompt de Tránsitos
curl -H "Authorization: Bearer $TOKEN" \
  https://tu-api.onrender.com/config/prompts/specialized/transits
```

### Verificar en UI:

1. Login como admin
2. Ir a Admin Panel > Tab "Prompts"
3. Debería mostrar "0 prompts configurados" (si no hay en DB)
4. Click en cualquier card (ej: "Carta Natal")
5. Debería abrir modal con el prompt predefinido
6. Verificar que muestra badge "Prompt del Sistema"
7. Verificar contenido del prompt en textarea

---

## 📝 Notas Importantes

### Seguridad:

- ✅ Solo administradores pueden **crear** prompts
- ✅ Solo admin o creador pueden **editar** prompts
- ✅ Solo admin o creador pueden **eliminar** prompts
- ✅ No se pueden eliminar prompts por defecto (`is_default: true`)
- ✅ Todos los usuarios autenticados pueden **ver** prompts

### Configuración de Orbes:

Los prompts pueden incluir configuración personalizada de orbes para aspectos:

```python
"orb_config": {
    "conjunction": 8.0,
    "opposition": 8.0,
    "trine": 8.0,
    "square": 8.0,
    "sextile": 6.0,
    "quincunx": 3.0,
    "sun_moon_orb_bonus": 2.0,
    "ascendant_orb": 4.0
}
```

Esto permite que cada tipo de análisis use orbes específicos.

### Performance:

- Los prompts predefinidos se retornan desde `DEFAULT_PROMPTS` si no existen en DB
- No requiere insertar datos iniciales
- Primera llamada puede ser lenta (MongoDB cold start en Render free tier)
- Considerar caché en frontend para prompts frecuentemente usados

---

## 🎓 Ejemplo de Prompt Especializado

### Prompt de Revolución Solar (Incluido en DEFAULT_PROMPTS):

```markdown
⚠️ SYSTEM PROMPT: REVOLUCIÓN SOLAR (FRAKTAL v2.0)

**ROL:** Experto en Técnicas Predictivas - Revolución Solar
**ENFOQUE:** Análisis anual basado en retorno solar

### PROTOCOLO REVOLUCIÓN SOLAR:

1. **COMPARACIÓN NATAL-REVOLUCIÓN**
   - Ascendente de RS vs Natal
   - Planetas angulares en RS
   - Casas activadas

2. **TEMAS PRINCIPALES DEL AÑO**
   - Casa donde cae el Sol de RS
   - Aspectos del Sol de RS
   - Planetas en ángulos de RS

3. **ÁREAS DE ACTIVACIÓN**
   - Por casa natal donde cae el ASC de RS
   - Planetas de RS sobre planetas natales
   - Aspectos entre cartas

4. **TIMING DE EVENTOS**
   - Progresión mensual (30° por mes)
   - Activación de casas por secuencia
   - Eclipses y lunaciones del año

5. **SÍNTESIS ANUAL**
   - Tema principal del año
   - Desafíos y oportunidades
   - Meses clave

**IMPORTANTE:** Toda interpretación debe relacionarse con la carta natal base.
```

---

## 📞 Soporte

Si tienes problemas con el sistema de prompts especializados:

1. Verifica que el backend esté desplegado correctamente en Render
2. Revisa logs del backend (busca `[CONFIG]` en Render Logs)
3. Verifica que el token de autenticación sea válido
4. Comprueba que la colección `specialized_prompts` existe en MongoDB
5. Si usas prompts personalizados, verifica que `MONGODB_URI` esté configurado correctamente

---

**Última actualización:** 2025-12-13
**Versión:** 1.0
**Estado:** ✅ Backend completo | 🟡 Frontend funcional (edición pendiente) | ⏳ Integración con Gemini pendiente
