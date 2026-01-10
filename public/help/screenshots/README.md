# 📸 Capturas de Pantalla - Sistema de Ayuda

Este directorio contiene las capturas de pantalla que se muestran en el sistema de ayuda contextual de la aplicación.

## 📋 Lista de Capturas Requeridas

### ✅ Completadas
_Marca con ✅ cuando completes cada captura_

### 🔰 Getting Started
- [ ] `register-form.png` - Formulario de registro
- [ ] `login-form.png` - Formulario de inicio de sesión
- [ ] `dashboard-overview.png` - Vista general del dashboard

### 🎨 Create Chart
- [ ] `new-chart-form.png` - Formulario de nueva carta
- [ ] `save-chart-dialog.png` - Diálogo de guardado
- [ ] `chart-visualization.png` - Visualización completa de carta natal

### 📊 Generate Reports
- [ ] `report-wizard.png` - Vista del wizard de configuración
- [ ] `report-type-selection.png` - Selección de tipo de informe
- [ ] `template-selection.png` - Selección de plantilla (Premium)
- [ ] `orb-configuration.png` - Configuración de orbes
- [ ] `generation-in-progress.png` - Generación en progreso
- [ ] `download-report.png` - Informe listo para descargar

### 🎨 Templates (Premium)
- [ ] `create-template.png` - Crear plantilla
- [ ] `edit-template.png` - Editar plantilla
- [ ] `template-preview.png` - Preview de plantilla
- [ ] `clone-template.png` - Clonar plantilla
- [ ] `delete-template-confirm.png` - Confirmación de eliminación

### ⚙️ Account Settings
- [ ] `profile-settings.png` - Configuración de perfil
- [ ] `subscription-management.png` - Gestión de suscripción

### 🔧 Admin Panel
- [ ] `admin-dashboard.png` - Dashboard de admin
- [ ] `user-management.png` - Gestión de usuarios
- [ ] `report-types-manager.png` - Gestor de tipos de informe
- [ ] `system-seeding.png` - Inicialización del sistema

### 🔍 Troubleshooting
- [ ] `error-generation.png` - Error en generación
- [ ] `geocoding-error.png` - Error de geocodificación
- [ ] `network-error.png` - Error de conexión

---

## 📐 Especificaciones Técnicas

### Dimensiones
- **Ancho mínimo**: 1200px
- **Ancho óptimo**: 1920px
- **Aspecto recomendado**: 16:9 o 16:10

### Formato
- **Tipo**: PNG
- **Compresión**: Sin compresión o pérdida mínima
- **Transparencia**: No necesaria (fondo completo de la app)

### Contenido
- **Tema**: Dark mode (slate-900)
- **Datos**: Ficticios pero realistas
- **Idioma**: Español
- **Elementos destacados**: Cursor visible en elementos interactivos

---

## 🎯 Cómo Tomar las Capturas

1. **Preparar la aplicación**:
   ```bash
   npm run dev
   # O en producción:
   npm run build && npm run preview
   ```

2. **Navegar a la pantalla objetivo**

3. **Asegurar estado correcto**:
   - Login con usuario de prueba
   - Datos de ejemplo cargados
   - Tema oscuro activado

4. **Capturar**:
   - Windows: Win + Shift + S
   - macOS: Cmd + Shift + 4
   - Linux: Flameshot

5. **Guardar**:
   - Nombre exacto según lista arriba
   - En este directorio: `/public/help/screenshots/`

6. **Verificar**:
   - Abrir ayuda en la app
   - Navegar al paso correspondiente
   - Confirmar que la imagen se carga

---

## 🔄 Actualización de Capturas

Si la UI cambia y las capturas quedan desactualizadas:

1. Identificar capturas obsoletas
2. Retomar capturas actualizadas
3. Reemplazar archivos manteniendo nombres
4. Limpiar caché del navegador (Ctrl+F5)

---

## ✨ Buenas Prácticas

- ✅ Usar datos consistentes ("Juan Pérez" en varios ejemplos)
- ✅ Mostrar estados de éxito/completado cuando sea posible
- ✅ Incluir elementos UI importantes (botones, menús)
- ✅ Asegurar contraste adecuado para legibilidad
- ❌ No incluir datos reales de usuarios
- ❌ No mostrar errores reales de producción
- ❌ No incluir información sensible

---

**Última actualización**: 2026-01-10
