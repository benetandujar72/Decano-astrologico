# 📖 Guía de Uso - Sistema de Informes Personalizables

## 🚀 Inicio Rápido

### 1. Inicializar el Sistema (Primera vez)

#### Opción A: Via Script Python
```bash
cd backend
python scripts/seed_report_system.py
```

#### Opción B: Via API (Requiere autenticación admin)
```bash
curl -X POST http://localhost:8000/admin/seed-report-system \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Esto creará:**
- ✅ 2 tipos de informe básicos (Carta Natal Completa, Resumida)
- ✅ Prompts profesionales para cada tipo
- ✅ Configuración de módulos por tipo

---

## 📊 Verificar Estado del Sistema

```bash
curl -X GET http://localhost:8000/admin/system-status-report \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Respuesta esperada:**
```json
{
  "total_report_types": 2,
  "total_templates": 0,
  "total_prompts": 2,
  "types_by_plan": {
    "free": 2,
    "premium": 0,
    "enterprise": 0
  },
  "types_by_category": {
    "individual": 2,
    "infantil": 0,
    "sistemico": 0,
    "clinico": 0
  },
  "is_initialized": true
}
```

---

## 🎯 Flujo de Uso para Usuarios

### Paso 1: Ver Tipos de Informe Disponibles

```bash
curl -X GET http://localhost:8000/api/report-types \
  -H "Authorization: Bearer USER_TOKEN"
```

**Respuesta:**
```json
{
  "report_types": [
    {
      "id": "...",
      "code": "carta_natal_completa",
      "name": "Carta Natal Completa",
      "description": "Análisis exhaustivo...",
      "icon": "🌟",
      "category": "individual",
      "min_plan_required": "free",
      "can_access": true,
      "available_modules": [...]
    }
  ],
  "total": 2
}
```

### Paso 2: Seleccionar Tipo (Opcional: Ver Plantillas)

```bash
curl -X GET "http://localhost:8000/api/templates?report_type_id=REPORT_TYPE_ID" \
  -H "Authorization: Bearer USER_TOKEN"
```

### Paso 3: Generar Informe

Usando `ReportConfigurationWizard` en el frontend:

```tsx
import ReportConfigurationWizard from './components/ReportConfigurationWizard';

function MyComponent() {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <>
      <button onClick={() => setShowWizard(true)}>
        Generar Informe
      </button>

      {showWizard && (
        <ReportConfigurationWizard
          cartaData={chartData}
          nombre={userName}
          currentUserPlan="free" // or "premium" or "enterprise"
          onClose={() => setShowWizard(false)}
          onComplete={(report) => {
            console.log('Informe generado:', report);
            setShowWizard(false);
          }}
        />
      )}
    </>
  );
}
```

---

## 👨‍💼 Funcionalidades por Plan

### Free
- ✅ Acceso a tipos de informe "free"
- ✅ Ver tipos disponibles
- ❌ No puede crear plantillas
- ❌ No puede crear prompts personalizados

### Premium
- ✅ Acceso a tipos "free" y "premium"
- ✅ Crear hasta 5 plantillas personalizadas
- ✅ Personalizar branding (logo, colores, tipografía)
- ✅ Crear prompts personalizados
- ✅ Clonar plantillas públicas

### Enterprise
- ✅ Acceso a todos los tipos de informe
- ✅ Plantillas ilimitadas
- ✅ CSS personalizado
- ✅ Configuración avanzada (watermarks, encriptación)
- ✅ Todos los permisos de Premium

---

## 🎨 Crear Plantilla Personalizada (Premium+)

```bash
curl -X POST http://localhost:8000/api/templates \
  -H "Authorization: Bearer PREMIUM_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi Plantilla Personalizada",
    "report_type_id": "REPORT_TYPE_ID",
    "branding": {
      "title": "Informe Astrológico Personalizado",
      "logo_url": "https://mi-sitio.com/logo.png",
      "logo_size": "medium",
      "typography": {
        "font_family": "Arial",
        "font_size": 12,
        "heading_color": "#1e293b",
        "body_color": "#334155"
      },
      "color_scheme": {
        "primary_color": "#6366f1",
        "secondary_color": "#f59e0b",
        "accent_color": "#8b5cf6"
      }
    },
    "content": {
      "modules_to_print": ["modulo_1", "modulo_2_personales"],
      "report_mode": "completo",
      "include_chart_images": true,
      "include_aspects_table": true,
      "language": "es",
      "page_size": "A4"
    },
    "is_public": false
  }'
```

---

## 🧪 Modos de Informe

### Resumen
- **Palabras:** ~3,000
- **Duración:** 10-15 min
- **Uso:** Análisis rápido

### Completo
- **Palabras:** ~8,000
- **Duración:** 20-30 min
- **Uso:** Análisis estándar profesional

### Exhaustivo
- **Palabras:** ~15,000+
- **Duración:** 40-60 min
- **Uso:** Análisis profundo y detallado

---

## 🔧 Resolución de Prompts

El sistema resuelve prompts en este orden:

```
1. ¿Usuario tiene prompt personalizado para este tipo?
   └─ SÍ → Usar ese
   └─ NO ↓

2. ¿Existe prompt por defecto del tipo?
   └─ SÍ → Usar ese
   └─ NO ↓

3. Usar prompt fallback del sistema
   ↓
4. Aplicar modificaciones de plantilla (si seleccionada)
   ↓
5. Inyectar variables {nombre}, {carta_data}
   ↓
6. Aplicar guardrails de seguridad
   ↓
7. Enviar a gemini-3-pro-preview
```

---

## 📝 Crear Prompt Personalizado (Premium+)

```bash
curl -X POST http://localhost:8000/api/prompts \
  -H "Authorization: Bearer PREMIUM_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type_id": "REPORT_TYPE_ID",
    "system_instruction": "Eres un astrólogo profesional...",
    "user_prompt_template": "Genera un informe para {nombre}...",
    "variables": [
      {"name": "nombre", "type": "string", "required": true},
      {"name": "carta_data", "type": "object", "required": true}
    ],
    "model": "gemini-3-pro-preview",
    "temperature": 0.7,
    "is_default": false
  }'
```

---

## 🛠️ Administración

### Ver Todos los Tipos de Informe (Admin)

```bash
curl -X GET "http://localhost:8000/api/report-types?include_beta=true" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Crear Nuevo Tipo de Informe (Admin)

```bash
curl -X POST http://localhost:8000/api/report-types \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "sinastria",
    "name": "Sinastría (Compatibilidad)",
    "description": "Análisis de compatibilidad entre dos cartas",
    "icon": "💞",
    "category": "sistemico",
    "folder_path": "/reports/sistemico/sinastria",
    "min_plan_required": "premium",
    "is_active": true,
    "is_beta": false,
    "available_modules": [
      {
        "id": "modulo_intro_sinastria",
        "name": "Introducción a la Sinastría",
        "required": true,
        "estimated_duration_sec": 240
      }
    ]
  }'
```

---

## 🔍 Troubleshooting

### Problema: No aparecen tipos de informe

**Solución:**
```bash
# Verificar estado
curl -X GET http://localhost:8000/admin/system-status-report

# Si is_initialized = false, ejecutar seeding
python backend/scripts/seed_report_system.py
```

### Problema: Usuario no puede crear plantillas

**Verificar:**
1. Plan del usuario es `premium` o `enterprise`
2. No ha alcanzado límite de plantillas (5 para premium)

```bash
# Ver plantillas del usuario
curl -X GET http://localhost:8000/api/templates
```

### Problema: Prompt no se resuelve correctamente

**Verificar:**
1. Variables requeridas están presentes
2. Prompt activo (`is_active: true`)
3. Report type existe

```bash
# Probar resolución
curl -X POST http://localhost:8000/api/prompts/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "report_type_id": "REPORT_TYPE_ID",
    "variables": {
      "nombre": "Juan Pérez",
      "carta_data": {...}
    }
  }'
```

---

## 📚 Endpoints Disponibles

### Report Types
```
GET    /api/report-types          # Listar tipos
GET    /api/report-types/{id}     # Obtener uno
POST   /api/report-types          # Crear (admin)
PUT    /api/report-types/{id}     # Actualizar (admin)
DELETE /api/report-types/{id}     # Archivar (admin)
```

### Templates
```
GET    /api/templates                   # Listar plantillas
GET    /api/templates/{id}              # Obtener una
POST   /api/templates                   # Crear (premium+)
PUT    /api/templates/{id}              # Actualizar (owner)
POST   /api/templates/{id}/clone        # Clonar (premium+)
DELETE /api/templates/{id}              # Eliminar (owner)
```

### Prompts
```
GET    /api/prompts/{report_type_id}    # Obtener prompt activo
POST   /api/prompts/resolve             # Resolver con variables
POST   /api/prompts                     # Crear (premium+)
PUT    /api/prompts/{id}                # Actualizar (owner/admin)
```

### Admin
```
POST   /admin/seed-report-system         # Inicializar sistema
GET    /admin/system-status-report       # Ver estadísticas
```

---

## 🎓 Ejemplos de Integración

### React Hook Personalizado

```tsx
import { useState, useEffect } from 'react';
import reportConfigApi from './services/reportConfigApi';

export function useReportTypes(category?: string) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTypes() {
      try {
        const data = await reportConfigApi.reportTypes.list({ category });
        setTypes(data.report_types);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTypes();
  }, [category]);

  return { types, loading, error };
}

// Uso
function MyComponent() {
  const { types, loading } = useReportTypes('individual');

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      {types.map(type => (
        <div key={type.id}>{type.name}</div>
      ))}
    </div>
  );
}
```

---

## 🔐 Seguridad

### Guardrails Implementados

1. **Límite de caracteres:** 32K máximo
2. **Sanitización:** Remove HTML/script tags
3. **Restricciones de contenido:**
   - No diagnósticos médicos
   - No consejos legales/financieros
   - No predicciones deterministas
   - No diagnósticos de salud mental

4. **Safety Settings de Gemini:**
   - Harassment: BLOCK_MEDIUM_AND_ABOVE
   - Hate Speech: BLOCK_MEDIUM_AND_ABOVE
   - Sexually Explicit: BLOCK_MEDIUM_AND_ABOVE
   - Dangerous Content: BLOCK_MEDIUM_AND_ABOVE

---

## 📞 Soporte

**Documentación completa:** `IMPLEMENTATION_REPORT_SYSTEM.md`

**API Docs:** `http://localhost:8000/docs`

**Issues:** Reportar en el repositorio del proyecto

---

**Fecha:** 2026-01-10
**Versión:** 1.0.0
**Estado:** ✅ Production Ready
