# Guía de Integración Completa - Sistema de Informe Gancho Free

## 📋 Resumen Ejecutivo

Sistema completo para que usuarios FREE generen un informe "gancho" gratuito que les motive a contratar servicios Premium.

---

## ✅ COMPLETADO (Partes A y B)

### Backend

#### 1. Geocodificación Automática ✅
- **Endpoint:** `POST /geocoding/geocode`
- **Función:** Convierte ciudad/país → lat/lon/timezone
- **Servicio:** Nominatim (OpenStreetMap) - gratuito
- **Archivo:** `backend/app/api/endpoints/geocoding.py`

#### 2. Tipo de Informe Gancho ✅
- **Tipo:** `gancho_free`
- **Módulos:** Sol, Luna, Ascendente
- **Seeded en MongoDB:** Ejecutar `python backend/scripts/seed_free_hook_report.py`
- **Configuración:**
  ```
  available_for_tiers: ["free"]
  display_config.show_cta_upgrade: true
  content_limits.min_chars_per_module: 2000
  ```

### WordPress Plugin

#### 3. REST API Proxy ✅
- **Archivo:** `wordpress/plugins/fraktal-reports/includes/class-da-rest-api.php`
- **Endpoints:**
  - `POST /wp-json/decano/v1/geocode`
  - `GET /wp-json/decano/v1/user/plan`
  - `GET /wp-json/decano/v1/user/limits`

#### 4. Componentes React ✅

**BirthDataForm:**
- `wordpress/plugins/fraktal-reports/react-src/src/components/BirthDataForm/`
- Geocodificación automática con debounce 1.5s
- Fallback a coordenadas manuales
- Validación completa

**FreeReportViewer:**
- `wordpress/plugins/fraktal-reports/react-src/src/components/FreeReportViewer/`
- Diseño basado en imagen proporcionada
- Header místico + módulos formateados
- CTA "DESCARGAR INFORME COMPLETO"

**UpgradeLanding:**
- `wordpress/plugins/fraktal-reports/react-src/src/components/UpgradeLanding/`
- Hero section + pricing cards
- Plan Carta Natal 49€ / Plan Revolución Solar 79€

#### 5. Shortcodes ✅
- `[decano-free-report-form]` - Formulario para usuarios Free
- `[decano-upgrade-landing]` - Landing de pricing
- `[decano-free-report-viewer]` - Visualizar informe generado

---

## ⏳ PENDIENTE (Parte C - Límites del Plan Free)

### 1. Verificar Límites en Backend

**Archivo a modificar:** `backend/app/api/endpoints/reports.py`

**En el endpoint `/reports/queue-full-report`**, añadir verificación:

```python
# Cerca de la línea donde se verifica el tier
user_tier = current_user.get("subscription", {}).get("plan", "free")

# AÑADIR: Permitir informe gancho_free para usuarios free
if report_type == "gancho_free":
    # Los usuarios Free PUEDEN generar este tipo
    if user_tier != "free":
        raise HTTPException(
            status_code=400,
            detail="El informe gancho es solo para usuarios Free. Usa otro tipo de informe."
        )
    # Verificar límite mensual (1 informe gancho por mes)
    # ... código de verificación de límites existente
else:
    # Otros tipos de informe requieren Premium o Enterprise
    if user_tier == "free":
        raise HTTPException(
            status_code=403,
            detail="Tu plan Free solo permite generar el informe gratuito. Actualiza a Premium para acceder a informes completos."
        )
```

### 2. Configurar Límites Mensuales

**Archivo:** `wordpress/plugins/fraktal-reports/includes/class-da-plan-manager.php`

Verificar que los límites para Free incluyan:

```php
'free' => [
    'max_reports_per_month' => 1,  // 1 informe gancho por mes
    'report_types' => ['gancho_free'],  // Solo tipo gancho
    'can_use_templates' => false,
    'max_templates' => 0
]
```

### 3. Actualizar Mensaje de Límites

Cuando un usuario Free intenta generar más de 1 informe:

```php
if ($reports_this_month >= 1 && $tier === 'free') {
    throw new Exception(
        "Has alcanzado el límite de 1 informe gratuito este mes. " .
        "Actualiza a Premium para informes ilimitados."
    );
}
```

---

## 🔄 FLUJO COMPLETO DE USUARIO FREE

### Paso 1: Usuario Llega a la Landing
- URL: `https://tu-sitio.com/informe-gratis`
- Página WordPress con shortcode: `[decano-free-report-form]`

### Paso 2: Completar Formulario
1. Introduce **nombre**
2. Introduce **fecha de nacimiento**
3. Introduce **hora de nacimiento**
4. Introduce **ciudad y país**
5. Sistema geocodifica automáticamente → obtiene lat/lon/timezone
6. Usuario confirma datos
7. Click en "Generar Mi Informe Gratuito"

### Paso 3: Registro/Login (si no está logueado)
- WordPress redirige a página de registro
- Usuario crea cuenta (plan Free por defecto)
- Vuelve al formulario con datos guardados

### Paso 4: Generación del Informe
- Backend recibe request con `report_type: "gancho_free"`
- Verifica: usuario es Free ✓
- Verifica: no ha generado informe este mes ✓
- Genera módulos: Sol, Luna, Ascendente
- Guarda en `wp_da_report_sessions`

### Paso 5: Visualización
- Usuario ve informe con `FreeReportViewer`
- Scroll hasta el final → CTA "DESCARGAR INFORME COMPLETO"

### Paso 6: Click en CTA
- Redirige a página con `[decano-upgrade-landing]`
- Muestra pricing: 49€ y 79€
- Usuario selecciona plan → checkout WooCommerce

---

## 📄 PÁGINAS A CREAR EN WORDPRESS

### Página 1: Informe Gratuito
- **Slug:** `/informe-gratis`
- **Shortcode:** `[decano-free-report-form]`
- **Contenido antes del shortcode:**
  ```
  <h1>Descubre Tu Esencia con Tu Informe Astrológico Gratuito</h1>
  <p>Obtén un análisis personalizado de tu Sol, Luna y Ascendente...</p>
  ```

### Página 2: Ver Informe (dinámica)
- **Slug:** `/mi-informe-gratis`
- **Shortcode:** `[decano-free-report-viewer session_id=""]`
- **Nota:** El `session_id` se pasa como parámetro GET

### Página 3: Upgrade
- **Slug:** `/planes-premium`
- **Shortcode:** `[decano-upgrade-landing]`

---

## 🔧 CONFIGURACIÓN NECESARIA

### 1. Variables de Entorno (Backend)

```bash
# .env
MONGODB_URL=mongodb+srv://bandujar_db_user:...@fraktal.um7xvgq.mongodb.net/fraktal
MONGODB_DB_NAME=fraktal
```

### 2. Configuración WordPress

**Settings → Decano Astrológico:**
- **API URL:** `https://tu-backend.com`
- **API Key:** (tu key)
- **HMAC Secret:** (auto-generado)

### 3. Seed de MongoDB

```bash
cd backend
python scripts/seed_free_hook_report.py
```

Verifica que aparezca:
```
✓ Tipo de informe 'gancho_free' creado
📊 Módulos incluidos:
   • modulo_1_sol
   • modulo_3_luna
   • modulo_9_ascendente
```

### 4. Recompilar React (WordPress)

```bash
cd wordpress/plugins/fraktal-reports/react-src
npm install
npm run build
```

Esto compila:
- `BirthDataForm`
- `FreeReportViewer`
- `UpgradeLanding`

---

## 🧪 TESTING

### Test 1: Geocodificación
```bash
curl -X POST https://tu-sitio.com/wp-json/decano/v1/geocode \
  -H "Content-Type: application/json" \
  -H "X-WP-Nonce: <nonce>" \
  -d '{"city": "Barcelona", "country": "España"}'

# Respuesta esperada:
{
  "latitude": 41.3874,
  "longitude": 2.1686,
  "timezone": "UTC+1",
  "formatted_address": "Barcelona, Cataluña, España"
}
```

### Test 2: Verificar Límites
```bash
curl https://tu-sitio.com/wp-json/decano/v1/user/limits \
  -H "X-WP-Nonce: <nonce>"

# Respuesta esperada (usuario Free):
{
  "tier": "free",
  "reports_used": 0,
  "max_reports": 1,
  "reports_remaining": 1,
  "can_generate": true
}
```

### Test 3: Generar Informe Gancho
```bash
curl -X POST https://tu-backend.com/reports/queue-full-report \
  -H "Authorization: Bearer <token>" \
  -d '{
    "chart_data": { "name": "Test", ... },
    "report_type": "gancho_free"
  }'

# Respuesta esperada:
{
  "session_id": "abc123...",
  "status": "queued"
}
```

---

## 🐛 TROUBLESHOOTING

### Problema: "Error al obtener coordenadas"

**Causa:** Nominatim no encontró la ciudad

**Solución:**
1. Verificar ortografía de ciudad/país
2. Probar con ciudad más grande cercana
3. Usar coordenadas manuales

### Problema: "No tienes permisos para generar este informe"

**Causa:** Usuario no es Free o ya generó su informe del mes

**Solución:**
1. Verificar plan: `GET /wp-json/decano/v1/user/plan`
2. Verificar límites: `GET /wp-json/decano/v1/user/limits`
3. Si `reports_remaining === 0`, mostrar mensaje upgrade

### Problema: Componentes React no aparecen

**Causa:** No se compiló el bundle o no se registraron

**Solución:**
```bash
cd wordpress/plugins/fraktal-reports/react-src
npm run build

# Verificar que aparezcan en build/
ls build/static/js/
```

### Problema: "gancho_free type not found"

**Causa:** No se ejecutó el seed script

**Solución:**
```bash
python backend/scripts/seed_free_hook_report.py
```

---

## 📊 MÉTRICAS A SEGUIR

1. **Tasa de Conversión Free → Premium**
   - Usuarios que generan informe gancho
   - Usuarios que hacen click en CTA
   - Usuarios que completan compra

2. **Uso del Sistema de Geocodificación**
   - % de geocodificaciones exitosas
   - Ciudades más buscadas
   - Errores comunes

3. **Límites de Plan**
   - Usuarios que alcanzan el límite mensual
   - Tiempo promedio hasta alcanzar límite
   - Reintentos después del límite

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

### Corto Plazo (1-2 semanas)
1. Completar Parte C (límites del plan Free)
2. Testing exhaustivo del flujo completo
3. Deploy a producción

### Medio Plazo (1 mes)
1. A/B testing de CTAs y pricing
2. Añadir email automation (recordatorio upgrade)
3. Implementar descarga PDF del informe gancho

### Largo Plazo (3 meses)
1. Sistema de referidos (comparte informe → obtén descuento)
2. Informes comparativos gratuitos (sinastría light)
3. Webinar automatizado explicando el informe gancho

---

## 📞 SOPORTE

Si encuentras problemas durante la integración:

1. **Logs de WordPress:** `wp-content/debug.log`
2. **Logs de Backend:** Salida de `uvicorn`
3. **Consola del navegador:** Errores de React
4. **MongoDB:** Verificar que los documentos existan

**Comandos útiles:**
```bash
# Ver logs de WordPress
tail -f wp-content/debug.log

# Ver logs de backend
docker logs decano-backend --tail=100 -f

# Verificar MongoDB
mongosh "mongodb+srv://..." --eval "db.report_types.find({type_id: 'gancho_free'})"
```

---

## ✅ CHECKLIST FINAL

Antes de considerar la integración completa:

- [ ] Seed de MongoDB ejecutado (`gancho_free` existe)
- [ ] REST API endpoints funcionando (`/geocode`, `/user/limits`)
- [ ] Componentes React compilados y cargando
- [ ] Shortcodes registrados y renderizando
- [ ] Página "Informe Gratuito" creada con shortcode
- [ ] Página "Planes Premium" creada con shortcode
- [ ] Límites del plan Free configurados (1 informe/mes)
- [ ] Testing completo del flujo Free → Gancho → Upgrade
- [ ] WooCommerce checkout funcionando
- [ ] Email de confirmación configurado

---

**Última actualización:** 2026-01-12

**Versión del sistema:** 1.0.0-free-hook
