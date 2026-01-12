# 🎨 Guía Completa de Configuración y Personalización

## 📋 Índice

1. [Solucionar Error "Error al cargar plantillas"](#1-solucionar-error)
2. [Configurar Plantillas de Informes](#2-plantillas-de-informes)
3. [Configurar Prompts Personalizados](#3-prompts-personalizados)
4. [Tipos de Informes Disponibles](#4-tipos-de-informes)
5. [Crear Nuevas Plantillas](#5-crear-nuevas-plantillas)
6. [Implementar Nuevos Prompts](#6-implementar-nuevos-prompts)

---

## 1. Solucionar Error "Error al cargar plantillas"

### Problema
```
Error al cargar plantillas
Error al cargar prompts
```

### Causa
Las colecciones de MongoDB están vacías o el usuario no tiene permisos.

### Solución Rápida

#### A. Verificar Backend está corriendo

```bash
curl https://decano-astrologico.onrender.com/health
# Debe devolver: {"status":"ok"}
```

#### B. Verificar Base de Datos

```bash
# Conectar a MongoDB
mongo "mongodb+srv://your-connection-string"

# Verificar colecciones existen
use astrology_db
db.templates.countDocuments()
db.specialized_prompts.countDocuments()
db.report_types.countDocuments()
```

#### C. Crear Datos Iniciales

Si las colecciones están vacías, ejecuta este script:

```bash
cd backend
python scripts/seed_data.py
```

O manualmente en MongoDB:

```javascript
// 1. Crear plantilla por defecto
db.templates.insertOne({
  name: "Plantilla por Defecto",
  is_public: true,
  user_id: null,
  branding: {
    logo_url: "",
    color_scheme: {
      primary: "#4F46E5",
      secondary: "#7C3AED",
      accent: "#EC4899"
    },
    typography: {
      font_family: "Inter, sans-serif",
      font_size_base: 16,
      line_height: 1.6
    }
  },
  content: {
    enabled_modules: [
      "modulo_1",
      "modulo_2_fundamentos",
      "modulo_2_ejes",
      "modulo_3_transitos",
      "modulo_4_sintesis"
    ],
    report_mode: "complete"
  },
  advanced: {
    custom_css: "",
    pdf_settings: {
      page_size: "A4",
      encryption: false,
      allow_printing: true,
      allow_copying: true
    }
  },
  created_at: new Date(),
  updated_at: new Date()
});

// 2. Crear tipos de informes
db.report_types.insertMany([
  {
    id: "carta_natal_completa",
    name: "Carta Natal Completa",
    description: "Análisis profundo de la carta natal",
    min_plan: "free",
    enabled: true
  },
  {
    id: "transitos_actuales",
    name: "Tránsitos Actuales",
    description: "Análisis de tránsitos planetarios",
    min_plan: "premium",
    enabled: true
  },
  {
    id: "revolucion_solar",
    name: "Revolución Solar",
    description: "Análisis anual de revolución solar",
    min_plan: "premium",
    enabled: true
  }
]);

// 3. Crear prompts especializados
db.specialized_prompts.insertMany([
  {
    type: "carta_natal",
    name: "Análisis Natal Estándar",
    prompt: "Analiza la carta natal considerando la posición de los planetas en signos, casas y aspectos. Usa lenguaje claro y empático.",
    is_public: true,
    user_id: null,
    usage_count: 0,
    created_at: new Date()
  },
  {
    type: "casas",
    name: "Interpretación de Casas",
    prompt: "Interpreta el significado de los planetas en las casas astrológicas, enfocándote en las áreas de vida que representan.",
    is_public: true,
    user_id: null,
    usage_count: 0,
    created_at: new Date()
  },
  {
    type: "aspectos",
    name: "Análisis de Aspectos",
    prompt: "Analiza los aspectos planetarios (conjunciones, trígonos, cuadraturas, oposiciones) y su significado psicológico.",
    is_public: true,
    user_id: null,
    usage_count: 0,
    created_at: new Date()
  }
]);
```

---

## 2. Plantillas de Informes

### ¿Qué son las Plantillas?

Las plantillas definen:
- **Branding**: Logo, colores, tipografía
- **Contenido**: Qué módulos incluir en el informe
- **Avanzado**: CSS personalizado, configuración PDF

### Estructura de una Plantilla

```json
{
  "name": "Mi Plantilla",
  "is_public": false,
  "user_id": "user123",
  "branding": {
    "logo_url": "https://mi-logo.com/logo.png",
    "color_scheme": {
      "primary": "#4F46E5",      // Azul índigo
      "secondary": "#7C3AED",    // Violeta
      "accent": "#EC4899"        // Rosa
    },
    "typography": {
      "font_family": "Inter, sans-serif",
      "font_size_base": 16,
      "line_height": 1.6
    }
  },
  "content": {
    "enabled_modules": [
      "modulo_1",                  // Introducción
      "modulo_2_fundamentos",      // Fundamentos
      "modulo_2_ejes",             // Ejes de polaridad
      "modulo_3_transitos",        // Tránsitos
      "modulo_4_sintesis"          // Síntesis
    ],
    "report_mode": "complete"      // summary | complete | exhaustive
  },
  "advanced": {
    "custom_css": ".report { font-size: 18px; }",
    "pdf_settings": {
      "page_size": "A4",           // A4 | Letter
      "encryption": false,
      "password": "",
      "allow_printing": true,
      "allow_copying": true,
      "watermark_text": ""
    }
  }
}
```

### Acceder a Plantillas desde Frontend

```javascript
// En components/Customization/TemplateManager.tsx

// Listar plantillas del usuario
const response = await api.get('/templates');
// Devuelve: { templates: [...], total: 10 }

// Obtener plantilla específica
const template = await api.get('/templates/template_id');

// Crear nueva plantilla
const newTemplate = await api.post('/templates', {
  name: "Mi Nueva Plantilla",
  branding: { /* ... */ },
  content: { /* ... */ }
});

// Clonar plantilla pública
const cloned = await api.post('/templates/template_id/clone');

// Actualizar plantilla
await api.put('/templates/template_id', {
  name: "Nombre Actualizado",
  /* otros campos */
});

// Eliminar plantilla
await api.delete('/templates/template_id');
```

---

## 3. Prompts Personalizados

### ¿Qué son los Prompts?

Los prompts son instrucciones que guían a la IA sobre **cómo generar el contenido** del informe.

### Tipos de Prompts

1. **Prompts Especializados** (`/config/prompts/specialized`)
   - Por tipo de análisis (carta_natal, casas, aspectos, tránsitos)
   - Personalizables por usuario
   - Afectan módulos específicos

2. **Prompt del Sistema** (`/config/prompt`)
   - Define el comportamiento global de la IA
   - Solo administradores pueden modificar
   - Aplica a todos los informes

### Estructura de un Prompt Especializado

```json
{
  "type": "carta_natal",
  "name": "Análisis Profundo de Carta Natal",
  "prompt": "Analiza la carta natal del consultante considerando:\n\n1. **Posiciones Planetarias**: Describe la posición de cada planeta en su signo y casa.\n2. **Aspectos Principales**: Enfócate en conjunciones, cuadraturas y oposiciones.\n3. **Temas Dominantes**: Identifica patrones arquetípicos recurrentes.\n4. **Lenguaje**: Usa lenguaje de posibilidad ('tiende a', 'puede', 'sugiere').\n\nMantén un tono empático y profesional.",
  "is_public": false,
  "user_id": "user123",
  "usage_count": 0
}
```

### Acceder a Prompts desde Frontend

```javascript
// En components/Customization/PromptEditor.tsx

// Listar prompts especializados
const prompts = await api.get('/config/prompts/specialized');

// Obtener prompt por tipo
const prompt = await api.get('/config/prompts/specialized/carta_natal');

// Crear nuevo prompt
const newPrompt = await api.post('/config/prompts/specialized', {
  type: "transitos",
  name: "Mi Análisis de Tránsitos",
  prompt: "Analiza los tránsitos actuales...",
  is_public: false
});

// Actualizar prompt
await api.put('/config/prompts/specialized/prompt_id', {
  name: "Nombre Actualizado",
  prompt: "Texto actualizado..."
});

// Eliminar prompt
await api.delete('/config/prompts/specialized/prompt_id');

// Registrar uso
await api.post('/config/prompts/specialized/prompt_id/use');
```

### Mejores Prácticas para Prompts

✅ **SÍ hacer:**
- Usar lenguaje de posibilidad ("tiende a", "puede", "sugiere")
- Ser específico sobre estructura y formato
- Incluir ejemplos de tono deseado
- Mencionar qué evitar (determinismo, lenguaje dramático)

❌ **NO hacer:**
- Usar lenguaje determinista ("es", "será", "siempre")
- Usar lenguaje dramático ("terrible", "catastrófico")
- Hacer prompts demasiado largos (>4000 caracteres)
- Incluir información personal del usuario en el prompt

### Ejemplo de Prompt Bien Escrito

```
Analiza los tránsitos planetarios actuales del consultante.

ESTRUCTURA:
1. Tránsitos Críticos (Saturno, Urano, Neptuno, Plutón)
2. Tránsitos de Planetas Rápidos (Sol, Luna, Mercurio, Venus, Marte)
3. Interpretación de Impacto Personal

INSTRUCCIONES:
- Usa lenguaje de posibilidad: "tiende a", "puede", "sugiere", "frecuentemente"
- Evita determinismo: NO uses "es", "será", "siempre", "nunca"
- Mantén tono empático y profesional
- Incluye al final: "Pregunta para reflexionar: [pregunta relevante]"

LONGITUD MÍNIMA: 3500 caracteres

EJEMPLO DE TONO:
"Este tránsito de Saturno sobre tu Luna natal puede traer un período de introspección emocional. Tiendes a sentir la necesidad de establecer límites más claros en tus relaciones..."
```

---

## 4. Tipos de Informes Disponibles

### Módulos del Sistema

El sistema soporta 11 módulos diferentes:

| ID | Nombre | Descripción | Min Chars |
|----|--------|-------------|-----------|
| `modulo_1` | Introducción | Presentación general de la carta | 2000 |
| `modulo_2_fundamentos` | Fundamentos | Sol, Luna, Ascendente | 3500 |
| `modulo_2_ejes` | Ejes de Polaridad | Análisis de los 6 ejes | 4000 |
| `modulo_3_transitos` | Tránsitos | Tránsitos planetarios actuales | 3500 |
| `modulo_4_sintesis` | Síntesis | Conclusión integradora | 2500 |
| `modulo_5_planetas` | Planetas en Signos | Interpretación detallada | 4000 |
| `modulo_6_casas` | Planetas en Casas | Áreas de vida | 4000 |
| `modulo_7_aspectos` | Aspectos Planetarios | Dinámicas internas | 4500 |
| `modulo_8_vocacion` | Vocación | Propósito de vida | 3000 |
| `modulo_9_relaciones` | Relaciones | Dinámicas relacionales | 3500 |
| `modulo_10_evolucion` | Evolución Personal | Camino de crecimiento | 3000 |

### Modos de Informe

1. **Summary** (`summary`)
   - Módulos: 1, 2_fundamentos, 4_sintesis
   - Longitud: ~8,000 caracteres
   - Tiempo: ~2-3 minutos

2. **Complete** (`complete`)
   - Módulos: Todos los básicos (1, 2, 3, 4)
   - Longitud: ~14,000 caracteres
   - Tiempo: ~5-7 minutos

3. **Exhaustive** (`exhaustive`)
   - Módulos: Todos los 11 módulos
   - Longitud: ~40,000+ caracteres
   - Tiempo: ~15-20 minutos

### Configurar en Plantilla

```json
{
  "content": {
    "enabled_modules": [
      "modulo_1",
      "modulo_2_fundamentos",
      "modulo_2_ejes",
      "modulo_3_transitos",
      "modulo_4_sintesis"
    ],
    "report_mode": "complete"
  }
}
```

---

## 5. Crear Nuevas Plantillas

### Desde el Frontend

1. **Acceder al Panel de Personalización**
   ```
   https://app.programafraktal.com
   → Clic en botón "Diseño" (settings icon)
   → Pestaña "Plantillas"
   ```

2. **Crear Nueva Plantilla**
   - Clic en "+ Crear Nueva"
   - Completar formulario:
     - **Nombre**: "Mi Plantilla Premium"
     - **¿Pública?**: No (solo tú la verás)

3. **Configurar Branding**
   - **Logo**: Subir imagen (DataURL por ahora, URL en futuro)
   - **Colores**:
     - Primario: Color principal del brand
     - Secundario: Color de acentos
     - Accent: Color de highlights
   - **Tipografía**:
     - Fuente: Inter, Roboto, Georgia, etc.
     - Tamaño base: 14-18px
     - Interlineado: 1.4-1.8

4. **Configurar Contenido**
   - Seleccionar módulos a incluir
   - Elegir modo de informe (summary/complete/exhaustive)

5. **Configuración Avanzada** (Solo Enterprise)
   - CSS personalizado
   - Configuración de PDF
   - Seguridad (encriptación, contraseña)

### Desde API Directamente

```bash
curl -X POST https://decano-astrologico.onrender.com/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Plantilla Profesional",
    "is_public": false,
    "branding": {
      "logo_url": "",
      "color_scheme": {
        "primary": "#1E40AF",
        "secondary": "#7C3AED",
        "accent": "#F59E0B"
      },
      "typography": {
        "font_family": "Georgia, serif",
        "font_size_base": 17,
        "line_height": 1.7
      }
    },
    "content": {
      "enabled_modules": [
        "modulo_1",
        "modulo_2_fundamentos",
        "modulo_5_planetas",
        "modulo_6_casas",
        "modulo_7_aspectos",
        "modulo_4_sintesis"
      ],
      "report_mode": "complete"
    },
    "advanced": {
      "custom_css": "",
      "pdf_settings": {
        "page_size": "A4",
        "encryption": false,
        "allow_printing": true,
        "allow_copying": true
      }
    }
  }'
```

---

## 6. Implementar Nuevos Prompts

### Paso 1: Identificar el Tipo

Los prompts se organizan por tipo:
- `carta_natal`
- `casas`
- `aspectos`
- `transitos`
- `vocacion`
- `relaciones`
- `sintesis`

### Paso 2: Diseñar el Prompt

Usa esta plantilla:

```markdown
[OBJETIVO DEL ANÁLISIS]
Analiza [tema específico] del consultante.

ESTRUCTURA:
1. [Sección 1]
2. [Sección 2]
3. [Sección 3]

INSTRUCCIONES:
- Usa lenguaje de posibilidad: "tiende a", "puede", "sugiere"
- Evita determinismo: NO uses "es", "será", "siempre"
- Mantén tono [empático/profesional/inspirador]
- Longitud mínima: [número] caracteres
- Incluye al final: "Pregunta para reflexionar: [pregunta]"

ENFOQUE METODOLÓGICO:
- [Punto clave 1]
- [Punto clave 2]
- [Punto clave 3]

EJEMPLO DE TONO:
"[Ejemplo de una oración bien escrita]"
```

### Paso 3: Crear en el Sistema

**Opción A: Desde Frontend**
1. Panel Personalización → Prompts
2. "+ Crear Nuevo"
3. Seleccionar tipo
4. Ingresar nombre y texto del prompt
5. Marcar como público (si quieres compartir) o privado
6. Guardar

**Opción B: Desde API**
```bash
curl -X POST https://decano-astrologico.onrender.com/config/prompts/specialized \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "vocacion",
    "name": "Análisis Vocacional Profundo",
    "prompt": "Analiza la vocación y propósito de vida...",
    "is_public": false
  }'
```

### Paso 4: Probar el Prompt

1. Crear un informe de prueba
2. Usar la plantilla que incluye ese tipo de módulo
3. Revisar la salida generada
4. Iterar y mejorar según necesidad

### Paso 5: Monitorear Uso

```bash
# Ver estadísticas de uso
curl https://decano-astrologico.onrender.com/config/prompts/specialized/prompt_id \
  -H "Authorization: Bearer YOUR_TOKEN"

# Devuelve:
# {
#   "usage_count": 45,
#   "last_used": "2026-01-12T10:30:00Z",
#   ...
# }
```

---

## 7. Ejemplos Prácticos

### Ejemplo 1: Plantilla Minimalista

```json
{
  "name": "Informe Resumido",
  "branding": {
    "color_scheme": {
      "primary": "#000000",
      "secondary": "#666666",
      "accent": "#999999"
    },
    "typography": {
      "font_family": "Georgia, serif",
      "font_size_base": 16,
      "line_height": 1.8
    }
  },
  "content": {
    "enabled_modules": ["modulo_1", "modulo_2_fundamentos", "modulo_4_sintesis"],
    "report_mode": "summary"
  }
}
```

### Ejemplo 2: Plantilla Profesional Completa

```json
{
  "name": "Análisis Profesional Completo",
  "branding": {
    "logo_url": "https://mi-consultorio.com/logo.png",
    "color_scheme": {
      "primary": "#1E40AF",
      "secondary": "#7C3AED",
      "accent": "#F59E0B"
    },
    "typography": {
      "font_family": "Inter, sans-serif",
      "font_size_base": 16,
      "line_height": 1.6
    }
  },
  "content": {
    "enabled_modules": [
      "modulo_1",
      "modulo_2_fundamentos",
      "modulo_2_ejes",
      "modulo_5_planetas",
      "modulo_6_casas",
      "modulo_7_aspectos",
      "modulo_3_transitos",
      "modulo_8_vocacion",
      "modulo_4_sintesis"
    ],
    "report_mode": "exhaustive"
  },
  "advanced": {
    "custom_css": `
      .report-header {
        border-bottom: 3px solid #1E40AF;
        padding-bottom: 20px;
      }
      .module-title {
        color: #7C3AED;
        font-weight: bold;
      }
    `,
    "pdf_settings": {
      "page_size": "A4",
      "encryption": true,
      "password": "consultante2024",
      "watermark_text": "Consultoría Astrológica - Confidencial"
    }
  }
}
```

### Ejemplo 3: Prompt para Vocación

```
Analiza la vocación y propósito de vida del consultante.

ESTRUCTURA:
1. Talentos Naturales (MC, Nodo Norte, planetas en casa 10)
2. Motivaciones Profundas (Sol, Luna, Saturno)
3. Camino de Realización (Aspectos con MC, planetas en signos de tierra)

INSTRUCCIONES:
- Usa lenguaje de posibilidad: "tiende a", "puede desarrollar", "sugiere"
- Evita determinismo: NO uses "tu vocación es", "debes ser", "tu destino es"
- Mantén tono inspirador pero realista
- Longitud mínima: 3000 caracteres
- Incluye al final: "Pregunta para reflexionar: ¿Qué actividades te hacen sentir más vivo y conectado con tu propósito?"

ENFOQUE:
- Considera los talentos innatos (casas, signos, planetas)
- Analiza las áreas de desafío que requieren desarrollo
- Sugiere caminos posibles sin imponer una dirección única
- Conecta la vocación con la evolución personal

EJEMPLO DE TONO:
"Tu Medio Cielo en Capricornio sugiere una inclinación natural hacia roles que requieren estructura, liderazgo y construcción a largo plazo. Puedes sentir una profunda satisfacción cuando contribuyes a proyectos que tienen un impacto duradero en la sociedad."
```

---

## 8. Troubleshooting

### Error: "No tienes permisos"
- Verificar que tu plan permite crear plantillas
- Free: No puede crear plantillas
- Premium: Máximo 5 plantillas
- Enterprise: Ilimitadas

### Error: "Límite de plantillas alcanzado"
- Elimina plantillas no usadas
- O actualiza a plan Enterprise

### Error: "Prompt demasiado largo"
- Máximo 4000 caracteres por prompt
- Divide en múltiples prompts especializados

### Plantillas no aparecen en lista
- Verificar filtro de búsqueda
- Verificar que `is_public=false` para ver solo tuyas
- Verificar que `is_public=true` para ver públicas

---

## 9. Recursos Adicionales

### Documentación de API

- **Templates**: [`report_templates.py`](backend/app/api/endpoints/report_templates.py)
- **Prompts**: [`config.py`](backend/app/api/endpoints/config.py)
- **Tipos de Informes**: [`report_types.py`](backend/app/api/endpoints/report_types.py)

### Componentes Frontend

- **CustomizationPanel**: [`CustomizationPanel.tsx`](components/Customization/CustomizationPanel.tsx)
- **BrandingEditor**: [`BrandingEditor.tsx`](components/Customization/BrandingEditor.tsx)
- **PromptEditor**: [`PromptEditor.tsx`](components/Customization/PromptEditor.tsx)
- **TemplateManager**: [`TemplateManager.tsx`](components/Customization/TemplateManager.tsx)

### Ayuda

- GitHub Issues: https://github.com/benetandujar72/Decano-astrologico/issues
- Documentación completa: Ver `AUTO_REGENERATION_SYSTEM.md`, `GEMINI_SAFETY_BLOCKS.md`

---

## 10. Siguiente Paso: Implementar Logo Upload

Actualmente los logos se manejan con DataURL (temporal). Para persistencia:

```python
# backend/app/api/endpoints/report_templates.py

@router.post("/{template_id}/upload-logo")
async def upload_logo(
    template_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # 1. Validar imagen
    # 2. Subir a S3/Cloudinary/Storage
    # 3. Actualizar template.branding.logo_url
    # 4. Devolver URL
    pass
```

¿Necesitas ayuda implementando alguna de estas funcionalidades?
