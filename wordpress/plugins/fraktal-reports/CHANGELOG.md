# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-01-10

### 🎉 Lanzamiento Inicial

Primera versión completa del plugin WordPress con sistema de suscripciones multi-tier.

### ✨ Añadido

#### Sistema de Planes
- Sistema de 3 planes de suscripción (Free, Premium, Enterprise)
- Creación automática de productos WooCommerce con suscripciones
- Gestión de límites mensuales por plan:
  - **Free**: 1 informe/mes
  - **Premium**: Informes ilimitados + 5 plantillas
  - **Enterprise**: Ilimitado + API + plantillas ilimitadas
- Cache de consultas de planes con transients (5 min)
- Detección automática de plan del usuario
- Control de límites antes de generar informes

#### Frontend React
- Proyecto React + TypeScript + Vite configurado
- Integración de Tailwind CSS v4 con paleta personalizada (slate-900, indigo, amber)
- Cliente API WordPress (wpApi.ts) con todas las operaciones AJAX
- **Componentes principales**:
  - `ReportGenerator`: Interfaz de generación con selectores de perfil y tipo
  - `ReportGenerationWizard`: Wizard con polling (5s), detección de estancamiento y reanudación
  - `UserDashboard`: Estadísticas del usuario e historial de informes
  - `PlanSelector`: Comparación de planes con CTAs de upgrade
- Build optimizado: 213 KB JS (67 KB gzip), 18 KB CSS (4.4 KB gzip)
- Component router dinámico para renderizar vía shortcodes

#### Shortcodes
- `[decano-report-generator]`: Generador completo con verificación de límites
- `[decano-user-dashboard]`: Dashboard del usuario
- `[decano-plans]`: Selector de planes con plan destacado configurable
- `[decano-report-history]`: Historial de informes
- `[fraktal_panel]`: Compatibilidad con versión anterior (legacy)

#### Panel de Administración
- **Dashboard** (`wp-admin > Decano > Dashboard`):
  - 4 tarjetas de estadísticas principales (informes, usuarios, suscripciones, ingresos)
  - Distribución de planes en tiempo real
  - Tabla de informes recientes
  - Gráficos de uso mensual (últimos 6 meses)

- **Gestión de Usuarios** (`wp-admin > Decano > Usuarios`):
  - Listado con información de plan y uso
  - Filtrado por plan tier (Free/Premium/Enterprise)
  - Búsqueda por nombre/email
  - Visualización de próxima renovación
  - Paginación (20 usuarios por página)

- **Gestión de Informes** (`wp-admin > Decano > Informes`):
  - Listado completo con filtros avanzados
  - Filtrado por estado (pending, processing, completed, failed, stalled)
  - Búsqueda por usuario o session ID
  - Estadísticas inline (total, últimos 30 días, promedio/día)
  - Paginación y exportación a CSV

- **Configuración** (`wp-admin > Decano > Configuración`):
  - Configuración de Backend API URL
  - Configuración de WP HMAC Secret
  - Lista de shortcodes disponibles

#### Base de Datos
- Tabla `wp_da_report_sessions`: Tracking de sesiones de generación
- Tabla `wp_da_plan_usage`: Contador de uso mensual por usuario
- Índices optimizados para consultas frecuentes

#### Clases PHP
- `DA_Activator`: Instalación y creación de productos
- `DA_Loader`: Gestión centralizada de hooks
- `DA_Plan_Manager`: Detección y gestión de planes con cache
- `DA_Limits`: Control de límites y uso mensual
- `DA_Admin`: Panel de administración principal
- `DA_Admin_Dashboard`: Estadísticas y métricas
- `DA_Admin_Users`: Gestión de usuarios
- `DA_Admin_Reports`: Gestión de informes
- `DA_Public`: Frontend hooks y assets
- `DA_Shortcodes`: Registro de shortcodes

#### Integración WooCommerce
- Webhooks para cambios en suscripciones
- Limpieza automática de cache al cambiar plan
- Tracking de ingresos mensuales
- Productos con metadata personalizada por plan

#### Estilos y UI
- Badges de color para estados de informes (5 estados)
- Badges de color para tiers de planes (3 tiers)
- Grid responsivo para estadísticas
- Tablas WordPress estándar con estilos mejorados
- Formularios de filtrado inline

### 🔒 Seguridad
- Autenticación HMAC-SHA256 con backend
- Nonces de WordPress en todos los formularios
- Sanitización de inputs con funciones WordPress
- Escape de outputs con `esc_html()`, `esc_attr()`
- Verificación de capacidades (`manage_options`)
- Validación de sesiones de usuario

### ⚡ Rendimiento
- Cache de planes con transients (5 min)
- Invalidación automática de cache en cambios
- Polling optimizado (5s) vs polling agresivo (2.5s anterior)
- Lazy loading de clases admin
- Assets condicionales (solo cargan cuando se necesitan)

### 🐛 Correcciones
- N/A (primera versión)

### 📚 Documentación
- README.md completo con guía de instalación
- Documentación de arquitectura y estructura
- Ejemplos de uso de shortcodes
- Guía de desarrollo y build
- Solución de problemas comunes

### 🔧 Técnico
- **PHP**: 8.1+
- **WordPress**: 6.0+
- **WooCommerce**: 8.0+
- **WooCommerce Subscriptions**: 5.0+
- **Node.js**: 18+ (desarrollo)
- **React**: 19.2.0
- **TypeScript**: 5.9.3
- **Vite**: 7.2.4
- **Tailwind CSS**: 4.1.18

### 📊 Estadísticas del Código
- **Total líneas nuevas**: ~9,300+
- **Archivos PHP**: 14 nuevos
- **Componentes React**: 4 principales + wizard
- **Shortcodes**: 5 (4 nuevos + 1 legacy)
- **Páginas admin**: 4
- **Tablas BD**: 2

---

## [0.1.3] - 2025-12 (Pre-refactorización)

### Legacy
Versión anterior del plugin con funcionalidad básica:
- 1 shortcode `[fraktal_panel]`
- Sistema de perfiles con CRUD
- Generación básica de informes vía API HMAC
- Descarga de PDFs por proxy
- 5 endpoints AJAX
- Sin sistema de planes
- Frontend jQuery
- Sin panel administrativo

---

[1.0.0]: https://github.com/benetandujar72/Decano-astrologico/compare/v0.1.3...v1.0.0
[0.1.3]: https://github.com/benetandujar72/Decano-astrologico/releases/tag/v0.1.3
