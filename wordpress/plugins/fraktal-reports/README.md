# Decano Astrológico - WordPress Plugin

Plugin de WordPress para integrar el sistema de generación de informes astrológicos Fraktal Reports con un sistema completo de suscripciones y gestión de usuarios.

## 📋 Características

### Sistema de Planes Multi-Tier
- **Free**: €0/mes - 1 informe resumido por mes
- **Premium**: €29.99/mes - Informes ilimitados, plantillas personalizadas
- **Enterprise**: €99.99/mes - Todo Premium + API REST, plantillas ilimitadas, CSS personalizado

### Frontend React Moderno
- Interfaz de usuario React + TypeScript + Tailwind CSS
- Generador de informes con wizard paso a paso
- Dashboard de usuario con estadísticas
- Selector de planes con comparación
- Sistema de polling con detección de estancamiento y reanudación

### Panel de Administración Avanzado
- Dashboard con estadísticas en tiempo real
- Gestión completa de usuarios y planes
- Gestión de informes con filtros avanzados
- Seguimiento de ingresos y uso mensual
- Exportación de datos a CSV

### Integración WooCommerce
- Productos de suscripción automáticos
- Gestión de límites por plan
- Webhooks para cambios de suscripción
- Cache de consultas de planes

## 🚀 Instalación

### Requisitos Previos

- WordPress 6.0+
- PHP 8.1+
- WooCommerce 8.0+
- **WooCommerce Subscriptions 5.0+** (plugin de pago requerido)
- Node.js 18+ (solo para desarrollo)
- Backend FastAPI (Motor Fractal) configurado

### Paso 1: Instalación del Plugin

1. Descarga el plugin o clona el repositorio:
```bash
cd wordpress/wp-content/plugins/
git clone <repositorio> fraktal-reports
```

2. Activa el plugin desde el panel de WordPress:
   - Ve a **Plugins > Plugins Instalados**
   - Busca "Decano Astrológico"
   - Haz clic en **Activar**

### Paso 2: Configuración Inicial

1. **Configurar API Backend**:
   - Ve a **Decano > Configuración**
   - Introduce la URL del backend FastAPI
   - Introduce el HMAC Secret (debe coincidir con el backend)
   - Guarda los cambios

2. **Verificar Productos WooCommerce**:
   - Ve a **Decano > Dashboard**
   - Verifica que los 3 productos (Free, Premium, Enterprise) se hayan creado
   - Si no existen, desactiva y reactiva el plugin

3. **Configurar WooCommerce Subscriptions**:
   - Asegúrate de que WooCommerce Subscriptions esté instalado y activo
   - Los productos ya están configurados como suscripciones

## 📖 Uso

### Shortcodes Disponibles

#### `[decano-report-generator]`
Generador completo de informes con wizard.

**Parámetros:**
- `plan_check` (opcional, default: 'true') - Verificar límites del plan
- `show_upgrade` (opcional, default: 'true') - Mostrar opción de upgrade

**Ejemplo:**
```php
[decano-report-generator plan_check="true" show_upgrade="true"]
```

#### `[decano-user-dashboard]`
Dashboard del usuario con estadísticas e historial de informes.

**Ejemplo:**
```php
[decano-user-dashboard]
```

#### `[decano-plans]`
Selector de planes con comparación de características.

**Parámetros:**
- `highlighted` (opcional, default: 'premium') - Plan destacado

**Ejemplo:**
```php
[decano-plans highlighted="premium"]
```

#### `[decano-report-history]`
Historial de informes del usuario.

**Ejemplo:**
```php
[decano-report-history]
```

#### `[fraktal_panel]` (Legacy)
Compatibilidad con versión anterior. Redirige a `[decano-report-generator]`.

### Panel de Administración

#### Dashboard
- **Ruta**: `wp-admin > Decano > Dashboard`
- Estadísticas principales: informes mensuales, usuarios activos, suscripciones, ingresos
- Distribución de planes
- Informes recientes

#### Gestión de Usuarios
- **Ruta**: `wp-admin > Decano > Usuarios`
- Listado de usuarios con información de planes
- Filtrado por plan (Free/Premium/Enterprise)
- Búsqueda por nombre o email
- Visualización de uso mensual
- Enlaces a perfiles de WordPress

#### Gestión de Informes
- **Ruta**: `wp-admin > Decano > Informes`
- Listado completo de informes generados
- Filtrado por estado (pending, processing, completed, failed, stalled)
- Búsqueda por usuario o session ID
- Estadísticas de informes
- Paginación

#### Configuración
- **Ruta**: `wp-admin > Decano > Configuración`
- URL del Backend API
- WP HMAC Secret
- Lista de shortcodes disponibles

## 🏗️ Arquitectura

### Estructura de Archivos

```
fraktal-reports/
├── fraktal-reports.php          # Plugin principal
├── includes/                     # Clases core
│   ├── class-da-activator.php   # Activación y setup
│   ├── class-da-loader.php      # Cargador de hooks
│   ├── class-da-plan-manager.php # Gestión de planes
│   └── class-da-limits.php      # Control de límites
├── admin/                        # Panel admin
│   ├── class-da-admin.php       # Clase principal admin
│   ├── class-da-admin-dashboard.php # Estadísticas
│   ├── class-da-admin-users.php     # Gestión usuarios
│   ├── class-da-admin-reports.php   # Gestión informes
│   ├── css/da-admin.css         # Estilos admin
│   └── js/da-admin.js           # Scripts admin
├── public/                       # Frontend
│   ├── class-da-public.php      # Frontend hooks
│   ├── class-da-shortcodes.php  # Shortcodes
│   └── build/                   # Build React
│       ├── da-app.js            # Bundle JS (213 KB)
│       └── da-app.css           # Bundle CSS (18 KB)
└── react-src/                    # Código fuente React
    ├── src/
    │   ├── components/          # Componentes React
    │   ├── services/            # API client
    │   └── types/               # TypeScript types
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.js
```

### Base de Datos

#### Tabla: `wp_da_report_sessions`
Almacena sesiones de generación de informes.

```sql
CREATE TABLE wp_da_report_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id BIGINT(20),
  status VARCHAR(50),
  created_at DATETIME,
  updated_at DATETIME,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);
```

#### Tabla: `wp_da_plan_usage`
Tracking de uso mensual por usuario.

```sql
CREATE TABLE wp_da_plan_usage (
  id BIGINT(20) AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT(20),
  month_year VARCHAR(7),
  reports_count INT(11) DEFAULT 0,
  plan_tier VARCHAR(50),
  last_reset DATETIME,
  UNIQUE KEY user_month (user_id, month_year)
);
```

### Sistema de Cache

El plugin utiliza transients de WordPress para cachear consultas de planes:
- **Duración**: 5 minutos (300 segundos)
- **Invalidación**: Automática al cambiar suscripción
- **Clave**: `da_user_plan_{user_id}`

### Integración con Backend

El plugin se comunica con el backend FastAPI mediante:
- **Autenticación HMAC-SHA256** para todas las peticiones
- **Endpoints AJAX** de WordPress
- **Polling** cada 5 segundos para estado de generación
- **Detección de estancamiento** tras 2 minutos sin cambios

## 🔧 Desarrollo

### Configurar Entorno de Desarrollo

1. **Instalar dependencias del frontend**:
```bash
cd react-src
npm install
```

2. **Modo desarrollo** (con hot reload):
```bash
npm run dev
```

3. **Build para producción**:
```bash
npm run build
```

Los archivos compilados se generan en `public/build/`.

### Estructura de Componentes React

- **ReportGenerator**: Interfaz principal de generación
- **ReportGenerationWizard**: Wizard con polling y control de estado
- **UserDashboard**: Dashboard con estadísticas del usuario
- **PlanSelector**: Selector de planes con CTAs de upgrade

### API Client (wpApi.ts)

Todas las llamadas al backend se realizan mediante el cliente WordPress AJAX:

```typescript
import { wpApi } from '@/services/wpApi';

// Iniciar generación
const result = await wpApi.startReport(payload);

// Consultar estado
const status = await wpApi.getReportStatus(sessionId);

// Obtener plan del usuario
const plan = await wpApi.getUserPlan();
```

## 🧪 Testing

### Probar Funcionalidad Básica

1. **Crear usuario de prueba** con diferentes planes
2. **Generar informe** usando `[decano-report-generator]`
3. **Verificar límites** intentando exceder el máximo mensual
4. **Probar upgrade** cambiando de Free a Premium
5. **Revisar dashboard** con estadísticas

### Verificar Integración WooCommerce

1. Crear pedido de suscripción desde frontend
2. Verificar que el plan se actualiza correctamente
3. Cancelar suscripción y verificar vuelta a Free
4. Comprobar webhooks de renovación

## 📊 Métricas y Estadísticas

El plugin rastrea:
- **Informes generados por mes**
- **Usuarios activos** (con al menos 1 informe)
- **Ingresos mensuales** de suscripciones
- **Distribución de planes** (Free/Premium/Enterprise)
- **Estados de informes** (pending, processing, completed, failed)
- **Tendencias de uso** (últimos 6 meses)

## 🔐 Seguridad

- **HMAC-SHA256** para autenticación con backend
- **Nonces de WordPress** para todos los formularios
- **Sanitización** de todos los inputs
- **Escape** de todos los outputs
- **Verificación de capacidades** (manage_options para admin)
- **Validación de sesiones** de usuario

## 🐛 Solución de Problemas

### Los productos no se crean al activar

**Solución**: Desactiva y reactiva el plugin. Verifica que WooCommerce esté activo.

### Error "No estás autenticado"

**Solución**: Verifica que el HMAC Secret coincida con el backend.

### Informes se quedan en "processing"

**Solución**: Verifica la conexión con el backend. Usa el botón "Reanudar generación" si se detecta estancamiento.

### Cache de plan no se actualiza

**Solución**: La cache se limpia automáticamente. Para forzar limpieza:
```php
DA_Plan_Manager::clear_user_plan_cache($user_id);
```

## 📝 Changelog

Ver [CHANGELOG.md](CHANGELOG.md) para historial completo de versiones.

## 👥 Contribuir

1. Fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit de cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y propietario.

## 🆘 Soporte

Para soporte técnico, contacta a través de los canales oficiales del proyecto.

---

**Versión**: 1.0.0
**Autor**: Motor Fractal Team
**Última actualización**: Enero 2026
