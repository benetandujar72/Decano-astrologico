# Paneles de Administración Completos - Decano Astrológico

## ✅ Implementación Completada

Se han añadido 4 nuevos paneles de administración completos que permiten a los administradores gestionar todas las funcionalidades del sistema desde WordPress.

---

## 📋 Nuevos Menús en WordPress Admin

### Ubicación: **WordPress Admin → Decano**

Ahora verás el siguiente menú:

```
📊 Decano
├── Dashboard
├── Usuarios
├── Informes
├── Configuración
├── 🆕 Tipos de Informe
├── 🆕 Plantillas
├── 🆕 Prompts
├── 🆕 Planes y Límites
└── Debug
```

---

## 1️⃣ Tipos de Informe

**Ruta**: `Dashboard → Decano → Tipos de Informe`

### Funcionalidades:

✅ **Ver todos los tipos de informe** disponibles:
- ID del tipo (ej: `gancho_free`, `carta_natal_completa`)
- Nombre descriptivo
- Planes que pueden acceder (Free, Premium, Enterprise)
- Número de módulos incluidos
- Estado (Activo/Inactivo)

✅ **Informe Gancho Destacado**:
- Badge dorado ⭐ para identificar `gancho_free`
- Protección: NO se puede eliminar (es crítico para conversión)

✅ **Acciones Disponibles**:
- **Editar** - Modificar configuración del tipo
- **Eliminar** - Borrar tipos personalizados
- **Sincronizar** - Actualizar desde backend MongoDB

✅ **Información Visual**:
- Badges de color por tier:
  - 🟦 FREE (gris)
  - 🔵 PREMIUM (azul)
  - 🟣 ENTERPRISE (morado)

### Ejemplo de Datos Mostrados:

| ID del Tipo | Nombre | Planes | Módulos | Estado |
|-------------|--------|--------|---------|--------|
| `gancho_free` ⭐ | Informe Gancho Gratuito | FREE | 📄 3 | ✅ Activo |
| `carta_natal_completa` | Carta Natal Personal | PREMIUM, ENTERPRISE | 📄 10 | ✅ Activo |
| `revolucion_solar_2026` | Revolución Solar 2026 | PREMIUM, ENTERPRISE | 📄 12 | ✅ Activo |

---

## 2️⃣ Plantillas

**Ruta**: `Dashboard → Decano → Plantillas`

### Funcionalidades:

✅ **Visualizar plantillas de informes**:
- Nombre de la plantilla
- Descripción
- Tipo (standard, premium, custom)
- Versión actual

✅ **Gestión**:
- Ver detalles completos
- Editar estructura
- Sincronizar desde backend

### Información Importante:

> 💡 **Tip**: Las plantillas se gestionan principalmente desde el backend de Python. Desde WordPress puedes visualizar y sincronizar las plantillas existentes.

Las plantillas definen:
- Estructura del informe (secciones, orden)
- Estilos y diseño
- Formato de exportación (PDF, HTML)

---

## 3️⃣ Prompts

**Ruta**: `Dashboard → Decano → Prompts`

### Funcionalidades:

✅ **Ver todos los prompts de IA**:
- Módulo astrológico al que pertenece
- Extracto del prompt (primeros 100 caracteres)
- Tokens estimados por prompt
- Estado activo/inactivo

✅ **Identificación Especial**:
- Prompts usados en `gancho_free` tienen ⭐ dorado
  - `modulo_1_sol` (Sol)
  - `modulo_3_luna` (Luna)
  - `modulo_9_ascendente` (Ascendente)

✅ **Gestión**:
- Ver prompt completo
- Editar texto del prompt
- Activar/desactivar prompts
- Sincronizar desde backend

### Ejemplo de Prompt:

| Módulo | Prompt (extracto) | Tokens | Activo |
|--------|------------------|--------|--------|
| Sol - Identidad ⭐ | "Analiza la posición del Sol en signo y casa. Describe la identidad core del consultante..." | 2,500 | ✅ Sí |
| Luna - Emociones ⭐ | "Examina la Luna natal en su signo, casa y aspectos. Explica las necesidades emocionales..." | 2,800 | ✅ Sí |

### ⚠️ Advertencia Importante:

> **Modificar los prompts puede afectar significativamente la calidad y el tono de los informes generados. Se recomienda hacer pruebas exhaustivas antes de activar cambios en producción.**

---

## 4️⃣ Planes y Límites

**Ruta**: `Dashboard → Decano → Planes y Límites`

### Funcionalidades:

✅ **Interfaz con Tabs** para cada plan:
- 🟦 FREE
- 🔵 PREMIUM
- 🟣 ENTERPRISE

✅ **Configuración por Plan**:

#### a) **Informes por Mes**
- Número máximo de informes que puede generar
- `-1` = ilimitado (para Enterprise)

**Configuración Actual**:
- FREE: **1 informe/mes**
- PREMIUM: **10 informes/mes**
- ENTERPRISE: **Ilimitados** (-1)

#### b) **Tipos de Informe Disponibles**
Checkboxes para seleccionar qué tipos puede acceder cada tier:

**FREE** ✅:
- [x] gancho_free

**PREMIUM** ✅:
- [x] gancho_free
- [x] carta_natal_completa
- [x] revolucion_solar_2026

**ENTERPRISE** ✅:
- [x] Todos los tipos

#### c) **Características**
Selecciona las funcionalidades disponibles:

| Característica | FREE | PREMIUM | ENTERPRISE |
|----------------|------|---------|------------|
| Geocodificación automática | ✅ | ✅ | ✅ |
| Guardar perfiles | ❌ | ✅ | ✅ |
| Descargar PDF | ❌ | ✅ | ✅ |
| Módulos personalizados | ❌ | ✅ | ✅ |
| Soporte prioritario | ❌ | ❌ | ✅ |
| Acceso a API | ❌ | ❌ | ✅ |

✅ **Guardar Cambios**:
- Botón por cada plan: "Guardar Límites de {Plan}"
- Confirmación visual al guardar

---

## 🔧 Clase de Gestión (Backend)

Se creó la clase `DA_Admin_Management` con métodos auxiliares:

### Métodos Disponibles:

```php
// Obtener datos desde backend
DA_Admin_Management::get_report_types()
DA_Admin_Management::get_templates()
DA_Admin_Management::get_prompts()

// Gestionar tipos de informe
DA_Admin_Management::save_report_type($data)
DA_Admin_Management::delete_report_type($type_id)

// Configurar límites
DA_Admin_Management::get_tier_limits()
DA_Admin_Management::update_tier_limits($tier, $limits)

// Módulos disponibles
DA_Admin_Management::get_available_modules()
```

### Módulos Astrológicos Configurables:

1. `modulo_1_sol` - Sol - Identidad y Propósito ⭐
2. `modulo_2_mercurio` - Mercurio - Comunicación
3. `modulo_3_luna` - Luna - Emociones ⭐
4. `modulo_4_venus` - Venus - Amor y Valores
5. `modulo_5_marte` - Marte - Acción y Energía
6. `modulo_6_jupiter` - Júpiter - Expansión
7. `modulo_7_saturno` - Saturno - Estructura
8. `modulo_8_urano` - Urano - Cambio
9. `modulo_9_ascendente` - Ascendente - Primera Impresión ⭐
10. `modulo_10_nodos` - Nodos Lunares - Destino

⭐ = Usado en informe gancho FREE

---

## 🚀 Cómo Usar los Paneles

### Paso 1: Acceder al Admin

1. Inicia sesión en WordPress como **Administrador**
2. Ve a **Dashboard → Decano**
3. Verás los 4 nuevos menús

### Paso 2: Verificar Backend

Antes de usar los paneles, asegúrate de que:
- Backend está configurado en `Configuración`
- URL del backend: `https://tu-backend.onrender.com`
- El backend está funcionando (verde en Debug)

### Paso 3: Sincronizar Datos

En cada panel, haz click en **🔄 Sincronizar desde Backend** para:
- Cargar tipos de informe desde MongoDB
- Actualizar plantillas
- Refrescar prompts

### Paso 4: Gestionar

Ya puedes:
- Editar tipos de informe existentes
- Crear nuevos tipos personalizados
- Modificar límites por plan
- Ajustar prompts de IA

---

## 🎯 Casos de Uso

### Caso 1: Crear Nuevo Tipo de Informe

1. Ve a **Tipos de Informe**
2. Click en **➕ Añadir Nuevo Tipo**
3. Completa:
   - ID: `carta_natal_profesional`
   - Nombre: "Carta Natal Profesional"
   - Tiers: Premium, Enterprise
   - Módulos: Todos los 10 módulos
4. Guardar

### Caso 2: Modificar Límites del Plan FREE

1. Ve a **Planes y Límites**
2. Tab **FREE**
3. Cambiar "Informes por Mes" de 1 a 2
4. Marcar "Guardar perfiles"
5. Click en **Guardar Límites de Free**

### Caso 3: Ajustar Prompt de Luna

1. Ve a **Prompts**
2. Buscar "Luna - Emociones" ⭐
3. Click en **Editar**
4. Modificar el texto del prompt
5. Guardar cambios
6. ⚠️ Probar con un informe de prueba

### Caso 4: Ver Plantillas Disponibles

1. Ve a **Plantillas**
2. Click en **🔄 Sincronizar**
3. Visualizar todas las plantillas
4. Click en **Ver** para ver detalles completos

---

## 🔒 Seguridad

Todos los paneles implementan:

✅ **WordPress Nonces**
```php
wp_nonce_field('da_report_types');
check_admin_referer('da_report_types');
```

✅ **Capacidades de Usuario**
- Solo usuarios con `manage_options` pueden acceder
- Validación en cada página

✅ **Sanitización de Datos**
```php
sanitize_text_field($_POST['type_id'])
esc_html($type['name'])
esc_attr($value)
```

✅ **Confirmaciones**
- Eliminar tipo: `confirm('¿Estás seguro?')`
- Cambios importantes: Avisos visuales

---

## 📊 Ejemplo de Flujo Completo

### Escenario: Configurar Sistema para Lanzamiento

**1. Configurar Backend** (Configuración)
```
✅ API URL: https://decano-backend.onrender.com
✅ HMAC Secret: [generado]
```

**2. Sincronizar Tipos de Informe**
```
→ Tipos de Informe
→ Click "🔄 Sincronizar"
✅ 3 tipos cargados:
   - gancho_free ⭐
   - carta_natal_completa
   - revolucion_solar_2026
```

**3. Configurar Plan FREE**
```
→ Planes y Límites → Tab FREE
✅ Informes/mes: 1
✅ Tipos disponibles: [x] gancho_free
✅ Características:
   [x] Geocodificación
   [ ] Guardar perfiles
   [ ] Descargar PDF
```

**4. Configurar Plan PREMIUM**
```
→ Tab PREMIUM
✅ Informes/mes: 10
✅ Tipos disponibles:
   [x] gancho_free
   [x] carta_natal_completa
   [x] revolucion_solar_2026
✅ Características:
   [x] Geocodificación
   [x] Guardar perfiles
   [x] Descargar PDF
   [x] Módulos personalizados
```

**5. Verificar Prompts**
```
→ Prompts
✅ Ver que los 3 prompts del gancho_free tienen ⭐
✅ Todos marcados como Activos
```

**6. Listo** ✅
El sistema está configurado y listo para producción.

---

## 🐛 Solución de Problemas

### Error: "Backend no configurado"

**Causa**: No se ha configurado la URL del backend

**Solución**:
1. Ve a **Configuración**
2. Introduce: `https://tu-backend.onrender.com`
3. Guarda cambios
4. Vuelve al panel

### Error: "No se pudieron cargar los tipos de informe"

**Causa**: Backend no responde o hay error de conexión

**Solución**:
1. Ve a **Debug**
2. Click en **🌐 Test Conexión Backend**
3. Verifica que el backend está online
4. Revisa los logs en Render

### Los cambios no se reflejan

**Causa**: Cache de WordPress o navegador

**Solución**:
1. Limpia cache de WordPress (si tienes plugin de cache)
2. Ctrl+Shift+R en navegador
3. Vuelve a sincronizar

---

## 📝 Commits Realizados

```bash
d7bcdaf feat(admin): add comprehensive management panels for administrators
```

**Archivos Modificados**:
- `admin/class-da-admin.php` - Añadidos 4 métodos render
- `admin/class-da-admin-management.php` - Nueva clase de gestión (NEW)
- `wordpress/plugins/fraktal-reports.zip` - Plugin actualizado (219 KB)

---

## 🎉 Resumen Final

### Lo que los Administradores pueden hacer ahora:

✅ **Gestionar Tipos de Informe**
- Ver, editar, eliminar tipos
- Crear nuevos tipos personalizados
- Sincronizar desde MongoDB

✅ **Controlar Plantillas**
- Visualizar todas las plantillas
- Ver detalles y versiones
- Sincronizar actualizaciones

✅ **Modificar Prompts de IA**
- Editar instrucciones para Gemini
- Ajustar tono y profundidad
- Activar/desactivar prompts

✅ **Configurar Planes y Límites**
- Definir informes por mes por tier
- Seleccionar tipos disponibles
- Habilitar/deshabilitar características
- Control granular por plan

### Control Total del Sistema ✅

Los administradores ahora tienen **control completo** sobre:
- Qué informes pueden generar los usuarios
- Cuántos informes por mes
- Qué características tiene cada plan
- Cómo genera la IA el contenido
- El diseño y formato de los informes

Todo desde la interfaz familiar de WordPress Admin.

---

**Última actualización**: 2026-01-12 19:15 CET

**Versión del plugin**: 1.1.0-admin-panels

**Estado**: ✅ LISTO PARA USAR
